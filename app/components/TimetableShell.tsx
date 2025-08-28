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
import DataManager from "./DataManager";
import {
  springPresets,
  useReducedMotion,
  useOriginAwareAnimation,
} from "../utils/animations";
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
  const dataManagerButtonRef = useRef<HTMLButtonElement>(null);
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const prefersReducedMotion = useReducedMotion();
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

  return (
    <div className="flex min-h-[100svh] flex-col">
      <header className="sticky top-0 z-10 border-b bg-[color:var(--surface)/0.8] backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-2 sm:px-4">
          <Link to="/" className="hero-title font-semibold tracking-tight">
            Timetable <span className="hero-subtitle ml-2">课程表</span>
          </Link>
          <div className="flex items-center gap-2">
            {showCreateButton && (
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
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
                  创建课表
                </motion.button>
              </Button>
            )}
            {id && (
              <>
                <nav className="hidden items-center gap-1 text-sm sm:flex">
                  <motion.div
                    initial={hasAnimated ? false : { opacity: 0, y: -10 }}
                    animate={hasAnimated ? false : { opacity: 1, y: 0 }}
                    transition={
                      hasAnimated
                        ? {}
                        : { ...springPresets.default, delay: 0.2 }
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
                      hasAnimated
                        ? {}
                        : { ...springPresets.default, delay: 0.3 }
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
                    hasAnimated ? {} : { ...springPresets.snappy, delay: 0.4 }
                  }
                >
                  🛠️
                </motion.button>
              </>
            )}
            {actions}
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-2 py-4 sm:px-4 sm:py-6">
        {title && (
          <h1 className="mb-4 text-lg font-semibold sm:text-xl">{title}</h1>
        )}
        {children}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <Card className="w-full max-w-md p-4">
            <div className="mb-3 text-lg font-medium">创建新课表</div>
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
                />
              </div>
              <div>
                <Label>模式</Label>
                <select name="type" className="select w-full">
                  <option value="teacher">老师课表</option>
                  <option value="student">学生课表</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="ghost"
                  size="sm"
                >
                  取消
                </Button>
                <Button disabled={busy}>{busy ? "创建中…" : "创建"}</Button>
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
