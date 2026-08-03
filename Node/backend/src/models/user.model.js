import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, maxlength: 25 },
    lastName: { type: String, trim: true, maxlength: 25 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 256 },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String, trim: true, maxlength: 15 },
    addressLine1: { type: String, trim: true, maxlength: 50 },
    addressLine2: { type: String, trim: true, maxlength: 50 },
    country: { type: String, trim: true, maxlength: 50 },
    profilePicUrl: { type: String, trim: true, maxlength: 500 },
    shortBio: { type: String, trim: true, maxlength: 1000 },
    sessionLockEnabled: { type: Boolean, default: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    failedSignInAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

