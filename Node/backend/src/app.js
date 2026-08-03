import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import { env } from "./config/env.js";
import accountRoutes from "./routes/account.routes.js";
import profileRoutes from "./routes/profile.routes.js";

export const createApp = async () => {
  await mongoose.connect(env.mongodbUri);

  const app = express();
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true
    })
  );

  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/api/account", accountRoutes);
  app.use("/api/profile", profileRoutes);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use((err, _req, res, _next) => {
    if (err?.name === "MulterError") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  });

  return app;
};

