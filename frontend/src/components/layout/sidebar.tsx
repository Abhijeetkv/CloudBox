"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  UploadCloud,
  Cpu,
  Settings,
  LogOut,
  Cloud,
  X,
  User,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useFiles, useStorageUsage } from "@/hooks/use-files";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "My Files", icon: Folder },
  { href: "/upload", label: "Direct Upload", icon: UploadCloud },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: files = [] } = useFiles();
  const { data: storageUsage } = useStorageUsage();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const totalBytes = storageUsage?.used ?? files.reduce((acc, f) => acc + f.size, 0);
  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
  const quotaPercent = (storageUsage?.percentage ?? Math.min(100, (totalBytes / (50 * 1024 * 1024 * 1024)) * 100)).toFixed(1);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 lg:static lg:translate-x-0 h-full overflow-hidden shrink-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-500/20">
              <Cloud className="h-4.5 w-4.5 fill-white/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                CloudBox
              </span>
              <span className="rounded-full bg-sky-50 border border-sky-200/80 px-2 py-0.5 text-[10px] font-semibold text-sky-600">
                Drive
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-slate-400"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 min-h-0 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item, index) => {
            const isActive =
              item.label === "Dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href && pathname !== "/dashboard";

            return (
              <Link
                key={`${item.href}-${index}`}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-sky-50 text-sky-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-sky-600" : "text-slate-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Storage Quota & User Profile */}
        <div className="border-t border-slate-100 p-3 space-y-3 shrink-0">
          {/* Storage Quota Card */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-medium text-slate-600">Storage Used</span>
              <span className="font-semibold text-sky-600">{quotaPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>{totalGB} GB</span>
              <span>50.0 GB</span>
            </div>
          </div>

          {/* User Profile Row */}
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white font-semibold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user?.email ? user.email.split("@")[0] : "User"}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {user?.email || "Personal Drive"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
