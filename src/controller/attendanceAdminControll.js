// // controllers/attendanceAdminController.js
// // Super admin / admin / HR / team leader edit another employee's attendance.
// // Breaks are never edited here.

// import Attendance, { ATTENDANCE_STATUS } from "../models/attendanceperday.js";
// import Employee from "../models/employee.js";
// import { isLate, dateKey } from "../utils/time.js";
// import { roleKey, FULL_ACCESS, LEADER_ROLES } from "../utils/roles.js";

// const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:30" (24h, IST)
// const NO_TIME_STATUSES = ["Absent", "Leave"];

// // Rejects dates like 2026-02-31.
// const isRealDate = (s) => {
//   if (!DATE_RE.test(s)) return false;
//   const d = new Date(`${s}T00:00:00Z`);
//   return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
// };

// // "HH:mm" is read as IST on the given date. Anything else must be a valid ISO string.
// const toDate = (date, value) => {
//   if (typeof value === "string" && TIME_RE.test(value)) {
//     return new Date(`${date}T${value}:00+05:30`);
//   }
//   const d = new Date(value);
//   return Number.isNaN(d.getTime()) ? null : d;
// };

// /**
//  * PATCH /api/attendance/employee/:employeeId/:date
//  *
//  * Body (all optional, but send at least one):
//  *   status   : "Present" | "Late" | "Absent" | "Leave" | "Half Day"
//  *   checkIn  : "09:30" | ISO string | null (null clears it)
//  *   checkOut : "18:05" | ISO string | null (null clears it)
//  *   remarks  : string
//  */
// export const updateAttendance = async (req, res) => {
//   try {
//     const { employeeId, date } = req.params;
//     const { status, checkIn, checkOut, remarks } = req.body ?? {};

//     /* ---------- 1. Who is calling ---------- */
//     const role = roleKey(req.user.role);
//     const isFull = FULL_ACCESS.includes(role);
//     const isLeader = LEADER_ROLES.includes(role);

//     if (!isFull && !isLeader) {
//       return res.status(403).json({
//         success: false,
//         message: "You do not have permission to edit attendance",
//       });
//     }

//     /* ---------- 2. Validate input ---------- */
//     if (!isRealDate(date)) {
//       return res.status(400).json({ success: false, message: "Date must be a valid YYYY-MM-DD" });
//     }
//     if (date > dateKey()) {
//       return res.status(400).json({ success: false, message: "Cannot edit a future date" });
//     }
//     if (status !== undefined && !ATTENDANCE_STATUS.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Status must be one of: ${ATTENDANCE_STATUS.join(", ")}`,
//       });
//     }
//     if (status === undefined && checkIn === undefined && checkOut === undefined) {
//       return res.status(400).json({
//         success: false,
//         message: "Send at least one of status, checkIn or checkOut",
//       });
//     }

//     // undefined = leave unchanged, null = clear, Date = set
//     let inTime;
//     let outTime;

//     if (checkIn !== undefined) {
//       if (checkIn === null || checkIn === "") inTime = null;
//       else {
//         inTime = toDate(date, checkIn);
//         if (!inTime) {
//           return res.status(400).json({ success: false, message: "checkIn must be HH:mm or an ISO date" });
//         }
//       }
//     }
//     if (checkOut !== undefined) {
//       if (checkOut === null || checkOut === "") outTime = null;
//       else {
//         outTime = toDate(date, checkOut);
//         if (!outTime) {
//           return res.status(400).json({ success: false, message: "checkOut must be HH:mm or an ISO date" });
//         }
//       }
//     }

//     if (inTime && dateKey(inTime) !== date) {
//       return res.status(400).json({ success: false, message: "Check-in must be on the selected date" });
//     }
//     if (outTime && dateKey(outTime) !== date) {
//       return res.status(400).json({ success: false, message: "Check-out must be on the selected date" });
//     }
//     if (status && NO_TIME_STATUSES.includes(status) && (inTime || outTime)) {
//       return res.status(400).json({
//         success: false,
//         message: `${status} cannot have check-in or check-out times`,
//       });
//     }

//     /* ---------- 3. Target employee + scope ---------- */
//     const employee = await Employee.findOne({ employeeId, isActive: true }).select(
//       "employeeId department"
//     );
//     if (!employee) {
//       return res.status(404).json({ success: false, message: "Employee not found" });
//     }

//     if (isLeader) {
//       if (employee.employeeId === req.user.employeeId) {
//         return res.status(403).json({
//           success: false,
//           message: "Team leaders cannot edit their own attendance",
//         });
//       }
//       if (employee.department !== req.user.department) {
//         return res.status(403).json({ success: false, message: "Not your team" });
//       }
//     }

