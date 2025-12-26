import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date to relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Parse citation references from text
 * Returns text with citation markers and extracted citation IDs
 */
export function parseCitations(text: string): { 
  text: string; 
  citationIds: number[] 
} {
  const citationPattern = /\[(\d+)\]/g;
  const citationIds: number[] = [];
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const id = parseInt(match[1], 10);
    if (!citationIds.includes(id)) {
      citationIds.push(id);
    }
  }
  
  return { text, citationIds: citationIds.sort((a, b) => a - b) };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get tool call icon and color
 */
export function getToolCallStyle(type: string): { icon: string; color: string } {
  switch (type) {
    case 'thinking':
      return { icon: '🧠', color: 'text-purple-500' };
    case 'searching_documents':
      return { icon: '🔍', color: 'text-blue-500' };
    case 'retrieving_pdf':
      return { icon: '📄', color: 'text-green-500' };
    case 'analyzing_content':
      return { icon: '📊', color: 'text-orange-500' };
    default:
      return { icon: '⚙️', color: 'text-gray-500' };
  }
}
