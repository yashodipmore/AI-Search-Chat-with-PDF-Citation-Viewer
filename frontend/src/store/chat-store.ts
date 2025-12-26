import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Conversation, 
  ChatMessage, 
  Citation, 
  ToolCall, 
  SourceCard, 
  UIComponent 
} from '@/types';

interface ChatStore {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  selectedCitation: Citation | null;
  activeToolCalls: ToolCall[];
  darkMode: boolean;
  
  // Actions
  createConversation: () => string;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (messageId: string, text: string) => void;
  addCitationToMessage: (messageId: string, citation: Citation) => void;
  addSourceCardsToMessage: (messageId: string, cards: SourceCard[]) => void;
  addUIComponentToMessage: (messageId: string, component: UIComponent) => void;
  addToolCallToMessage: (messageId: string, toolCall: ToolCall) => void;
  setSelectedCitation: (citation: Citation | null) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  addActiveToolCall: (toolCall: ToolCall) => void;
  updateActiveToolCall: (type: string, status: ToolCall['status']) => void;
  clearActiveToolCalls: () => void;
  toggleDarkMode: () => void;
  getCurrentConversation: () => Conversation | undefined;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial State
      conversations: [],
      currentConversationId: null,
      isStreaming: false,
      selectedCitation: null,
      activeToolCalls: [],
      darkMode: false,

      // Actions
      createConversation: () => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newConversation: Conversation = {
          id,
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));
        
        return id;
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id, selectedCitation: null });
      },

      addMessage: (message) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              // Update title based on first user message
              let title = conv.title;
              if (message.role === 'user' && conv.messages.length === 0) {
                title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
              }
              
              return {
                ...conv,
                title,
                messages: [...conv.messages, message],
                updatedAt: new Date(),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      updateMessage: (messageId, updates) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, ...updates } : msg
                ),
                updatedAt: new Date(),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      appendToMessage: (messageId, text) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId 
                    ? { ...msg, content: msg.content + text }
                    : msg
                ),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      addCitationToMessage: (messageId, citation) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, citations: [...msg.citations, citation] }
                    : msg
                ),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      addSourceCardsToMessage: (messageId, cards) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, sourceCards: [...msg.sourceCards, ...cards] }
                    : msg
                ),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      addUIComponentToMessage: (messageId, component) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, uiComponents: [...msg.uiComponents, component] }
                    : msg
                ),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      addToolCallToMessage: (messageId, toolCall) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === state.currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, toolCalls: [...msg.toolCalls, toolCall] }
                    : msg
                ),
              };
            }
            return conv;
          });
          
          return { conversations };
        });
      },

      setSelectedCitation: (citation) => {
        set({ selectedCitation: citation });
      },

      setIsStreaming: (isStreaming) => {
        set({ isStreaming });
      },

      addActiveToolCall: (toolCall) => {
        set((state) => ({
          activeToolCalls: [...state.activeToolCalls, toolCall],
        }));
      },

      updateActiveToolCall: (type, status) => {
        set((state) => ({
          activeToolCalls: state.activeToolCalls.map((tc) =>
            tc.type === type ? { ...tc, status } : tc
          ),
        }));
      },

      clearActiveToolCalls: () => {
        set({ activeToolCalls: [] });
      },

      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.darkMode;
          // Update document class
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', newDarkMode);
          }
          return { darkMode: newDarkMode };
        });
      },

      getCurrentConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.currentConversationId);
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId: 
            state.currentConversationId === id 
              ? null 
              : state.currentConversationId,
        }));
      },

      clearAllConversations: () => {
        set({
          conversations: [],
          currentConversationId: null,
          selectedCitation: null,
        });
      },
    }),
    {
      name: 'calquity-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        darkMode: state.darkMode,
      }),
    }
  )
);
