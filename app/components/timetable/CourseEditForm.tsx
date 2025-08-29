import { useSubmit } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { ColorSelector } from "../common/ColorSelector";
import type { SessionFormData } from "../../hooks/useCourseEditing";

const courseFormSchema = z.object({
  title: z
    .string()
    .min(1, {
      message: "课程名称不能为空",
    })
    .max(50, {
      message: "课程名称不能超过50个字符",
    }),
  location: z
    .string()
    .max(50, {
      message: "上课地点不能超过50个字符",
    })
    .optional(),
});

export interface CourseEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  formDefaults: SessionFormData | null;
  selectedColor: string;
  onColorChange: (color: string) => void;
  timetableId: string;
  existingSessionId?: string;
  onDeleteSession?: () => void;
  isBusy?: boolean;
  isMobile?: boolean;
}

export function CourseEditForm({
  isOpen,
  onClose,
  formDefaults,
  selectedColor,
  onColorChange,
  timetableId,
  existingSessionId,
  onDeleteSession,
  isBusy = false,
  isMobile = false,
}: CourseEditFormProps) {
  const submit = useSubmit();

  const form = useForm<z.infer<typeof courseFormSchema>>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: formDefaults?.title || "",
      location: formDefaults?.location || "",
    },
  });

  function onSubmit(values: z.infer<typeof courseFormSchema>) {
    // Prepare form data with all hidden fields
    const formData: Record<string, string | number> = {
      intent: "update-cell",
      timetableId,
      dayOfWeek: formDefaults?.dayOfWeek || 0,
      startMinutes: formDefaults?.startMinutes || 0,
      endMinutes: formDefaults?.endMinutes || 0,
      color: selectedColor,
      title: values.title,
      location: values.location || "",
    };

    if (existingSessionId) {
      formData.existingSessionId = existingSessionId;
    }

    submit(formData, { method: "post" });
    onClose();
  }

  if (!formDefaults) return null;

  const isEditing = !!existingSessionId;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
      >
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
            {isEditing ? "编辑课时" : "添加课时"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isMobile ? "text-sm" : ""}>
                    课程名称
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入课程名称"
                      className={isMobile ? "mt-1" : ""}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={isMobile ? "text-sm" : ""}>
                    上课地点（可选）
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入上课地点"
                      className={isMobile ? "mt-1" : ""}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className={`mb-2 block ${isMobile ? "text-sm" : ""}`}>
                课程颜色
              </FormLabel>
              <ColorSelector
                selectedColor={selectedColor}
                onColorChange={onColorChange}
                isMobile={isMobile}
              />
            </div>

            <DialogFooter className={isMobile ? "flex-col gap-3" : ""}>
              <div className={isMobile ? "w-full" : ""}>
                {isEditing && onDeleteSession && (
                  <Button
                    type="button"
                    variant="destructive"
                    size={isMobile ? "default" : "sm"}
                    className={isMobile ? "w-full" : ""}
                    onClick={onDeleteSession}
                  >
                    删除
                  </Button>
                )}
              </div>
              <div className={`flex gap-2 ${isMobile ? "w-full" : ""}`}>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="ghost"
                  size={isMobile ? "default" : "sm"}
                  className={isMobile ? "flex-1" : ""}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={isBusy}
                  className={isMobile ? "flex-1" : ""}
                  size={isMobile ? "default" : "sm"}
                >
                  {isEditing ? "更新" : "保存"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
