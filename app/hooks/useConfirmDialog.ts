import { useState, useCallback } from "react";

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export interface UseConfirmDialogResult {
  confirmDialog: ConfirmDialogState;
  showConfirm: (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      confirmVariant?: "default" | "destructive";
    }
  ) => Promise<boolean>;
  hideConfirm: () => void;
}

export function useConfirmDialog(): UseConfirmDialogResult {
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: undefined as string | undefined,
    cancelText: undefined as string | undefined,
    confirmVariant: "default" as "default" | "destructive",
  });

  const handleConfirm = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      options: {
        confirmText?: string;
        cancelText?: string;
        confirmVariant?: "default" | "destructive";
      } = {}
    ): Promise<boolean> => {
      return new Promise(resolve => {
        setDialogState({
          isOpen: true,
          title,
          message,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          confirmVariant: options.confirmVariant || "default",
        });
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const hideConfirm = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const confirmDialog: ConfirmDialogState = {
    ...dialogState,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return {
    confirmDialog,
    showConfirm,
    hideConfirm,
  };
}
