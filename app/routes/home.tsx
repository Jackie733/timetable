import type { Route } from "./+types/home";
import {
  useLoaderData,
  Form,
  useNavigation,
  Link,
  useActionData,
  useNavigate,
} from "react-router";
import {
  db,
  type Timetable,
  type TimetableType,
  type Course,
  type Session,
} from "../db";
import { TimetableShell } from "../components/TimetableShell";
import React from "react";

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
      const dayOfWeek = Number(fd.get("dayOfWeek"));
      const startMinutes = Number(fd.get("startMinutes"));
      const endMinutes = Number(fd.get("endMinutes"));

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
      let course = await db
        .getActive(db.courses)
        .filter(c => c.timetableId === timetableId && c.title === courseTitle)
        .first();
      if (!course) {
        course = {
          id: crypto.randomUUID(),
          timetableId,
          title: courseTitle,
          // 为新课程设置默认颜色
          color: "#3b82f6", // 默认蓝色
        } as Course;
        await db.courses.add(course);
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

  const [editingCell, setEditingCell] = React.useState<null | {
    day: number;
    segIndex: number;
  }>(null);
  const [formDefaults, setFormDefaults] = React.useState<{
    title: string;
    location: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);

  function openEdit(day: number, segIndex: number) {
    setEditingCell({ day, segIndex });
    const seg = segments[segIndex];
    setFormDefaults({
      title: "",
      location: "",
      dayOfWeek: day, // day 已经是正确的 dayOfWeek 值 (1-7)
      startMinutes: seg.startMinutes || segIndex * 60 + 480,
      endMinutes: seg.endMinutes || segIndex * 60 + 525,
    });
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

  return (
    <TimetableShell id={timetable.id} title={`${timetable.name}（主页面）`}>
      <div className="mb-4 flex gap-2 text-sm">
        <Link className="btn btn-secondary" to={`/t/${timetable.id}/edit-grid`}>
          网格设置
        </Link>
      </div>
      <div className="card">
        <div className="rounded-t-[14px] bg-[color:var(--surface-2)] py-3 text-center">
          <div className="hero-subtitle">学校名称</div>
          <div className="hero-title">{timetable.name}课表</div>
        </div>
        <div className="p-3">
          <div className="overflow-x-auto">
            <table className="table-clean w-full min-w-[720px] table-fixed border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky-col w-20 p-2 text-center align-middle">
                    节次
                  </th>
                  {Array.from({ length: days }).map((_, i) => (
                    <th key={i} className="p-2 text-center align-middle">
                      {dayLabels[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segments.map((seg, segIndex) => (
                  <tr key={segIndex}>
                    <td className="sticky-col bg-[color:var(--surface)] p-2 text-center align-top">
                      <div className="text-sm font-medium">
                        {seg.label || segIndex + 1}
                      </div>
                      <div className="text-[11px] text-[color:var(--muted)]">
                        {seg.startMinutes || seg.endMinutes
                          ? `${fmt(seg.startMinutes)}–${fmt(seg.endMinutes)}`
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
                        <td key={day} className="align-top">
                          <div className="min-h-16 p-2">
                            {cellSessions.map(s => (
                              <div
                                key={s.id}
                                className="session-card mb-2 p-2 text-sm"
                              >
                                <div className="font-medium">
                                  {courseById.get(s.courseId)?.title ?? "课程"}
                                </div>
                                {s.location && (
                                  <div className="text-xs text-[color:var(--muted)]">
                                    {s.location}
                                  </div>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => openEdit(dayOfWeek, segIndex)}
                              className="btn btn-secondary h-8 text-xs"
                            >
                              编辑
                            </button>
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
      </div>

      {/* Simple Modal for editing a cell */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="card w-full max-w-md p-4">
            <div className="mb-3 text-lg font-medium">编辑课时</div>
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
              <div>
                <label className="label">课程名</label>
                <input
                  name="title"
                  defaultValue={formDefaults?.title ?? ""}
                  className="input w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">开始(分)</label>
                  <input
                    name="startMinutes"
                    type="number"
                    min={0}
                    max={1439}
                    defaultValue={formDefaults?.startMinutes ?? 0}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label">结束(分)</label>
                  <input
                    name="endMinutes"
                    type="number"
                    min={1}
                    max={1440}
                    defaultValue={formDefaults?.endMinutes ?? 0}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">地点（可选）</label>
                <input
                  name="location"
                  defaultValue={formDefaults?.location ?? ""}
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="btn btn-ghost text-sm"
                >
                  取消
                </button>
                <button disabled={busy} className="btn btn-primary">
                  保存
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </TimetableShell>
  );
}
