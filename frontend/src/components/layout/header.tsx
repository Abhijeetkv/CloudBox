"use client";

import { useState, useEffect } from "react";
import { Search, UploadCloud, User, Menu } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import api from "@/lib/api";

interface HeaderProps {
  onMenuClick: () => void;
  onUploadClick?: () => void;
  onSearchChange?: (query: string) => void;
}

export function Header({ onMenuClick, onUploadClick, onSearchChange }: HeaderProps) {
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [apiLatency, setApiLatency] = useState("0.8ms");
  const [redisStatus, setRedisStatus] = useState("ONLINE");

  useEffect(() => {
    // Ping API health to measure live latency
    const start = performance.now();
    api
      .get("/health")
      .then(() => {
        const diff = (performance.now() - start).toFixed(1);
        setApiLatency(`${diff}ms`);
        setRedisStatus("ONLINE");
      })
      .catch(() => {
        setApiLatency("offline");
        setRedisStatus("DEGRADED");
      });
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearchChange?.(e.target.value);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 lg:px-6">
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden mr-2 h-9 w-9 text-slate-500"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearch}
            placeholder="Search keys, prefixes, MIME types, or tags... (Press / to search)"
            className="h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50/50 pl-10 pr-12 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
          />
          <kbd className="absolute right-3 top-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Status Indicators & Quick Actions */}
      <div className="ml-4 flex items-center gap-2.5">
        {/* Redis Status Pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-700 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Redis: {redisStatus}</span>
        </div>

        {/* Go API Latency Pill */}
        <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/80 px-2.5 py-1 text-[11px] font-mono font-medium text-sky-700 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          <span>Go API: {apiLatency}</span>
        </div>

        {/* Direct Upload Button */}
        <Button
          onClick={onUploadClick}
          className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm font-medium text-xs px-3.5"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Direct Upload</span>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900">
                  {user?.email || "dev@cloudbox.internal"}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Cluster: US-East-1 (MinIO)
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/files" className="cursor-pointer">
                Object Explorer
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                Infrastructure Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-700 cursor-pointer"
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
