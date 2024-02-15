import multer from "multer";
import { v4 as uuid } from "uuid";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";


cloudinary['v2'].config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: {
    public_id: (req, file) => uuid(),
  },
});

export const singleUpload = multer({ storage }).single("photo");

export const multipleUpload = multer({ storage }).array("photos", 7); 
