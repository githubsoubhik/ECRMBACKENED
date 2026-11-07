import express from 'express';
import { loginEmployee, logoutEmployee, getMe } from '../controller/authController.js';

import { protect } from '../middleware/authMiddleWare.js';

import rateLimit from 'express-rate-limit';


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                    // 10 attempts per IP
  message: { success: false, message: "Too many attempts. Try again later." },
});



// 1. Initialize the router
const loginrouter = express.Router();

// 2. Define the route
loginrouter.post("/login", loginLimiter, loginEmployee);   // public
loginrouter.post("/logout", logoutEmployee);               // public
loginrouter.get("/me", protect, getMe);                    // private


// 3. Export the router as default
export default loginrouter;