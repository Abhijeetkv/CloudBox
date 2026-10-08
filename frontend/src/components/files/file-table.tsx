"use client";

import { useState } from "react";
import type { FileItem } from "@/types";
import { FileIcon } from "./file-icon";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { useDeleteFile, useDownloadFile } from "@/hooks/use-files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Trash2, MoreHorizontal, Eye, Loader2, Link2, Check } from "lucide-react";
import { toast } from "sonner";

interface FileTableProps {
  files: FileItem[];
  onViewDetails?: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onMove?: (file: FileItem) => void;
  onShare?: (file: FileItem) => void;
}

export function FileTable({ files, onViewDetails, onRename, onMove, onShare }: FileTableProps) {
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
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="hidden px-4 py-3 text-left sm:table-cell">Category</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">Size</th>
              <th className="hidden px-4 py-3 text-left lg:table-cell">Uploaded</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => {
              const category = getFileCategory(file.mime_type);
              return (
                <tr
                  key={file.id}
                  className="transition-colors hover:bg-slate-50/70 group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileIcon mimeType={file.mime_type} />
                      <div className="min-w-0">
                        <span
                          onClick={() => onViewDetails?.(file)}
                          className="max-w-[220px] truncate font-semibold text-slate-900 sm:max-w-[340px] cursor-pointer hover:text-sky-600 block transition-colors"
                        >
                          {file.filename}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono sm:hidden block">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="capitalize text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                      {category}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-700 font-medium md:table-cell">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                    {formatDate(file.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" aria-label="File actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-lg">
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(file)} className="cursor-pointer text-xs">
                              <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              View Preview
                            </DropdownMenuItem>
                          )}
                          {onShare && (
                            <DropdownMenuItem onClick={() => onShare(file)} className="cursor-pointer text-xs">
                              <Link2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              Share Link
                            </DropdownMenuItem>
                          )}
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
                          {onRename && (
                            <DropdownMenuItem onClick={() => onRename(file)} className="cursor-pointer text-xs">
                              <Eye className="mr-2 h-3.5 w-3.5 opacity-0" />
                              Rename
                            </DropdownMenuItem>
                          )}
                          {onMove && (
                            <DropdownMenuItem onClick={() => onMove(file)} className="cursor-pointer text-xs">
                              <Eye className="mr-2 h-3.5 w-3.5 opacity-0" />
                              Move
                            </DropdownMenuItem>
                          )}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
