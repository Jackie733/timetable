import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, NavLink, Form, useNavigation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Printer, Eye, Settings, Home, Menu } from "lucide-react";
import DataManager from "./DataManager";
import {
  springPresets,
  useReducedMotion,
  useOriginAwareAnimation,
} from "../utils/animations";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";

export function TimetableShell(props: {
  id?: string;
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  showCreateButton?: boolean;
}) {
  const { id, title, children, actions, showCreateButton = false } = props;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDataManager, setShowDataManager] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const dataManagerButtonRef = useRef<HTMLButtonElement>(null);
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMobileDetection();
  const dataManagerOrigin = useOriginAwareAnimation(
    dataManagerButtonRef as RefObject<HTMLElement>
  );

  const hasAnimated = useMemo(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("nav-animated") === "true";
  }, []);

  // 打印函数
  const handlePrint = () => {
    // 设置打印日期
    const printDate = new Date().toLocaleDateString("zh-CN");
    const printHeader = document.querySelector(".print-header");
    if (printHeader) {
      printHeader.setAttribute("data-print-date", printDate);
    }
    window.print();
  };

  useEffect(() => {
    if (typeof window !== "undefined" && !hasAnimated) {
      sessionStorage.setItem("nav-animated", "true");
    }
  }, [hasAnimated]);

  return (
    <div
      className={`flex min-h-[100svh] flex-col ${isPrintPreview ? "print-preview-mode" : ""}`}
    >
      {isPrintPreview && (
        <button
          className="print-preview-toggle"
          onClick={() => setIsPrintPreview(false)}
        >
          退出打印预览
        </button>
      )}
      <header
        className={`bg-background/95 sticky top-0 z-10 border-b backdrop-blur ${isMobile ? "header-landscape" : ""}`}
      >
        <div className="container mx-auto flex items-center justify-between px-2 py-2 sm:px-4 sm:py-3">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <Link to="/" className="hero-title font-semibold tracking-tight">
              Timetable
              {!isMobile && <span className="hero-subtitle ml-2">课程表</span>}
            </Link>
          </div>

          {/* Desktop Navigation */}
          {!isMobile && id && (
            <nav className="flex items-center gap-1 text-sm">
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
                    isActive ? "nav-link active" : "nav-link"
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
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  课表设置
                </NavLink>
              </motion.div>
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {showCreateButton && (
              <Button
                onClick={() => setShowCreateModal(true)}
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
                {/* Mobile menu button */}
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}

                {!isMobile && (
                  <>
                    <motion.button
                      onClick={handlePrint}
                      className="btn btn-ghost text-sm"
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
                      onClick={() => setIsPrintPreview(!isPrintPreview)}
                      className="btn btn-ghost text-sm"
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
                      ref={dataManagerButtonRef}
                      onClick={() => setShowDataManager(true)}
                      className="btn btn-ghost text-sm"
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

        {/* Mobile menu dropdown */}
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
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Home className="mr-2 h-4 w-4" />
                  主页面
                </NavLink>
                <NavLink
                  to={`/t/${id}/edit-grid`}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""} justify-start`
                  }
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  课表设置
                </NavLink>
                <button
                  onClick={() => {
                    handlePrint();
                    setShowMobileMenu(false);
                  }}
                  className="nav-link justify-start"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  打印课表
                </button>
                <button
                  onClick={() => {
                    setIsPrintPreview(!isPrintPreview);
                    setShowMobileMenu(false);
                  }}
                  className="nav-link justify-start"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  打印预览
                </button>
                <button
                  onClick={() => {
                    setShowDataManager(true);
                    setShowMobileMenu(false);
                  }}
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

      <main className="container mx-auto flex-1 px-2 py-4 sm:px-4 sm:py-6">
        <div className="print-keep-together">
          {title && (
            <div className="print-header">
              <h1 className="print-title mb-4 text-lg font-semibold sm:text-xl">
                {title}
              </h1>
            </div>
          )}
          <div className="print-timetable-container">{children}</div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <Card
            className={`w-full p-4 ${isMobile ? "modal-mobile" : "max-w-md"}`}
          >
            <div
              className={`mb-3 font-medium ${isMobile ? "text-base" : "text-lg"}`}
            >
              创建新课表
            </div>
            <Form
              method="post"
              onSubmit={() => setShowCreateModal(false)}
              className="space-y-3"
            >
              <div>
                <Label>名称</Label>
                <Input
                  name="name"
                  placeholder="例如：张老师-春季学期"
                  required
                  className={isMobile ? "text-base" : ""}
                />
              </div>
              <div>
                <Label>模式</Label>
                <select
                  name="type"
                  className={`select w-full ${isMobile ? "min-h-[44px] text-base" : ""}`}
                >
                  <option value="teacher">老师课表</option>
                  <option value="student">学生课表</option>
                </select>
              </div>
              <div
                className={`flex gap-2 ${isMobile ? "flex-col pt-2" : "justify-end"}`}
              >
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="ghost"
                  size="sm"
                  className={isMobile ? "w-full" : ""}
                >
                  取消
                </Button>
                <Button disabled={busy} className={isMobile ? "w-full" : ""}>
                  {busy ? "创建中…" : "创建"}
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}

      <AnimatePresence>
        {showDataManager && (
          <div
            style={{
              transformOrigin: `${dataManagerOrigin.x} ${dataManagerOrigin.y}`,
            }}
          >
            <DataManager onClose={() => setShowDataManager(false)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
