"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, X, File as FileIconLucide, Loader2 } from "lucide-react";
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
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Upload className="h-5 w-5 text-sky-600" />
            Upload File
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Select or drag a file to upload to your secure CloudBox drive.
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
                  ? "border-sky-500 bg-sky-50/70"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Click to browse or drag and drop
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Any file type supported • Fast cloud storage
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                    <FileIconLucide className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || "File"}
                    </p>
                  </div>
                </div>
                {!uploadMutation.isPending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                    onClick={resetSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                      Uploading file...
                    </span>
                    <span>Processing</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full animate-pulse bg-sky-500 rounded-full w-full" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
            className="text-xs border-slate-200 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
