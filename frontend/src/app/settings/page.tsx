"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import { useFiles } from "@/hooks/use-files";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Shield,
  HardDrive,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { data: files = [] } = useFiles();

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
  const quotaLimitBytes = 50 * 1024 * 1024 * 1024;
  const quotaPercent = Math.min(100, (totalBytes / quotaLimitBytes) * 100);

  const handleSignOut = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account & Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal profile, storage space, and session security.
          </p>
        </div>

        {/* Profile Details Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-600" />
              User Profile
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Your account details and personal credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Email Address
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1">
                  {user?.email}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className="text-[11px] font-medium text-slate-500">
                  User ID
                </span>
                <p className="text-xs font-semibold text-slate-900 mt-1">
                  #{user?.id}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Account Plan
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-semibold text-slate-900">
                    Free Cloud Tier
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Active
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className="text-[11px] font-medium text-slate-500">
                  Security Status
                </span>
                <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated & Encrypted
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-sky-600" />
              Storage Allocation
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Overview of your cloud quota and space utilization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">Current Storage</span>
                <span className="font-semibold text-sky-600">{quotaPercent.toFixed(1)}% used</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(quotaPercent, totalBytes > 0 ? 2 : 0)}%` }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                <span>{formatFileSize(totalBytes)} used</span>
                <span>50.0 GB Total Limit</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out Card */}
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              Session & Sign Out
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Safely terminate your authenticated session on this computer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="gap-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9"
            >
              <LogOut className="h-4 w-4" />
              Sign Out of CloudBox
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
