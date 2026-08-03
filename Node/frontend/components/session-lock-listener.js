"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest, authStore, getAuthStatus } from "../lib/api";

const IDLE_MS = 5 * 60 * 1000;

export default function SessionLockListener() {
  const timerRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const auth = getAuthStatus();
        if (!auth || auth.isSessionLocked) return;
        const { body } = await apiRequest("/account/lockSession", { method: "POST" });
        if (body?.isSessionLocked && body?.accessToken) {
          authStore.setToken(body.accessToken);
          router.push(`/unlock-session?redirectURL=${encodeURIComponent(pathname)}`);
        }
      }, IDLE_MS);
    };

    const events = ["keydown", "mousemove", "mousedown", "click", "touchstart", "wheel"];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();

    return () => {
      events.forEach((event) => window.removeEventListener(event, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, router]);

  return null;
}

