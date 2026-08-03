"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, authStore } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const { body } = await apiRequest("/account/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (body?.succeeded && body?.accessToken) {
      authStore.setToken(body.accessToken);
      router.push("/home");
      return;
    }
    setError(body?.errorMessage || "Signup failed");
  };

  return (
    <div className="card">
      <h2>Sign Up</h2>
      <form onSubmit={submit}>
        <input placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
        <input placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <input
          placeholder="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />
        <button type="submit">Create account</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

