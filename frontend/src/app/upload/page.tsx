"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFileSize, getFileCategory } from "@/lib/utils";
import { uploadFile } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  Shield,
  Zap,
} from "lucide-react";

interface QueuedFile {
  id: string;
  file: File;
  status: "idle" | "uploading" | "success" | "error";
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFilesToQueue = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueuedFile[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "idle",
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

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
    if (e.dataTransfer.files) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    addFilesToQueue(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFileFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadSingleFile = async (queuedItem: QueuedFile) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === queuedItem.id ? { ...item, status: "uploading" } : item
      )
    );

    try {
      const res = await uploadFile(queuedItem.file);
      if (res.success) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queuedItem.id ? { ...item, status: "success" } : item
          )
        );
        queryClient.invalidateQueries({ queryKey: ["files"] });
      } else {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === queuedItem.id
              ? { ...item, status: "error", error: res.error || "Upload failed" }
              : item
          )
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Upload error";
      setQueue((prev) =>
        prev.map((item) =>
          item.id === queuedItem.id
            ? { ...item, status: "error", error: msg }
            : item
        )
      );
    }
  };

  const uploadAllFiles = async () => {
    setIsUploadingAll(true);
    const pendingItems = queue.filter(
      (item) => item.status === "idle" || item.status === "error"
    );

    let successCount = 0;
    for (const item of pendingItems) {
      try {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "uploading" } : i
          )
        );
        const res = await uploadFile(item.file);
        if (res.success) {
          successCount++;
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: "success" } : i
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "error", error: res.error || "Upload failed" }
                : i
            )
          );
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Upload error";
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: msg } : i
          )
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["files"] });
    setIsUploadingAll(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
    }
  };

  const hasPending = queue.some(
    (item) => item.status === "idle" || item.status === "error"
  );
  const allCompleted =
    queue.length > 0 &&
    queue.every((item) => item.status === "success");

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Upload Center
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Upload files to your cloud storage. Supports any file format with instant MinIO S3 sync.
          </p>
        </div>

        {/* Drag and drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 scale-[0.99]"
              : "border-zinc-300 hover:border-zinc-400 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 mb-4 shadow-sm">
            <Upload className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Drop your files here, or{" "}
            <span className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
              browse
            </span>
          </h3>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Upload images, documents, audio, videos, or archives.
          </p>
        </div>

        {/* Upload Queue Section */}
        {queue.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Upload Queue</CardTitle>
                <CardDescription>
                  {queue.length} file{queue.length > 1 ? "s" : ""} selected
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {allCompleted ? (
                  <Button
                    onClick={() => router.push("/files")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    View In Files Explorer
                  </Button>
                ) : (
                  <Button
                    onClick={uploadAllFiles}
                    disabled={!hasPending || isUploadingAll}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isUploadingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading All...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload All
                      </>
                    )}
                  </Button>
                )}

                {!isUploadingAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQueue([])}
                  >
                    Clear Queue
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatFileSize(item.file.size)} •{" "}
                          <span className="capitalize">
                            {getFileCategory(item.file.type)}
                          </span>
                        </p>
                        {item.error && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "uploading" && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}
                      {item.status === "success" && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Uploaded</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}

                      {item.status === "idle" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => uploadSingleFile(item)}
                          disabled={isUploadingAll}
                        >
                          Upload
                        </Button>
                      )}

                      {item.status !== "uploading" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          onClick={() => removeFileFromQueue(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Highlights / Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Fast Parallel Streams
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Optimized multipart streaming directly into Go backend & MinIO object storage.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Encrypted & Isolated
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Files are strictly isolated by your user ID with unique cryptographic UUID keys.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <FileCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Automatic Categorization
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                MIME types are automatically parsed and cataloged in PostgreSQL and Redis cache.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
