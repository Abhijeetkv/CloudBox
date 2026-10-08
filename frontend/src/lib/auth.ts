import api from "./api";
import type {
  LoginResponse,
  RegisterResponse,
  MeResponse,
  UploadResponse,
  FileItem,
  Folder,
  Share,
  ShareInfo,
  StorageUsage,
  PresignedUploadResponse,
  ApiResponse,
} from "@/types";

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
  return data;
}

export async function registerUser(
  email: string,
  password: string
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/api/auth/register", {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/api/auth/me");
  return data;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function listFiles(folderId?: number | null): Promise<FileItem[]> {
  const params: Record<string, any> = {};
  if (folderId !== undefined && folderId !== null) {
    params.folder_id = folderId;
  }
  const { data } = await api.get<ApiResponse<FileItem[]>>("/api/files", { params });
  return data.data || [];
}

export async function searchFiles(query: string): Promise<FileItem[]> {
  const { data } = await api.get<ApiResponse<FileItem[]>>("/api/files/search", {
    params: { q: query },
  });
  return data.data || [];
}

export async function getFile(id: number): Promise<FileItem> {
  const { data } = await api.get<ApiResponse<FileItem>>(`/api/files/${id}`);
  return data.data!;
}

export async function uploadFile(file: File, folderId?: number | null): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId !== undefined && folderId !== null) {
    formData.append("folder_id", folderId.toString());
  }
  const { data } = await api.post<UploadResponse>("/api/files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  size: number,
  folderId?: number | null
): Promise<PresignedUploadResponse> {
  const { data } = await api.post<ApiResponse<PresignedUploadResponse>>("/api/files/upload-url", {
    filename,
    mime_type: mimeType,
    size,
    folder_id: folderId || null,
  });
  return data.data!;
}

export async function confirmUpload(
  storageKey: string,
  filename: string,
  size: number,
  mimeType: string,
  folderId?: number | null
): Promise<FileItem> {
  const { data } = await api.post<ApiResponse<FileItem>>("/api/files/confirm-upload", {
    storage_key: storageKey,
    filename,
    size,
    mime_type: mimeType,
    folder_id: folderId || null,
  });
  return data.data!;
}

export async function renameFile(id: number, filename: string): Promise<FileItem> {
  const { data } = await api.patch<ApiResponse<FileItem>>(`/api/files/${id}`, {
    filename,
  });
  return data.data!;
}

export async function moveFile(id: number, folderId: number | null): Promise<FileItem> {
  const { data } = await api.patch<ApiResponse<FileItem>>(`/api/files/${id}`, {
    folder_id: folderId,
  });
  return data.data!;
}

export async function deleteFile(id: number): Promise<ApiResponse<string>> {
  const { data } = await api.delete<ApiResponse<string>>(`/api/files/${id}`);
  return data;
}

export function getDownloadUrl(id: number): string {
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/files/${id}/download`;
}

export async function downloadFile(id: number, filename: string): Promise<void> {
  const response = await api.get(`/api/files/${id}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Folders ─────────────────────────────────────────────────────────────────

export async function listFolders(parentId?: number | null): Promise<Folder[]> {
  const params: Record<string, any> = {};
  if (parentId !== undefined && parentId !== null) {
    params.parent_id = parentId;
  }
  const { data } = await api.get<ApiResponse<Folder[]>>("/api/folders", { params });
  return data.data || [];
}

export async function createFolder(name: string, parentId?: number | null): Promise<Folder> {
  const { data } = await api.post<ApiResponse<Folder>>("/api/folders", {
    name,
    parent_id: parentId || null,
  });
  return data.data!;
}

export async function renameFolder(id: number, name: string): Promise<Folder> {
  const { data } = await api.patch<ApiResponse<Folder>>(`/api/folders/${id}`, {
    name,
  });
  return data.data!;
}

export async function moveFolder(id: number, newParentId: number | null): Promise<Folder> {
  const { data } = await api.patch<ApiResponse<Folder>>(`/api/folders/${id}`, {
    parent_id: newParentId,
  });
  return data.data!;
}

export async function deleteFolder(id: number): Promise<ApiResponse<string>> {
  const { data } = await api.delete<ApiResponse<string>>(`/api/folders/${id}`);
  return data;
}

// ─── Shares ──────────────────────────────────────────────────────────────────

export async function createShare(fileId: number, durationMinutes?: number): Promise<Share> {
  const { data } = await api.post<ApiResponse<Share>>("/api/shares", {
    file_id: fileId,
    duration_minutes: durationMinutes,
  });
  return data.data!;
}

export async function getShare(token: string): Promise<ShareInfo> {
  const { data } = await api.get<ApiResponse<ShareInfo>>(`/api/shares/${token}`);
  return data.data!;
}

export async function listShares(): Promise<Share[]> {
  const { data } = await api.get<ApiResponse<Share[]>>("/api/shares");
  return data.data || [];
}

export async function deleteShare(id: number): Promise<ApiResponse<string>> {
  const { data } = await api.delete<ApiResponse<string>>(`/api/shares/${id}`);
  return data;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export async function getStorageUsage(): Promise<StorageUsage> {
  const { data } = await api.get<ApiResponse<StorageUsage>>("/api/storage/usage");
  return data.data || { used: 0, limit: 53687091200, percentage: 0 };
}

