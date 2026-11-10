// import  mongoose  from "mongoose";

// const attendanceSchema = new mongoose.Schema({
//   employeeId: { type: String, required: true, index: true }, 
//   department: String,
//   dateKey: { type: String, required: true },                 
//   checkIn: Date,
//   checkOut: Date,
//   breaks: [{ start: Date, end: Date }],
//   workMinutes: { type: Number, default: 0 },
//   status: { type: String, enum: ["Present", "Late", "Absent", "Leave", "Half Day"], default: "Present" },
//   checkInPhoto: String,

//   markedBy: String,                                           // who marked it
// }, { timestamps: true });

// // prevents double check-in on the same day
// attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true });

// const  Attendance = mongoose.model("Attendance", attendanceSchema);


// export default Attendance;



import mongoose from "mongoose";

const breakSchema = new mongoose.Schema(
  {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true
    },

    department: {
      type: String,
      default: ""
    },

    dateKey: {
      type: String,
      required: true
    },

    checkIn: {
      type: Date,
      default: null
    },

    checkOut: {
      type: Date,
      default: null
    },

    breaks: {
      type: [breakSchema],
      default: []
    },

    workMinutes: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: ["Present", "Late", "Absent", "Leave", "Half Day"],
      default: "Present"
    },

    checkInPhoto: {
      type: String,
      default: ""
    },

    markedBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// One employee can have only one attendance record per date.
attendanceSchema.index(
  { employeeId: 1, dateKey: 1 },
  { unique: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
