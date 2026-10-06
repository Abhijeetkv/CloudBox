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
  Filter,
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
        // Search filter
        const matchesSearch = file.filename
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim());
        if (!matchesSearch) return false;

        // Category filter
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Files Explorer
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Browse, filter, preview, and download your stored files.
            </p>
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        </div>

        {/* Filters & Search Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name..."
              className="pl-9 pr-9 bg-white dark:bg-zinc-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort & View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort files by"
                className="h-10 rounded-lg border border-zinc-200 bg-white pl-8 pr-4 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
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
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800"
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            Failed to load files from server.
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No files found
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search query or category filter."
                : "Your storage is currently empty. Upload your first file!"}
            </p>
            {searchQuery || selectedCategory !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
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
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
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
