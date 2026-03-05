"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/feed", label: "Live Feed", icon: "📡" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/districts", label: "Districts", icon: "🗺️" },
  { href: "/tv", label: "TV Monitor", icon: "📺" },
  { href: "/alerts", label: "Alert History", icon: "🔔" },
  { href: "/reports", label: "Reports", icon: "📄" },
  { href: "/keywords", label: "Keywords", icon: "🔑", hideFor: "VIEWER" },
  { href: "/upload", label: "Upload Clipping", icon: "📤", hideFor: "VIEWER" },
  { href: "/admin/users", label: "Admin", icon: "⚙️", adminOnly: true },
] as const;

export function Sidebar({
  role,
  userName,
  userEmail,
}: {
  role: string;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const visible = NAV.filter((n) => {
    if (n.adminOnly && role !== "ADMIN") return false;
    if (n.hideFor === "VIEWER" && role === "VIEWER") return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-slate-200 bg-slate-900">
      <div className="flex h-14 items-center gap-2 border-b border-slate-700 px-4">
        <span className="text-lg font-semibold text-white">
          DIPR Media Monitor
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visible.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-medium text-white">
            {(userName ?? userEmail ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {userName ?? "User"}
            </p>
            <p className="truncate text-xs text-slate-400">{role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
