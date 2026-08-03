import bcrypt from "bcryptjs";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { User } from "./models/user.model.js";

const seedAdmin = async () => {
  const adminEmail = env.adminEmail.toLowerCase().trim();
  const existing = await User.findOne({ email: adminEmail });
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await User.create({
    firstName: env.adminFirstName,
    lastName: env.adminLastName,
    email: adminEmail,
    passwordHash,
    role: "admin",
    sessionLockEnabled: true
  });
};

const bootstrap = async () => {
  const app = await createApp();
  await seedAdmin();

  app.listen(env.port, () => {
    process.stdout.write(`Backend running on http://localhost:${env.port}\n`);
  });
};

bootstrap().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exit(1);
});

