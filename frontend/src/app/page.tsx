"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
    </div>
  );
}
