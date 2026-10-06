"use client";

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
import { Download, HardDrive, Calendar, FileType, Key, Clock, Loader2 } from "lucide-react";
import { useDownloadFile } from "@/hooks/use-files";

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

  if (!file) return null;

  const category = getFileCategory(file.mime_type);

  const handleDownload = () => {
    downloadMutation.mutate({
      id: file.id,
      filename: file.filename,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <FileIcon mimeType={file.mime_type} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold">
                {file.filename}
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 capitalize">
                  {category}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h4 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400 mb-3">
              File Details
            </h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <FileType className="h-4 w-4" /> MIME Type
                </span>
                <span className="font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {file.mime_type}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <HardDrive className="h-4 w-4" /> Size
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {formatFileSize(file.size)} ({file.size.toLocaleString()} bytes)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Calendar className="h-4 w-4" /> Created
                </span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {formatDate(file.created_at)}
                </span>
              </div>

              {file.updated_at && file.updated_at !== file.created_at && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Clock className="h-4 w-4" /> Modified
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {formatDate(file.updated_at)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-zinc-200/60 pt-2.5 dark:border-zinc-800">
                <span className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Key className="h-4 w-4" /> Object Key
                </span>
                <span className="max-w-[220px] truncate font-mono text-xs text-zinc-600 dark:text-zinc-400" title={file.storage_key}>
                  {file.storage_key}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {downloadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
