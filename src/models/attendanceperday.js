import mongoose from "mongoose";

export const ATTENDANCE_STATUS = ["Present", "Late", "Absent", "Leave", "Half Day"];

const breakSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || v >= this.start;
        },
        message: "Break end must be after break start",
      },
    },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, trim: true },
    department: { type: String, trim: true },

    // Format: YYYY-MM-DD, generated in Asia/Kolkata timezone
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "dateKey must be YYYY-MM-DD"],
    },

    checkIn: Date,
    checkOut: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || !this.checkIn || v >= this.checkIn;
        },
        message: "Check-out must be after check-in",
      },
    },

    breaks: [breakSchema],
    workMinutes: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ATTENDANCE_STATUS, required: true },

    checkInPhoto: String,

    markedBy: { type: String },                     
    source: { type: String, enum: ["self", "admin", "biometric"], default: "self" },
  },
  { timestamps: true }
);

// One record per employee per day (also covers employeeId-only queries)
attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true });
// Daily / department reports
attendanceSchema.index({ dateKey: 1, department: 1 });



// Auto-calculate work minutes
attendanceSchema.pre("save", function () {
  if (this.checkIn && this.checkOut) {
    const breakMs = (this.breaks || []).reduce(
      (sum, b) => (b.start && b.end ? sum + (b.end - b.start) : sum),
      0
    );
    const total = this.checkOut - this.checkIn - breakMs;
    this.workMinutes = Math.max(0, Math.round(total / 60000));
  }
});

const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export default Attendance;

