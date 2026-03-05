"use client";

import { useSession } from "next-auth/react";
import { setAuthToken } from "@/lib/api";

export function AuthTokenSetter() {
  const { data: session } = useSession();
  const token = (session as unknown as { accessToken?: string })?.accessToken;
  if (typeof window !== "undefined" && token) {
    (window as unknown as { __NEXT_AUTH_TOKEN?: string }).__NEXT_AUTH_TOKEN =
      token;
    setAuthToken(token);
  }
  return null;
}
