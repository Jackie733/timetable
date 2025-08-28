import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  db,
  type Timetable,
  type Course,
  type Session,
  type Backup,
} from "../db";
import {
  BatchOperations,
  DataIntegrityTools,
  ImportExportTools,
} from "../utils/batchOperations";
import {
  animationVariants,
  springPresets,
  transitions,
  useReducedMotion,
} from "../utils/animations";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";

const MotionButton = motion.create(Button);
const MotionCard = motion.create(Card);

type TabType = "backup" | "integrity" | "cleanup" | "deleted" | "batch";

interface IntegrityResult {
  isValid: boolean;
  issues: string[];
  orphanedRecords: {
    courses: Course[];
    sessions: Session[];
  };
}

interface DeletedRecords {
  timetables: Timetable[];
  courses: Course[];
  sessions: Session[];
}

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmVariant?: "default" | "destructive";
}

interface InputDialog {
  isOpen: boolean;
  title: string;
  placeholder: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function DataManager({ onClose }: { onClose: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<
    "backup" | "integrity" | "cleanup" | "deleted" | "batch"
  >("backup");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [integrityResult, setIntegrityResult] =
    useState<IntegrityResult | null>(null);
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecords>({
    timetables: [],
    courses: [],
    sessions: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTimetableId, setSelectedTimetableId] = useState<string>("");
  const [availableTimetables, setAvailableTimetables] = useState<Timetable[]>(
    []
  );
  const [batchResult, setBatchResult] = useState<string>("");

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const [inputDialog, setInputDialog] = useState<InputDialog>({
    isOpen: false,
    title: "",
    placeholder: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // 检测移动端
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "确定",
    confirmVariant: "default" | "destructive" = "default"
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      confirmText,
      confirmVariant,
    });
  };

  const showInputDialog = (
    title: string,
    placeholder: string,
    onConfirm: (value: string) => void,
    defaultValue = ""
  ) => {
    setInputDialog({
      isOpen: true,
      title,
      placeholder,
      defaultValue,
      onConfirm: (value: string) => {
        onConfirm(value);
        setInputDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setInputDialog(prev => ({ ...prev, isOpen: false })),
    });
  };

  const loadBackups = useCallback(async () => {
    try {
      const backupList = await db.getBackups();
      setBackups(backupList);
    } catch (error) {
      console.error("加载备份列表失败:", error);
    }
  }, []);

  const loadTimetables = useCallback(async () => {
    try {
      const timetables = await db.getActive(db.timetables).toArray();
      setAvailableTimetables(timetables);
      if (timetables.length > 0 && !selectedTimetableId) {
        setSelectedTimetableId(timetables[0].id);
      }
    } catch (error) {
      console.error("加载课表列表失败:", error);
    }
  }, [selectedTimetableId]);

  const checkIntegrity = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await db.checkDataIntegrity();
      setIntegrityResult(result);
    } catch (error) {
      console.error("数据完整性检查失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDeletedRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const [timetables, courses, sessions] = await Promise.all([
        db.getDeleted(db.timetables).toArray(),
        db.getDeleted(db.courses).toArray(),
        db.getDeleted(db.sessions).toArray(),
      ]);
      setDeletedRecords({ timetables, courses, sessions });
    } catch (error) {
      console.error("加载已删除记录失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBackup = async () => {
    showInputDialog("创建备份", "请输入备份名称", async (name: string) => {
      if (!name.trim()) return;

      setIsLoading(true);
      try {
        const backupId = await db.createBackup(name);
        toast.success(`备份创建成功！ID: ${backupId}`);
        await loadBackups();
      } catch (error) {
        toast.error(`备份创建失败: ${error}`);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const restoreBackup = async (backupId: string) => {
    showConfirm(
      "恢复备份",
      "确定要恢复此备份吗？这将覆盖当前数据。",
      async () => {
        setIsLoading(true);
        try {
          const result = await db.restoreBackup(backupId, {
            clearExisting: true,
          });
          if (result.success) {
            toast.success(
              `备份恢复成功！恢复了 ${result.restoredRecords} 条记录。`
            );
            window.location.reload(); // 刷新页面以反映数据变化
          } else {
            toast.error(`备份恢复失败: ${result.error}`);
          }
        } catch (error) {
          toast.error(`备份恢复失败: ${error}`);
        } finally {
          setIsLoading(false);
        }
      },
      "恢复",
      "destructive"
    );
  };

  const exportBackup = async (backupId: string, backupName: string) => {
    try {
      const blob = await db.exportBackup(backupId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timetable-backup-${backupName}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("备份导出成功！");
    } catch (error) {
      toast.error(`导出失败: ${error}`);
    }
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const backupId = await db.importBackup(file);
      toast.success(`备份导入成功！ID: ${backupId}`);
      await loadBackups();
    } catch (error) {
      toast.error(`导入失败: ${error}`);
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const cleanupOrphaned = async () => {
    showConfirm(
      "清理孤立记录",
      "确定要清理孤立记录吗？这些记录将被软删除。",
      async () => {
        setIsLoading(true);
        try {
          const result = await db.cleanupOrphanedRecords();
          toast.success(
            `清理完成！清理了 ${result.cleanedCourses} 个课程和 ${result.cleanedSessions} 个课时。`
          );
          await checkIntegrity();
        } catch (error) {
          toast.error(`清理失败: ${error}`);
        } finally {
          setIsLoading(false);
        }
      },
      "清理",
      "destructive"
    );
  };

  const restoreRecord = async (
    type: "timetable" | "course" | "session",
    id: string
  ) => {
    try {
      switch (type) {
        case "timetable":
          await db.restoreTimetable(id);
          break;
        case "course":
          await db.restoreCourse(id);
          break;
        case "session":
          await db.restoreSession(id);
          break;
      }
      toast.success("记录恢复成功！");
      await loadDeletedRecords();
    } catch (error) {
      toast.error(`恢复失败: ${error}`);
    }
  };

  const permanentDelete = async (
    type: "timetable" | "course" | "session",
    id: string
  ) => {
    showConfirm(
      "永久删除",
      "确定要永久删除此记录吗？此操作不可撤销！",
      async () => {
        try {
          switch (type) {
            case "timetable":
              await db.timetables.delete(id);
              break;
            case "course":
              await db.courses.delete(id);
              break;
            case "session":
              await db.sessions.delete(id);
              break;
          }
          toast.success("记录已永久删除！");
          await loadDeletedRecords();
        } catch (error) {
          toast.error(`删除失败: ${error}`);
        }
      },
      "永久删除",
      "destructive"
    );
  };

  const handleDuplicateTimetable = async () => {
    if (!selectedTimetableId) {
      toast.error("请选择要复制的课表");
      return;
    }

    showInputDialog("复制课表", "请输入新课表名称", async (newName: string) => {
      if (!newName.trim()) return;

      setIsLoading(true);
      try {
        const newTimetableId = await BatchOperations.duplicateTimetable(
          selectedTimetableId,
          newName
        );
        setBatchResult(`课表复制成功！新课表ID: ${newTimetableId}`);
        await loadTimetables();
        toast.success("课表复制成功！");
      } catch (error) {
        setBatchResult(`复制失败: ${error}`);
        toast.error(`复制失败: ${error}`);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleMergeDuplicateCourses = async () => {
    if (!selectedTimetableId) {
      toast.error("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        await BatchOperations.mergeDuplicateCourses(selectedTimetableId);
      const message = `合并完成！处理了 ${result.mergedCount} 个重复课程，删除了 ${result.removedCourseIds.length} 个重复记录`;
      setBatchResult(message);
      toast.success("重复课程合并成功！");
    } catch (error) {
      setBatchResult(`合并失败: ${error}`);
      toast.error(`合并失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixTimeConflicts = async () => {
    if (!selectedTimetableId) {
      toast.error("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        await DataIntegrityTools.fixTimeConflicts(selectedTimetableId);
      const message = `时间冲突修复完成！发现 ${result.conflictsFound} 个冲突，修复了 ${result.conflictsFixed} 个`;
      setBatchResult(message);
      toast.success("时间冲突修复成功！");
    } catch (error) {
      setBatchResult(`修复失败: ${error}`);
      toast.error(`修复失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardizeTime = async () => {
    if (!selectedTimetableId) {
      toast.error("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      await DataIntegrityTools.standardizeTimeFormats(selectedTimetableId);
      setBatchResult("时间格式标准化完成！所有时间已调整为15分钟的倍数");
      toast.success("时间格式标准化成功！");
    } catch (error) {
      setBatchResult(`标准化失败: ${error}`);
      toast.error(`标准化失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedTimetableId) {
      toast.error("请选择要导出的课表");
      return;
    }

    setIsLoading(true);
    try {
      const csv = await ImportExportTools.exportToCSV(selectedTimetableId);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `timetable_${selectedTimetableId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setBatchResult("CSV导出成功！");
      toast.success("CSV导出成功！");
    } catch (error) {
      setBatchResult(`导出失败: ${error}`);
      toast.error(`导出失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "backup") {
      loadBackups();
    } else if (activeTab === "integrity") {
      checkIntegrity();
    } else if (activeTab === "deleted") {
      loadDeletedRecords();
    } else if (activeTab === "batch") {
      loadTimetables();
    }
  }, [
    activeTab,
    loadBackups,
    checkIntegrity,
    loadDeletedRecords,
    loadTimetables,
  ]);

  const tabs = [
    { id: "backup", label: "备份管理" },
    { id: "integrity", label: "完整性检查" },
    { id: "cleanup", label: "数据清理" },
    { id: "deleted", label: "回收站" },
    { id: "batch", label: "批量操作" },
  ];

  const modalVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : animationVariants.modal;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transitions.fast}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className={`card overflow-hidden ${
          isMobile 
            ? "modal-mobile max-h-[90vh] w-full" 
            : "max-h-[80vh] w-full max-w-4xl"
        }`}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={springPresets.gentle}
        style={{
          transformOrigin: "center center",
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
            <h2 className={`font-medium ${isMobile ? "text-base" : "text-lg"}`}>数据管理</h2>
            <MotionButton
              onClick={onClose}
              variant="ghost"
              disabled={isLoading}
              size={isMobile ? "sm" : "default"}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={transitions.hover}
            >
              关闭
            </MotionButton>
          </div>

          <div className={`border-b border-[color:var(--border)] ${isMobile ? "overflow-x-auto" : "flex"}`}>
            <div className={`${isMobile ? "flex min-w-max" : "flex w-full"}`}>
              {tabs.map(tab => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[color:var(--primary)] text-[color:var(--primary)]"
                      : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]"
                  }`}
                  whileHover={prefersReducedMotion ? {} : { y: -1 }}
                  whileTap={prefersReducedMotion ? {} : { y: 0 }}
                  transition={transitions.hover}
                >
                  {tab.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 mobile-scroll">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  className="flex items-center justify-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transitions.fast}
                >
                  <div className="text-[color:var(--muted)]">加载中...</div>
                </motion.div>
              )}

              {activeTab === "backup" && !isLoading && (
                <motion.div
                  key="backup"
                  className="space-y-4"
                  variants={
                    prefersReducedMotion
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : animationVariants.tabContent
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springPresets.default}
                >
                  <div className="flex gap-2">
                    <MotionButton
                      onClick={createBackup}
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      transition={transitions.hover}
                    >
                      创建备份
                    </MotionButton>
                    <MotionButton
                      variant="secondary"
                      asChild
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      transition={transitions.hover}
                    >
                      <label className="cursor-pointer">
                        导入备份
                        <input
                          type="file"
                          accept=".json"
                          onChange={importBackup}
                          className="hidden"
                        />
                      </label>
                    </MotionButton>
                  </div>

                  <div className="space-y-2">
                    {backups.length === 0 ? (
                      <div className="py-8 text-center text-[color:var(--muted)]">
                        暂无备份
                      </div>
                    ) : (
                      backups.map(backup => (
                        <div
                          key={backup.id}
                          className="surface flex items-center justify-between rounded-lg p-3"
                        >
                          <div>
                            <div className="font-medium">{backup.name}</div>
                            <div className="text-sm text-[color:var(--muted)]">
                              {new Date(
                                backup.createdAt || ""
                              ).toLocaleString()}{" "}
                              • {backup.recordCount} 条记录 •{" "}
                              {Math.round(backup.size / 1024)}KB
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                exportBackup(backup.id, backup.name)
                              }
                            >
                              导出
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => restoreBackup(backup.id)}
                            >
                              恢复
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                db.deleteBackup(backup.id).then(loadBackups)
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "integrity" && !isLoading && integrityResult && (
                <motion.div
                  key="integrity"
                  className="space-y-4"
                  variants={
                    prefersReducedMotion
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : animationVariants.tabContent
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springPresets.default}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`font-medium ${integrityResult.isValid ? "text-green-600" : "text-red-600"}`}
                    >
                      {integrityResult.isValid
                        ? "✅ 数据完整性良好"
                        : "⚠️ 发现数据完整性问题"}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={checkIntegrity}
                    >
                      重新检查
                    </Button>
                  </div>

                  {integrityResult.issues.length > 0 && (
                    <div className="surface rounded-lg p-3">
                      <div className="mb-2 font-medium">发现的问题:</div>
                      <ul className="space-y-1 text-sm">
                        {integrityResult.issues.map(
                          (issue: string, index: number) => (
                            <li key={index} className="text-red-600">
                              • {issue}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  {integrityResult.orphanedRecords.courses.length > 0 && (
                    <div className="surface rounded-lg p-3">
                      <div className="mb-2 font-medium">
                        孤立课程 (
                        {integrityResult.orphanedRecords.courses.length}
                        ):
                      </div>
                      <div className="space-y-1 text-sm">
                        {integrityResult.orphanedRecords.courses.map(
                          (course: Course) => (
                            <div key={course.id}>
                              • {course.title} (ID: {course.id})
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {integrityResult.orphanedRecords.sessions.length > 0 && (
                    <div className="surface rounded-lg p-3">
                      <div className="mb-2 font-medium">
                        孤立课时 (
                        {integrityResult.orphanedRecords.sessions.length}):
                      </div>
                      <div className="space-y-1 text-sm">
                        {integrityResult.orphanedRecords.sessions.map(
                          (session: Session) => (
                            <div key={session.id}>• Session {session.id}</div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "cleanup" && !isLoading && (
                <motion.div
                  key="cleanup"
                  className="space-y-4"
                  variants={
                    prefersReducedMotion
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : animationVariants.tabContent
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springPresets.default}
                >
                  <div className="surface rounded-lg p-4">
                    <div className="mb-2 font-medium">清理孤立记录</div>
                    <p className="mb-3 text-sm text-[color:var(--muted)]">
                      清理引用不存在课表或课程的记录。这些记录将被软删除，可在回收站中恢复。
                    </p>
                    <Button variant="destructive" onClick={cleanupOrphaned}>
                      开始清理
                    </Button>
                  </div>

                  <div className="surface rounded-lg p-4">
                    <div className="mb-2 font-medium">数据完整性检查</div>
                    <p className="mb-3 text-sm text-[color:var(--muted)]">
                      检查数据库中的数据完整性问题，包括孤立记录和引用错误。
                    </p>
                    <Button variant="secondary" onClick={checkIntegrity}>
                      运行检查
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === "deleted" && !isLoading && (
                <motion.div
                  key="deleted"
                  className="space-y-4"
                  variants={
                    prefersReducedMotion
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : animationVariants.tabContent
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springPresets.default}
                >
                  {Object.entries(deletedRecords).map(
                    ([type, records]: [
                      string,
                      (Timetable | Course | Session)[],
                    ]) =>
                      records.length > 0 && (
                        <div key={type} className="surface rounded-lg p-3">
                          <div className="mb-2 font-medium">
                            已删除的
                            {type === "timetables"
                              ? "课表"
                              : type === "courses"
                                ? "课程"
                                : "课时"}{" "}
                            ({records.length})
                          </div>
                          <div className="space-y-2">
                            {records.map(record => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between border-b border-[color:var(--border)] py-2 last:border-b-0"
                              >
                                <div>
                                  <div className="font-medium">
                                    {(record as Timetable).name ||
                                      (record as Course).title ||
                                      `${type.slice(0, -1)} ${record.id.slice(0, 8)}`}
                                  </div>
                                  <div className="text-sm text-[color:var(--muted)]">
                                    删除时间:{" "}
                                    {record.deletedAt
                                      ? new Date(
                                          record.deletedAt
                                        ).toLocaleString()
                                      : "未知"}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      restoreRecord(
                                        type === "timetables"
                                          ? "timetable"
                                          : type === "courses"
                                            ? "course"
                                            : "session",
                                        record.id
                                      )
                                    }
                                  >
                                    恢复
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      permanentDelete(
                                        type === "timetables"
                                          ? "timetable"
                                          : type === "courses"
                                            ? "course"
                                            : "session",
                                        record.id
                                      )
                                    }
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    永久删除
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                  )}

                  {deletedRecords.timetables.length === 0 &&
                    deletedRecords.courses.length === 0 &&
                    deletedRecords.sessions.length === 0 && (
                      <div className="py-8 text-center text-[color:var(--muted)]">
                        回收站为空
                      </div>
                    )}
                </motion.div>
              )}

              {activeTab === "batch" && (
                <motion.div
                  key="batch"
                  className="space-y-4"
                  variants={
                    prefersReducedMotion
                      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
                      : animationVariants.tabContent
                  }
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={springPresets.default}
                >
                  <div className="space-y-2">
                    <Label htmlFor="timetable-select">选择课表:</Label>
                    <select
                      id="timetable-select"
                      value={selectedTimetableId}
                      onChange={e => setSelectedTimetableId(e.target.value)}
                      className={`border-input placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                        isMobile ? "h-10 text-base" : "h-9"
                      }`}
                    >
                      <option value="">请选择课表</option>
                      {availableTimetables.map(timetable => (
                        <option key={timetable.id} value={timetable.id}>
                          {timetable.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`gap-4 ${isMobile ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2"}`}>
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">课表管理</h3>
                      <Button
                        onClick={handleDuplicateTimetable}
                        disabled={isLoading || !selectedTimetableId}
                        className="w-full"
                        size={isMobile ? "default" : "default"}
                      >
                        {isLoading ? "处理中..." : "复制课表"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleExportCSV}
                        disabled={isLoading || !selectedTimetableId}
                        className="w-full"
                        size={isMobile ? "default" : "default"}
                      >
                        {isLoading ? "导出中..." : "导出CSV"}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">数据优化</h3>
                      <Button
                        onClick={handleMergeDuplicateCourses}
                        disabled={isLoading || !selectedTimetableId}
                        className="w-full"
                        size={isMobile ? "default" : "default"}
                      >
                        {isLoading ? "处理中..." : "合并重复课程"}
                      </Button>
                      <Button
                        onClick={handleFixTimeConflicts}
                        disabled={isLoading || !selectedTimetableId}
                        className="w-full"
                        size={isMobile ? "default" : "default"}
                      >
                        {isLoading ? "处理中..." : "修复时间冲突"}
                      </Button>
                      <Button
                        onClick={handleStandardizeTime}
                        disabled={isLoading || !selectedTimetableId}
                        className="w-full"
                        size={isMobile ? "default" : "default"}
                      >
                        {isLoading ? "处理中..." : "标准化时间"}
                      </Button>
                    </div>
                  </div>

                  {batchResult && (
                    <Card className="p-4">
                      <h3 className="mb-2 font-medium">操作结果:</h3>
                      <div className="text-sm text-[color:var(--muted)]">
                        {batchResult}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBatchResult("")}
                        className="mt-2"
                      >
                        清除
                      </Button>
                    </Card>
                  )}

                  <Card className="p-4">
                    <h3 className="mb-2 font-medium">CSV导入</h3>
                    <p className={`mb-3 text-[color:var(--muted)] ${isMobile ? "text-sm" : "text-sm"}`}>
                      支持导入格式：课程名称,教师,地点,星期,开始时间,结束时间,备注
                    </p>
                    <Input
                      type="file"
                      accept=".csv"
                      className={isMobile ? "text-base" : ""}
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedTimetableId) return;

                        setIsLoading(true);
                        try {
                          const content = await file.text();
                          const result = await ImportExportTools.importFromCSV(
                            selectedTimetableId,
                            content
                          );
                          const message = `导入完成！成功导入 ${result.imported} 条记录。${result.errors.length > 0 ? `错误: ${result.errors.join(", ")}` : ""}`;
                          setBatchResult(message);
                          toast.success("CSV 导入成功！");
                        } catch (error) {
                          setBatchResult(`导入失败: ${error}`);
                          toast.error(`导入失败: ${error}`);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 确认对话框 */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => {
              if (e.target === e.currentTarget) confirmDialog.onCancel();
            }}
          >
            <MotionCard
              className={`w-full p-4 ${isMobile ? "modal-mobile" : "max-w-md"}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={springPresets.default}
            >
              <div className="mb-4">
                <h3 className={`font-medium ${isMobile ? "text-base" : "text-lg"}`}>
                  {confirmDialog.title}
                </h3>
                <p className={`mt-2 text-gray-600 ${isMobile ? "text-sm" : "text-sm"}`}>
                  {confirmDialog.message}
                </p>
              </div>
              <div className={`flex gap-2 ${isMobile ? "flex-col" : "justify-end"}`}>
                <Button 
                  variant="ghost" 
                  onClick={confirmDialog.onCancel}
                  className={isMobile ? "w-full" : ""}
                >
                  取消
                </Button>
                <Button
                  variant={confirmDialog.confirmVariant || "default"}
                  onClick={confirmDialog.onConfirm}
                  className={isMobile ? "w-full" : ""}
                >
                  {confirmDialog.confirmText || "确定"}
                </Button>
              </div>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入对话框 */}
      <AnimatePresence>
        {inputDialog.isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => {
              if (e.target === e.currentTarget) inputDialog.onCancel();
            }}
          >
            <MotionCard
              className={`w-full p-4 ${isMobile ? "modal-mobile" : "max-w-md"}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={springPresets.default}
            >
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const value = formData.get("inputValue") as string;
                  if (value.trim()) {
                    inputDialog.onConfirm(value.trim());
                  }
                }}
              >
                <div className="mb-4">
                  <h3 className={`font-medium ${isMobile ? "text-base" : "text-lg"}`}>
                    {inputDialog.title}
                  </h3>
                  <div className="mt-3">
                    <Label htmlFor="inputValue">请输入内容</Label>
                    <Input
                      id="inputValue"
                      name="inputValue"
                      placeholder={inputDialog.placeholder}
                      defaultValue={inputDialog.defaultValue}
                      className={`mt-1 ${isMobile ? "text-base" : ""}`}
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <div className={`flex gap-2 ${isMobile ? "flex-col" : "justify-end"}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={inputDialog.onCancel}
                    className={isMobile ? "w-full" : ""}
                  >
                    取消
                  </Button>
                  <Button 
                    type="submit"
                    className={isMobile ? "w-full" : ""}
                  >
                    确定
                  </Button>
                </div>
              </form>
            </MotionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
