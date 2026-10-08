"use client";

import { useState, useEffect } from "react";
import { Edit2, Loader2 } from "lucide-react";
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
import { useRenameFile, useRenameFolder } from "@/hooks/use-files";

export interface RenameTarget {
  id: number;
  name: string;
  type: "file" | "folder";
}

interface RenameModalProps {
  item: RenameTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameModal({ item, open, onOpenChange }: RenameModalProps) {
  const [newName, setNewName] = useState("");
  const renameFileMutation = useRenameFile();
  const renameFolderMutation = useRenameFolder();

  const isPending = renameFileMutation.isPending || renameFolderMutation.isPending;

  useEffect(() => {
    if (item) {
      setNewName(item.name);
    }
  }, [item]);

  const handleRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!item) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.name) {
      onOpenChange(false);
      return;
    }

    if (item.type === "file") {
      renameFileMutation.mutate(
        { id: item.id, filename: trimmed },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    } else {
      renameFolderMutation.mutate(
        { id: item.id, name: trimmed },
        {
          onSuccess: () => onOpenChange(false),
        }
      );
    }
  };

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
        <form onSubmit={handleRename}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Edit2 className="h-4.5 w-4.5 text-sky-600" />
              Rename {item?.type === "folder" ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter a new name for &quot;{item?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="bg-white border-slate-200 text-xs h-9 focus-visible:ring-sky-500"
              disabled={isPending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-xs border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!newName.trim() || isPending || newName === item?.name}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
