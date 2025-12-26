import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useChatStore } from "@/store/chat-store";
import type { 
  Citation, 
  SourceCard, 
  ToolCall, 
  UIComponent,
  SourceCardsEvent 
} from "@/types";

interface UseStreamingChatOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for handling streaming chat responses via SSE
 */
export function useStreamingChat(options: UseStreamingChatOptions = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const {
    appendToMessage,
    addCitationToMessage,
    addSourceCardsToMessage,
    addUIComponentToMessage,
    addToolCallToMessage,
    updateMessage,
    setIsStreaming,
    addActiveToolCall,
    updateActiveToolCall,
    clearActiveToolCalls,
  } = useChatStore();

  const handleSSEEvent = useCallback(async (messageId: string, data: Record<string, unknown>) => {
    // Handle different event types based on the data structure
    
    // Text chunk
    if ('text' in data && typeof data.text === 'string') {
      appendToMessage(messageId, data.text);
      return;
    }
    
    // Tool call
    if ('type' in data && 'status' in data && 'message' in data) {
      const toolCall: ToolCall = {
        type: data.type as ToolCall['type'],
        message: data.message as string,
        status: data.status as ToolCall['status'],
      };
      
      if (toolCall.status === 'started') {
        addActiveToolCall(toolCall);
      } else {
        updateActiveToolCall(toolCall.type, toolCall.status);
      }
      
      addToolCallToMessage(messageId, toolCall);
      return;
    }
    
    // Citation (has document_id)
    if ('id' in data && 'document_id' in data) {
      const citation: Citation = {
        id: data.id as number,
        documentId: data.document_id as string,
        documentName: data.document_name as string,
        pageNumber: data.page_number as number,
        textSnippet: data.text_snippet as string,
      };
      addCitationToMessage(messageId, citation);
      return;
    }
    
    // Source cards
    if ('cards' in data && Array.isArray(data.cards)) {
      const cards: SourceCard[] = (data.cards as SourceCardsEvent['cards']).map((card) => ({
        documentId: card.document_id,
        documentName: card.document_name,
        pageCount: card.page_count,
        previewText: card.preview_text,
        relevanceScore: card.relevance_score,
      }));
      addSourceCardsToMessage(messageId, cards);
      return;
    }
    
    // UI Component
    if ('type' in data && 'id' in data && 'data' in data && 
        ['chart', 'table', 'card', 'info_box'].includes(data.type as string)) {
      const component: UIComponent = {
        type: data.type as UIComponent['type'],
        id: data.id as string,
        data: data.data as Record<string, unknown>,
        title: data.title as string | undefined,
      };
      addUIComponentToMessage(messageId, component);
      return;
    }
    
    // Done event
    if ('message_id' in data) {
      console.log('Stream completed:', data);
      return;
    }
  }, [
    appendToMessage,
    addCitationToMessage,
    addSourceCardsToMessage,
    addUIComponentToMessage,
    addToolCallToMessage,
    addActiveToolCall,
    updateActiveToolCall,
  ]);

  const startStreaming = useCallback(async (
    query: string,
    messageId: string
  ) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsConnecting(true);
    setIsStreaming(true);
    clearActiveToolCalls();
    options.onStart?.();

    try {
      const url = api.chat.directStream(query);
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setIsConnecting(false);
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            continue;
          }
          
          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              await handleSSEEvent(messageId, data);
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Streaming error:', error);
        options.onError?.(error as Error);
      }
    } finally {
      setIsConnecting(false);
      setIsStreaming(false);
      updateMessage(messageId, { isStreaming: false });
      clearActiveToolCalls();
      options.onEnd?.();
    }
  }, [
    handleSSEEvent,
    updateMessage,
    setIsStreaming,
    clearActiveToolCalls,
    options,
  ]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, [setIsStreaming]);

  return {
    startStreaming,
    stopStreaming,
    isConnecting,
  };
}
