import { isAdmin } from "../utils/validators.js";

export const adminRequired = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
};

