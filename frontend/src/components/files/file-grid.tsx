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
import { Download, Trash2, MoreVertical, Eye, Loader2 } from "lucide-react";

interface FileGridProps {
  files: FileItem[];
  onViewDetails?: (file: FileItem) => void;
}

export function FileGrid({ files, onViewDetails }: FileGridProps) {
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const deleteMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => {
          const category = getFileCategory(file.mime_type);
          return (
            <div
              key={file.id}
              className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 group-hover:bg-blue-50 transition-colors cursor-pointer dark:bg-zinc-800 dark:group-hover:bg-blue-950/40"
                  onClick={() => onViewDetails?.(file)}
                >
                  <FileIcon mimeType={file.mime_type} className="h-6 w-6" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      aria-label="File options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewDetails && (
                      <DropdownMenuItem onClick={() => onViewDetails(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() =>
                        downloadMutation.mutate({
                          id: file.id,
                          filename: file.filename,
                        })
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(file)}
                      className="text-red-600 focus:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
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
                  className="truncate text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors dark:text-zinc-100 dark:group-hover:text-blue-400"
                  title={file.filename}
                >
                  {file.filename}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="capitalize">{category}</span>
                  <span>{formatFileSize(file.size)}</span>
                </div>
              </div>

              <div className="mt-3 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                {formatDate(file.created_at)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {deleteTarget?.filename}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