//     /* ---------- 4. Load or create the day's record ---------- */
//     let rec = await Attendance.findOne({ employeeId, dateKey: date });
//     const isNew = !rec;

//     if (isNew) {
//       if (!status && !inTime) {
//         return res.status(400).json({
//           success: false,
//           message: "No record exists for this day. Send a status or a check-in time to create it",
//         });
//       }
//       rec = new Attendance({
//         employeeId,
//         department: employee.department,
//         dateKey: date,
//         status: status ?? "Present", // corrected below if a check-in time is given
//       });
//     }

//     /* ---------- 5. Apply changes ---------- */
//     if (inTime !== undefined) rec.checkIn = inTime ?? undefined;
//     if (outTime !== undefined) rec.checkOut = outTime ?? undefined;

//     // Absent or Leave means no working times.
//     if (status && NO_TIME_STATUSES.includes(status)) {
//       rec.checkIn = undefined;
//       rec.checkOut = undefined;
//     }

//     if (rec.checkOut && !rec.checkIn) {
//       return res.status(400).json({
//         success: false,
//         message: "Set a check-in time before a check-out time",
//       });
//     }
//     if (rec.checkIn && rec.checkOut && rec.checkOut < rec.checkIn) {
//       return res.status(400).json({ success: false, message: "Check-out must be after check-in" });
//     }

//     // Status: an explicit value wins. Otherwise a new check-in time decides Late or Present.
//     if (status) {
//       rec.status = status;
//     } else if (inTime && rec.status !== "Half Day") {
//       rec.status = isLate(rec.checkIn) ? "Late" : "Present";
//     }

//     // Same rule as the normal check-out: a break still running is closed at check-out.
//     if (rec.checkOut) {
//       const open = rec.breaks.find((b) => !b.end);
//       if (open) open.end = rec.checkOut;
//     }

//     // The schema's pre-save hook calculates minutes when both times exist.
//     if (!rec.checkIn || !rec.checkOut) rec.workMinutes = 0;

//     // Audit fields
//     rec.source = "admin";
//     rec.markedBy = req.user.employeeId;
//     if (remarks !== undefined) rec.remarks = String(remarks).trim().slice(0, 300);

//     await rec.save();

//     return res.status(200).json({
//       success: true,
//       message: isNew ? "Attendance created" : "Attendance updated",
//       data: rec,
//     });
//   } catch (error) {
//     if (error.name === "ValidationError") {
//       return res.status(400).json({ success: false, message: error.message });
//     }
//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "This record was just created by someone else. Try again",
//       });
//     }
//     console.error("Update attendance error:", error);
//     return res.status(500).json({ success: false, message: "Unable to update attendance" });
//   }
// };




import Attendance, { ATTENDANCE_STATUS } from "../models/attendanceperday.js";
import Employee from "../models/employee.js";
import { isLate, dateKey } from "../utils/time.js";
import { roleKey, FULL_ACCESS, LEADER_ROLES } from "../utils/roles.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:30" (24h, IST)
const NO_TIME_STATUSES = ["Absent", "Leave"];

const REMARKS_REQUIRED = true; // set false if remarks should be optional
const REMARKS_MIN = 3;
const REMARKS_MAX = 300;
const MAX_BULK = 200; // max records per bulk request


