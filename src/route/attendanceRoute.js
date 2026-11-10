
import express from "express";

import {
  checkIn,
  checkOut,
  getAll,
  getEmployee
} from "../controller/attendanceController.js";

import {
  uploadAttendancePhoto
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Employee check-in with optional photo
router.post(
  "/check-in",
  uploadAttendancePhoto.single("checkInPhoto"),
  checkIn
);

// Employee check-out
router.post("/check-out", checkOut);

// Attendance list
router.get("/all", getAll);

// Individual employee monthly attendance
router.get("/employee/:employeeId", getEmployee);

export default router;
