
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (
  !CLOUDINARY_CLOUD_NAME ||
  !CLOUDINARY_API_KEY ||
  !CLOUDINARY_API_SECRET
) {
  throw new Error("Cloudinary credentials are missing in .env");
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,

  
});

try {
  const result = await cloudinary.api.ping();

  console.log("Cloudinary API test:", result);
} catch (error) {
  console.error("Cloudinary API test failed:", {
    message: error.message,
    http_code: error.http_code,
    name: error.name,
  });
}

console.log("Cloudinary configured successfully!");

export default cloudinary;



