import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const createRandomToken = () => crypto.randomBytes(32).toString("base64");

export const createBrowserIdentifier = () => crypto.randomBytes(16).toString("base64");

export const createAccessToken = ({ user, refreshToken }) => {
  const claims = user.role === "admin" ? ["Admin:Admin"] : [];
  return jwt.sign(
    {
      nameid: user._id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      role: user.role,
      isPersistent: refreshToken?.rememberMe ? "true" : "false",
      sessionLockEnabled: user.sessionLockEnabled ? "true" : "false",
      claims,
      usertype: user.role === "admin" ? "0" : "1",
      isSessionLocked: refreshToken?.isSessionLocked ? "true" : "false"
    },
    env.jwtSecret,
    {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      expiresIn: `${env.accessTokenExpiryHours}h`
    }
  );
};

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwtSecret, {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience
  });

