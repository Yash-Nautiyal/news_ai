"use client";

import { Breadcrumb } from "./Breadcrumb";

export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>Monitoring Active</span>
    </div>
  );
}

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <Breadcrumb />
      <div className="flex items-center gap-4">
        <LiveIndicator />
        <div className="text-sm text-slate-500">
          {new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>
      </div>
    </header>
  );
}
