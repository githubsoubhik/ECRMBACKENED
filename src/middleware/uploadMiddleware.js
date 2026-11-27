// 



import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});

// Upload optimized WebP buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        format: "webp",
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          console.error("CLOUDINARY ERROR:");
          console.dir(error, { depth: 10 });
          return reject(error);
        }

        resolve({
          imageUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// Shared image processor
const processAndUpload = async (file, folder, width) => {
  if (!file?.buffer) {
    throw new Error("Image file buffer is missing");
  }

  const webpBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width,
      height: width,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();

  const publicId = randomUUID();

  return uploadToCloudinary(
    webpBuffer,
    folder,
    publicId
  );
};

// EMPLOYEE PROFILE IMAGE
export const processProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const result = await processAndUpload(
      req.file,
      "profileimages",
      800
    );

    req.profileImagePath = result.imageUrl;
    req.profileImagePublicId = result.publicId;

    console.log("EMPLOYEE IMAGE UPLOADED:", result);

    return next();

  } catch (error) {
    console.error("PROFILE IMAGE UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Profile image upload failed",
    });
  }
};

// ATTENDANCE PHOTO
export const processAttendancePhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();


    const now = new Date();

    const dateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const parts = Object.fromEntries(
      dateParts.map(({ type, value }) => [type, value])
    );

    const folder =
      `attendance/${parts.year}/${parts.month}/${parts.day}/${req.user.employeeId}`;

    const result = await processAndUpload(
  req.file,
  folder,
  640
);

    req.attendancePhotoPath = result.imageUrl;
    req.attendancePhotoPublicId = result.publicId;

    console.log("ATTENDANCE IMAGE UPLOADED:", result);

    return next();

  } catch (error) {
    console.error("ATTENDANCE IMAGE UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Attendance image upload failed",
    });
  }
};

// ATTENDANCE MULTER FIELD
export const uploadAttendancePhoto = (fieldName) => (
  req,
  res,
  next
) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    return res.status(400).json({
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Photo must be under 5 MB"
          : err.message || "Image upload failed",
    });
  });
};
