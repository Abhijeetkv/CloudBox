"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useFiles, useDeleteFile, useDownloadFile } from "@/hooks/use-files";
import { PresignedUrlModal } from "@/components/dashboard/presigned-url-modal";
import { ApiDocsModal } from "@/components/dashboard/api-docs-modal";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { Button } from "@/components/ui/button";
import {
  Zap,
  BookOpen,
  UploadCloud,
  Copy,
  Check,
  Download,
  Link2,
  Info,
  Trash2,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Cpu,
  FolderOpen,
} from "lucide-react";
import type { FileItem } from "@/types";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: realFiles = [], isLoading } = useFiles();
  const deleteMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const [presignedModalOpen, setPresignedModalOpen] = useState(false);
  const [apiDocsModalOpen, setApiDocsModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "archives" | "documents" | "media">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculate real metrics from stored files
  const totalBytes = useMemo(() => {
    return realFiles.reduce((acc, f) => acc + f.size, 0);
  }, [realFiles]);

  const quotaLimitBytes = 50 * 1024 * 1024 * 1024; // 50 GB
  const quotaPercent = Math.min(100, (totalBytes / quotaLimitBytes) * 100);

  const filteredObjects = useMemo(() => {
    if (activeTab === "all") return realFiles;
    return realFiles.filter((item) => {
      const cat = getFileCategory(item.mime_type);
      if (activeTab === "archives") return cat === "archive";
      if (activeTab === "documents") return cat === "document" || cat === "spreadsheet";
      if (activeTab === "media") return cat === "image" || cat === "video" || cat === "audio";
      return true;
    });
  }, [realFiles, activeTab]);

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedKey(uri);
    toast.success("S3 URI copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDeleteItem = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleDownloadItem = (file: FileItem) => {
    downloadMutation.mutate({ id: file.id, filename: file.filename });
  };

  const renderFileIcon = (mime: string) => {
    const cat = getFileCategory(mime);
    if (cat === "archive") {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
          <FileArchive className="h-4 w-4" />
        </div>
      );
    }
    if (cat === "document") {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
          <FileCode className="h-4 w-4" />
        </div>
      );
    }
    if (cat === "spreadsheet") {
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
          <FileSpreadsheet className="h-4 w-4" />
        </div>
      );
    }
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
        <FileText className="h-4 w-4" />
      </div>
    );
  };

  return (
    <AppShell>
      <div className="space-y-4 max-w-full">
        {/* Top Header Row */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-slate-400">
              CLUSTER-US-EAST-1 •
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 tracking-wide">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              STREAM PIPELINE ENGAGED
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                S3 Storage Topology
              </h1>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                minio-edge.internal:9000
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresignedModalOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
              >
                <Zap className="h-3.5 w-3.5 text-sky-600" />
                <span>New Presigned URL</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setApiDocsModalOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                <span>View API Docs</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm px-3.5"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Direct S3 Upload</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: TOTAL OBJECTS */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                TOTAL OBJECTS
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(String(realFiles.length));
                  toast.success("Count copied to clipboard");
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {realFiles.length}
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {realFiles.length > 0 ? `+${realFiles.length} total` : "Empty"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              <span>Indexed in PostgreSQL</span>
              <span>MinIO Persistent</span>
            </div>
          </div>

          {/* Card 2: STORAGE ALLOCATED */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                STORAGE ALLOCATED
              </span>
              <span className="font-mono text-xs font-bold text-sky-600">
                {quotaPercent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatFileSize(totalBytes)}{" "}
              <span className="text-sm font-medium text-slate-400">/ 50.0 GB</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 flex h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${Math.max(quotaPercent, totalBytes > 0 ? 2 : 0)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Hot Storage
              </span>
              <span>Quota: 50.0 GB</span>
            </div>
          </div>

          {/* Card 3: REDIS METADATA HIT RATE */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                REDIS METADATA CACHE
              </span>
              <Zap className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 tracking-tight">
                99.4%
              </span>
              <span className="font-mono text-xs text-slate-400 ml-2">
                &lt; 0.4ms avg
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              <span>L1 In-Memory Cache</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Sync
              </span>
            </div>
          </div>

          {/* Card 4: GO WORKER POOL */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">
                GO WORKER POOL
              </span>
              <Cpu className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                3/3
              </span>
              <span className="font-mono text-xs font-semibold text-sky-600">
                Active Goroutines
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              <span>Buffer: 0 dropped</span>
              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                channel[100]
              </span>
            </div>
          </div>
        </div>

        {/* Recent Storage Objects Table Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-4 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Storage Objects
              </h2>
              <p className="text-xs text-slate-500">
                Active keys indexed across Redis and MinIO persistence layers
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50/60 self-start sm:self-auto text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                  activeTab === "all"
                    ? "bg-white text-sky-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All Objects ({realFiles.length})
              </button>
              <button
                onClick={() => setActiveTab("archives")}
                className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                  activeTab === "archives"
                    ? "bg-white text-sky-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Archives
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                  activeTab === "documents"
                    ? "bg-white text-sky-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActiveTab("media")}
                className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                  activeTab === "media"
                    ? "bg-white text-sky-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Media
              </button>
            </div>
          </div>

          {/* Table Data or Empty State */}
          {isLoading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-400">
              Fetching object topology from MinIO cluster...
            </div>
          ) : filteredObjects.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 mb-3">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {realFiles.length === 0
                  ? "No storage objects found in cluster"
                  : "No objects matching this category filter"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {realFiles.length === 0
                  ? "Your MinIO S3 bucket is currently empty. Upload your first file or generate a presigned URL."
                  : "Try switching to the 'All Objects' tab."}
              </p>
              {realFiles.length === 0 && (
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  size="sm"
                  className="mt-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs"
                >
                  <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                  Direct S3 Upload
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">OBJECT IDENTIFIER & KEY</th>
                    <th className="py-2.5 px-4 font-semibold">MIME / TYPE</th>
                    <th className="py-2.5 px-4 font-semibold">PAYLOAD SIZE</th>
                    <th className="py-2.5 px-4 font-semibold">SYNC STATUS</th>
                    <th className="py-2.5 px-4 font-semibold">MODIFIED</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredObjects.map((item) => {
                    const s3Key = item.storage_key || `s3://cloudbox/users/${item.user_id}/${item.filename}`;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Identifier & Key */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {renderFileIcon(item.mime_type)}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate max-w-[280px]">
                                {item.filename}
                              </p>
                              <p className="font-mono text-[10px] text-slate-400 truncate max-w-[340px]">
                                {s3Key}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* MIME Type */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50">
                            {item.mime_type}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {formatFileSize(item.size)}
                        </td>

                        {/* Sync Status */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-700 border border-emerald-200/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Redis Cached
                          </span>
                        </td>

                        {/* Modified */}
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {formatDate(item.created_at)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Download */}
                            <button
                              onClick={() => handleDownloadItem(item)}
                              title="Download"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyUri(s3Key)}
                              title="Copy S3 URI"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              {copiedKey === s3Key ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Link2 className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* View Details */}
                            <button
                              onClick={() => setPreviewFile(item)}
                              title="Inspect Metadata"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              title="Evict Object"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <PresignedUrlModal
        open={presignedModalOpen}
        onOpenChange={setPresignedModalOpen}
      />
      <ApiDocsModal
        open={apiDocsModalOpen}
        onOpenChange={setApiDocsModalOpen}
      />
      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />
    </AppShell>
  );
}
