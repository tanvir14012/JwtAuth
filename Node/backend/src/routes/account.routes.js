import { Router } from "express";
import { body } from "express-validator";
import {
  changePassword,
  checkAccessTokenValidity,
  isAdmin,
  lockSession,
  refreshUserTokens,
  resetPassword,
  signIn,
  signOut,
  signUp,
  unlockSession
} from "../controllers/account.controller.js";
import { authRequired } from "../middleware/auth.middleware.js";
import { adminRequired } from "../middleware/admin.middleware.js";
import { patterns } from "../utils/validators.js";

const router = Router();

router.post(
  "/signup",
  [
    body("firstName").matches(patterns.name),
    body("lastName").optional({ values: "falsy" }).matches(patterns.name),
    body("email").isEmail().isLength({ max: 256 }),
    body("password").matches(patterns.password)
  ],
  signUp
);
router.post("/signin", signIn);
router.post("/refreshUserTokens", refreshUserTokens);
router.get("/checkAccessTokenValidity", authRequired, checkAccessTokenValidity);
router.get("/isAdmin", authRequired, isAdmin);
router.post("/changePassword", authRequired, changePassword);
router.post("/resetPassword", authRequired, adminRequired, resetPassword);
router.post("/signout", authRequired, signOut);
router.post("/lockSession", authRequired, lockSession);
router.post("/unlockSession", authRequired, unlockSession);

export default router;

