

  import cookieParser from "cookie-parser";   // <-- must be at the top with the other imports
  import express from 'express';
  import dotenv from 'dotenv';
  import connectdb from './src/db/connection.js';


  import loginrouter from './src/route/authRoute.js';

  import { protect } from './src/middleware/authMiddleWare.js';



  import path from 'path';

  import { fileURLToPath } from 'url';
  import emprouter from './src/route/employeeRoute.js';


  import attendanceRouter from "./src/route/attendanceRoute.js"

  import cors from 'cors';
  import helmet from 'helmet';






  dotenv.config();

  const app = express();
  const PORT = process.env.PORT || 5000;


  //image   file 


  const __filename = fileURLToPath(import.meta.url);

  const __dirname = path.dirname(__filename);




  app.use(cookieParser());

  // Middleware: parse JSON request bodies
  app.use(express.json({ limit: "10kb" }));


  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://192.168.200.161:3000',
      'http://10.2.0.2:3000/'

    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));





  // Home route
  app.get('/', (req, res) => {
    res.send('Server successfully running');
  });




  // Parse incoming form data.
  app.use(express.urlencoded({ extended: true }));


  // Serve uploaded images.
  app.use('/imageUploads', express.static(path.resolve('imageUploads')));

  //login

  // app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.use('/api/auth', loginrouter);
  
  //protect all   api....

  app.use("/api", protect);

  // Employee registration routes
  app.use('/api/regemployee', emprouter);

  // employee show route

  app.use('/api/getAllEmployee', emprouter);


 

// Attendance routes
app.use("/api/attendance", attendanceRouter);



  // Connect to MongoDB, then start Express
  const startServer = async () => {
    try {

    await  connectdb()

      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  };

  startServer();
