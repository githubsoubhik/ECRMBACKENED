import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "..", "imageUploads");
const attendanceDir = path.join(uploadDir, "attendance");

try {
  await fs.mkdir(attendanceDir, { recursive: true }); // also creates uploadDir
} catch (err) {
  console.error("Could not create upload directory:", err);
  throw err;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* ---------- ORIGINAL EXPORTS (used by employeeRoute.js) ---------- */

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  },
});

export const processProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const filename = `${randomUUID()}.webp`;

    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(path.join(uploadDir, filename));

    req.profileImagePath = `/imageUploads/${filename}`;
    next();
  } catch (error) {
    next(error);
  }
};

/* ---------- ATTENDANCE EXPORTS ---------- */

export const uploadAttendancePhoto = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo must be under 5 MB"
        : err.code === "LIMIT_UNEXPECTED_FILE"
        ? `Unexpected file field. Use "${fieldName}"`
        : err.message || "Upload failed";

    return res.status(400).json({ success: false, message });
  });
};

export const processAttendancePhoto = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = `${randomUUID()}.webp`;

    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(path.join(attendanceDir, filename));

    req.attendancePhotoPath = `/imageUploads/attendance/${filename}`;
    req.file.buffer = undefined;
    next();
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or corrupted image file" });
  }
};