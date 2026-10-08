// CloudBox API Types — mirrors the Go backend models

export interface User {
  id: number;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Folder {
  id: number;
  user_id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface FileItem {
  id: number;
  user_id: number;
  folder_id: number | null;
  filename: string;
  storage_key: string;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export interface StorageUsage {
  used: number;
  limit: number;
  percentage: number;
}

export interface Share {
  id: number;
  file_id: number;
  user_id: number;
  token: string;
  expires_at: string | null;
  created_at: string;
  file?: FileItem;
}

export interface ShareInfo {
  file_id: number;
  filename: string;
  size: number;
  mime_type: string;
  download_url: string;
  expires_at: string | null;
}

export interface PresignedUploadResponse {
  upload_url: string;
  storage_key: string;
  expires_in: number;
  filename: string;
  folder_id: number | null;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  } | string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: {
      id: number;
      email: string;
    };
  };
  error?: any;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    id: number;
    email: string;
    created_at: string;
  };
  error?: any;
}

export interface UploadResponse {
  success: boolean;
  file?: {
    id: number;
    filename: string;
    size: number;
    mime_type: string;
    created_at: string;
  };
  data?: FileItem;
  error?: any;
}

export interface MeResponse {
  success: boolean;
  data?: {
    user_id: number;
    email: string;
  };
  error?: any;
}

