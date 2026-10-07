"use client";

import { useState } from "react";
import type { FileItem } from "@/types";
import { FileIcon } from "./file-icon";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { useDeleteFile, useDownloadFile } from "@/hooks/use-files";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Trash2, MoreVertical, Eye, Loader2, Link2, Check } from "lucide-react";
import { toast } from "sonner";

interface FileGridProps {
  files: FileItem[];
  onViewDetails?: (file: FileItem) => void;
}

export function FileGrid({ files, onViewDetails }: FileGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const deleteMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleCopyLink = (file: FileItem) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cloudbox_token") || "" : "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const shareUrl = `${apiBase}/api/files/${file.id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedId(file.id);
    toast.success("File link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => {
          const category = getFileCategory(file.mime_type);
          return (
            <div
              key={file.id}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-sky-50 transition-colors cursor-pointer border border-slate-100"
                  onClick={() => onViewDetails?.(file)}
                >
                  <FileIcon mimeType={file.mime_type} className="h-6 w-6" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-700"
                      aria-label="File options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-lg">
                    {onViewDetails && (
                      <DropdownMenuItem onClick={() => onViewDetails(file)} className="cursor-pointer text-xs">
                        <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                        View Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleCopyLink(file)} className="cursor-pointer text-xs">
                      {copiedId === file.id ? (
                        <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Link2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      )}
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        downloadMutation.mutate({
                          id: file.id,
                          filename: file.filename,
                        })
                      }
                      className="cursor-pointer text-xs"
                    >
                      <Download className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(file)}
                      className="text-red-600 focus:text-red-700 cursor-pointer text-xs"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className="mt-3 cursor-pointer"
                onClick={() => onViewDetails?.(file)}
              >
                <p
                  className="truncate text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors"
                  title={file.filename}
                >
                  {file.filename}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span className="capitalize">{category}</span>
                  <span className="font-medium text-slate-600">{formatFileSize(file.size)}</span>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                {formatDate(file.created_at)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete file?</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              This will permanently delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.filename}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-xs"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
