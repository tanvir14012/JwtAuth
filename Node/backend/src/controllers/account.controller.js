import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { User } from "../models/user.model.js";
import { RefreshToken } from "../models/refresh-token.model.js";
import { cookieNames, env } from "../config/env.js";
import {
  createAccessToken,
  createBrowserIdentifier,
  createRandomToken
} from "../services/auth-token.service.js";
import { patterns } from "../utils/validators.js";

const failedLoginLockMinutes = 5;
const maxFailedLoginAttempts = 10;

const cookieOptions = (hours) => ({
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  expires: new Date(Date.now() + hours * 60 * 60 * 1000)
});

const requestInfo = (req) => ({
  ip: req.ip,
  userAgent: req.get("user-agent") || ""
});

const setRefreshCookies = (res, refreshToken, browserIdentifier) => {
  res.cookie(cookieNames.refreshToken, refreshToken, cookieOptions(env.refreshTokenExpiryHours));
  if (browserIdentifier) {
    res.cookie(cookieNames.browserIdentifier, browserIdentifier, cookieOptions(24 * 365));
  }
};

const clearRefreshCookies = (res) => {
  res.clearCookie(cookieNames.refreshToken);
  res.clearCookie(cookieNames.browserIdentifier);
};

const rotateRefreshToken = async (tokenDoc, reqInfo) => {
  tokenDoc.isRevoked = true;
  tokenDoc.revokeTime = new Date();
  tokenDoc.revokeReason = "Rotation";
  tokenDoc.revokedByIp = reqInfo.ip;
  tokenDoc.revokedByUserAgent = reqInfo.userAgent;
  await tokenDoc.save();

  const newToken = await RefreshToken.create({
    userId: tokenDoc.userId,
    tokenString: createRandomToken(),
    isSessionLocked: tokenDoc.isSessionLocked,
    createTime: new Date(),
    expiry: new Date(Date.now() + env.refreshTokenExpiryHours * 60 * 60 * 1000),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
    browserIdentifier: tokenDoc.browserIdentifier,
    rememberMe: tokenDoc.rememberMe,
    rememberMeUntil: tokenDoc.rememberMeUntil || null,
    rotatedBy: tokenDoc._id
  });

  return newToken;
};

const createAuthTokens = async ({ user, rememberMe, reqInfo }) => {
  const browserIdentifier = rememberMe ? createBrowserIdentifier() : null;
  const refreshToken = await RefreshToken.create({
    userId: user._id,
    tokenString: createRandomToken(),
    isSessionLocked: false,
    createTime: new Date(),
    expiry: new Date(Date.now() + env.refreshTokenExpiryHours * 60 * 60 * 1000),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
    browserIdentifier,
    rememberMe
  });

  const accessToken = createAccessToken({ user, refreshToken });
  return { accessToken, refreshToken, browserIdentifier };
};

export const signUp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firstName = "", lastName = "", email = "", password = "" } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.json({
      succeeded: false,
      errorMessage: `A user already exists with email ${normalizedEmail}`
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user"
  });

  const reqInfo = requestInfo(req);
  const tokens = await createAuthTokens({ user, rememberMe: true, reqInfo });
  setRefreshCookies(res, tokens.refreshToken.tokenString, tokens.browserIdentifier);

  return res.json({
    succeeded: true,
    accessToken: tokens.accessToken
  });
};

export const signIn = async (req, res) => {
  const { email = "", password = "", rememberMe = false } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.json({
      succeeded: false,
      validationFailed: true,
      errorMessage: "Email and password are required"
    });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.json({
      succeeded: false,
      errorMessage: "Incorrect email or password"
    });
  }

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const waitMinutes = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
    return res.json({
      succeeded: false,
      accountLocked: true,
      errorMessage: `Your account has been locked temporarily because of too many failed login attempts. Please try again after ${waitMinutes} minutes`
    });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    user.failedSignInAttempts += 1;
    if (user.failedSignInAttempts >= maxFailedLoginAttempts) {
      user.lockoutUntil = new Date(Date.now() + failedLoginLockMinutes * 60 * 1000);
      user.failedSignInAttempts = 0;
    }
    await user.save();
    return res.json({
      succeeded: false,
      errorMessage: "Incorrect email or password"
    });
  }

  user.failedSignInAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  const reqInfo = requestInfo(req);
  const tokens = await createAuthTokens({ user, rememberMe: Boolean(rememberMe), reqInfo });
  setRefreshCookies(res, tokens.refreshToken.tokenString, tokens.browserIdentifier);

  return res.json({
    succeeded: true,
    accessToken: tokens.accessToken
  });
};

