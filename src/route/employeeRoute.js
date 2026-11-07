
import express from 'express';
import {registerEmployee} from '../controller/employeecontroller.js';

import {getAllEmployee} from '../controller/employee_show.js';

import { upload , processProfileImage} from '../middleware/uploadMiddleware.js';

const emprouter = express.Router();

// emprouter.post('/', upload.single('profileImage'), registerEmployee);


emprouter.post(
  "/",
  upload.single("profileImage"),
  processProfileImage,
  registerEmployee
);


emprouter.get('/', getAllEmployee);

export default emprouter;
