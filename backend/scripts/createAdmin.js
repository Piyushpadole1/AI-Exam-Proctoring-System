/**
 * Create Teacher/Admin Account
 *
 * Usage:
 * node backend/scripts/createAdmin.js
 *
 * This script creates ONE teacher/admin account.
 * It does NOT delete students, exams, or questions.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

import User from "../models/userModel.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => {
    rl.question(question, resolve);
  });

async function createAdmin() {
  try {
    // Connect to the same MongoDB used by the application
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB.");

    const name = (await ask("Enter admin name: ")).trim();
    const email = (await ask("Enter admin email: ")).trim().toLowerCase();
    const password = await ask("Enter admin password: ");

    // Basic validation
    if (!name || !email || !password) {
      console.log("\nName, email and password are required.");
      return;
    }

    // Check if account already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log(`\nA user with ${email} already exists.`);
      console.log(`Current role: ${existingUser.role}`);
      return;
    }

    // IMPORTANT:
    // Do NOT bcrypt.hash() here.
    // userModel.js already hashes the password in its pre-save hook.
    const admin = await User.create({
      name,
      email,
      password,
      role: "teacher",
      isVerified: true,
      isApproved: true,
    });

    console.log("\n======================================");
    console.log("Teacher/Admin account created successfully.");
    console.log("======================================");
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Verified: ${admin.isVerified}`);
    console.log(`Approved: ${admin.isApproved}`);
    console.log("======================================\n");
  } catch (error) {
    console.error("\nFailed to create Teacher/Admin account:");
    console.error(error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();