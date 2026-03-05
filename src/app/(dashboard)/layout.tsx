"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AuthTokenSetter } from "@/components/AuthTokenSetter";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "VIEWER";

  return (
    <>
      <AuthTokenSetter />
      <Sidebar
        role={role}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? null}
      />
      <div className="pl-60">
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </>
  );
}
