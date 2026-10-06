"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, File as FileIconLucide, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadFile } from "@/hooks/use-files";
import { formatFileSize } from "@/lib/utils";

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileUploadModal({ open, onOpenChange }: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFile();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        onOpenChange(false);
      },
    });
  };

  const resetSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!uploadMutation.isPending) {
          if (!isOpen) resetSelection();
          onOpenChange(isOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload File
          </DialogTitle>
          <DialogDescription>
            Select or drag a file to upload to your secure CloudBox storage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Click to browse or drag and drop
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Any file type supported • Fast & encrypted
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                    <FileIconLucide className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || "Unknown type"}
                    </p>
                  </div>
                </div>
                {!uploadMutation.isPending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                    onClick={resetSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      Uploading to MinIO...
                    </span>
                    <span>Processing</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div className="h-full animate-pulse bg-blue-600 rounded-full w-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
