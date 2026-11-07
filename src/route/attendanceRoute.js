

router.use(authenticateToken);

// Employee check-in with optional photo.
router.post(
  "/check-in",
  uploadAttendancePhoto.single("checkInPhoto"),
  checkIn
);

// Employee check-out.
router.post(
  "/check-out",
  checkOut
);

// Attendance list.
router.get(
  "/all",
  getAll
);

// Individual employee monthly attendance.
router.get(
  "/employee/:employeeId",
  getEmployee
);

export default router;