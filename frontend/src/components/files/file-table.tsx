"use client";

import { useState } from "react";
import type { FileItem } from "@/types";
import { FileIcon } from "./file-icon";
import { formatFileSize, formatDate } from "@/lib/utils";
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
import { Download, Trash2, MoreHorizontal, Eye, Loader2 } from "lucide-react";

interface FileTableProps {
  files: FileItem[];
  onViewDetails?: (file: FileItem) => void;
}

export function FileTable({ files, onViewDetails }: FileTableProps) {
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
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                Name
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 sm:table-cell dark:text-zinc-400">
                Type
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 md:table-cell dark:text-zinc-400">
                Size
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-zinc-500 lg:table-cell dark:text-zinc-400">
                Created
              </th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr
                key={file.id}
                className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileIcon mimeType={file.mime_type} />
                    <span className="max-w-[200px] truncate font-medium text-zinc-900 sm:max-w-[300px] dark:text-zinc-100">
                      {file.filename}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-zinc-500 sm:table-cell dark:text-zinc-400">
                  {file.mime_type.split("/").pop()}
                </td>
                <td className="hidden px-4 py-3 text-zinc-500 md:table-cell dark:text-zinc-400">
                  {formatFileSize(file.size)}
                </td>
                <td className="hidden px-4 py-3 text-zinc-500 lg:table-cell dark:text-zinc-400">
                  {formatDate(file.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="File actions">
                        <MoreHorizontal className="h-4 w-4" />
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
