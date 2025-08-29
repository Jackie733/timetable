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
import {
  db,
  type Timetable,
  type TimetableType,
  type Course,
  type Session,
} from "../db";
import { TimetableShell } from "../components/TimetableShell";
import { MobileOptimizedMessage } from "../components/MobileOptimizedMessage";
import { MobileUserGuide } from "../components/MobileUserGuide";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";

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

      // 对于编辑现有session，如果课程名称没有变化，保持原课程ID
      // 对于新session或课程名称变化，总是创建新课程或寻找完全匹配的课程
      let course: Course;

      if (existingSessionId) {
        // 编辑模式：检查是否有完全匹配的课程（名称和颜色都相同）
        const existingCourse = await db
          .getActive(db.courses)
          .filter(
            c =>
              c.timetableId === timetableId &&
              c.title === courseTitle &&
              c.color === color
          )
          .first();

        if (existingCourse) {
          course = existingCourse;
        } else {
          // 没有完全匹配的课程，创建新课程
          course = {
            id: crypto.randomUUID(),
            timetableId,
            title: courseTitle,
            color: color,
          } as Course;
          await db.courses.add(course);
        }
      } else {
        // 新增模式：也是寻找完全匹配的课程，没有则创建
        const existingCourse = await db
          .getActive(db.courses)
          .filter(
            c =>
              c.timetableId === timetableId &&
              c.title === courseTitle &&
              c.color === color
          )
          .first();

        if (existingCourse) {
          course = existingCourse;
        } else {
          course = {
            id: crypto.randomUUID(),
            timetableId,
            title: courseTitle,
            color: color,
          } as Course;
          await db.courses.add(course);
        }
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

  // 状态定义
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
  const [showMobileGuide, setShowMobileGuide] = useState(false);

  // 监听操作成功，关闭模态框
  useEffect(() => {
    if (actionData?.ok && nav.state === "idle" && editingCell) {
      setEditingCell(null);
      setFormDefaults(null);
    }
  }, [actionData, nav.state, editingCell]);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // 如果是移动端且是新用户，显示引导
      if (
        mobile &&
        !data.timetables.length &&
        !localStorage.getItem("mobile-guide-seen")
      ) {
        setShowMobileGuide(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [data.timetables.length]);

  if (actionData?.ok && actionData.id && nav.state === "idle") {
    // After creating a timetable, take user to edit page
    navigate(`/t/${actionData.id}/edit-grid`, { replace: true });
  }

  if (!data.timetables.length) {
    return (
      <>
        <TimetableShell title="欢迎使用课程表" showCreateButton={true}>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h2 className="mb-4 text-2xl font-semibold">还没有课程表</h2>
              <p className="text-muted-foreground mb-6">
                点击右上角的"创建课表"按钮开始制作您的第一个课程表
              </p>
              <div className="bg-muted inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm">
                <span>💡</span>
                <span>支持教师课表和学生课表两种模式</span>
              </div>
            </div>
          </div>
        </TimetableShell>
        {showMobileGuide && (
          <MobileUserGuide
            onClose={() => {
              setShowMobileGuide(false);
              localStorage.setItem("mobile-guide-seen", "true");
            }}
          />
        )}
      </>
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

  // 设置打印时的动态行数
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--segments-count",
      segments.length.toString()
    );
  }, [segments.length]);

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

  function fmt(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }

  return (
    <TimetableShell id={timetable.id} title={timetable.name}>
      {isMobile && <MobileOptimizedMessage />}
      <div
        className={`print:h-full ${
          isMobile ? "mobile-scroll-container overflow-x-auto pb-2" : ""
        }`}
      >
        <div className={`print:h-full ${isMobile ? "min-w-fit" : ""}`}>
          <table
            className={`table-clean w-full border-separate border-spacing-0 print:h-full ${
              isMobile
                ? "table-ultra-compact text-xs"
                : "min-w-[720px] table-fixed"
            }`}
            style={
              isMobile
                ? {
                    minWidth: "100%",
                    width: "max-content", // 让表格可以水平滚动
                  }
                : {}
            }
          >
            <thead>
              <tr>
                <th
                  className={`sticky-col text-center align-middle ${
                    isMobile ? "w-10 p-1 text-xs" : "w-20 p-2"
                  }`}
                >
                  {isMobile ? "节" : "节次"}
                </th>
                {Array.from({ length: days }).map((_, i) => (
                  <th
                    key={i}
                    className={`text-center align-middle ${
                      isMobile ? "w-16 p-1 text-xs" : "p-2"
                    }`}
                  >
                    {isMobile ? dayLabels[i].replace("星期", "") : dayLabels[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map((seg, segIndex) => (
                <tr key={segIndex}>
                  <td
                    className={`sticky-col bg-background text-center align-top ${
                      isMobile ? "p-1" : "p-2"
                    }`}
                  >
                    <div
                      className={`font-medium ${isMobile ? "text-xs leading-tight" : "text-sm"}`}
                    >
                      {seg.label || segIndex + 1}
                    </div>
                    <div
                      className={`text-muted-foreground ${
                        isMobile ? "text-[9px] leading-tight" : "text-[11px]"
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
                        s.startMinutes < seg.endMinutes &&
                        s.endMinutes > seg.startMinutes
                    );
                    const courseById = new Map(
                      courses.map(c => [c.id, c] as const)
                    );
                    return (
                      <td key={day} className="h-full p-0">
                        <div
                          className={`touch-action-manipulation flex h-full cursor-pointer flex-col rounded-xs p-0.5 transition-colors hover:bg-gray-50/80 active:bg-gray-100/80 dark:hover:bg-gray-800/50 ${
                            isMobile ? "min-h-8" : "min-h-16"
                          }`}
                          style={{
                            height: "100%",
                            minHeight: isMobile ? "2rem" : "4rem",
                          }}
                          onClick={() => {
                            const session = cellSessions[0];
                            const course = session
                              ? courseById.get(session.courseId)
                              : undefined;
                            openEdit(dayOfWeek, segIndex, session, course);
                          }}
                          onTouchStart={e => {
                            if (isMobile) {
                              e.currentTarget.style.transform = "scale(0.98)";
                            }
                          }}
                          onTouchEnd={e => {
                            if (isMobile) {
                              e.currentTarget.style.transform = "scale(1)";
                            }
                          }}
                        >
                          {cellSessions.map(s => (
                            <div
                              key={s.id}
                              className={`flex flex-1 flex-col justify-center rounded-xs text-center font-medium text-white shadow-sm ${
                                isMobile
                                  ? "px-1 py-0.5 text-[10px] leading-tight"
                                  : "px-2 py-1 text-xs"
                              }`}
                              style={{
                                backgroundColor:
                                  courseById.get(s.courseId)?.color ||
                                  "#6b7280",
                              }}
                            >
                              <div className="truncate">
                                {courseById.get(s.courseId)?.title ||
                                  "未知课程"}
                              </div>
                              {s.location && !isMobile && (
                                <div className="truncate text-[10px] opacity-90">
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
      </div>{" "}
      {/* 编辑课时模态框 */}
      <Dialog
        open={!!editingCell}
        onOpenChange={open => {
          if (!open) {
            setEditingCell(null);
            setFormDefaults(null);
          }
        }}
      >
        <DialogContent
          className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
        >
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
              {editingCell?.session ? "编辑课时" : "添加课时"}
            </DialogTitle>
          </DialogHeader>

          {formDefaults && (
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update-cell" />
              <input type="hidden" name="timetableId" value={timetable.id} />
              <input
                type="hidden"
                name="dayOfWeek"
                value={formDefaults.dayOfWeek}
              />
              <input
                type="hidden"
                name="startMinutes"
                value={formDefaults.startMinutes}
              />
              <input
                type="hidden"
                name="endMinutes"
                value={formDefaults.endMinutes}
              />
              <input type="hidden" name="color" value={selectedColor} />
              {editingCell?.session && (
                <input
                  type="hidden"
                  name="existingSessionId"
                  value={editingCell.session.id}
                />
              )}

              <div>
                <Label htmlFor="title" className={isMobile ? "text-sm" : ""}>
                  课程名称
                </Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={formDefaults.title}
                  placeholder="请输入课程名称"
                  required
                  className={isMobile ? "mt-1" : ""}
                />
              </div>

              <div>
                <Label htmlFor="location" className={isMobile ? "text-sm" : ""}>
                  上课地点（可选）
                </Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={formDefaults.location}
                  placeholder="请输入上课地点"
                  className={isMobile ? "mt-1" : ""}
                />
              </div>

              <div>
                <Label className={`mb-2 block ${isMobile ? "text-sm" : ""}`}>
                  课程颜色
                </Label>
                <div
                  className={`grid gap-2 ${isMobile ? "grid-cols-6" : "grid-cols-6"}`}
                >
                  {[
                    "#ef4444",
                    "#f97316",
                    "#eab308",
                    "#22c55e",
                    "#06b6d4",
                    "#3b82f6",
                    "#a855f7",
                    "#ec4899",
                    "#84cc16",
                    "#f59e0b",
                    "#10b981",
                    "#8b5cf6",
                  ].map(color => (
                    <label
                      key={color}
                      className={`relative flex cursor-pointer items-center justify-center rounded-full ${
                        isMobile ? "h-8 w-8" : "h-10 w-10"
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      <input
                        type="radio"
                        name="colorSelection"
                        value={color}
                        checked={color === selectedColor}
                        onChange={e => setSelectedColor(e.target.value)}
                        className="sr-only"
                      />
                      {color === selectedColor && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full">
                          <div
                            className={`rounded-full bg-gray-700 ${
                              isMobile ? "h-2 w-2" : "h-2 w-2"
                            }`}
                          ></div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter className={isMobile ? "flex-col gap-3" : ""}>
                <div className={isMobile ? "w-full" : ""}>
                  {editingCell?.session && (
                    <Button
                      type="button"
                      variant="destructive"
                      size={isMobile ? "default" : "sm"}
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
                <div className={`flex gap-2 ${isMobile ? "w-full" : ""}`}>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingCell(null);
                      setFormDefaults(null);
                    }}
                    variant="ghost"
                    size={isMobile ? "default" : "sm"}
                    className={isMobile ? "flex-1" : ""}
                  >
                    取消
                  </Button>
                  <Button
                    disabled={busy}
                    className={isMobile ? "flex-1" : ""}
                    size={isMobile ? "default" : "sm"}
                  >
                    {editingCell?.session ? "更新" : "保存"}
                  </Button>
                </div>
              </DialogFooter>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      {/* 确认对话框 */}
      <Dialog
        open={confirmDialog.isOpen}
        onOpenChange={open => {
          if (!open) {
            confirmDialog.onCancel();
          }
        }}
      >
        <DialogContent
          className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
        >
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
              {confirmDialog.title}
            </DialogTitle>
          </DialogHeader>

          <p className={`text-gray-600 ${isMobile ? "text-sm" : ""}`}>
            {confirmDialog.message}
          </p>

          <DialogFooter className={isMobile ? "flex-col gap-2" : "justify-end"}>
            <Button
              variant="ghost"
              onClick={confirmDialog.onCancel}
              size={isMobile ? "default" : "default"}
              className={isMobile ? "w-full" : ""}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
              size={isMobile ? "default" : "default"}
              className={isMobile ? "w-full" : ""}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TimetableShell>
  );
}