const isRealDate = (s) => {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// "HH:mm" is read as IST on the given date. Anything else must be a valid ISO string.
const toDate = (date, value) => {
  if (typeof value === "string" && TIME_RE.test(value)) {
    return new Date(`${date}T${value}:00+05:30`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// undefined = leave unchanged, null = clear, Date = set
const parseTime = (date, raw, label) => {
  if (raw === undefined) return { value: undefined };
  if (raw === null || raw === "") return { value: null };
  const d = toDate(date, raw);
  if (!d) return { error: `${label} must be HH:mm or an ISO date` };
  if (dateKey(d) !== date) return { error: `${label} must be on the selected date` };
  return { value: d };
};

// Who is making the change (taken from the logged-in account, never from the body).
const getActor = (user) => {
  const role = roleKey(user.role);
  return {
    employeeId: user.employeeId,
    name: user.name ?? user.fullName ?? "",
    role: user.role,
    department: user.department,
    isFull: FULL_ACCESS.includes(role),
    isLeader: LEADER_ROLES.includes(role),
  };
};

const snapshot = (r) => ({
  status: r.status,
  checkIn: r.checkIn ?? null,
  checkOut: r.checkOut ?? null,
});

/**
 * Validates one change request (pure, no DB).
 * Returns { error } or { changes: { status, inTime, outTime, remarks } }.
 */
const parseChanges = (date, body) => {
  if (!isRealDate(date)) return { error: "Date must be a valid YYYY-MM-DD" };
  if (date > dateKey()) return { error: "Cannot edit a future date" };

  const status = body.status === "" ? undefined : body.status;
  if (status !== undefined && !ATTENDANCE_STATUS.includes(status)) {
    return { error: `Status must be one of: ${ATTENDANCE_STATUS.join(", ")}` };
  }
  if (status === undefined && body.checkIn === undefined && body.checkOut === undefined) {
    return { error: "Send at least one of status, checkIn or checkOut" };
  }

  const inRes = parseTime(date, body.checkIn, "Check-in");
  if (inRes.error) return { error: inRes.error };
  const outRes = parseTime(date, body.checkOut, "Check-out");
  if (outRes.error) return { error: outRes.error };
  const inTime = inRes.value;
  const outTime = outRes.value;

  if (status && NO_TIME_STATUSES.includes(status) && (inTime || outTime)) {
    return { error: `${status} cannot have check-in or check-out times` };
  }

  let remarks;
  if (body.remarks !== undefined && body.remarks !== null) {
    remarks = String(body.remarks).trim().slice(0, REMARKS_MAX);
  }
  if (REMARKS_REQUIRED && (!remarks || remarks.length < REMARKS_MIN)) {
    return { error: `Remarks are required (min ${REMARKS_MIN} characters)` };
  }

  return { changes: { status, inTime, outTime, remarks } };
};

// Can this actor edit this employee?
const checkScope = (actor, employee) => {
  if (actor.isFull) return null;
  if (actor.isLeader) {
    if (employee.employeeId === actor.employeeId) {
      return { code: 403, message: "Team leaders cannot edit their own attendance" };
    }
    if (employee.department !== actor.department) {
      return { code: 403, message: "Not your team" };
    }
    return null;
  }
  return { code: 403, message: "You do not have permission to edit attendance" };
};

/**
 * Loads/creates the day's record, applies the changes, stamps the audit fields, saves.
 * Returns { ok: true, isNew, rec } or { ok: false, code, message }.
 */
const applyChange = async ({ actor, employee, date, changes }) => {
  const { status, inTime, outTime, remarks } = changes;
  const { employeeId } = employee;

  let rec = await Attendance.findOne({ employeeId, dateKey: date });
  const isNew = !rec;

  if (isNew) {
    if (!status && !inTime) {
      return {
        ok: false,
        code: 400,
        message: "No record exists for this day. Send a status or a check-in time to create it",
      };
    }
    rec = new Attendance({
      employeeId,
      department: employee.department,
      dateKey: date,
      status: status ?? "Present", // corrected below if a check-in time is given
    });
  }

  const before = isNew ? null : snapshot(rec);

  /* ---- apply times ---- */
  if (inTime !== undefined) rec.checkIn = inTime ?? undefined;
  if (outTime !== undefined) rec.checkOut = outTime ?? undefined;

  // Absent or Leave means no working times.
  if (status && NO_TIME_STATUSES.includes(status)) {
    rec.checkIn = undefined;
    rec.checkOut = undefined;
  }

  if (rec.checkOut && !rec.checkIn) {
    return { ok: false, code: 400, message: "Set a check-in time before a check-out time" };
  }
  if (rec.checkIn && rec.checkOut && rec.checkOut < rec.checkIn) {
    return { ok: false, code: 400, message: "Check-out must be after check-in" };
  }

  /* ---- status: explicit value wins, else a new check-in decides Late/Present ---- */
  if (status) {
    rec.status = status;
  } else if (inTime && rec.status !== "Half Day") {
    rec.status = isLate(rec.checkIn) ? "Late" : "Present";
  }

  // Same rule as the normal check-out: a break still running is closed at check-out.
  if (rec.checkOut) {
    const open = rec.breaks.find((b) => !b.end);
    if (open) open.end = rec.checkOut;
  }

  // The schema's pre-save hook calculates minutes when both times exist.
  if (!rec.checkIn || !rec.checkOut) rec.workMinutes = 0;

  /* ---- audit: who, when, why ---- */
  rec.source = "admin";
  rec.markedBy = actor.employeeId;
  rec.markedByName = actor.name;
  rec.markedByRole = actor.role;
  rec.markedAt = new Date();
  if (remarks !== undefined) rec.remarks = remarks;

  // Full history of edits (only if the schema has the editLog field).
  if (Attendance.schema.path("editLog")) {
    rec.editLog.push({
      at: rec.markedAt,
      by: actor.employeeId,
      byName: actor.name,
      byRole: actor.role,
      remarks: remarks ?? "",
      before,
      after: snapshot(rec),
    });
  }

  await rec.save();
  return { ok: true, isNew, rec };
};

// Turns thrown DB errors into { code, message }.
const mapError = (error) => {
  if (error.name === "ValidationError") return { code: 400, message: error.message };
  if (error.code === 11000) {
    return { code: 409, message: "This record was just created by someone else. Try again" };
  }
  console.error("Update attendance error:", error);
  return { code: 500, message: "Unable to update attendance" };
};

/* ================================================================== */
/* PATCH /api/attendance/employee/:employeeId/:date                   */
/*                                                                    */

export const updateAttendance = async (req, res) => {
  try {
    const actor = getActor(req.user);
    if (!actor.isFull && !actor.isLeader) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit attendance",
      });
    }

    const { employeeId, date } = req.params;
    const parsed = parseChanges(date, req.body ?? {});
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const employee = await Employee.findOne({ employeeId, isActive: true }).select(
      "employeeId department"
    );
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const denied = checkScope(actor, employee);
    if (denied) return res.status(denied.code).json({ success: false, message: denied.message });

    const result = await applyChange({ actor, employee, date, changes: parsed.changes });
    if (!result.ok) {
      return res.status(result.code).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.isNew ? "Attendance created" : "Attendance updated",
      data: result.rec,
    });
  } catch (error) {
    const { code, message } = mapError(error);
    return res.status(code).json({ success: false, message });
  }
};


