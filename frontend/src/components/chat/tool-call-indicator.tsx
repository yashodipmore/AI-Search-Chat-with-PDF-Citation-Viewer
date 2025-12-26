"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { getToolCallStyle } from "@/lib/utils";
import type { ToolCall } from "@/types";

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
}

export function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const { icon, color } = getToolCallStyle(toolCall.type);
  const isCompleted = toolCall.status === "completed";
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl
                bg-gray-100 dark:bg-surface-800 
                text-black dark:text-surface-300
                text-sm font-medium border-2 border-black dark:border-surface-600"
    >
      <span className="text-base">{icon}</span>
      <span>{toolCall.message}</span>
      {isCompleted ? (
        <Check className="w-4 h-4 text-green-600 ml-auto" />
      ) : (
        <Loader2 className="w-4 h-4 text-black dark:text-white ml-auto animate-spin" />
      )}
    </motion.div>
  );
}
