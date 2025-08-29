import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export interface InputDialogProps {
  isOpen: boolean;
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  loading?: boolean;
  isMobile?: boolean;
  required?: boolean;
  type?: "text" | "number" | "email";
}

export function InputDialog({
  isOpen,
  title,
  label,
  placeholder,
  defaultValue = "",
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
  loading = false,
  isMobile = false,
  required = false,
  type = "text",
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  const handleConfirm = () => {
    if (required && !value.trim()) return;
    onConfirm(value);
  };

  const handleCancel = () => {
    setValue(defaultValue);
    onCancel();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent
        className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
      >
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {label && (
            <Label htmlFor="input-field" className={isMobile ? "text-sm" : ""}>
              {label}
            </Label>
          )}
          <Input
            id="input-field"
            type={type}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={isMobile ? "mt-1" : ""}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter className={isMobile ? "flex-col gap-2" : "justify-end"}>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            size={isMobile ? "default" : "default"}
            className={isMobile ? "w-full" : ""}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (required && !value.trim())}
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
