import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

const uploadDir = path.resolve("imageUploads");

await fs.mkdir(uploadDir, { recursive: true });

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, and WEBP images are allowed.")
      );
    }

    cb(null, true);
  },
});

export const processProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const filename = `${randomUUID()}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toFile(outputPath);

    req.profileImagePath = `/imageUploads/${filename}`;

    next();
  } catch (error) {
    next(error);
  }
};