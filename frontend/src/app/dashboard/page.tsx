"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useFiles, useDeleteFile, useDownloadFile, useStorageUsage } from "@/hooks/use-files";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  Check,
  Download,
  Link2,
  Trash2,
  Eye,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FolderOpen,
  Files,
  HardDrive,
  ShieldCheck,
  Cloud,
} from "lucide-react";
import type { FileItem } from "@/types";
import { formatFileSize, formatDate, getFileCategory } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: realFiles = [], isLoading } = useFiles();
  const { data: storageUsage } = useStorageUsage();
  const deleteMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "archives" | "documents" | "media">("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Storage calculation from live backend
  const totalBytes = storageUsage?.used ?? realFiles.reduce((acc, f) => acc + f.size, 0);
  const quotaLimitBytes = storageUsage?.limit ?? 50 * 1024 * 1024 * 1024; // 50 GB
  const quotaPercent = storageUsage?.percentage ?? Math.min(100, (totalBytes / quotaLimitBytes) * 100);

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

  const handleCopyLink = (file: FileItem) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("cloudbox_token") || "" : "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const shareUrl = `${apiBase}/api/files/${file.id}/download${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    navigator.clipboard.writeText(shareUrl);
    setCopiedId(file.id);
    toast.success("File link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteItem = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleDownloadItem = (file: FileItem) => {
    downloadMutation.mutate({ id: file.id, filename: file.filename });
  };

  const renderFileIcon = (mime: string) => {
    const cat = getFileCategory(mime);
    if (cat === "image") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
          <FileImage className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (cat === "video") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
          <FileVideo className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (cat === "audio") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600 border border-pink-100">
          <FileAudio className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (cat === "archive") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
          <FileArchive className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (cat === "document") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <FileCode className="h-4.5 w-4.5" />
        </div>
      );
    }
    if (cat === "spreadsheet") {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
          <FileSpreadsheet className="h-4.5 w-4.5" />
        </div>
      );
    }
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
        <FileText className="h-4.5 w-4.5" />
      </div>
    );
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-full">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome back! View, upload, and organize your files.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs shadow-sm px-4"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload File</span>
            </Button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Files */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Files
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Files className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {realFiles.length}
              </span>
              <span className="text-xs text-slate-500">
                {realFiles.length === 1 ? "file stored" : "files stored"}
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              Available in your personal cloud
            </div>
          </div>

          {/* Card 2: Storage Used */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Storage Used
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <HardDrive className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-slate-900 tracking-tight">
              {formatFileSize(totalBytes)}{" "}
              <span className="text-xs font-normal text-slate-400">/ 50.0 GB</span>
            </div>
            <div className="mt-3 flex h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(quotaPercent, totalBytes > 0 ? 2 : 0)}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              {quotaPercent.toFixed(1)}% of 50.0 GB used
            </div>
          </div>

          {/* Card 3: Storage Plan */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Account Plan
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Free Tier
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Active
              </span>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              50 GB secure cloud space included
            </div>
          </div>

          {/* Card 4: Drive Status */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Drive Status
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Cloud className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Synced
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-3 text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              {realFiles.length > 0 ? "All files backed up safely" : "Ready for your first upload"}
            </div>
          </div>
        </div>

        {/* Recent Files Table Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-4 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Files
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quick access to view, download, and manage your uploaded files
              </p>
            </div>

            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-md px-3 py-1 font-semibold transition-colors ${
                  activeTab === "all"
                    ? "bg-white text-sky-600 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({realFiles.length})
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
            </div>
          </div>

          {/* Table Data or Empty State */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Loading your files...
            </div>
          ) : filteredObjects.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200 mb-3">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {realFiles.length === 0
                  ? "No files in your CloudBox yet"
                  : "No files match this category"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {realFiles.length === 0
                  ? "Upload photos, documents, videos, and archives to get started."
                  : "Try selecting the 'All' tab to view all uploaded files."}
              </p>
              {realFiles.length === 0 && (
                <Button
                  onClick={() => setUploadModalOpen(true)}
                  size="sm"
                  className="mt-4 bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs"
                >
                  <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                  Upload First File
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredObjects.map((item) => {
                    const category = getFileCategory(item.mime_type);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* File Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {renderFileIcon(item.mime_type)}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate max-w-[280px]">
                                {item.filename}
                              </p>
                              <p className="text-[11px] text-slate-400 capitalize">
                                {category} file
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="py-3 px-4">
                          <span className="capitalize text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                            {category}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {formatFileSize(item.size)}
                        </td>

                        {/* Uploaded Date */}
                        <td className="py-3 px-4 text-slate-500">
                          {formatDate(item.created_at)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewFile(item)}
                              title="Preview file"
                              className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Download */}
                            <button
                              onClick={() => handleDownloadItem(item)}
                              title="Download file"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLink(item)}
                              title="Copy file link"
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              {copiedId === item.id ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Link2 className="h-4 w-4" />
                              )}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              title="Delete file"
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Upload Modal */}
      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />
    </AppShell>
  );
}
