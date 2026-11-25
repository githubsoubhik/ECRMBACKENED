// import multer from "multer";
// import sharp from "sharp";
// import path from "path";
// import fs from "fs/promises";
// import { randomUUID } from "crypto";
// import { fileURLToPath } from "url";
// import cloudinary from "../config/cloudinary.js";



// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const uploadDir = path.join(__dirname, "..", "..", "imageUploads");
// const attendanceDir = path.join(uploadDir, "attendance");

// try {
//   await fs.mkdir(attendanceDir, { recursive: true }); // also creates uploadDir
// } catch (err) {
//   console.error("Could not create upload directory:", err);
//   throw err;
// }

// const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// /* ---------- ORIGINAL EXPORTS (used by employeeRoute.js) ---------- */

// export const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 5 * 1024 * 1024, files: 1 },
//   fileFilter: (req, file, cb) => {
//     if (!ALLOWED_TYPES.includes(file.mimetype)) {
//       return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
//     }
//     cb(null, true);
//   },
// });

// // ---------- PROFILE IMAGE EXPORTS (used by employeeRoute.js) ---------- */

// export const processProfileImage = async (req, res, next) => {
//   try {
//     if (!req.file) return next();

//     const filename = `${randomUUID()}.webp`;

//     await sharp(req.file.buffer)
//       .rotate()
//       .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
//       .webp({ quality: 75 })
//       .toFile(path.join(uploadDir, filename));

//     req.profileImagePath = `/imageUploads/${filename}`;
//     next();
//   } catch (error) {
//     next(error);
//   }
// };

// /* ---------- ATTENDANCE EXPORTS ---------- */

// export const uploadAttendancePhoto = (fieldName) => (req, res, next) => {
//   upload.single(fieldName)(req, res, (err) => {
//     if (!err) return next();

//     const message =
//       err.code === "LIMIT_FILE_SIZE"
//         ? "Photo must be under 5 MB"
//         : err.code === "LIMIT_UNEXPECTED_FILE"
//         ? `Unexpected file field. Use "${fieldName}"`
//         : err.message || "Upload failed";

//     return res.status(400).json({ success: false, message });
//   });
// };

// export const processAttendancePhoto = async (req, res, next) => {
//   if (!req.file) return next();

//   try {
//     const filename = `${randomUUID()}.webp`;

//     await sharp(req.file.buffer)
//       .rotate()
//       .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
//       .webp({ quality: 75 })
//       .toFile(path.join(attendanceDir, filename));

//     req.attendancePhotoPath = `/imageUploads/attendance/${filename}`;
//     req.file.buffer = undefined;
//     next();
//   } catch (error) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Invalid or corrupted image file" });
//   }
// };


import multer from "multer";
import sharp from "sharp";
import { Readable } from "stream";
import { randomUUID } from "crypto";

import cloudinary from "../config/cloudinary.js";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ======================================
// MULTER MEMORY STORAGE
// ======================================

export const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});

// ======================================
// COMMON IMAGE PROCESSING + CLOUDINARY
// ======================================

const processAndUpload = async (file, folder, maxWidth) => {
  if (!file) return null;

  // Convert image into optimized WebP
  const optimizedBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: maxWidth,
      height: maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 75,
      effort: 5,
    })
    .toBuffer();

  const publicId = randomUUID();

  // Upload WebP buffer to Cloudinary
  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        format: "webp",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Cloudinary upload returned no result"));
        }

        resolve(result);
      }
    );

    Readable.from([optimizedBuffer]).pipe(uploadStream);
  });

  return {
    imageUrl: result.secure_url,
    publicId: result.public_id,
  };
};

// ======================================
// EMPLOYEE PROFILE IMAGE
// ======================================

export const processProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await processAndUpload(
      req.file,
      "mern-app/employees",
      800
    );

    req.profileImagePath = result.imageUrl;
    req.profileImagePublicId = result.publicId;

    req.file.buffer = undefined;

    next();

  } catch (error) {
    console.error("Profile image upload error:", error);

    next(error);
  }
};

// ======================================
// ATTENDANCE IMAGE UPLOAD MIDDLEWARE
// ======================================

export const uploadAttendancePhoto = (fieldName) => (
  req,
  res,
  next
) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo must be under 5 MB"
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? `Unexpected file field. Use "${fieldName}"`
        : err.message || "Upload failed";

    return res.status(400).json({
      success: false,
      message,
    });
  });
};

// ======================================
// ATTENDANCE PHOTO PROCESSING
// ======================================

export const processAttendancePhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await processAndUpload(
      req.file,
      "mern-app/attendance",
      640
    );

    req.attendancePhotoPath = result.imageUrl;
    req.attendancePhotoPublicId = result.publicId;

    req.file.buffer = undefined;

    next();

  } catch (error) {
    console.error("Attendance photo upload error:", error);

    return res.status(400).json({
      success: false,
      message: "Invalid image or Cloudinary upload failed",
    });
  }
};
