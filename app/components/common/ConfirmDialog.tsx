import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  isMobile?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  confirmVariant = "default",
  onConfirm,
  onCancel,
  loading = false,
  isMobile = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent
        className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
      >
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className={`text-gray-600 ${isMobile ? "text-sm" : ""}`}>
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>

        <DialogFooter className={isMobile ? "flex-col gap-2" : "justify-end"}>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            size={isMobile ? "default" : "default"}
            className={isMobile ? "w-full" : ""}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            size={isMobile ? "default" : "default"}
            className={isMobile ? "w-full" : ""}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
