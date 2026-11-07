import mongoose from "mongoose";

import dotenv from "dotenv";


const connectdb = async ()=> {
  try {

    console.log("...connecting");

    const uri = process.env.MONGO_URI;

        if (!uri) {
      throw new Error('MONGO_URI is missing from .env');
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('2. MongoDB connected successfully!');

  }catch(error){
    console.log("error", error);
  }
}

export default connectdb




