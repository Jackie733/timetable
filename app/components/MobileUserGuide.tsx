import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, Hand, Edit3, Menu, Rocket } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export function MobileUserGuide({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "欢迎使用移动版课表",
      content: "本应用已专门为移动设备优化，让您随时随地管理课表。",
      icon: Smartphone,
    },
    {
      title: "查看课表",
      content: "课表支持左右滑动查看完整内容。您可以点击任意课程卡片进行编辑。",
      icon: Hand,
    },
    {
      title: "快速编辑",
      content: "点击空白时间段可添加新课程，点击现有课程可编辑或删除。",
      icon: Edit3,
    },
    {
      title: "导航菜单",
      content: "点击右上角的菜单按钮，可以访问课表设置和数据管理功能。",
      icon: Menu,
    },
    {
      title: "开始使用",
      content: "现在您已经了解了基本操作，开始创建您的第一个课表吧！",
      icon: Rocket,
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="mb-4 text-4xl">
              {(() => {
                const IconComponent = steps[currentStep].icon;
                return (
                  <IconComponent className="mx-auto h-12 w-12 text-blue-500" />
                );
              })()}
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {steps[currentStep].title}
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              {steps[currentStep].content}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-500"
                    : index < currentStep
                      ? "bg-blue-300"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                上一步
              </Button>
            )}
            <Button size="sm" onClick={nextStep}>
              {currentStep < steps.length - 1 ? "下一步" : "开始使用"}
            </Button>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full text-gray-500"
          >
            跳过引导
          </Button>
        </div>
      </Card>
    </div>
  );
}
