"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthStatus } from "../lib/api";

export default function IndexPage() {
  const router = useRouter();
  useEffect(() => {
    const auth = getAuthStatus();
    router.replace(auth ? "/home" : "/sign-in");
  }, [router]);
  return null;
}

