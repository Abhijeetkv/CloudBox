"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Shield,
  Server,
  Database,
  Layers,
  LogOut,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
} from "lucide-react";
import api from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiEndpoint, setApiEndpoint] = useState("");

  useEffect(() => {
    setApiEndpoint(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

    // Ping backend health
    api
      .get("/health")
      .then(() => setHealthStatus("online"))
      .catch(() => setHealthStatus("offline"));
  }, []);

  const handleSignOut = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Account & System Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your account preferences and view backend connection health.
          </p>
        </div>

        {/* Profile Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Profile
            </CardTitle>
            <CardDescription>
              Your personal account credentials and identifiers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Email Address
                </span>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {user?.email}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Account ID
                </span>
                <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  #{user?.id}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Session Token Status
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Active JWT (24-Hour Expiry)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Authentication Type
                </span>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-0.5 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-blue-600" /> Bearer Token Auth
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System & Architecture Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              Connected Infrastructure
            </CardTitle>
            <CardDescription>
              Backend microservices and persistent storage components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Server className="h-4 w-4 text-blue-600" /> Go / Gin REST API
                  </span>
                  {healthStatus === "checking" && (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  )}
                  {healthStatus === "online" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
                    </span>
                  )}
                  {healthStatus === "offline" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> Offline
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 mt-2">
                  {apiEndpoint}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <HardDrive className="h-4 w-4 text-emerald-600" /> MinIO Object Storage
                </span>
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 mt-2">
                  s3://cloudbox (S3 compatible)
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Database className="h-4 w-4 text-purple-600" /> PostgreSQL 16
                </span>
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 mt-2">
                  User accounts & file metadata repository
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Layers className="h-4 w-4 text-red-600" /> Redis Cache & Worker Pool
                </span>
                <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300 mt-2">
                  Rate limiting & async metadata worker pool
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone / Log Out Card */}
        <Card className="border-red-200 dark:border-red-950">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-400">
              Session Management
            </CardTitle>
            <CardDescription>
              Sign out from this browser session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="gap-2"
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
