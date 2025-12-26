"use client";

import { motion } from "framer-motion";
import type { Citation } from "@/types";

interface CitationBadgeProps {
  citation: Citation;
  onClick: () => void;
}

export function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="inline-flex items-center justify-center w-6 h-6 mx-0.5 
                text-xs font-bold rounded-lg align-text-top
                bg-black dark:bg-white 
                text-white dark:text-black
                hover:bg-gray-700 dark:hover:bg-gray-200
                cursor-pointer transition-colors
                border border-black dark:border-white"
      title={`${citation.documentName}, Page ${citation.pageNumber}`}
    >
      {citation.id}
    </motion.button>
  );
}
