import { useNavigation, useSubmit } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMobileDetection } from "~/hooks/useMobileDetection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "课表名称不能为空",
    })
    .max(50, {
      message: "课表名称不能超过50个字符",
    }),
  type: z.enum(["teacher", "student"]),
});

export interface CreateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTimetableModal({
  isOpen,
  onClose,
}: CreateTimetableModalProps) {
  const nav = useNavigation();
  const submit = useSubmit();
  const busy = nav.state === "submitting";
  const { isMobile } = useMobileDetection();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "teacher",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Submit to React Router
    submit(values, { method: "post" });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <Card className={`w-full p-4 ${isMobile ? "modal-mobile" : "max-w-md"}`}>
        <div
          className={`mb-3 font-medium ${isMobile ? "text-base" : "text-lg"}`}
        >
          创建新课表
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：张老师-2025年度第一学期"
                      className={isMobile ? "text-base" : ""}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>模式</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={`w-full ${isMobile ? "min-h-[44px] text-base" : ""}`}
                      >
                        <SelectValue placeholder="选择课表模式" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="teacher">老师课表</SelectItem>
                      <SelectItem value="student">学生课表</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div
              className={`flex gap-2 ${isMobile ? "flex-col pt-2" : "justify-end"}`}
            >
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                size="sm"
                className={isMobile ? "w-full" : ""}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className={isMobile ? "w-full" : ""}
              >
                {busy ? "创建中…" : "创建"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
