"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, getAuthStatus } from "../../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ userId: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuthStatus();
    if (!auth) {
      router.replace("/sign-in");
      return;
    }
    if (auth.userType !== "0") {
      router.replace("/home");
      return;
    }

    apiRequest("/profile/getAll").then(({ body }) => setUsers(body || []));
  }, [router]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const { body } = await apiRequest("/account/resetPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: form.userId, password: form.password })
    });

    if (body === true) {
      setMessage("Password reset.");
      return;
    }
    setError("Password reset failed.");
  };

  return (
    <div className="card">
      <h2>Reset Password (Admin)</h2>
      <form onSubmit={submit}>
        <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
          <option value="">Select user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
        <input
          type="password"
          placeholder="New password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />
        <button type="submit">Reset</button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

