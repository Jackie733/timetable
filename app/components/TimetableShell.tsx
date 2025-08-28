import React from "react";
import { Link, NavLink, Form, useNavigation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import DataManager from "./DataManager";
import {
  springPresets,
  useReducedMotion,
  useOriginAwareAnimation,
} from "../utils/animations";

export function TimetableShell(props: {
  id?: string;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  showCreateButton?: boolean;
}) {
  const { id, title, children, actions, showCreateButton = false } = props;
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showDataManager, setShowDataManager] = React.useState(false);
  const dataManagerButtonRef = React.useRef<HTMLButtonElement>(null);
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const prefersReducedMotion = useReducedMotion();
  const dataManagerOrigin = useOriginAwareAnimation(
    dataManagerButtonRef as React.RefObject<HTMLElement>
  );

  return (
    <div className="flex min-h-[100svh] flex-col">
      <header className="sticky top-0 z-10 border-b bg-[color:var(--surface)/0.8] backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="hero-title font-semibold tracking-tight">
            Timetable <span className="hero-subtitle ml-2">课程表</span>
          </Link>
          <div className="flex items-center gap-2">
            {showCreateButton && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary text-sm"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springPresets.default, delay: 0.1 }}
              >
                创建课表
              </motion.button>
            )}
            {id && (
              <>
                <nav className="hidden items-center gap-1 text-sm sm:flex">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springPresets.default, delay: 0.2 }}
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
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springPresets.default, delay: 0.3 }}
                  >
                    <NavLink
                      to={`/t/${id}/edit-grid`}
                      className={({ isActive }) =>
                        isActive ? "nav-link active" : "nav-link"
                      }
                    >
                      网格设置
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springPresets.snappy, delay: 0.4 }}
                >
                  🛠️
                </motion.button>
              </>
            )}
            {actions}
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 py-6">
        {title && <h1 className="mb-4 text-xl font-semibold">{title}</h1>}
        {children}
      </main>
      <footer className="border-t py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Timetable
      </footer>

      {/* Create Timetable Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="card w-full max-w-md p-4">
            <div className="mb-3 text-lg font-medium">创建新课表</div>
            <Form
              method="post"
              onSubmit={() => setShowCreateModal(false)}
              className="space-y-3"
            >
              <div>
                <label className="label">名称</label>
                <input
                  name="name"
                  placeholder="例如：张老师-春季学期"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="label">模式</label>
                <select name="type" className="select w-full">
                  <option value="teacher">老师课表</option>
                  <option value="student">学生课表</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost text-sm"
                >
                  取消
                </button>
                <button disabled={busy} className="btn btn-primary">
                  {busy ? "创建中…" : "创建"}
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Data Manager Modal */}
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
