"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useFiles } from "@/hooks/use-files";
import { FileTable } from "@/components/files/file-table";
import { FileGrid } from "@/components/files/file-grid";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileItem } from "@/types";
import { getFileCategory } from "@/lib/utils";
import {
  Upload,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  FileQuestion,
  X,
} from "lucide-react";

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
type CategoryFilter = "all" | "document" | "image" | "video" | "archive" | "unknown";

export default function FilesPage() {
  const { data: files = [], isLoading, error } = useFiles();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All Files" },
    { key: "document", label: "Documents" },
    { key: "image", label: "Images" },
    { key: "video", label: "Media" },
    { key: "archive", label: "Archives" },
    { key: "unknown", label: "Others" },
  ];

  const filteredAndSortedFiles = useMemo(() => {
    return files
      .filter((file) => {
        const matchesSearch = file.filename
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim());
        if (!matchesSearch) return false;

        if (selectedCategory !== "all") {
          const cat = getFileCategory(file.mime_type);
          if (cat !== selectedCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "name-asc":
            return a.filename.localeCompare(b.filename);
          case "name-desc":
            return b.filename.localeCompare(a.filename);
          case "size-desc":
            return b.size - a.size;
          case "size-asc":
            return a.size - b.size;
          case "date-asc":
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          case "date-desc":
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      });
  }, [files, searchQuery, selectedCategory, sortBy]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Upload Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Files
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse, search, preview, and download your stored files.
            </p>
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm font-medium text-xs h-9 px-4"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>

        {/* Filters & Search Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name..."
              className="pl-9 pr-9 bg-white border-slate-200 text-xs h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort & View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort files by"
                className="h-9 rounded-lg border border-slate-200 bg-white pl-8 pr-4 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-desc">Largest size</option>
                <option value="size-asc">Smallest size</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${viewMode === "table" ? "bg-slate-100 text-sky-600" : "text-slate-400"}`}
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${viewMode === "grid" ? "bg-slate-100 text-sky-600" : "text-slate-400"}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const count =
              cat.key === "all"
                ? files.length
                : files.filter((f) => getFileCategory(f.mime_type) === cat.key)
                    .length;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
            Failed to load files from server.
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No files found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search query or category filter."
                : "Your storage is currently empty. Upload your first file!"}
            </p>
            {searchQuery || selectedCategory !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
                size="sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          <FileTable
            files={filteredAndSortedFiles}
            onViewDetails={(file) => setPreviewFile(file)}
          />
        ) : (
          <FileGrid
            files={filteredAndSortedFiles}
            onViewDetails={(file) => setPreviewFile(file)}
          />
        )}
      </div>

      {/* Modals */}
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
