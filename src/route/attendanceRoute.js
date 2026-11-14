import express from "express";
import { breakEnd, breakStart, checkIn, checkOut, getAll, getEmployee, getToday } from "../controller/attendancecheck.js";
import { processAttendancePhoto, uploadAttendancePhoto } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleWare.js";

const router = express.Router();

router.use(protect); // every attendance route requires login

router.post(
  "/check-in",
  uploadAttendancePhoto("checkInPhoto"),
  processAttendancePhoto,
  checkIn
);


router.get("/today", protect, getToday);   
router.post("/check-out", checkOut);

router.get("/all", getAll);                    


router.post("/break-start", breakStart);
router.post("/break-end", breakEnd);

router.get("/employee/:employeeId", getEmployee);

export default router;