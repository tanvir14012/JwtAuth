import { verifyAccessToken } from "../services/auth-token.service.js";
import { User } from "../models/user.model.js";

export const authRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.nameid);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const unlockedSessionRequired = (req, res, next) => {
  if (req.tokenPayload?.isSessionLocked === "true") {
    return res.status(423).json({ error: "Session locked" });
  }
  return next();
};

