/**
 * Type definitions for the CalQuity AI Search Chat application
 */

// ============== Chat Types ==============

export interface Citation {
  id: number;
  documentId: string;
  documentName: string;
  pageNumber: number;
  textSnippet: string;
  startChar?: number;
  endChar?: number;
}

export interface SourceCard {
  documentId: string;
  documentName: string;
  pageCount: number;
  previewText: string;
  relevanceScore: number;
}

export interface ToolCall {
  type: 'thinking' | 'searching_documents' | 'retrieving_pdf' | 'analyzing_content';
  message: string;
  status: 'started' | 'completed' | 'error';
  metadata?: Record<string, unknown>;
}

export interface UIComponent {
  type: 'chart' | 'table' | 'card' | 'info_box';
  id: string;
  data: Record<string, unknown>;
  title?: string;
}

export interface ChartData {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  sourceCards: SourceCard[];
  uiComponents: UIComponent[];
  toolCalls: ToolCall[];
  isStreaming?: boolean;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ============== Stream Events ==============

export type StreamEventType = 
  | 'text_chunk' 
  | 'tool_call' 
  | 'citation' 
  | 'ui_component' 
  | 'source_cards'
  | 'done'
  | 'error'
  | 'keepalive';

export interface StreamEvent<T = unknown> {
  eventType: StreamEventType;
  data: T;
  timestamp: string;
}

export interface TextChunkEvent {
  text: string;
}

export interface ToolCallEvent {
  type: ToolCall['type'];
  message: string;
  status: ToolCall['status'];
}

export interface SourceCardsEvent {
  cards: Array<{
    document_id: string;
    document_name: string;
    page_count: number;
    preview_text: string;
    relevance_score: number;
  }>;
}

export interface DoneEvent {
  message_id: string;
  total_citations: number;
}

// ============== PDF Types ==============

export interface PDFDocument {
  id: string;
  filename: string;
  pageCount: number;
  fileSize: number;
  uploadDate: string;
}

export interface PDFHighlight {
  pageNumber: number;
  text: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============== API Types ==============

export interface ChatRequest {
  query: string;
  conversationId?: string;
  includeCitations?: boolean;
}

export interface ChatResponse {
  jobId: string;
  streamId: string;
  message: string;
}

export interface UploadResponse {
  documentId: string;
  filename: string;
  pageCount: number;
  message: string;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
}

// ============== Store Types ==============

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isStreaming: boolean;
  selectedCitation: Citation | null;
  toolCalls: ToolCall[];
}

export interface PDFState {
  currentDocument: PDFDocument | null;
  currentPage: number;
  zoom: number;
  highlight: PDFHighlight | null;
  isLoading: boolean;
}
