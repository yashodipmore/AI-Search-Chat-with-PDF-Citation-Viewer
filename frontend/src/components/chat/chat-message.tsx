"use client";

import { User, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import { CitationBadge } from "./citation-badge";
import { SourceCards } from "./source-cards";
import { GenerativeUIComponent } from "./generative-ui";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-black dark:bg-white
                      flex items-center justify-center border-2 border-black dark:border-white">
          <Bot className="w-5 h-5 text-white dark:text-black" />
        </div>
      )}
      
      {/* Message Content */}
      <div className={cn("flex flex-col max-w-[85%]", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-white dark:bg-surface-800 border-2 border-black dark:border-surface-600 shadow-sm"
          )}
        >
          {/* Message Text with Citations */}
          <MessageContent 
            content={message.content} 
            citations={message.citations}
            isStreaming={message.isStreaming}
          />
        </div>
        
        {/* Generative UI Components */}
        {!isUser && message.uiComponents.length > 0 && (
          <div className="mt-3 space-y-3 w-full">
            {message.uiComponents.map((component) => (
              <motion.div
                key={component.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <GenerativeUIComponent component={component} />
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Source Cards */}
        {!isUser && message.sourceCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-3 w-full"
          >
            <SourceCards cards={message.sourceCards} />
          </motion.div>
        )}
      </div>
      
      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 
                      flex items-center justify-center">
          <User className="w-5 h-5 text-surface-600 dark:text-surface-300" />
        </div>
      )}
    </div>
  );
}

interface MessageContentProps {
  content: string;
  citations: ChatMessageType["citations"];
  isStreaming?: boolean;
}

function MessageContent({ content, citations, isStreaming }: MessageContentProps) {
  const { setSelectedCitation } = useChatStore();
  
  // Remove markdown formatting like **bold**, *italic*, etc.
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*([^*]+)\*/g, '$1')       // Remove *italic*
      .replace(/__([^_]+)__/g, '$1')       // Remove __bold__
      .replace(/_([^_]+)_/g, '$1')         // Remove _italic_
      .replace(/`([^`]+)`/g, '$1')         // Remove `code`
      .replace(/#{1,6}\s?/g, '')           // Remove # headings
      .replace(/>\s?/g, '');               // Remove > blockquotes
  };
  
  // Parse content to render citation badges inline
  const renderContent = () => {
    if (!content) {
      return isStreaming ? (
        <span className="streaming-cursor text-surface-400 dark:text-surface-500">
          Thinking
        </span>
      ) : null;
    }
    
    // Clean markdown from content
    const cleanedContent = cleanMarkdown(content);
    
    // Split by citation pattern [1], [2], etc.
    const parts = cleanedContent.split(/(\[\d+\])/g);
    
    return (
      <>
        {parts.map((part, idx) => {
          const citationMatch = part.match(/\[(\d+)\]/);
          
          if (citationMatch) {
            const citationId = parseInt(citationMatch[1], 10);
            const citation = citations.find((c) => c.id === citationId);
            
            if (citation) {
              return (
                <CitationBadge
                  key={idx}
                  citation={citation}
                  onClick={() => setSelectedCitation(citation)}
                />
              );
            }
            
            // Render as plain text if no citation data
            return <span key={idx}>{part}</span>;
          }
          
          return <span key={idx}>{part}</span>;
        })}
        {isStreaming && <span className="streaming-cursor" />}
      </>
    );
  };
  
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {renderContent()}
    </div>
  );
}
