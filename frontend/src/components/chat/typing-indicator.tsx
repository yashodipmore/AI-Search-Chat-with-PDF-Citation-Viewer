"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 
                    flex items-center justify-center">
        <span className="text-white text-sm">AI</span>
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md 
                    bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
        <span className="w-2 h-2 rounded-full bg-primary-400 typing-dot" />
        <span className="w-2 h-2 rounded-full bg-primary-400 typing-dot" />
        <span className="w-2 h-2 rounded-full bg-primary-400 typing-dot" />
      </div>
    </div>
  );
}
