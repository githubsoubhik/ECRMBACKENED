import Employee from '../models/employee.js';
import jwt from 'jsonwebtoken';

// Helper: Generate JWT Token
const generateToken = (employee) => {
  return jwt.sign(
    {
      id: employee._id,
      employeeId: employee.employeeId,
      role: employee.role,
    },
    process.env.JWT_SECRET || 'your_fallback_secret_key',
    { expiresIn: '7d' }
  );
};

// @desc    Register / Add New Employee
// @route   POST /api/employees/register
// @access  Public / Admin
export const registerEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      department,
      designation,
      joiningDate,
      status,
      teamLeaderId,
      isActive,
    } = req.body;

    // 1. Mandatory Schema Fields Validation
    if (
      !employeeId?.trim() ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !role?.trim() ||
      !department?.trim() ||
      !designation?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, firstName, lastName, email, password, role, department, and designation are all required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 2. Validate Enum Values
    const validRoles = ['Super Admin', 'Admin', 'Hr', 'employee', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${validRoles.join(', ')}`,
      });
    }

    const validDepartments = [
      'Social Media',
      'Graphics Design',
      'Marketing',
      'Sales',
      'HR',
      'Finance',
      'Web Development',
    ];
    if (!validDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Allowed: ${validDepartments.join(', ')}`,
      });
    }

    // 3. Duplicate Check (employeeId or email)
    const existingEmployee = await Employee.findOne({
      $or: [
        { employeeId: employeeId.trim().toUpperCase() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingEmployee) {
      const isIdMatch = existingEmployee.employeeId === employeeId.trim().toUpperCase();
      return res.status(409).json({
        success: false,
        message: isIdMatch ? 'Employee ID already exists.' : 'Work email already exists.',
      });
    }

    // 4. Resolve Image Path (Local Folder Upload or Firebase URL)
let profileImage = "";

if (req.profileImagePath) {
  profileImage = req.profileImagePath;
} else if (req.body.profileImage) {
  profileImage = req.body.profileImage.trim();
}
    // 5. Build Employee Document directly matching Schema
    const newEmployee = new Employee({
      employeeId: employeeId.trim().toUpperCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      password: password.trim(), // Automatically hashed by employeeSchema.pre("save")
      role,
      department,
      designation: designation.trim(),
      profileImage,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      status: status || 'Active',
      teamLeaderId: teamLeaderId || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    // 6. Save in MongoDB
    const savedEmployee = await newEmployee.save();

    // 7. Generate JWT Token
    const token = generateToken(savedEmployee);

    // 8. Prepare response (exclude password)
    const employeeResponse = savedEmployee.toObject();
    delete employeeResponse.password;

    return res.status(201).json({
      success: true,
      message: 'Employee registered successfully.',
      token,
      data: employeeResponse,
    });
  } catch (error) {
    // MongoDB duplicate key error fallback
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID or email already exists.',
      });
    }

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    console.error('Error in registerEmployee:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      error: error.message,
    });
  }
};

// @desc    Get All Employees
// @route   GET /api/employees
// @access  Protected
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('teamLeaderId', 'firstName lastName email designation')
      .sort({ createdAt: -1 });

      console.log("MongoDB employee data:", employees);

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
      
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employees.',
      error: error.message,
    });
  }
};