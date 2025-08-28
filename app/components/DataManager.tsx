import React from "react";
import { motion, AnimatePresence } from "motion/react";
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

export default function DataManager({ onClose }: { onClose: () => void }) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = React.useState<
    "backup" | "integrity" | "cleanup" | "deleted" | "batch"
  >("backup");
  const [backups, setBackups] = React.useState<Backup[]>([]);
  const [integrityResult, setIntegrityResult] =
    React.useState<IntegrityResult | null>(null);
  const [deletedRecords, setDeletedRecords] = React.useState<DeletedRecords>({
    timetables: [],
    courses: [],
    sessions: [],
  });
  const [isLoading, setIsLoading] = React.useState(false);

  // 批量操作相关状态
  const [selectedTimetableId, setSelectedTimetableId] =
    React.useState<string>("");
  const [availableTimetables, setAvailableTimetables] = React.useState<
    Timetable[]
  >([]);
  const [batchResult, setBatchResult] = React.useState<string>("");

  // 加载备份列表
  const loadBackups = React.useCallback(async () => {
    try {
      const backupList = await db.getBackups();
      setBackups(backupList);
    } catch (error) {
      console.error("加载备份列表失败:", error);
    }
  }, []);

  // 加载课表列表
  const loadTimetables = React.useCallback(async () => {
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

  // 检查数据完整性
  const checkIntegrity = React.useCallback(async () => {
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

  // 加载已删除的记录
  const loadDeletedRecords = React.useCallback(async () => {
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

  // 创建备份
  const createBackup = async () => {
    const name = prompt("请输入备份名称:");
    if (!name) return;

    setIsLoading(true);
    try {
      const backupId = await db.createBackup(name);
      alert(`备份创建成功！ID: ${backupId}`);
      await loadBackups();
    } catch (error) {
      alert(`备份创建失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 恢复备份
  const restoreBackup = async (backupId: string) => {
    const confirmRestore = confirm("确定要恢复此备份吗？这将覆盖当前数据。");
    if (!confirmRestore) return;

    setIsLoading(true);
    try {
      const result = await db.restoreBackup(backupId, { clearExisting: true });
      if (result.success) {
        alert(`备份恢复成功！恢复了 ${result.restoredRecords} 条记录。`);
        window.location.reload(); // 刷新页面以反映数据变化
      } else {
        alert(`备份恢复失败: ${result.error}`);
      }
    } catch (error) {
      alert(`备份恢复失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 导出备份
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
    } catch (error) {
      alert(`导出失败: ${error}`);
    }
  };

  // 导入备份
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const backupId = await db.importBackup(file);
      alert(`备份导入成功！ID: ${backupId}`);
      await loadBackups();
    } catch (error) {
      alert(`导入失败: ${error}`);
    } finally {
      setIsLoading(false);
      // 重置文件输入
      event.target.value = "";
    }
  };

  // 清理孤立记录
  const cleanupOrphaned = async () => {
    const confirmCleanup = confirm(
      "确定要清理孤立记录吗？这些记录将被软删除。"
    );
    if (!confirmCleanup) return;

    setIsLoading(true);
    try {
      const result = await db.cleanupOrphanedRecords();
      alert(
        `清理完成！清理了 ${result.cleanedCourses} 个课程和 ${result.cleanedSessions} 个课时。`
      );
      await checkIntegrity();
    } catch (error) {
      alert(`清理失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 恢复删除的记录
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
      alert("记录恢复成功！");
      await loadDeletedRecords();
    } catch (error) {
      alert(`恢复失败: ${error}`);
    }
  };

  // 永久删除记录
  const permanentDelete = async (
    type: "timetable" | "course" | "session",
    id: string
  ) => {
    const confirmDelete = confirm("确定要永久删除此记录吗？此操作不可撤销！");
    if (!confirmDelete) return;

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
      alert("记录已永久删除！");
      await loadDeletedRecords();
    } catch (error) {
      alert(`删除失败: ${error}`);
    }
  };

  // 批量操作函数
  const handleDuplicateTimetable = async () => {
    if (!selectedTimetableId) {
      alert("请选择要复制的课表");
      return;
    }

    const newName = prompt("请输入新课表名称:");
    if (!newName) return;

    setIsLoading(true);
    try {
      const newTimetableId = await BatchOperations.duplicateTimetable(
        selectedTimetableId,
        newName
      );
      setBatchResult(`课表复制成功！新课表ID: ${newTimetableId}`);
      await loadTimetables();
    } catch (error) {
      setBatchResult(`复制失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeDuplicateCourses = async () => {
    if (!selectedTimetableId) {
      alert("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        await BatchOperations.mergeDuplicateCourses(selectedTimetableId);
      setBatchResult(
        `合并完成！处理了 ${result.mergedCount} 个重复课程，删除了 ${result.removedCourseIds.length} 个重复记录`
      );
    } catch (error) {
      setBatchResult(`合并失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixTimeConflicts = async () => {
    if (!selectedTimetableId) {
      alert("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      const result =
        await DataIntegrityTools.fixTimeConflicts(selectedTimetableId);
      setBatchResult(
        `时间冲突修复完成！发现 ${result.conflictsFound} 个冲突，修复了 ${result.conflictsFixed} 个`
      );
    } catch (error) {
      setBatchResult(`修复失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardizeTime = async () => {
    if (!selectedTimetableId) {
      alert("请选择要处理的课表");
      return;
    }

    setIsLoading(true);
    try {
      await DataIntegrityTools.standardizeTimeFormats(selectedTimetableId);
      setBatchResult("时间格式标准化完成！所有时间已调整为15分钟的倍数");
    } catch (error) {
      setBatchResult(`标准化失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedTimetableId) {
      alert("请选择要导出的课表");
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
    } catch (error) {
      setBatchResult(`导出失败: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
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
        className="card max-h-[80vh] w-full max-w-4xl overflow-hidden"
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
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--border)] p-4">
            <h2 className="text-lg font-medium">数据管理</h2>
            <motion.button
              onClick={onClose}
              className="btn btn-ghost text-sm"
              disabled={isLoading}
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              transition={transitions.hover}
            >
              关闭
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[color:var(--border)]">
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
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

              {/* 备份管理 */}
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
                    <motion.button
                      onClick={createBackup}
                      className="btn btn-primary"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      transition={transitions.hover}
                    >
                      创建备份
                    </motion.button>
                    <motion.label
                      className="btn btn-secondary cursor-pointer"
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      transition={transitions.hover}
                    >
                      导入备份
                      <input
                        type="file"
                        accept=".json"
                        onChange={importBackup}
                        className="hidden"
                      />
                    </motion.label>
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
                            <button
                              onClick={() =>
                                exportBackup(backup.id, backup.name)
                              }
                              className="btn btn-ghost text-sm"
                            >
                              导出
                            </button>
                            <button
                              onClick={() => restoreBackup(backup.id)}
                              className="btn btn-secondary text-sm"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() =>
                                db.deleteBackup(backup.id).then(loadBackups)
                              }
                              className="btn btn-ghost text-sm text-red-600"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* 完整性检查 */}
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
                    <button
                      onClick={checkIntegrity}
                      className="btn btn-secondary text-sm"
                    >
                      重新检查
                    </button>
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

              {/* 数据清理 */}
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
                    <button
                      onClick={cleanupOrphaned}
                      className="btn btn-warning"
                    >
                      开始清理
                    </button>
                  </div>

                  <div className="surface rounded-lg p-4">
                    <div className="mb-2 font-medium">数据完整性检查</div>
                    <p className="mb-3 text-sm text-[color:var(--muted)]">
                      检查数据库中的数据完整性问题，包括孤立记录和引用错误。
                    </p>
                    <button
                      onClick={checkIntegrity}
                      className="btn btn-secondary"
                    >
                      运行检查
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 回收站 */}
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
                                  <button
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
                                    className="btn btn-secondary text-sm"
                                  >
                                    恢复
                                  </button>
                                  <button
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
                                    className="btn btn-ghost text-sm text-red-600"
                                  >
                                    永久删除
                                  </button>
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

              {/* 批量操作 */}
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
                  {/* 课表选择 */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      选择课表:
                    </label>
                    <select
                      value={selectedTimetableId}
                      onChange={e => setSelectedTimetableId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">请选择课表</option>
                      {availableTimetables.map(timetable => (
                        <option key={timetable.id} value={timetable.id}>
                          {timetable.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 批量操作按钮 */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">课表管理</h3>
                      <button
                        onClick={handleDuplicateTimetable}
                        disabled={isLoading || !selectedTimetableId}
                        className="btn btn-primary w-full"
                      >
                        {isLoading ? "处理中..." : "复制课表"}
                      </button>
                      <button
                        onClick={handleExportCSV}
                        disabled={isLoading || !selectedTimetableId}
                        className="btn btn-secondary w-full"
                      >
                        {isLoading ? "导出中..." : "导出CSV"}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">数据优化</h3>
                      <button
                        onClick={handleMergeDuplicateCourses}
                        disabled={isLoading || !selectedTimetableId}
                        className="btn btn-primary w-full"
                      >
                        {isLoading ? "处理中..." : "合并重复课程"}
                      </button>
                      <button
                        onClick={handleFixTimeConflicts}
                        disabled={isLoading || !selectedTimetableId}
                        className="btn btn-primary w-full"
                      >
                        {isLoading ? "处理中..." : "修复时间冲突"}
                      </button>
                      <button
                        onClick={handleStandardizeTime}
                        disabled={isLoading || !selectedTimetableId}
                        className="btn btn-primary w-full"
                      >
                        {isLoading ? "处理中..." : "标准化时间"}
                      </button>
                    </div>
                  </div>

                  {/* 操作结果 */}
                  {batchResult && (
                    <div className="surface rounded-lg p-4">
                      <h3 className="mb-2 font-medium">操作结果:</h3>
                      <div className="text-sm text-[color:var(--muted)]">
                        {batchResult}
                      </div>
                      <button
                        onClick={() => setBatchResult("")}
                        className="btn btn-ghost mt-2 text-sm"
                      >
                        清除
                      </button>
                    </div>
                  )}

                  {/* CSV导入 */}
                  <div className="surface rounded-lg p-4">
                    <h3 className="mb-2 font-medium">CSV导入</h3>
                    <p className="mb-3 text-sm text-[color:var(--muted)]">
                      支持导入格式：课程名称,教师,地点,星期,开始时间,结束时间,备注
                    </p>
                    <input
                      type="file"
                      accept=".csv"
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
                          setBatchResult(
                            `导入完成！成功导入 ${result.imported} 条记录。${result.errors.length > 0 ? `错误: ${result.errors.join(", ")}` : ""}`
                          );
                        } catch (error) {
                          setBatchResult(`导入失败: ${error}`);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="input w-full"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
