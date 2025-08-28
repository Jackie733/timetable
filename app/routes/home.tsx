import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import {
  useLoaderData,
  Form,
  useNavigation,
  useActionData,
  useNavigate,
  useSubmit,
} from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  db,
  type Timetable,
  type TimetableType,
  type Course,
  type Session,
} from "../db";
import { TimetableShell } from "../components/TimetableShell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import {
  animationVariants,
  springPresets,
  useReducedMotion,
} from "../utils/animations";

const MotionCard = motion.create(Card);

interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function meta(): ReturnType<Route.MetaFunction> {
  return [
    { title: "课程表 - Timetable" },
    { name: "description", content: "简洁优美的课程表管理工具" },
  ];
}

export async function clientLoader() {
  const timetables = await db.getActive(db.timetables).toArray();
  const current = timetables[0];
  let courses: Course[] = [];
  let sessions: Session[] = [];
  if (current) {
    [courses, sessions] = await Promise.all([
      db
        .getActive(db.courses)
        .filter(c => c.timetableId === current.id)
        .toArray(),
      db
        .getActive(db.sessions)
        .filter(s => s.timetableId === current.id)
        .toArray(),
    ]);
  }
  return { timetables, current, courses, sessions } as const;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  try {
    const fd = await request.formData();
    const intent = String(fd.get("intent") || "create");
    if (intent === "update-cell") {
      const timetableId = String(fd.get("timetableId"));
      const courseTitle = String(fd.get("title") || "").trim();
      const location = String(fd.get("location") || "").trim();
      const color = String(fd.get("color") || "#a5b4fc");
      const dayOfWeek = Number(fd.get("dayOfWeek"));
      const startMinutes = Number(fd.get("startMinutes"));
      const endMinutes = Number(fd.get("endMinutes"));
      const existingSessionId = String(fd.get("existingSessionId") || "");

      // 验证输入数据
      if (
        !timetableId ||
        !courseTitle ||
        !(endMinutes > startMinutes) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6 ||
        startMinutes < 0 ||
        startMinutes >= 1440 ||
        endMinutes <= 0 ||
        endMinutes > 1440
      ) {
        return { ok: false } as const;
      }

      // 如果是编辑现有课程，先删除旧的 session
      if (existingSessionId) {
        await db.sessions.delete(existingSessionId);
      }

      let course = await db
        .getActive(db.courses)
        .filter(c => c.timetableId === timetableId && c.title === courseTitle)
        .first();
      if (!course) {
        course = {
          id: crypto.randomUUID(),
          timetableId,
          title: courseTitle,
          color: color,
        } as Course;
        await db.courses.add(course);
      } else {
        // 更新已存在课程的颜色
        await db.courses.update(course.id, { color: color });
      }
      const session: Session = {
        id: crypto.randomUUID(),
        timetableId,
        courseId: course.id,
        dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startMinutes,
        endMinutes,
        location: location || undefined,
      };
      await db.sessions.add(session);
      return { ok: true } as const;
    }
    if (intent === "delete-session") {
      const sessionId = String(fd.get("sessionId"));
      if (!sessionId) {
        return { ok: false } as const;
      }
      await db.sessions.delete(sessionId);
      return { ok: true } as const;
    }
    const name = (fd.get("name") as string) || "未命名课表";
    const type = ((fd.get("type") as string) || "teacher") as TimetableType;
    const id = crypto.randomUUID();
    const timetable: Timetable = {
      id,
      name,
      type,
      weekStart: 1,
      termRange: null,
      days: 5,
      segments: Array.from({ length: 6 }).map((_, i) => ({
        label: String(i + 1),
        startMinutes: i * 60 + 480, // 8:00 开始
        endMinutes: (i + 1) * 60 + 480, // 每节课1小时
      })),
    };
    await db.timetables.add(timetable);
    return { ok: true, id } as const;
  } catch (error) {
    console.error("Error in clientAction:", error);
    return { ok: false, error: "操作失败，请重试" } as const;
  }
}

