import type { Route } from "./+types/t.$id.edit-grid";
import { useLoaderData, Form, useNavigation } from "react-router";
import { motion } from "motion/react";
import { db, type Timetable } from "../db";
import { TimetableShell } from "../components/TimetableShell";
import { TimePicker } from "../components/TimePicker";
import { springPresets, useReducedMotion } from "../utils/animations";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";

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
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useMobileDetection();
  const existingSegments = timetable.segments ?? [];
  const segmentsCount = Math.max(existingSegments.length, 6);

  return (
    <TimetableShell id={timetable.id} title={`${timetable.name}（课表设置）`}>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.default}
      >
        <Form
          method="post"
          className={`grid gap-4 ${isMobile ? "" : "md:grid-cols-[1fr_280px]"}`}
        >
          <motion.div
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -20 }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springPresets.default, delay: 0.1 }}
          >
            <Card className="p-3">
              <p
                className={`text-muted-foreground mb-2 ${isMobile ? "text-sm" : "text-sm"}`}
              >
                设置课程表显示的天数与每日节次时间段。
              </p>
              <div
                className={`mb-3 gap-3 ${isMobile ? "grid grid-cols-1 space-y-3" : "grid grid-cols-2"}`}
              >
                <div>
                  <Label className="py-1">显示天数（5/7）</Label>
                  <Input
                    name="days"
                    type="number"
                    min={1}
                    max={7}
                    defaultValue={timetable.days ?? 5}
                    className={`${isMobile ? "h-10 text-base" : "h-8"}`}
                  />
                </div>
                <div>
                  <Label className="py-1">节次数量</Label>
                  <Input
                    name="segmentsCount"
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={segmentsCount}
                    className={`${isMobile ? "h-10 text-base" : "h-8"}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: segmentsCount }).map((_, i) => {
                  const seg = existingSegments[i];
                  return (
                    <motion.div
                      key={i}
                      className={`border-border gap-2 rounded border p-2 ${
                        isMobile
                          ? "grid grid-cols-1 space-y-2"
                          : "grid grid-cols-[70px_1fr_1fr] items-end"
                      }`}
                      initial={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { opacity: 0, scale: 0.95 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        ...springPresets.default,
                        delay: 0.2 + i * 0.05,
                      }}
                    >
                      <div>
                        <Label
                          className={`py-1 ${isMobile ? "text-sm" : "text-xs"}`}
                        >
                          第{i + 1}节
                        </Label>
                        <Input
                          name={`seg_${i}_label`}
                          defaultValue={seg?.label ?? String(i + 1)}
                          className={`${isMobile ? "h-10 text-base" : "h-8 text-xs"}`}
                          placeholder={`${i + 1}`}
                        />
                      </div>
                      <div
                        className={
                          isMobile ? "grid grid-cols-2 gap-2" : "contents"
                        }
                      >
                        <TimePicker
                          name={`seg_${i}_start`}
                          defaultValue={seg?.startMinutes ?? i * 50 + 480} // 默认从8:00开始，每节课50分钟间隔
                          label="开始时间"
                          min="06:00"
                          max="22:00"
                          compact={!isMobile}
                        />
                        <TimePicker
                          name={`seg_${i}_end`}
                          defaultValue={seg?.endMinutes ?? i * 50 + 525} // 默认45分钟课时 + 5分钟课间
                          label="结束时间"
                          min="06:30"
                          max="22:30"
                          compact={!isMobile}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
          <motion.aside
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 20 }
            }
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springPresets.default, delay: 0.3 }}
          >
            <Card className="p-3">
              <Button
                disabled={busy}
                size={isMobile ? "default" : "sm"}
                className="w-full"
                asChild
              >
                <motion.button
                  whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                >
                  {busy ? "保存中…" : "保存设置"}
                </motion.button>
              </Button>

              <div className="text-muted-foreground mt-3 space-y-1 text-sm">
                <h3 className="text-foreground text-sm font-medium">
                  使用说明
                </h3>
                <ul
                  className={`space-y-0.5 leading-relaxed ${isMobile ? "text-sm" : "text-xs"}`}
                >
                  <li>• 选择显示天数（5天/7天）</li>
                  <li>• 设置每日节次数量</li>
                  <li>• 用时间选择器设置时间段</li>
                  <li>• 标签可自定义（早读、午休等）</li>
                  <li>• 支持5分钟间隔调整</li>
                </ul>
              </div>
            </Card>
          </motion.aside>
        </Form>
      </motion.div>
    </TimetableShell>
  );
}
