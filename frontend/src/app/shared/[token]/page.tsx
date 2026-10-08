"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getShare } from "@/lib/auth";
import type { ShareInfo } from "@/types";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Download,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Loader2,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Cloud,
} from "lucide-react";

export default function SharedFilePage() {
  const params = useParams();
  const token = params.token as string;

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getShare(token)
      .then((data) => {
        if (isMounted) {
          setShareInfo(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const msg =
            err.response?.data?.error?.message ||
            "This share link is invalid or has expired.";
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleDownload = () => {
    if (!shareInfo?.download_url) return;
    window.location.href = shareInfo.download_url;
  };

  const renderIcon = (mime: string) => {
    const cat = getFileCategory(mime);
    if (cat === "image") {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-xs">
          <FileImage className="h-8 w-8" />
        </div>
      );
    }
    if (cat === "video") {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-xs">
          <FileVideo className="h-8 w-8" />
        </div>
      );
    }
    if (cat === "audio") {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 shadow-xs">
          <FileAudio className="h-8 w-8" />
        </div>
      );
    }
    if (cat === "archive") {
      return (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-xs">
          <FileArchive className="h-8 w-8" />
        </div>
      );
    }
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 shadow-xs">
        <FileText className="h-8 w-8" />
      </div>
    );
  };

  return (
    <div className="h-screen h-[100dvh] w-screen overflow-y-auto bg-slate-50 flex flex-col justify-between box-border">
      {/* Navbar */}
      <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-xs">
            <Cloud className="h-5 w-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">
            CloudBox
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Encrypted Direct Transfer</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-lg space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto" />
              <p className="text-xs font-medium text-slate-500">
                Fetching secure download link...
              </p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 p-8 sm:p-10 text-center shadow-lg space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100 mx-auto">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Link Expired or Not Found
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {error}
              </p>
              <div className="pt-2">
                <a
                  href="/login"
                  className="inline-flex text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
                >
                  Go to CloudBox Home
                </a>
              </div>
            </div>
          ) : shareInfo ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col items-center text-center">
                {renderIcon(shareInfo.mime_type)}
                <h1
                  className="mt-4 text-base sm:text-lg font-bold text-slate-900 truncate max-w-full px-2"
                  title={shareInfo.filename}
                >
                  {shareInfo.filename}
                </h1>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>{formatFileSize(shareInfo.size)}</span>
                  <span>•</span>
                  <span>{shareInfo.mime_type || "Binary"}</span>
                </div>
              </div>

              {/* Expiration Banner */}
              {shareInfo.expires_at && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-amber-800">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Valid until {formatDate(shareInfo.expires_at)}
                  </span>
                </div>
              )}

              {/* Download CTA */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleDownload}
                  className="w-full h-11 gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm"
                >
                  <Download className="h-4.5 w-4.5" />
                  Download File
                </Button>
                <p className="text-center text-[11px] text-slate-400">
                  Powered by CloudBox object storage presigned URLs.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-4 text-center text-xs text-slate-400 border-t border-slate-200/60">
        CloudBox Portfolio Project • S3-Compatible Direct Object Storage
      </footer>
    </div>
  );
}
