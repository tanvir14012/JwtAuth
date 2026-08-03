"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthStatus } from "../../lib/api";

export default function HomePage() {
  const router = useRouter();
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const status = getAuthStatus();
    if (!status) {
      router.replace("/sign-in");
      return;
    }
    if (status.isSessionLocked) {
      router.replace("/unlock-session");
      return;
    }
    setAuth(status);
  }, [router]);

  if (!auth) return null;

  return (
    <div className="card">
      <h2>Home</h2>
      <p>You are signed in as <strong>{auth.userEmail}</strong>.</p>
    </div>
  );
}

