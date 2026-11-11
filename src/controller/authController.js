import Employee from "../models/employee.js";
import jwt from "jsonwebtoken";


// import dotenv from "dotenv";


// dotenv.config();


// const cookieOptions = () => ({


//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax", 
//   maxAge: 24*60*60*1000,
// }); 

const cookieOptions = () => ({
  httpOnly: true,
  // secure: process.env.COOKIE_SECURE === "true", // leave unset on http
    secure: process.env.COOKIE_SECURE === "true",
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});

const generateToken = (emp) => {
  return jwt.sign(
       {
      id: emp._id,
      employeeId: emp.employeeId,
      role: String(emp.role).toLowerCase(),
      department: emp.department,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const isBlocked = (emp) =>
  emp.isActive === false ||
  emp.status === "Terminated" ||
  emp.status === "Inactive";



// ---------- LOGIN ----------
export const loginEmployee = async (req, res) => {
  try {
    const { identifier, email, phone, employeeId, password } = req.body;
    const loginKey = String(identifier || email || phone || employeeId || "").trim();

    if (!loginKey || typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide your email/phone/employee ID and password.",
      });
    }

    const employee = await Employee.findOne({
      $or: [
        { email: loginKey.toLowerCase() },
        { phone: loginKey },
        { employeeId: loginKey.toUpperCase() },
      ],
    }).select("+password");

    // Check the password FIRST, with one message for "no user" and "wrong password"
    if (!employee || !(await employee.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Only someone with the correct password learns the account is blocked
    if (isBlocked(employee)) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact administration.",
      });
    }

    const token = generateToken(employee);
    res.cookie("token", token, cookieOptions());       // <-- the important change

    const data = employee.toObject();
    delete data.password;
    delete data.resetPasswordToken;
    delete data.resetPasswordExpire;

    return res.status(200).json({ success: true, message: "Login successful.", data });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Try again." });
  }
};


// ---------- LOGOUT ----------
export const logoutEmployee = (req, res) => {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({ success: true, message: "Logged out." });
};


export const getMe = (req, res) => {
  const data = req.user.toObject();
  delete data.password;
  delete data.resetPasswordToken;
  delete data.resetPasswordExpire;
  res.status(200).json({ success: true, data });
};

// const generateToken = (Employee) =>{
//     return jwt.sign(
//         {
//             id: Employee._id,
//             employeeId: Employee.employeeId,
//             role: Employee.role,
//         },
//         process.env.JWT_SECRET,
//         {expiresIn: '1d'}

//         );
// };


// //login Api

// export  const loginEmployee = async (req, res) => {
//     try {
//         const {identifier , email , phone ,  employeeId ,  password} = req.body;

//         const loginkey = (identifier || email || phone || employeeId || '').trim();

//         if(!loginkey || !password?.trim()){
            
//            return res.status(400).json({
//         success: false,
//         message: 'Please provide your email/phone/employee ID and password.',
//          });
//         }

//         const employee = await Employee.findOne({
//             $or: [
                
//                     {email : loginkey.toLowerCase()},
//                     {phone: loginkey},
//                     {employeeId: loginkey.toUpperCase()}, 
                
//             ],
//         }).select('+password');


//         if (!employee) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials.',
//       });
//     }
//   /// whether   employee active or   not 

//     if (!employee.isActive || employee.status === 'Terminated' || employee.status === 'Inactive') {
//       return res.status(403).json({
//         success: false,
//         message: 'Your account is inactive. Please contact administration.',
//       });
//     }


//     // Compare entered password with stored hashed password
//     const isMatch = await employee.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials.',
//       });
//     }


  
//     // now Generate JWT token
//     const token = generateToken(employee);


//     // Prepare response data (exclude password)
//     const employeeData = employee.toObject();
//     delete employeeData.password;
//     delete employeeData.resetPasswordToken;
//     delete employeeData.resetPasswordExpire;

//     return res.status(200).json({
//       success: true,
//       message: 'Login successful.',
//       token,
//       data: employeeData,
//     });



//  } catch (error){
//         console.log("error message" , error.message);
//     }
// }