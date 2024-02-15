import express from "express";
import { multipleUpload } from "../middlewares/multer.js";
import { adminOnly } from "../middlewares/auth.js";
import { getSingleProductDetails,deleteProduct, getAdminProducts, getAllProducts, getSingleProduct, getlatestProducts, newProduct, updateProduct,getAllCategories, getAllColors } from "../controllers/product.js";

const app = express.Router();

//To Create New Product  - /api/v1/product/new
app.post("/new", adminOnly, multipleUpload, newProduct);

//To get all Products with filters  - /api/v1/product/all
app.get("/all", getAllProducts);

//To get last 10 Products  - /api/v1/product/latest
app.get("/latest", getlatestProducts);

//To get all unique Categories  - /api/v1/product/categories
app.get("/categories", getAllCategories);

//To get all unique color  - /api/v1/product/colors
app.get("/colors", getAllColors);

//To get all Products   - /api/v1/product/admin-products
app.get("/admin-products", adminOnly,getAdminProducts);

// To get, update, delete Product
app
  .route("/:id")
  .get(getSingleProduct)
  .put(adminOnly,multipleUpload, updateProduct)
  .delete(adminOnly, deleteProduct);

// get single product details

app.get("/product/:id" ,getSingleProductDetails)
export default app;