export default function Home() {
  const data = useLoaderData<typeof clientLoader>();
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const actionData = useActionData<typeof clientAction>();
  const navigate = useNavigate();
  const submit = useSubmit();

  if (actionData?.ok && actionData.id && nav.state === "idle") {
    // After creating a timetable, take user to edit page
    navigate(`/t/${actionData.id}/edit-grid`, { replace: true });
  }

  if (!data.timetables.length) {
    return (
      <TimetableShell title="欢迎使用课程表" showCreateButton={true}>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-semibold">还没有课程表</h2>
            <p className="mb-6 text-[color:var(--muted)]">
              点击右上角的"创建课表"按钮开始制作您的第一个课程表
            </p>
            <div className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--surface-2)] px-4 py-2 text-sm">
              <span>💡</span>
              <span>支持教师课表和学生课表两种模式</span>
            </div>
          </div>
        </div>
      </TimetableShell>
    );
  }

  const { current, courses, sessions } = data;
  const timetable = current!;
  const days = timetable.days ?? 5;
  const segments = (
    timetable.segments?.length
      ? timetable.segments
      : Array.from({ length: 6 }).map((_, i) => ({
          label: String(i + 1),
          startMinutes: i * 60 + 480, // 8:00 开始，每节课1小时
          endMinutes: (i + 1) * 60 + 480, // 9:00, 10:00, ...
        }))
  )!;

  const [editingCell, setEditingCell] = useState<null | {
    day: number;
    segIndex: number;
    session?: Session;
    course?: Course;
  }>(null);
  const [formDefaults, setFormDefaults] = useState<{
    title: string;
    location: string;
    color: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("#3b82f6");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  function openEdit(
    day: number,
    segIndex: number,
    session?: Session,
    course?: Course
  ) {
    setEditingCell({ day, segIndex, session, course });
    const seg = segments[segIndex];
    const defaultColor = "#a5b4fc"; // 默认柔和蓝色
    setFormDefaults({
      title: course?.title || "",
      location: session?.location || "",
      color: course?.color || defaultColor,
      dayOfWeek: day, // day 已经是正确的 dayOfWeek 值 (1-7)
      startMinutes: seg.startMinutes || segIndex * 60 + 480,
      endMinutes: seg.endMinutes || segIndex * 60 + 525,
    });
    setSelectedColor(course?.color || defaultColor);
  }

  const dayLabels = [
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
    "星期日",
  ];

  const fmt = (m: number) => {
    // 确保时间在有效范围内
    const minutes = Math.max(0, Math.min(1439, m));
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const prefersReducedMotion = useReducedMotion();

  return (
    <TimetableShell id={timetable.id} title={`${timetable.name}（主页面）`}>
      <motion.div
        className="mb-4 flex gap-2 text-sm"
        variants={
          prefersReducedMotion
            ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
            : animationVariants.slideIn
        }
        initial="hidden"
        animate="visible"
        transition={springPresets.default}
      ></motion.div>
      <motion.div
        variants={
          prefersReducedMotion
            ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
            : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }
        }
        initial="hidden"
        animate="visible"
        transition={{ ...springPresets.default, delay: 0.2 }}
      >
        <Card>
          <div className="rounded-t-[14px] bg-[color:var(--surface-2)] py-3 text-center">
            <div className="hero-subtitle">学校名称</div>
            <div className="hero-title">{timetable.name}课表</div>
          </div>
          <div className="p-3">
            <div className={`overflow-x-auto ${isMobile ? "pb-2" : ""}`}>
              <table
                className={`table-clean w-full table-fixed border-separate border-spacing-0 ${
                  isMobile ? "text-xs" : "min-w-[720px]"
                }`}
                style={
                  isMobile
                    ? {
                        minWidth: "100vw",
                        width: "calc(100vw - 2rem)", // 减去padding
                      }
                    : {}
                }
              >
                <thead>
                  <tr>
                    <th
                      className={`sticky-col text-center align-middle ${
                        isMobile ? "w-12 p-1 text-xs" : "w-20 p-2"
                      }`}
                    >
                      节次
                    </th>
                    {Array.from({ length: days }).map((_, i) => (
                      <th
                        key={i}
                        className={`text-center align-middle ${
                          isMobile ? "p-1 text-xs" : "p-2"
                        }`}
                      >
                        {isMobile
                          ? dayLabels[i].replace("星期", "")
                          : dayLabels[i]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg, segIndex) => (
                    <tr key={segIndex}>
                      <td
                        className={`sticky-col bg-[color:var(--surface)] text-center align-top ${
                          isMobile ? "p-1" : "p-2"
                        }`}
                      >
                        <div
                          className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`}
                        >
                          {seg.label || segIndex + 1}
                        </div>
                        <div
                          className={`text-[color:var(--muted)] ${
                            isMobile ? "text-[10px]" : "text-[11px]"
                          }`}
                        >
                          {seg.startMinutes || seg.endMinutes
                            ? isMobile
                              ? fmt(seg.startMinutes)
                              : `${fmt(seg.startMinutes)}–${fmt(seg.endMinutes)}`
                            : ""}
                        </div>
                      </td>
                      {Array.from({ length: days }).map((_, day) => {
                        const dayOfWeek = (day + 1) % 7; // 转换为 0-6 (周日为0)
                        const cellSessions = sessions.filter(
                          s =>
                            s.dayOfWeek === dayOfWeek &&
                            // Session 与当前时间段有重叠即可显示
                            s.startMinutes < seg.endMinutes &&
                            s.endMinutes > seg.startMinutes
                        );
                        const courseById = new Map(
                          courses.map(c => [c.id, c] as const)
                        );
                        return (
                          <td key={day} className="p-0 align-top">
                            <div
                              className={`cursor-pointer rounded-sm transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50 ${
                                isMobile ? "min-h-12 p-1" : "min-h-16 p-2"
                              }`}
                              onClick={() => {
                                const session = cellSessions[0]; // 取第一个session作为编辑对象
                                const course = session
                                  ? courseById.get(session.courseId)
                                  : undefined;
                                openEdit(dayOfWeek, segIndex, session, course);
                              }}
                            >
                              {cellSessions.map(s => (
                                <div
                                  key={s.id}
                                  className={`session-card rounded-lg border border-white/40 shadow-sm backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-md ${
                                    isMobile
                                      ? "mb-1 p-1 text-xs"
                                      : "mb-2 p-2 text-sm"
                                  }`}
                                  style={{
                                    backgroundColor: `${courseById.get(s.courseId)?.color || "#a5b4fc"}80`,
                                    backgroundImage: `linear-gradient(135deg, ${courseById.get(s.courseId)?.color || "#a5b4fc"}90 0%, ${courseById.get(s.courseId)?.color || "#a5b4fc"}60 100%)`,
                                    color: "#374151",
                                  }}
                                >
                                  <div
                                    className={`font-medium ${isMobile ? "truncate text-xs" : ""}`}
                                  >
                                    {courseById.get(s.courseId)?.title ??
                                      "课程"}
                                  </div>
                                  {s.location && !isMobile && (
                                    <div className="text-xs opacity-75">
                                      {s.location}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </motion.div>{" "}
      {/* Simple Modal for editing a cell */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <Card
            className={`w-full p-4 ${isMobile ? "mx-2 max-w-sm" : "max-w-md"}`}
          >
            <div
              className={`mb-3 font-medium ${
                isMobile ? "text-base" : "text-lg"
              }`}
            >
              {editingCell.session ? "编辑课时" : "添加课时"}
            </div>
            <Form
              method="post"
              onSubmit={() => setEditingCell(null)}
              className="space-y-3"
            >
              <input type="hidden" name="intent" value="update-cell" />
              <input type="hidden" name="timetableId" value={timetable.id} />
              <input
                type="hidden"
                name="dayOfWeek"
                value={formDefaults?.dayOfWeek ?? 1}
              />
              <input
                type="hidden"
                name="startMinutes"
                value={formDefaults?.startMinutes ?? 0}
              />
              <input
                type="hidden"
                name="endMinutes"
                value={formDefaults?.endMinutes ?? 0}
              />
              {editingCell.session && (
                <input
                  type="hidden"
                  name="existingSessionId"
                  value={editingCell.session.id}
                />
              )}
              <div>
                <Label>课程名</Label>
                <Input
                  name="title"
                  defaultValue={formDefaults?.title ?? ""}
                  required
                />
              </div>
              <div>
                <Label>地点</Label>
                <Input
                  name="location"
                  defaultValue={formDefaults?.location ?? ""}
                />
              </div>
              <div>
                <Label>颜色</Label>
                <div
                  className={`mt-2 gap-2 ${
                    isMobile ? "grid grid-cols-4" : "flex"
                  }`}
                >
                  {[
                    "#a5b4fc",
                    "#fca5a5",
                    "#86efac",
                    "#fde047",
                    "#c4b5fd",
                    "#67e8f9",
                    "#fdba74",
                    "#bef264",
                  ].map(color => (
                    <label
                      key={color}
                      className={`relative cursor-pointer rounded-full border-2 transition-all hover:scale-110 hover:border-gray-400 ${
                        isMobile ? "h-6 w-6" : "h-8 w-8"
                      }`}
                      style={{
                        backgroundColor: color,
                        borderColor:
                          color === selectedColor ? "#374151" : "transparent",
                        boxShadow:
                          color === selectedColor
                            ? `0 0 0 2px ${color}, 0 0 0 4px #374151`
                            : "none",
                      }}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        checked={color === selectedColor}
                        onChange={e => setSelectedColor(e.target.value)}
                        className="sr-only"
                      />
                      {color === selectedColor && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full">
                          <div
                            className={`rounded-full bg-gray-700 ${
                              isMobile ? "h-1.5 w-1.5" : "h-2 w-2"
                            }`}
                          ></div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              <div
                className={`flex justify-between ${
                  isMobile ? "flex-col gap-3" : ""
                }`}
              >
                <div>
                  {editingCell.session && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className={isMobile ? "w-full" : ""}
                      onClick={async () => {
                        const confirmed = await showConfirm(
                          "删除课时",
                          "确定要删除这个课时吗？"
                        );
                        if (confirmed) {
                          // 使用React Router的submit方法
                          const formData = new FormData();
                          formData.set("intent", "delete-session");
                          formData.set("sessionId", editingCell.session!.id);

                          submit(formData, { method: "post" });
                          setEditingCell(null);
                        }
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>
                <div className={`flex gap-2 ${isMobile ? "" : ""}`}>
                  <Button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    variant="ghost"
                    size="sm"
                    className={isMobile ? "flex-1" : ""}
                  >
                    取消
                  </Button>
                  <Button disabled={busy} className={isMobile ? "flex-1" : ""}>
                    {editingCell.session ? "更新" : "保存"}
                  </Button>
                </div>
              </div>
            </Form>
          </Card>
        </div>
      )}
      {/* 确认对话框 */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={confirmDialog.onCancel}
            />
            <MotionCard
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative z-10 bg-white shadow-lg ${
                isMobile ? "mx-4 max-w-xs p-4" : "mx-4 max-w-md p-6"
              }`}
            >
              <h3
                className={`mb-2 font-semibold ${
                  isMobile ? "text-base" : "text-lg"
                }`}
              >
                {confirmDialog.title}
              </h3>
              <p
                className={`mb-6 text-gray-600 ${
                  isMobile ? "mb-4 text-sm" : ""
                }`}
              >
                {confirmDialog.message}
              </p>
              <div
                className={`flex justify-end gap-3 ${isMobile ? "gap-2" : ""}`}
              >
                <Button
                  variant="ghost"
                  onClick={confirmDialog.onCancel}
                  size={isMobile ? "sm" : "default"}
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDialog.onConfirm}
                  size={isMobile ? "sm" : "default"}
                >
                  确定
                </Button>
              </div>
            </MotionCard>
          </div>
        )}
      </AnimatePresence>
    </TimetableShell>
  );
}
