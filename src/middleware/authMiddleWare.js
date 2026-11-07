import jwt from "jsonwebtoken";
import Employee from "../models/employee.js";

export const protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || (req.headers.authorization || "").replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, message: "Not logged in." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // fails if fake or expired
    const user = await Employee.findById(decoded.id);          // fresh data from DB

    if (
      !user ||
      !user.isActive ||
      user.status === "Terminated" ||
      user.status === "Inactive"
    ) {
      return res.status(401).json({ success: false, message: "Account not found or disabled." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Use after protect, e.g. authorize("Admin", "HR")  (use your own role names)
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ success: false, message: "You do not have permission." });