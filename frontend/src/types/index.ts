// CloudBox API Types — mirrors the Go backend models

export interface User {
  id: number;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface FileItem {
  id: number;
  user_id: number;
  filename: string;
  storage_key: string;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  data?: {
    id: number;
    email: string;
    created_at: string;
  };
  error?: string;
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
  error?: string;
}

export interface MeResponse {
  success: boolean;
  data?: {
    user_id: number;
    email: string;
  };
  error?: string;
}
