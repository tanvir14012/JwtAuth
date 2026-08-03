"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ oldPassword: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password === form.oldPassword) {
      setError("New password must differ from old password");
      return;
    }

    const { body } = await apiRequest("/account/changePassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.password })
    });

    if (body === true) {
      setMessage("Password changed.");
      router.push("/profile");
      return;
    }
    setError("Password change failed.");
  };

  return (
    <div className="card">
      <h2>Change Password</h2>
      <form onSubmit={submit}>
        <input
          type="password"
          placeholder="Old password"
          value={form.oldPassword}
          onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
          required
        />
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
        <button type="submit">Update password</button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

