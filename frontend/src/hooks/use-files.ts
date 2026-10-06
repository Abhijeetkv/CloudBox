import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFiles, getFile, uploadFile, deleteFile, downloadFile } from "@/lib/auth";
import { toast } from "sonner";

export function useFiles() {
  return useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
  });
}

export function useFile(id: number) {
  return useQuery({
    queryKey: ["files", id],
    queryFn: () => getFile(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload file");
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("File deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: ({ id, filename }: { id: number; filename: string }) =>
      downloadFile(id, filename),
    onError: (error: Error) => {
      toast.error(error.message || "Failed to download file");
    },
  });
}
