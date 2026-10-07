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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Upload Files
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Add documents, images, media, and archives to your cloud drive.
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
              ? "border-sky-500 bg-sky-50/70 scale-[0.99]"
              : "border-slate-300 hover:border-slate-400 bg-white shadow-xs"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-4 shadow-2xs border border-sky-100">
            <Upload className="h-8 w-8" />
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            Drop your files here, or{" "}
            <span className="text-sky-600 underline underline-offset-2">
              browse
            </span>
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
            Supports any file format up to 50 GB per file.
          </p>
        </div>

        {/* Upload Queue Section */}
        {queue.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Upload Queue</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {queue.length} file{queue.length > 1 ? "s" : ""} selected
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {allCompleted ? (
                  <Button
                    onClick={() => router.push("/files")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                    size="sm"
                  >
                    <FileCheck className="mr-1.5 h-3.5 w-3.5" />
                    View In My Files
                  </Button>
                ) : (
                  <Button
                    onClick={uploadAllFiles}
                    disabled={!hasPending || isUploadingAll}
                    className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8"
                    size="sm"
                  >
                    {isUploadingAll ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Uploading All...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Upload All
                      </>
                    )}
                  </Button>
                )}

                {!isUploadingAll && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 border-slate-200 text-slate-700"
                    onClick={() => setQueue([])}
                  >
                    Clear Queue
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              <div className="divide-y divide-slate-100">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
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
                        <div className="flex items-center gap-1.5 text-xs text-sky-600 font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </div>
                      )}
                      {item.status === "success" && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Uploaded</span>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed</span>
                        </div>
                      )}

                      {item.status === "idle" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
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
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
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

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Fast Cloud Uploads
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Optimized multipart streaming with real-time transfer progress.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Private & Secure
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Your files are privately secured and accessible only to your account.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <FileCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Auto Organization
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Files are automatically categorized into documents, media, and archives.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
