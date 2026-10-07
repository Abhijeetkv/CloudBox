"use client";

import { useState, type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          <span className="text-xs font-medium text-slate-500">Loading CloudBox...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100/60 p-0 sm:p-3 md:p-5 flex items-center justify-center">
      <div className="w-full max-w-[1600px] min-h-screen sm:min-h-[92vh] sm:rounded-2xl border border-slate-200/90 bg-white shadow-sm flex overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            onUploadClick={() => setUploadModalOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#fcfdfd]">
            {children}
          </main>
        </div>
      </div>

      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
