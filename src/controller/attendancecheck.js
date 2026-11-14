

import Attendance from "../models/attendanceperday.js";
import { isLate, dateKey, calcWorkMinutes } from "../utils/time.js";

import  Employee from "../models/employee.js";



// check in

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


// check out 

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

// export const getAll = async (req, res) => {
//   try {
//     const {
//       date = dateKey(),
//       department,
//       status,
//     } = req.query;

//     const query = {
//       dateKey: date,
//     };

//     if (status) {
//       query.status = status;
//     }

//     const role = String(req.user.role).toLowerCase();

//     // Leader can only see their department.
//     if (role === "leader") {
//       query.department = req.user.department;
//     } else if (department) {
//       query.department = department;
//     }

//     const records = await Attendance.find(query)
//       .sort({ checkIn: 1 });

//     return res.status(200).json({
//       success: true,
//       count: records.length,
//       data: records,
//     });

//   } catch (error) {
//     console.error("Get attendance error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to fetch attendance",
//     });
//   }
// };

const FULL_ACCESS = ["admin", "hr", "manager"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// getAll: access + validation
export const getAll = async (req, res) => {
  try {
    const role = String(req.user.role).toLowerCase();
    if (role !== "leader" && !FULL_ACCESS.includes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const date = String(req.query.date || dateKey());
    if (!DATE_RE.test(date)) {
      return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD" });
    }

    const query = { dateKey: date };

    if (req.query.status) {
      const status = String(req.query.status);
      if (!ATTENDANCE_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      query.status = status;
    }

    if (role === "leader") query.department = req.user.department;
    else if (req.query.department) query.department = String(req.query.department);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const [records, total] = await Promise.all([
      Attendance.find(query).sort({ checkIn: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Attendance.countDocuments(query),
    ]);

    return res.status(200).json({ success: true, total, page, count: records.length, data: records });
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch attendance" });
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

// break strat

export const breakStart = async (req, res) => {
  try {
    const rec = await Attendance.findOne({ employeeId: req.user.employeeId, dateKey: dateKey() });

    if (!rec || !rec.checkIn)
      return res.status(400).json({ success: false, message: "Please check in first" });
    if (rec.checkOut)
      return res.status(409).json({ success: false, message: "Already checked out" });
    if (rec.breaks.some((b) => !b.end))
      return res.status(409).json({ success: false, message: "A break is already running" });

    rec.breaks.push({ start: new Date() });
    await rec.save();
    return res.status(200).json({ success: true, message: "Break started", data: rec });
  } catch (error) {
    console.error("Break start error:", error);
    return res.status(500).json({ success: false, message: "Unable to start break" });
  }
};


//   break  end

export const breakEnd = async (req, res) => {
  try {
    const rec = await Attendance.findOne({ employeeId: req.user.employeeId, dateKey: dateKey() });
    const open = rec?.breaks.find((b) => !b.end);

    if (!open)
      return res.status(400).json({ success: false, message: "No running break" });

    open.end = new Date();
    await rec.save();
    return res.status(200).json({ success: true, message: "Break ended", data: rec });
  } catch (error) {
    console.error("Break end error:", error);
    return res.status(500).json({ success: false, message: "Unable to end break" });
  }
};


//...today  attendanc status 


export const getToday = async (req, res) => {
  try {
    const { employeeId } = req.user;
    const now = new Date();
    const today = dateKey(now);

    const rec = await Attendance.findOne({ employeeId, dateKey: today }).lean();

    // Nothing marked yet today
    if (!rec || !rec.checkIn) {
      return res.status(200).json({
        success: true,
        data: {
          employeeId,
          dateKey: today,
          checkIn: null,
          checkInPhoto: null,
          checkOut: null,
          breaks: [],
          state: "not_checked_in",
          status: "Not Marked",
          onBreak: false,
          breakMinutes: 0,
          workMinutes: 0,
          canCheckIn: true,
          canCheckOut: false,
          canStartBreak: false,
          canEndBreak: false,
        },
      });
    }

    const breaks = rec.breaks || [];
    const openBreak = breaks.find((b) => !b.end);

    // Completed breaks + the running one (if any)
    const breakMs = breaks.reduce((sum, b) => {
      const end = b.end ? new Date(b.end) : rec.checkOut ? new Date(rec.checkOut) : now;
      return sum + Math.max(0, end - new Date(b.start));
    }, 0);

    const endPoint = rec.checkOut ? new Date(rec.checkOut) : now;
    const workMs = Math.max(0, endPoint - new Date(rec.checkIn) - breakMs);

    const state = rec.checkOut ? "checked_out" : openBreak ? "on_break" : "checked_in";

    return res.status(200).json({
      success: true,
      data: {
        employeeId,
        dateKey: today,
        checkIn: rec.checkIn,
        checkInPhoto: rec.checkInPhoto || null,
        checkOut: rec.checkOut || null,
        breaks: breaks.map((b) => ({ start: b.start, end: b.end || null })),
        state,
        status: rec.status, // Present | Late | ...
        onBreak: !!openBreak,
        breakMinutes: Math.round(breakMs / 60000),
        workMinutes: Math.round(workMs / 60000),
        canCheckIn: false,
        canCheckOut: state === "checked_in" || state === "on_break",
        canStartBreak: state === "checked_in",
        canEndBreak: state === "on_break",
      },
    });
  } catch (error) {
    console.error("Today attendance error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch today's attendance" });
  }
};