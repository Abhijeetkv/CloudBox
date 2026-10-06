import api from "./api";
import type {
  LoginResponse,
  RegisterResponse,
  MeResponse,
  UploadResponse,
  FileItem,
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

export async function listFiles(): Promise<FileItem[]> {
  const { data } = await api.get<ApiResponse<FileItem[]>>("/api/files");
  return data.data || [];
}

export async function getFile(id: number): Promise<FileItem> {
  const { data } = await api.get<ApiResponse<FileItem>>(`/api/files/${id}`);
  return data.data!;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<UploadResponse>("/api/files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteFile(
  id: number
): Promise<ApiResponse<string>> {
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
