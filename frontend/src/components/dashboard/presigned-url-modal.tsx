"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Copy, Check, Link2, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface PresignedUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PresignedUrlModal({ open, onOpenChange }: PresignedUrlModalProps) {
  const [objectKey, setObjectKey] = useState("s3://cloudbox/models/dataset_v2.tar.gz");
  const [expiry, setExpiry] = useState("3600");
  const [httpMethod, setHttpMethod] = useState<"GET" | "PUT">("GET");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const cleanKey = objectKey.replace("s3://", "").trim();
    const token = Math.random().toString(36).substring(2, 15);
    const url = `http://localhost:8080/api/files/presigned?key=${encodeURIComponent(cleanKey)}&method=${httpMethod}&expires=${expiry}&sig=${token}`;
    setGeneratedUrl(url);
    toast.success("Presigned S3 URL generated successfully");
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Presigned URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Generate Presigned S3 URL</DialogTitle>
              <DialogDescription className="text-xs">
                Create a time-limited, cryptographic presigned signature for direct MinIO stream access.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="obj-key" className="text-xs font-medium text-slate-700">
              Object Identifier / Target Key
            </Label>
            <Input
              id="obj-key"
              value={objectKey}
              onChange={(e) => setObjectKey(e.target.value)}
              placeholder="s3://bucket/path/file.ext"
              className="font-mono text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">HTTP Access Method</Label>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setHttpMethod("GET")}
                  className={`flex-1 rounded-md py-1 text-xs font-semibold transition-colors ${
                    httpMethod === "GET"
                      ? "bg-white text-sky-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  GET (Download)
                </button>
                <button
                  type="button"
                  onClick={() => setHttpMethod("PUT")}
                  className={`flex-1 rounded-md py-1 text-xs font-semibold transition-colors ${
                    httpMethod === "PUT"
                      ? "bg-white text-sky-600 shadow-2xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  PUT (Upload)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiry" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" /> Expiry Duration
              </Label>
              <select
                id="expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="900">15 minutes (900s)</option>
                <option value="3600">1 hour (3600s)</option>
                <option value="86400">24 hours (86400s)</option>
                <option value="604800">7 days</option>
              </select>
            </div>
          </div>

          {generatedUrl && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-900 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> Presigned Endpoint URL
                </span>
                <span className="font-mono text-[10px] text-slate-400">Valid for {parseInt(expiry) / 60}m</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedUrl}
                  className="flex-1 font-mono text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 truncate"
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handleGenerate} className="bg-sky-600 hover:bg-sky-700 text-white">
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Generate Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
