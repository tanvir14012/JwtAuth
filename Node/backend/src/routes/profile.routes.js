import { Router } from "express";
import {
  createUser,
  deleteUser,
  getAll,
  getDetails,
  updateDetails,
  updateDetailsByAdmin
} from "../controllers/profile.controller.js";
import { adminRequired } from "../middleware/admin.middleware.js";
import { authRequired, unlockedSessionRequired } from "../middleware/auth.middleware.js";
import { profileUpload } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/getDetails", authRequired, unlockedSessionRequired, getDetails);
router.post("/updateDetails", authRequired, unlockedSessionRequired, profileUpload.single("profilePicture"), updateDetails);
router.get("/getAll", authRequired, unlockedSessionRequired, adminRequired, getAll);
router.post("/createUser", authRequired, unlockedSessionRequired, adminRequired, profileUpload.single("profilePicture"), createUser);
router.delete("/deleteUser/:id", authRequired, unlockedSessionRequired, adminRequired, deleteUser);
router.post(
  "/updateDetailsByAdmin",
  authRequired,
  unlockedSessionRequired,
  adminRequired,
  profileUpload.single("profilePicture"),
  updateDetailsByAdmin
);

export default router;

