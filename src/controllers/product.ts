import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import {
  BaseQuery,
  NewProductRequestBody,
  SearchRequestQuery,
} from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";
import cloudinary from 'cloudinary';

export const getSingleProductDetails = TryCatch(async (req, res, next) => {

  const id = req.params.id;
  
  const product = await Product.findById(id);

  if(!product) return next(new ErrorHandler("Product Not Found", 404));

  res.status(200).json({
    success : true,
    product,
  })

})

export const getlatestProducts = TryCatch(async (req, res, next) => {

    let products;

    if(myCache.has("latest-products"))
    {
      products = JSON.parse(myCache.get("latest-products") as  string);
    }
    else{
      products = await Product.find({}).sort({ createdAt: -1 }).limit(4);
      myCache.set("latest-products", JSON.stringify(products));
    }
     return res.status(200).json({
      success: true,
      products,
    });

})


export const getSingleProduct = TryCatch(async(req, res, next)=>{

  let product;
  const id = req.params.id;
  if (myCache.has(`product-${id}`))
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  else {
    product = await Product.findById(id);

    if (!product) return next(new ErrorHandler("Product Not Found", 404));

    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
})
export const getAdminProducts = TryCatch(async(req, res, next)=>{
  let products;
  if (myCache.has("all-products"))
    products = JSON.parse(myCache.get("all-products") as string);
  else {
    products = await Product.find({});
    myCache.set("all-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
})

export const getAllCategories = TryCatch(async (req,res,next)=>{
  let categories;

  if (myCache.has("categories"))
    categories = JSON.parse(myCache.get("categories") as string);
  else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
})
export const getAllColors = TryCatch(async (req,res,next)=>{
  let colors;

  if (myCache.has("colors"))
    colors = JSON.parse(myCache.get("colors") as string);
  else {
    colors = await Product.distinct("color");
    myCache.set("colors", JSON.stringify(colors));
  }

  return res.status(200).json({
    success: true,
    colors,
  });
})


export const newProduct = TryCatch(
  async (req: Request<{}, {}, NewProductRequestBody>, res, next) => {
    const { name, price, category, description, color, stock } = req.body;
    const photos = req.files as Express.Multer.File[];

    if (!photos || photos.length === 0) return next(new ErrorHandler("Please add Photo", 400));

    if (!name || !price || !stock || !category || !description || !color) {
      return next(new ErrorHandler("Please enter All Fields", 400));
    }

    try {
      const photoUrls = await Promise.all(photos.map(async (photo) => {
        const cloudinaryResponse = await cloudinary.v2.uploader.upload(photo.path, {
          folder: "products",
        });
        return cloudinaryResponse.secure_url;
      }));

      await Product.create({
        name,
        price,
        description,
        stock,
        color,
        category: category.toLowerCase(),
        photos: photoUrls, // Use 'photos' instead of 'photo' to store multiple photo URLs
      });

      invalidateCache({ product: true, admin: true });

      return res.status(201).json({
        success: true,
        message: "Product Created Successfully",
      });
    } catch (error) {
      return next(new ErrorHandler("Failed to create product", 500));
    }
  }
);



export const updateProduct = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { name, price, category, description, color, stock } = req.body;
  const photos = req.files as Express.Multer.File[];
  const product = await Product.findById(id);

  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  // Handle multiple photo uploads
  if (photos && photos.length > 0) {
    // Delete existing photos from Cloudinary
    if (product.photos && product.photos.length > 0) {
      for (let i = 0; i < product.photos.length; i++) {
        await cloudinary.v2.uploader.destroy(getPublicIdFromUrl(product.photos[i]));
      }
    }
    
    
    const photoUrls = await Promise.all(photos.map(async (photo) => {
      const cloudinaryResponse = await cloudinary.v2.uploader.upload(photo.path, {
        folder: "products",
      });
      return cloudinaryResponse.secure_url;
    }));
    product.photos = photoUrls;
  }

  if (name) product.name = name;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;
  if (description) product.description = description;
  if (color) product.color = color;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully",
  });
});

export const deleteProduct = TryCatch(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product Not Found", 404));

  // Delete photos from Cloudinary
  if (product.photos && product.photos.length > 0) {
    for (let i = 0; i < product.photos.length; i++) {
      await cloudinary.v2.uploader.destroy(getPublicIdFromUrl(product.photos[i]));
    }
  }

  await product.deleteOne();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Deleted Successfully",
  });
});


function getPublicIdFromUrl(photoUrl: string): string {
  const publicIdMatch = /\/v\d+\/(.*\/)?(.+?)\.[a-zA-Z]+(#.*)?$/.exec(photoUrl);
  return publicIdMatch ? publicIdMatch[2] : '';
}

export const getAllProducts = TryCatch(async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {

  const { search, sort, category, price, size, color } = req.query;

  const page = Number(req.query.page) || 1;
  const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
  const skip = (page - 1) * limit;

  const baseQuery: BaseQuery = {};

  if (search) {
    baseQuery.name = {
      $regex: search,
      $options: "i",
    };
  }
  if (price) {
    baseQuery.price = {
      $lte: Number(price),
    };
  }

  if (category) baseQuery.category = category;
  if (size) baseQuery.size = size;
if (color) baseQuery.color = color;

  const productsPromise = Product.find(baseQuery).sort(sort && { price: sort === "asc" ? 1 : -1 }).limit(limit).skip(skip);

  const [products, filteredOnlyProduct] = await Promise.all([
    productsPromise,
    Product.find(baseQuery),
  ]);

  const totalPage = Math.ceil(filteredOnlyProduct.length / limit);

  return res.status(200).json({
    success: true,
    products,
    totalPage,
  });
});