export const refreshUserTokens = async (req, res) => {
  const refreshToken = req.cookies[cookieNames.refreshToken];
  const browserIdentifier = req.cookies[cookieNames.browserIdentifier];

  if (!refreshToken) {
    clearRefreshCookies(res);
    return res.json({ refreshSucceeded: false, signedOut: true });
  }

  const tokenDoc = await RefreshToken.findOne({ tokenString: refreshToken }).populate("userId");
  if (!tokenDoc || !tokenDoc.userId || tokenDoc.isRevoked || tokenDoc.expiry < new Date()) {
    clearRefreshCookies(res);
    return res.json({ refreshSucceeded: false, signedOut: true });
  }

  if (tokenDoc.rememberMe && tokenDoc.browserIdentifier !== browserIdentifier) {
    tokenDoc.isRevoked = true;
    tokenDoc.revokeTime = new Date();
    tokenDoc.revokeReason = "Browser identifier mismatch";
    await tokenDoc.save();
    clearRefreshCookies(res);
    return res.json({ refreshSucceeded: false, signedOut: true });
  }

  const reqInfo = requestInfo(req);
  const newToken = await rotateRefreshToken(tokenDoc, reqInfo);
  const accessToken = createAccessToken({ user: tokenDoc.userId, refreshToken: newToken });
  setRefreshCookies(res, newToken.tokenString, newToken.browserIdentifier);

  return res.json({
    refreshSucceeded: true,
    signedOut: false,
    isSessionLocked: newToken.isSessionLocked,
    accessToken
  });
};

export const checkAccessTokenValidity = async (_req, res) => res.json({ ok: true });

export const isAdmin = async (req, res) => res.json(req.user.role === "admin");

export const changePassword = async (req, res) => {
  const { oldPassword = "", newPassword = "" } = req.body;
  if (!patterns.password.test(oldPassword) || !patterns.password.test(newPassword)) {
    return res.status(400).json({ err: ["Password validation failed"] });
  }

  const user = req.user;
  const validOldPassword = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!validOldPassword) {
    return res.json(false);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  return res.json(true);
};

export const resetPassword = async (req, res) => {
  const { userId = "", password = "" } = req.body;
  if (!patterns.password.test(password)) {
    return res.status(400).json({ err: ["Password validation failed"] });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.json(false);
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  return res.json(true);
};

export const signOut = async (req, res) => {
  const refreshToken = req.cookies[cookieNames.refreshToken];
  if (refreshToken) {
    const tokenDoc = await RefreshToken.findOne({ tokenString: refreshToken, userId: req.user._id });
    if (tokenDoc) {
      tokenDoc.isRevoked = true;
      tokenDoc.revokeTime = new Date();
      tokenDoc.revokeReason = "Sign-out";
      await tokenDoc.save();
    }
  }
  clearRefreshCookies(res);
  return res.json({ ok: true });
};

export const lockSession = async (req, res) => {
  const refreshToken = req.cookies[cookieNames.refreshToken];
  const browserIdentifier = req.cookies[cookieNames.browserIdentifier];

  if (!refreshToken) {
    return res.json({ isSessionLocked: false, isSignedOut: true, errorMessage: "Empty refresh token given" });
  }

  const tokenDoc = await RefreshToken.findOne({
    tokenString: refreshToken,
    userId: req.user._id,
    browserIdentifier
  });

  if (!tokenDoc) {
    return res.json({ isSessionLocked: false, isSignedOut: true, errorMessage: "Token not found" });
  }

  if (!req.user.sessionLockEnabled) {
    return res.json({ isSessionLocked: false, isSignedOut: false, errorMessage: "Session lock is not enabled" });
  }

  tokenDoc.isSessionLocked = true;
  await tokenDoc.save();
  const accessToken = createAccessToken({ user: req.user, refreshToken: tokenDoc });
  return res.json({ isSessionLocked: true, isSignedOut: false, accessToken });
};

export const unlockSession = async (req, res) => {
  const { value = "" } = req.body;
  if (!patterns.password.test(value)) {
    return res.json({ unlockSuccess: false, errorMessage: "Password is incorrect" });
  }

  const refreshToken = req.cookies[cookieNames.refreshToken];
  const browserIdentifier = req.cookies[cookieNames.browserIdentifier];
  const tokenDoc = await RefreshToken.findOne({
    tokenString: refreshToken,
    userId: req.user._id,
    browserIdentifier
  });

  if (!tokenDoc) {
    clearRefreshCookies(res);
    return res.json({ unlockSuccess: false, signedOut: true, errorMessage: "Token not found" });
  }

  const validPassword = await bcrypt.compare(value, req.user.passwordHash);
  if (!validPassword) {
    return res.json({ unlockSuccess: false, errorMessage: "Password is incorrect" });
  }

  tokenDoc.isSessionLocked = false;
  await tokenDoc.save();
  const accessToken = createAccessToken({ user: req.user, refreshToken: tokenDoc });
  return res.json({ unlockSuccess: true, signedOut: false, accessToken });
};

