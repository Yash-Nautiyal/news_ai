import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { User } from "@/types";
import { MOCK_USERS } from "@/lib/mockData";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Frontend-only mock auth for local demos
        if (USE_MOCK_AUTH) {
          const user = MOCK_USERS.find((u) => u.email === credentials.email);
          if (!user) {
            throw new Error("Invalid credentials");
          }
          // Simple shared demo password
          if (credentials.password !== "password") {
            throw new Error("Invalid credentials");
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accessToken: `mock-token-${user.role.toLowerCase()}`,
          };
        }

        // Real backend auth
        try {
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { detail?: string }).detail ?? "Invalid credentials");
          }
          const data = (await res.json()) as {
            access_token: string;
            user: User;
          };
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            accessToken: data.access_token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as unknown as { accessToken?: string }).accessToken;
        token.role = (user as unknown as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id?: string }).id = token.id as string;
        (session.user as unknown as { role?: string }).role = token.role as string;
        (session as unknown as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
