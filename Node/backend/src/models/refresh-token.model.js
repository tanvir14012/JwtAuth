import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenString: { type: String, required: true, unique: true, index: true },
    isSessionLocked: { type: Boolean, default: false },
    createTime: { type: Date, required: true },
    expiry: { type: Date, required: true },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    browserIdentifier: { type: String, default: null },
    rememberMe: { type: Boolean, default: false },
    rememberMeUntil: { type: Date, default: null },
    isRevoked: { type: Boolean, default: false },
    revokeTime: { type: Date, default: null },
    revokeReason: { type: String, default: null },
    revokedByIp: { type: String, default: null },
    revokedByUserAgent: { type: String, default: null },
    rotatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "RefreshToken", default: null }
  },
  { timestamps: false }
);

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

