"use client";

import { useState } from "react";
import type { FileItem } from "@/types";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { FileIcon } from "./file-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, HardDrive, Calendar, FileType, ExternalLink, Link2, Check, Loader2 } from "lucide-react";
import { useDownloadFile } from "@/hooks/use-files";
import { toast } from "sonner";

interface FilePreviewModalProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: FilePreviewModalProps) {
  const downloadMutation = useDownloadFile();
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const category = getFileCategory(file.mime_type);
  const token = typeof window !== "undefined" ? localStorage.getItem("cloudbox_token") || "" : "";
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const fileUrl = `${apiBase}/api/files/${file.id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const handleDownload = () => {
    downloadMutation.mutate({
      id: file.id,
      filename: file.filename,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    toast.success("File link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExternal = () => {
    window.open(fileUrl, "_blank");
  };

  const isImage = file.mime_type.startsWith("image/");
  const isVideo = file.mime_type.startsWith("video/");
  const isAudio = file.mime_type.startsWith("audio/");
  const isPdf = file.mime_type === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <FileIcon mimeType={file.mime_type} className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-bold text-slate-900">
                {file.filename}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 capitalize">
                  {category}
                </span>
                <span className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3">
          {/* Visual Preview Container */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-center min-h-[160px] overflow-hidden">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl}
                alt={file.filename}
                className="max-h-[320px] max-w-full rounded-lg object-contain shadow-xs bg-white"
                loading="lazy"
              />
            ) : isVideo ? (
              <video
                controls
                src={fileUrl}
                className="max-h-[320px] w-full rounded-lg bg-black"
              >
                Your browser does not support video playback.
              </video>
            ) : isAudio ? (
              <div className="w-full px-4 py-6 text-center">
                <audio controls src={fileUrl} className="w-full">
                  Your browser does not support audio playback.
                </audio>
              </div>
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                title={file.filename}
                className="w-full h-[320px] rounded-lg border border-slate-200 bg-white"
              />
            ) : (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs font-medium">Inline preview not supported for this file format.</p>
                <p className="text-[11px] text-slate-400 mt-1">You can open or download the file to inspect it.</p>
              </div>
            )}
          </div>

          {/* Clean File Details (No internal S3 keys) */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <FileType className="h-3.5 w-3.5 text-slate-400" /> MIME Type
              </span>
              <span className="font-mono text-[11px] font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded">
                {file.mime_type}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <HardDrive className="h-3.5 w-3.5 text-slate-400" /> Size
              </span>
              <span className="font-medium text-slate-800">
                {formatFileSize(file.size)} ({file.size.toLocaleString()} bytes)
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Uploaded
              </span>
              <span className="text-slate-800">
                {formatDate(file.created_at)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 gap-2 flex-wrap sm:flex-nowrap justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Link2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              Open File
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 text-slate-600 hover:text-slate-900"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white font-medium"
            >
              {downloadMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