export const bulkUpdateAttendance = async (req, res) => {
  try {
    const actor = getActor(req.user);
    if (!actor.isFull && !actor.isLeader) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit attendance",
      });
    }

    const body = req.body ?? {};
    const { records, employeeIds, ...defaults } = body;

    let rows;
    if (Array.isArray(records)) {
      rows = records.map((r) => ({ ...defaults, ...r }));
    } else if (Array.isArray(employeeIds)) {
      rows = employeeIds.map((employeeId) => ({ ...defaults, employeeId }));
    } else {
      return res.status(400).json({
        success: false,
        message: "Send either employeeIds (with date/status/times) or records[]",
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "No employees selected" });
    }
    if (rows.length > MAX_BULK) {
      return res.status(400).json({
        success: false,
        message: `Too many records. Maximum ${MAX_BULK} per request`,
      });
    }

    // Load all target employees in one query.
    const ids = [...new Set(rows.map((r) => r.employeeId).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: ids }, isActive: true }).select(
      "employeeId department"
    );
    const empMap = new Map(employees.map((e) => [e.employeeId, e]));

    const results = [];
    const seen = new Set();

    for (const row of rows) {
      const { employeeId, date } = row;
      const out = { employeeId, date };

      try {
        if (!employeeId) {
          results.push({ ...out, success: false, message: "employeeId is missing" });
          continue;
        }

        const key = `${employeeId}|${date}`;
        if (seen.has(key)) {
          results.push({ ...out, success: false, message: "Duplicate row in request" });
          continue;
        }
        seen.add(key);

        const parsed = parseChanges(date, row);
        if (parsed.error) {
          results.push({ ...out, success: false, message: parsed.error });
          continue;
        }

        const employee = empMap.get(employeeId);
        if (!employee) {
          results.push({ ...out, success: false, message: "Employee not found" });
          continue;
        }

        const denied = checkScope(actor, employee);
        if (denied) {
          results.push({ ...out, success: false, message: denied.message });
          continue;
        }

        const result = await applyChange({ actor, employee, date, changes: parsed.changes });
        if (!result.ok) {
          results.push({ ...out, success: false, message: result.message });
          continue;
        }

        results.push({
          ...out,
          success: true,
          message: result.isNew ? "Attendance created" : "Attendance updated",
          data: {
            status: result.rec.status,
            checkIn: result.rec.checkIn ?? null,
            checkOut: result.rec.checkOut ?? null,
            workMinutes: result.rec.workMinutes,
            remarks: result.rec.remarks,
            markedBy: result.rec.markedBy,
            markedByName: result.rec.markedByName,
          },
        });
      } catch (err) {
        results.push({ ...out, success: false, message: mapError(err).message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;

    return res.status(succeeded === 0 ? 400 : 200).json({
      success: succeeded > 0,
      message:
        failed === 0
          ? `${succeeded} attendance record(s) saved`
          : `${succeeded} saved, ${failed} failed`,
      summary: { total: results.length, succeeded, failed },
      results,
    });
  } catch (error) {
    const { code, message } = mapError(error);
    return res.status(code).json({ success: false, message });
  }
};

