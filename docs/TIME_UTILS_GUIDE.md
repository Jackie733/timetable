# 时间工具使用指南

本项目使用分钟数来存储时间的原因是**计算效率**和**数据一致性**，但我们提供了丰富的时间工具函数来让开发更加直观和用户友好。

## 为什么使用分钟数存储？

1. **计算效率**：数字比字符串计算更快
2. **存储效率**：整数比字符串占用空间更小
3. **排序便利**：数字可以直接排序比较
4. **避免时区问题**：纯数字表示相对时间，不受时区影响

## 时间工具函数使用示例

### 基础转换

```typescript
import { TimeUtils } from "~/utils/timeUtils";

// HH:mm 格式转换为分钟数
const minutes = TimeUtils.timeToMinutes("08:30"); // 返回 510

// 分钟数转换为 HH:mm 格式
const timeString = TimeUtils.minutesToTime(510); // 返回 "08:30"

// 验证时间格式
const isValid = TimeUtils.isValidTimeFormat("08:30"); // 返回 true
```

### 时间计算

```typescript
// 添加时间
const newTime = TimeUtils.addMinutes("08:00", 45); // 返回 "08:45"

// 检查时间范围
const inRange = TimeUtils.isTimeInRange("09:30", "08:00", "10:00"); // 返回 true

// 检查时间重叠
const overlap = TimeUtils.isTimeOverlap("08:00", "09:00", "08:30", "09:30"); // 返回 true

// 时间间隔调整
const rounded = TimeUtils.roundToInterval("08:23", 15); // 返回 "08:30"
```

### 学校课表相关

```typescript
// 生成标准学校课表
const schedule = TimeUtils.generateStandardSchoolSchedule();
// 返回包含6节课的标准时间安排

// 获取特定节次的时间
const classTime = TimeUtils.getStandardSchoolTime(0);
// 返回: { startTime: "08:00", endTime: "08:40", startMinutes: 480, endMinutes: 520 }

// 生成时间选择器选项
const options = TimeUtils.generateTimeOptions(6, 22, 5);
// 生成从6:00到22:00，每5分钟间隔的选项
```

### 在组件中使用

#### TimePicker 组件

```tsx
<TimePicker
  name="startTime"
  defaultValue={TimeUtils.timeToMinutes("08:00")} // 直接使用时间字符串
  label="开始时间"
  min="06:00"
  max="22:00"
/>
```

#### 在表单处理中

```typescript
// 表单提交时的验证
const startMinutes = Number(formData.get("startTime"));
const endMinutes = Number(formData.get("endTime"));

if (TimeUtils.isValidTimeRange(startMinutes, endMinutes)) {
  // 保存到数据库
  await db.segments.add({
    startMinutes,
    endMinutes,
    // 可选：同时保存可读格式用于调试
    startTime: TimeUtils.minutesToTime(startMinutes),
    endTime: TimeUtils.minutesToTime(endMinutes),
  });
}
```

### 数据库增强功能

```typescript
// 创建标准学校课表
const timetableId = await db.createStandardSchoolTimetable(
  "高一(1)班",
  "student"
);

// 获取带时间字符串的课表
const enrichedTimetable = await db.enrichTimetableWithTimeStrings(timetableId);

// 验证时间段冲突
const validation = await db.validateTimetableTimeSegments(timetableId);
if (!validation.isValid) {
  console.log("发现时间冲突：", validation.conflicts);
}
```

## 最佳实践

### 1. 前端显示

```typescript
// ✅ 好的做法：使用工具函数进行转换
const displayTime = TimeUtils.minutesToTime(segment.startMinutes);

// ❌ 避免：手动计算
const hours = Math.floor(segment.startMinutes / 60);
const minutes = segment.startMinutes % 60;
```

### 2. 时间验证

```typescript
// ✅ 好的做法：使用工具函数验证
if (TimeUtils.isValidTimeRange(start, end)) {
  // 处理逻辑
}

// ❌ 避免：手动比较
if (start < end && start >= 0 && end <= 1440) {
  // 处理逻辑
}
```

### 3. 默认值设置

```typescript
// ✅ 好的做法：使用标准学校时间
const defaultStart = TimeUtils.getStandardSchoolTime(segmentIndex).startMinutes;

// ❌ 避免：硬编码分钟数
const defaultStart = 480; // 用户不知道这是什么时间
```

## 调试技巧

### 在开发工具中查看时间

```typescript
// 在控制台中快速转换时间
console.log("开始时间:", TimeUtils.minutesToTime(segment.startMinutes));
console.log("结束时间:", TimeUtils.minutesToTime(segment.endMinutes));
console.log(
  "持续时间:",
  TimeUtils.formatDuration(
    TimeUtils.getDurationMinutes(segment.startMinutes, segment.endMinutes)
  )
);
```

### 时间冲突检测

```typescript
// 检测课程时间冲突
const courses = await db
  .getActive(db.sessions)
  .filter(s => s.timetableId === id)
  .toArray();
for (let i = 0; i < courses.length; i++) {
  for (let j = i + 1; j < courses.length; j++) {
    const course1 = courses[i];
    const course2 = courses[j];

    if (course1.dayOfWeek === course2.dayOfWeek) {
      const start1 = TimeUtils.minutesToTime(course1.startMinutes);
      const end1 = TimeUtils.minutesToTime(course1.endMinutes);
      const start2 = TimeUtils.minutesToTime(course2.startMinutes);
      const end2 = TimeUtils.minutesToTime(course2.endMinutes);

      if (TimeUtils.isTimeOverlap(start1, end1, start2, end2)) {
        console.warn(`课程冲突：${start1}-${end1} 与 ${start2}-${end2}`);
      }
    }
  }
}
```

## 总结

虽然底层使用分钟数存储，但通过丰富的时间工具函数，我们可以：

1. **更直观的开发体验**：使用 HH:mm 格式进行思考和调试
2. **更好的代码可读性**：函数名明确表达意图
3. **更少的错误**：统一的验证和转换逻辑
4. **更好的用户体验**：用户看到的都是友好的时间格式

这种设计既保持了性能优势，又提供了开发便利性。
