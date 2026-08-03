import fs from "fs";
import path from "path";
import multer from "multer";

const uploadPath = path.resolve(process.cwd(), "uploads", "profile-pics");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadPath),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${Date.now()}-${safeBase}${ext}`);
  }
});

const allowedExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".tiff"]);

export const profileUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedExt.has(ext));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

