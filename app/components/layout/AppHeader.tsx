import { useState, useMemo, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Printer, Eye, Settings, Home, Menu } from "lucide-react";
import { springPresets, useReducedMotion } from "~/utils/animations";
import { useMobileDetection } from "~/hooks/useMobileDetection";
import { Button } from "../ui/button";

export interface AppHeaderProps {
  id?: string;
  actions?: ReactNode;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  onPrintClick?: () => void;
  onPrintPreviewClick?: () => void;
  onDataManagerClick?: () => void;
  isPrintPreview?: boolean;
}

export function AppHeader({
  id,
  actions,
  showCreateButton = false,
  onCreateClick,
  onPrintClick,
  onPrintPreviewClick,
  onDataManagerClick,
  isPrintPreview = false,
}: AppHeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMobileDetection();

  const hasAnimated = useMemo(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nav-animated") === "true";
  }, []);

  const handleMobileMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  const handleMobileAction = (action?: () => void) => {
    action?.();
    closeMobileMenu();
  };

  return (
    <>
      {isPrintPreview && (
        <button className="print-preview-toggle" onClick={onPrintPreviewClick}>
          退出打印预览
        </button>
      )}

      <header
        className={`bg-background/95 sticky top-0 z-10 border-b backdrop-blur ${
          isMobile ? "header-landscape" : ""
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              Timetable
              {!isMobile && (
                <span className="text-muted-foreground ml-2 text-xs">
                  课程表
                </span>
              )}
            </Link>
          </div>

          {!isMobile && id && (
            <nav className="flex items-center gap-2 text-sm">
              <motion.div
                initial={hasAnimated ? false : { opacity: 0, y: -10 }}
                animate={hasAnimated ? false : { opacity: 1, y: 0 }}
                transition={
                  hasAnimated ? {} : { ...springPresets.default, delay: 0.2 }
                }
              >
                <NavLink
                  to={`/`}
                  className={({ isActive }) =>
                    isActive ? "rounded bg-gray-200/50 px-4 py-2" : "px-4 py-2"
                  }
                >
                  主页面
                </NavLink>
              </motion.div>
              <motion.div
                initial={hasAnimated ? false : { opacity: 0, y: -10 }}
                animate={hasAnimated ? false : { opacity: 1, y: 0 }}
                transition={
                  hasAnimated ? {} : { ...springPresets.default, delay: 0.3 }
                }
              >
                <NavLink
                  to={`/t/${id}/edit-grid`}
                  className={({ isActive }) =>
                    isActive ? "rounded bg-gray-200/50 px-4 py-2" : "px-4 py-2"
                  }
                >
                  课表设置
                </NavLink>
              </motion.div>
            </nav>
          )}

          <div className="flex items-center gap-2">
            {showCreateButton && (
              <Button
                onClick={onCreateClick}
                size={isMobile ? "sm" : "sm"}
                asChild
              >
                <motion.button
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  initial={hasAnimated ? false : { opacity: 0, x: 20 }}
                  animate={hasAnimated ? false : { opacity: 1, x: 0 }}
                  transition={
                    hasAnimated ? {} : { ...springPresets.default, delay: 0.1 }
                  }
                >
                  {isMobile ? "+" : "创建课表"}
                </motion.button>
              </Button>
            )}

            {id && (
              <>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMobileMenuToggle}
                    className="p-2"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}

                {!isMobile && (
                  <>
                    <motion.button
                      onClick={onPrintClick}
                      className="text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-transparent px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                      title="打印课表"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                      initial={hasAnimated ? false : { opacity: 0, scale: 0.8 }}
                      animate={hasAnimated ? false : { opacity: 1, scale: 1 }}
                      transition={
                        hasAnimated
                          ? {}
                          : { ...springPresets.snappy, delay: 0.3 }
                      }
                    >
                      <Printer className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      onClick={onPrintPreviewClick}
                      className="text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-transparent px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                      title="打印预览"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                      initial={hasAnimated ? false : { opacity: 0, scale: 0.8 }}
                      animate={hasAnimated ? false : { opacity: 1, scale: 1 }}
                      transition={
                        hasAnimated
                          ? {}
                          : { ...springPresets.snappy, delay: 0.35 }
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      onClick={onDataManagerClick}
                      className="text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-transparent px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                      title="数据管理"
                      whileHover={
                        prefersReducedMotion ? {} : { scale: 1.05, rotate: 5 }
                      }
                      whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                      initial={hasAnimated ? false : { opacity: 0, scale: 0.8 }}
                      animate={hasAnimated ? false : { opacity: 1, scale: 1 }}
                      transition={
                        hasAnimated
                          ? {}
                          : { ...springPresets.snappy, delay: 0.4 }
                      }
                    >
                      <Settings className="h-4 w-4" />
                    </motion.button>
                  </>
                )}
              </>
            )}
            {actions}
          </div>
        </div>

        <AnimatePresence>
          {isMobile && showMobileMenu && id && (
            <motion.div
              className="bg-background border-t shadow-lg"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <nav className="container mx-auto flex flex-col py-2">
                <NavLink
                  to={`/`}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""} justify-start`
                  }
                  onClick={closeMobileMenu}
                >
                  <Home className="mr-2 h-4 w-4" />
                  主页面
                </NavLink>
                <NavLink
                  to={`/t/${id}/edit-grid`}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""} justify-start`
                  }
                  onClick={closeMobileMenu}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  课表设置
                </NavLink>
                <button
                  onClick={() => handleMobileAction(onPrintClick)}
                  className="nav-link justify-start"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  打印课表
                </button>
                <button
                  onClick={() => handleMobileAction(onPrintPreviewClick)}
                  className="nav-link justify-start"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  打印预览
                </button>
                <button
                  onClick={() => handleMobileAction(onDataManagerClick)}
                  className="nav-link justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  数据管理
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
