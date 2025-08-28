import type { Route } from "./+types/t.$id.edit-grid";
import { useLoaderData, Form, useNavigation } from "react-router";
import { db, type Timetable } from "../db";
import { TimetableShell } from "../components/TimetableShell";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = params.id!;
  const timetable = await db
    .getActive(db.timetables)
    .filter(t => t.id === id)
    .first();
  if (!timetable) throw new Response("Not Found", { status: 404 });
  return { timetable } as const;
}

export async function clientAction({
  request,
  params,
}: Route.ClientActionArgs) {
  const id = params.id!;
  const fd = await request.formData();
  const days = Math.max(1, Math.min(7, Number(fd.get("days") || 5)));
  const segmentsCount = Math.max(
    1,
    Math.min(12, Number(fd.get("segmentsCount") || 6))
  );
  const segments: Timetable["segments"] = [];
  for (let i = 0; i < segmentsCount; i++) {
    const label = String(fd.get(`seg_${i}_label`) || "").trim();
    const startMinutes = Math.max(
      0,
      Math.min(1439, Number(fd.get(`seg_${i}_start`) || 0))
    );
    const endMinutes = Math.max(
      1,
      Math.min(1440, Number(fd.get(`seg_${i}_end`) || 0))
    );
    if (endMinutes > startMinutes) {
      segments.push({
        label: label || String(i + 1),
        startMinutes,
        endMinutes,
      });
    }
  }
  await db.timetables.update(id, { days, segments });
  return { ok: true } as const;
}

export default function EditGrid() {
  const { timetable } = useLoaderData<typeof clientLoader>();
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const existingSegments = timetable.segments ?? [];
  const segmentsCount = Math.max(existingSegments.length, 6);
  return (
    <TimetableShell id={timetable.id} title={`${timetable.name}（网格设置）`}>
      <Form method="post" className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="card p-4">
          <p className="mb-3 text-sm text-[color:var(--muted)]">
            设置课程表显示的天数与每日节次时间段。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">显示天数（5/7）</label>
              <input
                name="days"
                type="number"
                min={1}
                max={7}
                defaultValue={timetable.days ?? 5}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">节次数量</label>
              <input
                name="segmentsCount"
                type="number"
                min={1}
                max={12}
                defaultValue={segmentsCount}
                className="input w-full"
              />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: segmentsCount }).map((_, i) => {
              const seg = existingSegments[i];
              return (
                <div
                  key={i}
                  className="grid grid-cols-[80px_1fr_1fr] items-end gap-2"
                >
                  <div>
                    <label className="label">第{i + 1}节</label>
                    <input
                      name={`seg_${i}_label`}
                      defaultValue={seg?.label ?? String(i + 1)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">开始(分)</label>
                    <input
                      name={`seg_${i}_start`}
                      type="number"
                      min={0}
                      max={1439}
                      defaultValue={seg?.startMinutes ?? 0}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">结束(分)</label>
                    <input
                      name={`seg_${i}_end`}
                      type="number"
                      min={1}
                      max={1440}
                      defaultValue={seg?.endMinutes ?? 0}
                      className="input w-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="card p-4">
          <button disabled={busy} className="btn btn-primary">
            {busy ? "保存中…" : "保存设置"}
          </button>
        </aside>
      </Form>
    </TimetableShell>
  );
}
