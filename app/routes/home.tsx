import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import {
  useLoaderData,
  useNavigation,
  useActionData,
  useNavigate,
  useSubmit,
} from "react-router";
import { Lightbulb } from "lucide-react";
import {
  db,
  type Timetable,
  type TimetableType,
  type Course,
  type Session,
} from "~/db";
import { TimetableShell } from "~/components/TimetableShell";
import { TimetableView } from "~/components/timetable/TimetableView";
import { CourseEditForm } from "~/components/timetable/CourseEditForm";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import { MobileOptimizedMessage } from "~/components/MobileOptimizedMessage";
import { MobileUserGuide } from "~/components/MobileUserGuide";
import { useMobileDetection } from "~/hooks/useMobileDetection";
import { useCourseEditing } from "~/hooks/useCourseEditing";
import { useConfirmDialog } from "~/hooks/useConfirmDialog";
import type { DragSession } from "~/utils/dragDropUtils";

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
    if (intent === "move-session") {
      const sessionId = String(fd.get("sessionId"));
      const dayOfWeek = Number(fd.get("dayOfWeek"));
      const startMinutes = Number(fd.get("startMinutes"));
      const endMinutes = Number(fd.get("endMinutes"));

      if (
        !sessionId ||
        dayOfWeek < 0 ||
        dayOfWeek > 6 ||
        !(endMinutes > startMinutes)
      ) {
        return { ok: false } as const;
      }

      // 更新会话的时间信息
      await db.sessions.update(sessionId, {
        dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startMinutes,
        endMinutes,
      });

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

  // 使用自定义钩子
  const { isMobile } = useMobileDetection();
  const { confirmDialog, showConfirm } = useConfirmDialog();
  const {
    editingCell,
    formDefaults,
    selectedColor,
    setSelectedColor,
    openEdit,
    closeEdit,
  } = useCourseEditing({
    onSuccess: () => {
      // 编辑成功后的回调
    },
  });

  // 状态定义
  const [showMobileGuide, setShowMobileGuide] = useState(false);

  // 监听操作成功，关闭模态框
  useEffect(() => {
    if (actionData?.ok && nav.state === "idle" && editingCell) {
      closeEdit();
    }
  }, [actionData, nav.state, editingCell, closeEdit]);

  // 检测移动端并显示引导
  useEffect(() => {
    if (
      isMobile &&
      !data.timetables.length &&
      !localStorage.getItem("mobile-guide-seen")
    ) {
      setShowMobileGuide(true);
    }
  }, [isMobile, data.timetables.length]);

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
                <Lightbulb className="h-4 w-4 text-yellow-500" />
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

  const handleCellClick = (
    dayOfWeek: number,
    segIndex: number,
    session?: Session,
    course?: Course
  ) => {
    const segments = timetable.segments || [];
    const seg = segments[segIndex];
    openEdit(
      dayOfWeek,
      segIndex,
      session,
      course,
      seg?.startMinutes,
      seg?.endMinutes
    );
  };

  const handleSessionMove = async (dragSession: DragSession) => {
    // 根据 DragSession 计算新的时间段
    const segments = timetable.segments || [];
    const targetSegment = segments[dragSession.toSegIndex];

    if (!targetSegment) return;

    const formData = new FormData();
    formData.set("intent", "move-session");
    formData.set("sessionId", dragSession.session.id);
    formData.set("dayOfWeek", dragSession.toDayOfWeek.toString());
    formData.set("startMinutes", targetSegment.startMinutes.toString());
    formData.set("endMinutes", targetSegment.endMinutes.toString());
    submit(formData, { method: "post" });
  };

  const handleDeleteSession = async () => {
    if (!editingCell?.session) return;

    const confirmed = await showConfirm("删除课时", "确定要删除这个课时吗？", {
      confirmVariant: "destructive",
    });

    if (confirmed) {
      const formData = new FormData();
      formData.set("intent", "delete-session");
      formData.set("sessionId", editingCell.session.id);
      submit(formData, { method: "post" });
      closeEdit();
    }
  };

  return (
    <TimetableShell id={timetable.id} title={timetable.name}>
      {isMobile && <MobileOptimizedMessage />}

      <TimetableView
        timetable={timetable}
        courses={courses}
        sessions={sessions}
        onCellClick={handleCellClick}
        onSessionMove={handleSessionMove}
        isMobile={isMobile}
      />

      <CourseEditForm
        isOpen={!!editingCell}
        onClose={closeEdit}
        formDefaults={formDefaults}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        timetableId={timetable.id}
        existingSessionId={editingCell?.session?.id}
        onDeleteSession={handleDeleteSession}
        isBusy={busy}
        isMobile={isMobile}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        isMobile={isMobile}
      />
    </TimetableShell>
  );
}
