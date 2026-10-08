"use client";

import { useState } from "react";
import { Share2, Copy, Check, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateShare } from "@/hooks/use-files";
import type { FileItem } from "@/types";
import { toast } from "sonner";

interface ShareModalProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ file, open, onOpenChange }: ShareModalProps) {
  const [durationMinutes, setDurationMinutes] = useState<number>(1440); // 24 hours default
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShareMutation = useCreateShare();

  const handleGenerateShare = () => {
    if (!file) return;

    createShareMutation.mutate(
      {
        fileId: file.id,
        durationMinutes: durationMinutes === 0 ? undefined : durationMinutes,
      },
      {
        onSuccess: (share) => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const link = `${origin}/shared/${share.token}`;
          setGeneratedUrl(link);
        },
      }
    );
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Share link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Share2 className="h-4.5 w-4.5 text-sky-600" />
            Share &quot;{file?.filename}&quot;
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Create a secure temporary link for anyone to download this file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4">
          {!generatedUrl ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Link Expiration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value={60}>1 Hour</option>
                  <option value={1440}>24 Hours (1 Day)</option>
                  <option value={10080}>7 Days</option>
                  <option value={43200}>30 Days</option>
                  <option value={0}>Never expires</option>
                </select>
              </div>

              <div className="rounded-lg bg-sky-50/60 border border-sky-100 p-3 text-xs text-sky-800 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  Recipients do not need an account. CloudBox will generate an ephemeral secure presigned S3 token when they visit the link.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedUrl}
                  className="bg-slate-50 border-slate-200 text-xs h-9 font-mono text-slate-700 select-all"
                />
                <Button
                  onClick={handleCopy}
                  size="sm"
                  className="h-9 px-3 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="text-xs border-slate-200 text-slate-700"
          >
            {generatedUrl ? "Done" : "Cancel"}
          </Button>
          {!generatedUrl && (
            <Button
              size="sm"
              onClick={handleGenerateShare}
              disabled={createShareMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium"
            >
              {createShareMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Create Link"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
