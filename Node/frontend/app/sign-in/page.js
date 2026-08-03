"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, authStore } from "../../lib/api";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const { body } = await apiRequest("/account/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (body?.succeeded && body?.accessToken) {
      authStore.setToken(body.accessToken);
      router.push("/home");
      return;
    }
    setError(body?.errorMessage || "Signin failed");
  };

  return (
    <div className="card">
      <h2>Sign In</h2>
      <form onSubmit={submit}>
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={form.rememberMe}
            onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
          />{" "}
          Remember me
        </label>
        <button type="submit">Sign In</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

