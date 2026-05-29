import { useEffect, useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { APP_NAME } from "@/constants";

/** URLs longer than this are likely to be rejected by browsers/servers. */
const URL_LENGTH_WARNING_THRESHOLD = 8000;

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
}

export function ShareDialog({ open, onOpenChange, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // Auto-copy the link when the dialog opens with a ready URL.
  useEffect(() => {
    if (!open || !url) {
      setCopied(false);
      return;
    }
    let cancelled = false;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        if (!cancelled) setCopied(true);
      })
      .catch(() => {
        if (!cancelled) setCopied(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const tooLong = url != null && url.length > URL_LENGTH_WARNING_THRESHOLD;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share worksheet</DialogTitle>
          <DialogDescription>
            Anyone with this link can open a read-only preview of your worksheet
            in {APP_NAME}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url ?? "Generating link…"}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 font-mono text-xs"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={copyUrl}
            disabled={!url}
            aria-label="Copy link"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        {copied && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md text-green-700 dark:text-green-400 text-xs">
            <Check className="size-4 shrink-0" />
            <span>Link copied to clipboard.</span>
          </div>
        )}
        {tooLong && (
          <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              This link is very long and may not work everywhere. Consider using
              Export to share a Markdown file instead.
            </span>
          </div>
        )}
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
