import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jwtauth",
  jwtIssuer: process.env.JWT_ISSUER || "http://localhost:4000",
  jwtAudience: process.env.JWT_AUDIENCE || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  accessTokenExpiryHours: Number(process.env.ACCESS_TOKEN_EXPIRY_HOURS || 8),
  refreshTokenExpiryHours: Number(process.env.REFRESH_TOKEN_EXPIRY_HOURS || 720),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123",
  adminFirstName: process.env.ADMIN_FIRST_NAME || "John",
  adminLastName: process.env.ADMIN_LAST_NAME || "Doe"
};

export const cookieNames = {
  refreshToken: "refreshToken",
  browserIdentifier: "browserIdentifier"
};

