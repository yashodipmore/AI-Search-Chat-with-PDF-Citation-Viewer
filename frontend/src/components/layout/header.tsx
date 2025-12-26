"use client";

import { Moon, Sun, FileUp, Trash2, Search } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { useState, useRef } from "react";
import { useUploadDocument } from "@/hooks/use-api";

export function Header() {
  const { darkMode, toggleDarkMode, clearAllConversations, conversations } = useChatStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadDocument();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await uploadMutation.mutateAsync(file);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b-[3px] border-black dark:border-surface-500 bg-white dark:bg-surface-900">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-black dark:bg-white flex items-center justify-center">
          <Search className="w-5 h-5 text-white dark:text-black" />
        </div>
        <h1 className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
          CalQuity
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-black dark:text-white 
                   bg-white dark:bg-surface-800 border-2 border-black dark:border-surface-500 
                   rounded-xl hover:bg-gray-100 dark:hover:bg-surface-700
                   transition-colors"
          disabled={uploadMutation.isPending}
        >
          <FileUp className="w-4 h-4" />
          <span className="hidden sm:inline">
            {uploadMutation.isPending ? 'Uploading...' : 'Upload PDF'}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Clear Conversations */}
        {conversations.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all conversations?')) {
                clearAllConversations();
              }
            }}
            className="p-2 text-surface-500 dark:text-surface-400 hover:text-red-500 dark:hover:text-red-400 
                     rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors
                     border-2 border-transparent hover:border-red-300"
            title="Clear all conversations"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 
                   rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors
                   border-2 border-transparent hover:border-black dark:hover:border-surface-500"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
