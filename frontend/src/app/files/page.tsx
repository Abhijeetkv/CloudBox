"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useFiles, useFolders, useDeleteFolder } from "@/hooks/use-files";
import { FileTable } from "@/components/files/file-table";
import { FileGrid } from "@/components/files/file-grid";
import { FolderGrid } from "@/components/files/folder-grid";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/files/breadcrumbs";
import { FileUploadModal } from "@/components/files/file-upload-modal";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
import { NewFolderModal } from "@/components/files/new-folder-modal";
import { RenameModal, type RenameTarget } from "@/components/files/rename-modal";
import { MoveModal, type MoveTarget } from "@/components/files/move-modal";
import { ShareModal } from "@/components/files/share-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileItem, Folder } from "@/types";
import { getFileCategory } from "@/lib/utils";
import {
  Upload,
  FolderPlus,
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
  // Folder hierarchy state
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Queries
  const { data: files = [], isLoading: filesLoading, error: filesError } = useFiles(currentFolderId);
  const { data: folders = [], isLoading: foldersLoading } = useFolders(currentFolderId);
  const deleteFolderMutation = useDeleteFolder();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All Files" },
    { key: "document", label: "Documents" },
    { key: "image", label: "Images" },
    { key: "video", label: "Media" },
    { key: "archive", label: "Archives" },
    { key: "unknown", label: "Others" },
  ];

  // Navigation handlers
  const handleOpenFolder = (folder: Folder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (targetId: number | null) => {
    if (targetId === null) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
      return;
    }
    const index = breadcrumbs.findIndex((b) => b.id === targetId);
    if (index !== -1) {
      setCurrentFolderId(targetId);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    if (window.confirm(`Delete folder "${folder.name}" and all its contents?`)) {
      deleteFolderMutation.mutate(folder.id);
    }
  };

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
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case "date-desc":
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [files, searchQuery, selectedCategory, sortBy]);

  const isLoading = filesLoading || foldersLoading;

  return (
    <AppShell>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Top Header Row with Upload & New Folder */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Files
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Browse, organize, share, and manage your cloud drive.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setNewFolderModalOpen(true)}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs h-9 px-3 gap-1.5"
            >
              <FolderPlus className="h-4 w-4 text-amber-500" />
              New Folder
            </Button>
            <Button
              onClick={() => setUploadModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-2xs font-medium text-xs h-9 px-4 gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
          </div>
        </div>

        {/* Breadcrumbs Path */}
        <div className="bg-slate-50/70 rounded-lg px-3 py-1.5 border border-slate-200/80">
          <Breadcrumbs
            items={breadcrumbs}
            onNavigate={handleNavigateBreadcrumb}
          />
        </div>

        {/* Filters & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in this folder..."
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
                : files.filter((f) => getFileCategory(f.mime_type) === cat.key).length;

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

        {/* Folders Section */}
        {folders.length > 0 && (
          <FolderGrid
            folders={folders}
            onOpenFolder={handleOpenFolder}
            onRenameFolder={(folder) =>
              setRenameTarget({ id: folder.id, name: folder.name, type: "folder" })
            }
            onMoveFolder={(folder) =>
              setMoveTarget({
                id: folder.id,
                name: folder.name,
                type: "folder",
                currentParentId: folder.parent_id,
              })
            }
            onDeleteFolder={handleDeleteFolder}
          />
        )}

        {/* Files Content Section */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : filesError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 text-xs">
            Failed to load files from server.
          </div>
        ) : filteredAndSortedFiles.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              This folder is empty
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search query or category filter."
                : "Upload a file or create a folder to get started."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewFolderModalOpen(true)}
                className="text-xs"
              >
                <FolderPlus className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
                New Folder
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
                size="sm"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload File
              </Button>
            </div>
          </div>
        ) : viewMode === "table" ? (
          <FileTable
            files={filteredAndSortedFiles}
            onViewDetails={(file) => setPreviewFile(file)}
            onRename={(file) =>
              setRenameTarget({ id: file.id, name: file.filename, type: "file" })
            }
            onMove={(file) =>
              setMoveTarget({
                id: file.id,
                name: file.filename,
                type: "file",
                currentParentId: file.folder_id,
              })
            }
            onShare={(file) => setShareFile(file)}
          />
        ) : (
          <div className="overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
            <FileGrid
              files={filteredAndSortedFiles}
              onViewDetails={(file) => setPreviewFile(file)}
              onRename={(file) =>
                setRenameTarget({ id: file.id, name: file.filename, type: "file" })
              }
              onMove={(file) =>
                setMoveTarget({
                  id: file.id,
                  name: file.filename,
                  type: "file",
                  currentParentId: file.folder_id,
                })
              }
              onShare={(file) => setShareFile(file)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <FileUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        folderId={currentFolderId}
      />
      <NewFolderModal
        open={newFolderModalOpen}
        onOpenChange={setNewFolderModalOpen}
        parentId={currentFolderId}
      />
      <RenameModal
        item={renameTarget}
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      />
      <MoveModal
        item={moveTarget}
        open={!!moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      />
      <ShareModal
        file={shareFile}
        open={!!shareFile}
        onOpenChange={(open) => !open && setShareFile(null)}
      />
      <FilePreviewModal
        file={previewFile}
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      />
    </AppShell>
  );
}
