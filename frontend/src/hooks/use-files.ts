import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFiles,
  getFile,
  uploadFile,
  deleteFile,
  downloadFile,
  renameFile,
  moveFile,
  searchFiles,
  listFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  listShares,
  createShare,
  deleteShare,
  getStorageUsage,
} from "@/lib/auth";
import { toast } from "sonner";

// ─── Files Hooks ─────────────────────────────────────────────────────────────

export function useFiles(folderId?: number | null) {
  return useQuery({
    queryKey: ["files", folderId ?? "root"],
    queryFn: () => listFiles(folderId),
  });
}

export function useSearchFiles(query: string) {
  return useQuery({
    queryKey: ["files", "search", query],
    queryFn: () => searchFiles(query),
    enabled: query.trim().length > 0,
  });
}

export function useFile(id: number) {
  return useQuery({
    queryKey: ["file", id],
    queryFn: () => getFile(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: number | null }) =>
      uploadFile(file, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      toast.success("File uploaded successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to upload file";
      toast.error(msg);
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      renameFile(id, filename),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File renamed successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to rename file";
      toast.error(msg);
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) =>
      moveFile(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File moved successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to move file";
      toast.error(msg);
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      toast.success("File deleted successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to delete file";
      toast.error(msg);
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      downloadFile(id, filename),
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to download file";
      toast.error(msg);
    },
  });
}

// ─── Folders Hooks ───────────────────────────────────────────────────────────

export function useFolders(parentId?: number | null) {
  return useQuery({
    queryKey: ["folders", parentId ?? "root"],
    queryFn: () => listFolders(parentId),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: number | null }) =>
      createFolder(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder created successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to create folder";
      toast.error(msg);
    },
  });
}

export function useRenameFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      renameFolder(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder renamed successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to rename folder";
      toast.error(msg);
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newParentId }: { id: number; newParentId: number | null }) =>
      moveFolder(id, newParentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast.success("Folder moved successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to move folder";
      toast.error(msg);
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
      toast.success("Folder deleted successfully");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to delete folder";
      toast.error(msg);
    },
  });
}

// ─── Shares Hooks ────────────────────────────────────────────────────────────

export function useShares() {
  return useQuery({
    queryKey: ["shares"],
    queryFn: listShares,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileId, durationMinutes }: { fileId: number; durationMinutes?: number }) =>
      createShare(fileId, durationMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success("Share link created");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to create share link";
      toast.error(msg);
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success("Share link revoked");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.error?.message || error.message || "Failed to revoke share link";
      toast.error(msg);
    },
  });
}

// ─── Storage Hooks ───────────────────────────────────────────────────────────

export function useStorageUsage() {
  return useQuery({
    queryKey: ["storage", "usage"],
    queryFn: getStorageUsage,
    refetchInterval: 30000,
  });
}

