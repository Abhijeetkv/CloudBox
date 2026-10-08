"use client";

import { Folder as FolderIcon, MoreVertical, FolderOpen, Edit2, FolderInput, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder } from "@/types";
import { formatDate } from "@/lib/utils";

interface FolderGridProps {
  folders: Folder[];
  onOpenFolder: (folder: Folder) => void;
  onRenameFolder: (folder: Folder) => void;
  onMoveFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

export function FolderGrid({
  folders,
  onOpenFolder,
  onRenameFolder,
  onMoveFolder,
  onDeleteFolder,
}: FolderGridProps) {
  if (folders.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Folders ({folders.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onDoubleClick={() => onOpenFolder(folder)}
            className="group relative flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer"
          >
            <div
              onClick={() => onOpenFolder(folder)}
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500 border border-amber-100 group-hover:bg-amber-100/70 transition-colors">
                <FolderIcon className="h-4 w-4 fill-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-sky-600 transition-colors">
                  {folder.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatDate(folder.updated_at || folder.created_at)}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-60 group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem onClick={() => onOpenFolder(folder)}>
                  <FolderOpen className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveFolder(folder)}>
                  <FolderInput className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteFolder(folder)}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
