"use client";

import { useState } from "react";
import { FolderInput, Folder as FolderIcon, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFolders, useMoveFile, useMoveFolder } from "@/hooks/use-files";
import type { Folder } from "@/types";

export interface MoveTarget {
  id: number;
  name: string;
  type: "file" | "folder";
  currentParentId: number | null;
}

interface MoveModalProps {
  item: MoveTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveModal({ item, open, onOpenChange }: MoveModalProps) {
  // Fetch all user folders at root and nested
  const { data: folders = [], isLoading } = useFolders();
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const moveFileMutation = useMoveFile();
  const moveFolderMutation = useMoveFolder();

  const isPending = moveFileMutation.isPending || moveFolderMutation.isPending;

  const handleMove = () => {
    if (!item) return;

    if (item.type === "file") {
      moveFileMutation.mutate(
        { id: item.id, folderId: selectedParentId },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      moveFolderMutation.mutate(
        { id: item.id, newParentId: selectedParentId },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

  // Filter out the folder itself if moving a folder
  const availableFolders = folders.filter((f) => {
    if (item?.type === "folder" && f.id === item.id) return false;
    return true;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isPending) {
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <FolderInput className="h-5 w-5 text-sky-600" />
            Move {item?.type === "folder" ? "Folder" : "File"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Choose a destination for &quot;{item?.name}&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedParentId(null)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-xs transition-colors ${
              selectedParentId === null
                ? "border-sky-500 bg-sky-50/60 font-semibold text-sky-900"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <HardDrive className={`h-4 w-4 ${selectedParentId === null ? "text-sky-600" : "text-slate-400"}`} />
            <div>
              <p className="font-medium">My Files (Root)</p>
              <p className="text-[10px] text-slate-500">Top-level drive directory</p>
            </div>
          </button>

          {/* List of folders */}
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading folders...</div>
          ) : (
            availableFolders.map((folder) => {
              const isSelected = selectedParentId === folder.id;
              const isCurrent = item?.currentParentId === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedParentId(folder.id)}
                  disabled={isCurrent}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                    isCurrent
                      ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400"
                      : isSelected
                      ? "border-sky-500 bg-sky-50/60 font-semibold text-sky-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FolderIcon className={`h-4 w-4 ${isSelected ? "text-sky-600" : "text-amber-500"}`} />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] text-slate-400 font-normal">Current location</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs border-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={isPending || selectedParentId === item?.currentParentId}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Moving...
              </>
            ) : (
              "Move Here"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
