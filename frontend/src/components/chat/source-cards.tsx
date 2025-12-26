"use client";

import { FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import type { SourceCard as SourceCardType, Citation } from "@/types";

interface SourceCardsProps {
  cards: SourceCardType[];
}

export function SourceCards({ cards }: SourceCardsProps) {
  const { setSelectedCitation } = useChatStore();
  
  const handleCardClick = (card: SourceCardType) => {
    // Create a citation from the source card to open PDF viewer
    const citation: Citation = {
      id: 0,
      documentId: card.documentId,
      documentName: card.documentName,
      pageNumber: 1,
      textSnippet: card.previewText,
    };
    setSelectedCitation(citation);
  };
  
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wide">
        Sources
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {cards.map((card, idx) => (
          <motion.button
            key={card.documentId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            onClick={() => handleCardClick(card)}
            className="flex-shrink-0 w-48 p-3 rounded-2xl text-left
                     bg-white dark:bg-surface-800 
                     border-2 border-black dark:border-surface-600
                     hover:bg-gray-50 dark:hover:bg-surface-700
                     hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-surface-700 
                            flex items-center justify-center border border-black dark:border-surface-500">
                <FileText className="w-4 h-4 text-black dark:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                  {card.documentName}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {card.pageCount} pages
                </p>
              </div>
            </div>
            
            <p className="mt-2 text-xs text-surface-600 dark:text-surface-300 line-clamp-2">
              {card.previewText}
            </p>
            
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getRelevanceColor(card.relevanceScore)
                  }}
                />
                <span className="text-xs text-surface-400">
                  {Math.round(card.relevanceScore * 100)}% match
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-primary-500 transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function getRelevanceColor(score: number): string {
  if (score >= 0.8) return '#10b981'; // green
  if (score >= 0.6) return '#f59e0b'; // amber
  if (score >= 0.4) return '#f97316'; // orange
  return '#ef4444'; // red
}
