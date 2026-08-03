"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest, authStore, getAuthStatus } from "../lib/api";

export default function Nav() {
  const router = useRouter();
  const auth = getAuthStatus();
  const isAuthenticated = Boolean(auth);
  const isAdmin = auth?.userType === "0";

  const signOut = async () => {
    await apiRequest("/account/signout", { method: "POST" });
    authStore.clear();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <nav className="nav">
      <Link href="/home">Home</Link>
      {isAuthenticated && <Link href="/profile">Profile</Link>}
      {isAuthenticated && <Link href="/change-password">Change Password</Link>}
      {isAuthenticated && isAdmin && <Link href="/users">Users</Link>}
      {isAuthenticated && isAdmin && <Link href="/reset-password">Reset Password</Link>}
      {!isAuthenticated && <Link href="/sign-in">Sign In</Link>}
      {!isAuthenticated && <Link href="/sign-up">Sign Up</Link>}
      {isAuthenticated && <button onClick={signOut}>Sign Out</button>}
    </nav>
  );
}

