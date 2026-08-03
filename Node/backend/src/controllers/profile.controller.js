import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { patterns, toProfileDto } from "../utils/validators.js";

const updateUserFromInput = (user, body, profilePicturePath) => {
  const map = [
    "firstName",
    "lastName",
    "email",
    "phoneNumber",
    "addressLine1",
    "addressLine2",
    "country",
    "shortBio"
  ];
  map.forEach((key) => {
    if (typeof body[key] === "string") {
      user[key] = body[key].trim();
    }
  });
  if (profilePicturePath) {
    user.profilePicUrl = profilePicturePath;
  }
};

const validateUserBody = (body, isCreate = false) => {
  if (isCreate && !body.firstName) return "First name is required";
  if (isCreate && !body.email) return "Email is required";
  if (body.firstName && !patterns.name.test(body.firstName)) return "First name should contain only letters";
  if (body.lastName && !patterns.name.test(body.lastName)) return "Last name should contain only letters";
  if (body.phoneNumber && !patterns.phone.test(body.phoneNumber)) return "Phone number is invalid";
  return null;
};

export const getDetails = async (req, res) => {
  return res.json(toProfileDto(req.user));
};

export const updateDetails = async (req, res) => {
  const error = validateUserBody(req.body, false);
  if (error) {
    return res.status(400).json([error]);
  }

  updateUserFromInput(req.user, req.body, req.file ? `/uploads/profile-pics/${req.file.filename}` : null);
  if (req.body.email) {
    req.user.email = req.body.email.trim().toLowerCase();
  }
  await req.user.save();
  return res.json(toProfileDto(req.user));
};

export const getAll = async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json(users.map(toProfileDto));
};

export const createUser = async (req, res) => {
  const error = validateUserBody(req.body, true);
  if (error) {
    return res.status(400).json([error]);
  }

  const email = (req.body.email || "").trim().toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json([`A user already exists with email ${email}`]);
  }

  const passwordHash = await bcrypt.hash("User@123", 10);
  const user = await User.create({
    firstName: (req.body.firstName || "").trim(),
    lastName: (req.body.lastName || "").trim(),
    email,
    passwordHash,
    phoneNumber: (req.body.phoneNumber || "").trim(),
    addressLine1: (req.body.addressLine1 || "").trim(),
    addressLine2: (req.body.addressLine2 || "").trim(),
    country: (req.body.country || "").trim(),
    shortBio: (req.body.shortBio || "").trim(),
    profilePicUrl: req.file ? `/uploads/profile-pics/${req.file.filename}` : "",
    role: "user"
  });

  return res.json(toProfileDto(user));
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return res.json(false);
  }

  if (user.profilePicUrl?.startsWith("/uploads/profile-pics/")) {
    const fsPath = path.resolve(process.cwd(), user.profilePicUrl.slice(1));
    if (fs.existsSync(fsPath)) {
      fs.unlinkSync(fsPath);
    }
  }
  await user.deleteOne();
  return res.json(true);
};

export const updateDetailsByAdmin = async (req, res) => {
  const { id } = req.body;
  const user = await User.findById(id);
  if (!user) {
    return res.status(400).json(["User not found"]);
  }

  const error = validateUserBody(req.body, false);
  if (error) {
    return res.status(400).json([error]);
  }

  updateUserFromInput(user, req.body, req.file ? `/uploads/profile-pics/${req.file.filename}` : null);
  if (req.body.email) {
    user.email = req.body.email.trim().toLowerCase();
  }
  await user.save();
  return res.json(toProfileDto(user));
};

