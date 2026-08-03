"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest, authStore } from "../../lib/api";

export default function UnlockSessionPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const { body } = await apiRequest("/account/unlockSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: password })
    });

    if (body?.unlockSuccess && body?.accessToken) {
      authStore.setToken(body.accessToken);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirectURL") || "/home";
      router.push(redirectUrl);
      return;
    }
    if (body?.signedOut) {
      authStore.clear();
      router.push("/sign-in");
      return;
    }
    setError(body?.errorMessage || "Unlock failed");
  };

  return (
    <div className="card">
      <h2>Unlock Session</h2>
      <form onSubmit={submit}>
        <input
          type="password"
          placeholder="Account password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Unlock</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

