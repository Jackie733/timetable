import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence } from "motion/react";
import DataManager from "../DataManager";
import { AppHeader } from "./AppHeader";
import { CreateTimetableModal } from "./CreateTimetableModal";
import { usePrintManager } from "./PrintManager";
import { useOriginAwareAnimation } from "../../utils/animations";

export interface AppLayoutProps {
  id?: string;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  showCreateButton?: boolean;
}

export function AppLayout({
  id,
  title,
  children,
  actions,
  showCreateButton = false,
}: AppLayoutProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const dataManagerButtonRef = useRef<HTMLButtonElement>(null);

  const { onPrint } = usePrintManager();

  const dataManagerOrigin = useOriginAwareAnimation(
    dataManagerButtonRef as RefObject<HTMLElement>
  );

  const hasAnimated = useMemo(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nav-animated") === "true";
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !hasAnimated) {
      sessionStorage.setItem("nav-animated", "true");
    }
  }, [hasAnimated]);

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleCreateClose = () => {
    setShowCreateModal(false);
  };

  const handlePrintPreviewToggle = () => {
    setIsPrintPreview(!isPrintPreview);
  };

  const handleDataManagerOpen = () => {
    setShowDataManager(true);
  };

  const handleDataManagerClose = () => {
    setShowDataManager(false);
  };

  return (
    <div
      className={`flex min-h-[100svh] flex-col ${
        isPrintPreview ? "print-preview-mode" : ""
      }`}
    >
      <AppHeader
        id={id}
        actions={actions}
        showCreateButton={showCreateButton}
        onCreateClick={handleCreateClick}
        onPrintClick={onPrint}
        onPrintPreviewClick={handlePrintPreviewToggle}
        onDataManagerClick={handleDataManagerOpen}
        isPrintPreview={isPrintPreview}
      />

      <main className="container mx-auto flex flex-1 flex-col px-2 py-4 sm:px-4 sm:py-6">
        <div className="print-keep-together flex flex-1 flex-col">
          {title && (
            <div className="print-header">
              <h1 className="print-title mb-4 text-lg font-semibold sm:text-xl">
                {title}
              </h1>
            </div>
          )}
          <div className="print-timetable-container flex flex-1 flex-col">
            {children}
          </div>
        </div>
      </main>

      <CreateTimetableModal
        isOpen={showCreateModal}
        onClose={handleCreateClose}
      />

      <AnimatePresence>
        {showDataManager && (
          <div
            style={{
              transformOrigin: `${dataManagerOrigin.x} ${dataManagerOrigin.y}`,
            }}
          >
            <DataManager onClose={handleDataManagerClose} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
