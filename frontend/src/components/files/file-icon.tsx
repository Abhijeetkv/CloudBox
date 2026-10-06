import {
  FileText,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Archive,
  File,
  FileType,
} from "lucide-react";
import { getFileCategory } from "@/lib/utils";

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export function FileIcon({ mimeType, className = "h-5 w-5" }: FileIconProps) {
  const category = getFileCategory(mimeType);

  switch (category) {
    case "image":
      return <Image className={`${className} text-emerald-600`} />;
    case "video":
      return <Video className={`${className} text-purple-600`} />;
    case "audio":
      return <Music className={`${className} text-pink-600`} />;
    case "pdf":
      return <FileType className={`${className} text-red-600`} />;
    case "document":
      return <FileText className={`${className} text-blue-600`} />;
    case "spreadsheet":
      return <FileSpreadsheet className={`${className} text-green-600`} />;
    case "archive":
      return <Archive className={`${className} text-amber-600`} />;
    default:
      return <File className={`${className} text-zinc-500`} />;
  }
}
