import Attendance from "../models/attendanceperday.js";
import Employee from "../models/employee.js";


import { isLate, dateKey, calcWorkMinutes } from "../utils/time.js";


export const checkIn = async (req, res) => {
  try {
   
    const { employeeId } = req.user;

    // Fetch current employee details from MongoDB.
    const employee = await Employee.findOne({
      employeeId,
      isActive: true,
    }).select("employeeId department status");

    if (!employee || employee.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Employee account is inactive",
      });
    }

    const now = new Date();
    const today = dateKey(now);

    // Check whether attendance already exists.
    const exists = await Attendance.findOne({
      employeeId: employee.employeeId,
      dateKey: today,
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Already checked in today",
      });
    }

    const rec = await Attendance.create({
      employeeId: employee.employeeId,
      department: employee.department,
      dateKey: today,

      checkIn: now,

      status: isLate(now) ? "Late" : "Present",

      checkInPhoto: req.file
        ? `/imageUploads/${req.file.filename}`
        : "",

      location: {
        lat: req.body.lat
          ? Number(req.body.lat)
          : null,

        lng: req.body.lng
          ? Number(req.body.lng)
          : null,

        office: "PAVION Office - Kolkata",
      },

      markedBy: employee.employeeId,
    });

    return res.status(201).json({
      success: true,
      message: "Check-in successful",
      data: rec,
    });

  } catch (error) {
    // MongoDB duplicate-key protection.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already checked in today",
      });
    }

    console.error("Check-in error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check in",
    });
  }
};


export const checkOut = async (req, res) => {
  try {
    const { employeeId } = req.user;

    const today = dateKey();

    const rec = await Attendance.findOne({
      employeeId,
      dateKey: today,
    });

    if (!rec || !rec.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Please check in first",
      });
    }

    if (rec.checkOut) {
      return res.status(409).json({
        success: false,
        message: "Already checked out",
      });
    }

    const now = new Date();

    // Close an open break automatically.
    const openBreak = rec.breaks.find(
      (item) => !item.end
    );

    if (openBreak) {
      openBreak.end = now;
    }

    rec.checkOut = now;

    rec.workMinutes = calcWorkMinutes(rec);

    await rec.save();

    return res.status(200).json({
      success: true,
      message: "Check-out successful",
      data: rec,
    });

  } catch (error) {
    console.error("Check-out error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check out",
    });
  }
};


//get all attendance 

export const getAll = async (req, res) => {
  try {
    const {
      date = dateKey(),
      department,
      status,
    } = req.query;

    const query = {
      dateKey: date,
    };

    if (status) {
      query.status = status;
    }

    const role = String(req.user.role).toLowerCase();

    // Leader can only see their department.
    if (role === "leader") {
      query.department = req.user.department;
    } else if (department) {
      query.department = department;
    }

    const records = await Attendance.find(query)
      .sort({ checkIn: 1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });

  } catch (error) {
    console.error("Get attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch attendance",
    });
  }
};



/// individual    attendance ....

export const getEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    if (!/^\d{4}-\d{2}$/.test(month || "")) {
      return res.status(400).json({
        success: false,
        message: "Month must be in YYYY-MM format",
      });
    }

    const role = String(req.user.role).toLowerCase();

    // Normal employees can only see their own attendance.
    if (
      role === "employee" &&
      req.user.employeeId !== employeeId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance",
      });
    }

    // Leader can only view employees in their department.
    if (role === "leader") {
      const employee = await Employee.findOne({
        employeeId,
      }).select("department");

      if (
        !employee ||
        employee.department !== req.user.department
      ) {
        return res.status(403).json({
          success: false,
          message: "Not your team",
        });
      }
    }

    const records = await Attendance.find({
      employeeId,
      dateKey: {
        $regex: `^${month}`,
      },
    }).sort({ dateKey: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });

  } catch (error) {
    console.error("Employee attendance error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch employee attendance",
    });
  }
};