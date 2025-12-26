"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Square, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { ChatMessage } from "./chat-message";
import { TypingIndicator } from "./typing-indicator";
import { ToolCallIndicator } from "./tool-call-indicator";
import { generateId } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    conversations,
    currentConversationId,
    isStreaming,
    activeToolCalls,
    createConversation,
    addMessage,
  } = useChatStore();
  
  const { startStreaming, stopStreaming, isConnecting } = useStreamingChat();

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages = useMemo(
    () => currentConversation?.messages || [],
    [currentConversation?.messages]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeToolCalls]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;
    
    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
    }
    
    // Add user message
    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: trimmedInput,
      citations: [],
      sourceCards: [],
      uiComponents: [],
      toolCalls: [],
      createdAt: new Date(),
    };
    addMessage(userMessage);
    
    // Clear input
    setInput("");
    
    // Create assistant message placeholder
    const assistantMessageId = generateId();
    const assistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      citations: [],
      sourceCards: [],
      uiComponents: [],
      toolCalls: [],
      isStreaming: true,
      createdAt: new Date(),
    };
    addMessage(assistantMessage);
    
    // Start streaming
    await startStreaming(trimmedInput, assistantMessageId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  // Handle suggestion click - directly submit the query
  const handleSuggestionClick = async (suggestion: string) => {
    if (isStreaming) return;
    
    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
    }
    
    // Add user message
    const userMessage: ChatMessageType = {
      id: generateId(),
      role: "user",
      content: suggestion,
      citations: [],
      sourceCards: [],
      uiComponents: [],
      toolCalls: [],
      createdAt: new Date(),
    };
    addMessage(userMessage);
    
    // Create assistant message placeholder
    const assistantMessageId = generateId();
    const assistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      citations: [],
      sourceCards: [],
      uiComponents: [],
      toolCalls: [],
      isStreaming: true,
      createdAt: new Date(),
    };
    addMessage(assistantMessage);
    
    // Start streaming
    await startStreaming(suggestion, assistantMessageId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage message={message} />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Active Tool Calls */}
            {activeToolCalls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {activeToolCalls.map((toolCall, idx) => (
                  <ToolCallIndicator key={idx} toolCall={toolCall} />
                ))}
              </motion.div>
            )}
            
            {/* Typing Indicator */}
            {isConnecting && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t-[3px] border-black dark:border-surface-500 bg-white dark:bg-surface-900 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your documents..."
                rows={1}
                disabled={isStreaming}
                className="w-full px-4 py-3 pr-12 rounded-2xl border-2 border-black dark:border-surface-500 
                         bg-white dark:bg-surface-800 text-black dark:text-white
                         placeholder:text-gray-500 dark:placeholder:text-surface-500
                         focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2
                         resize-none min-h-[48px] max-h-[200px]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         font-medium"
              />
            </div>
            
            <button
              type={isStreaming ? "button" : "submit"}
              onClick={isStreaming ? stopStreaming : undefined}
              disabled={!isStreaming && !input.trim()}
              className="flex items-center justify-center w-12 h-12 rounded-2xl 
                       bg-black hover:bg-gray-800 disabled:bg-gray-300 dark:bg-white dark:hover:bg-gray-200 dark:disabled:bg-surface-700
                       text-white dark:text-black disabled:text-gray-500 dark:disabled:text-surface-400
                       transition-colors duration-200 border-2 border-black dark:border-surface-500"
            >
              {isStreaming ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-surface-500 font-medium">
            Press Enter to send, Shift + Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (suggestion: string) => void }) {
  const suggestions = [
    "What are the key findings in my documents?",
    "Summarize the main topics covered",
    "Compare the different perspectives",
    "What recommendations are made?",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-black dark:bg-white
                    flex items-center justify-center mb-6 border-2 border-black dark:border-white">
        <Zap className="w-8 h-8 text-white dark:text-black" />
      </div>
      <h2 className="text-3xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
        CalQuity AI Search
      </h2>
      <p className="text-gray-600 dark:text-surface-400 max-w-md mb-8 font-medium">
        Ask questions about your documents and get AI-powered answers with citations.
        Upload PDFs to get started.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-4 py-3 text-left text-sm font-semibold text-black dark:text-white
                     bg-white dark:bg-surface-800 rounded-2xl
                     hover:bg-gray-50 dark:hover:bg-surface-700
                     border-2 border-black dark:border-surface-500
                     transition-all duration-200 cursor-pointer
                     active:scale-[0.98]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
