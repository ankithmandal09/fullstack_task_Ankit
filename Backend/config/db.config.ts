import mongoose from "mongoose";

const connectToDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected To DB");
  } catch (error) {
    if (error instanceof Error) {
      console.log("Error While Connecting To DB", error.message);
    } else {
      console.log("An unknown error occurred while connecting to DB");
    }
  }
};

export default connectToDB;
