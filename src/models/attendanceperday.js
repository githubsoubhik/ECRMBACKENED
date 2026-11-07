import  mongoose  from "mongoose";

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true }, 
  department: String,
  dateKey: { type: String, required: true },                 
  checkIn: Date,
  checkOut: Date,
  breaks: [{ start: Date, end: Date }],
  workMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ["Present", "Late", "Absent", "Leave", "Half Day"], default: "Present" },
  checkInPhoto: String,

  markedBy: String,                                           // who marked it
}, { timestamps: true });

// prevents double check-in on the same day
attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true });

const  Attendance = mongoose.model("Attendance", attendanceSchema);


export default Attendance;