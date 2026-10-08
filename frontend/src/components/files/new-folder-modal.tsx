"use client";

import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateFolder } from "@/hooks/use-files";

interface NewFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: number | null;
}

export function NewFolderModal({ open, onOpenChange, parentId }: NewFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const createFolderMutation = useCreateFolder();

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return;

    createFolderMutation.mutate(
      { name: trimmed, parentId: parentId || null },
      {
        onSuccess: () => {
          setFolderName("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!createFolderMutation.isPending) {
          if (!isOpen) setFolderName("");
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-xl">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <FolderPlus className="h-5 w-5 text-sky-600" />
              New Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a new folder to organize your files.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name"
              className="bg-white border-slate-200 text-xs h-9 focus-visible:ring-sky-500"
              disabled={createFolderMutation.isPending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createFolderMutation.isPending}
              className="text-xs border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!folderName.trim() || createFolderMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
            >
              {createFolderMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
