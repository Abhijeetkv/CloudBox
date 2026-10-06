"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ApiDocsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiDocsModal({ open, onOpenChange }: ApiDocsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const endpoints = [
    {
      method: "POST",
      path: "/api/files",
      desc: "Upload multipart file to MinIO object storage and index metadata in PostgreSQL.",
      curl: `curl -X POST http://localhost:8080/api/files \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@document.pdf"`,
    },
    {
      method: "GET",
      path: "/api/files",
      desc: "Retrieve list of all active storage objects for authenticated user.",
      curl: `curl -X GET http://localhost:8080/api/files \\
  -H "Authorization: Bearer <TOKEN>"`,
    },
    {
      method: "GET",
      path: "/api/files/:id/download",
      desc: "Stream object binary stream directly from MinIO with Content-Disposition.",
      curl: `curl -O -J http://localhost:8080/api/files/1/download \\
  -H "Authorization: Bearer <TOKEN>"`,
    },
    {
      method: "DELETE",
      path: "/api/files/:id",
      desc: "Evict object from MinIO S3 bucket, invalidate Redis cache, and delete record.",
      curl: `curl -X DELETE http://localhost:8080/api/files/1 \\
  -H "Authorization: Bearer <TOKEN>"`,
    },
    {
      method: "POST",
      path: "/api/auth/login",
      desc: "Authenticate user and receive 24-hour JWT token.",
      curl: `curl -X POST http://localhost:8080/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"secretpassword"}'`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("cURL example copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">CloudBox S3 & REST API Documentation</DialogTitle>
              <DialogDescription className="text-xs">
                Official REST endpoints exposed by the Go/Gin storage microservice on port 8080.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-2">
          {endpoints.map((ep, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      ep.method === "POST"
                        ? "bg-emerald-100 text-emerald-800"
                        : ep.method === "GET"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">{ep.path}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  onClick={() => handleCopy(ep.curl, idx)}
                >
                  {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>

              <p className="text-xs text-slate-500">{ep.desc}</p>

              <div className="rounded-lg bg-slate-900 p-2.5 overflow-x-auto">
                <pre className="font-mono text-[11px] text-slate-200">{ep.curl}</pre>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
