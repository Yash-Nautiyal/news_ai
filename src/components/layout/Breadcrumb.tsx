"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEGMENTS: Record<string, string> = {
  feed: "Live Feed",
  analytics: "Analytics",
  districts: "Districts",
  tv: "TV Monitor",
  alerts: "Alert History",
  reports: "Reports",
  keywords: "Keywords",
  upload: "Upload Clipping",
  admin: "Admin",
  users: "User Management",
  sources: "Source Management",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((segment, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const label = SEGMENTS[segment] ?? segment.replace(/-/g, " ");
    return { href, label };
  });

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600">
      <Link href="/feed" className="hover:text-slate-900">
        Home
      </Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-2">
          <span className="text-slate-400">/</span>
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-slate-900">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-slate-900">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
