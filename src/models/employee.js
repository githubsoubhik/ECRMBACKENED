import mongoose from 'mongoose';

import bcrypt from 'bcryptjs';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Work email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
  password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Prevents password from leaking in normal find() queries
    },
    
    role: {
        type: String,
        required: [true, "role is required"],
        enum: ['Super Admin', "Admin", "Hr", "employee", "staff"],

       },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['Social Media', 'Graphics Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Web Development'],
    },
    designation: {
      type: String,
      required: [true, 'Designation/Role is required'],
      trim: true,
    },

    // Stores only the relative path (e.g. "/uploads/avatar-123.png") or Firebase URL
    profileImage: {
      type: String,
      default: "",
    },

    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Probation', 'Inactive', 'Terminated'],
      default: 'Active',
    },

 
resetPasswordToken: {
  type: String,
  default: null,
},
resetPasswordExpire: {
  type: Date,
  default: null,
},
    // Useful for Team Leaders managing specific members
    teamLeaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);



// Auto-hash password before saving (Mongoose 7+ compatible)
employeeSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// verify password at login
employeeSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

employeeSchema.index({ department: 1, status: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;