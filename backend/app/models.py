"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ToolCallType(str, Enum):
    THINKING = "thinking"
    SEARCHING_DOCUMENTS = "searching_documents"
    RETRIEVING_PDF = "retrieving_pdf"
    ANALYZING_CONTENT = "analyzing_content"


class Citation(BaseModel):
    """Citation reference model"""
    id: int = Field(..., description="Citation number (1-indexed)")
    document_id: str = Field(..., description="PDF document ID")
    document_name: str = Field(..., description="Original filename")
    page_number: int = Field(..., description="Page number in PDF")
    text_snippet: str = Field(..., description="Relevant text excerpt")
    start_char: Optional[int] = Field(None, description="Start character position")
    end_char: Optional[int] = Field(None, description="End character position")


class SourceCard(BaseModel):
    """Source card for displaying document metadata"""
    document_id: str
    document_name: str
    page_count: int
    preview_text: str
    relevance_score: float = Field(ge=0, le=1)


class ToolCall(BaseModel):
    """Tool call step indicator"""
    type: ToolCallType
    message: str
    status: Literal["started", "completed", "error"] = "started"
    metadata: Optional[dict] = None


class UIComponent(BaseModel):
    """Generative UI component model"""
    type: Literal["chart", "table", "card", "info_box"]
    id: str
    data: dict
    title: Optional[str] = None


class StreamEvent(BaseModel):
    """Server-Sent Event payload"""
    event_type: Literal[
        "text_chunk", 
        "tool_call", 
        "citation", 
        "ui_component", 
        "source_cards",
        "done",
        "error"
    ]
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(BaseModel):
    """Chat message model"""
    id: str
    role: Literal["user", "assistant"]
    content: str
    citations: List[Citation] = []
    source_cards: List[SourceCard] = []
    ui_components: List[UIComponent] = []
    tool_calls: List[ToolCall] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatRequest(BaseModel):
    """Incoming chat request"""
    query: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    include_citations: bool = True


class ChatResponse(BaseModel):
    """Non-streaming chat response"""
    message: ChatMessage
    conversation_id: str


class PDFMetadata(BaseModel):
    """PDF document metadata"""
    id: str
    filename: str
    page_count: int
    file_size: int
    upload_date: datetime
    text_content: dict[int, str]  # page_number -> text


class PDFHighlight(BaseModel):
    """PDF highlight section"""
    page_number: int
    text: str
    bounding_box: Optional[dict] = None  # {x, y, width, height}


class JobStatus(BaseModel):
    """Queue job status"""
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: float = Field(ge=0, le=1, default=0)
    result: Optional[dict] = None
    error: Optional[str] = None


class UploadResponse(BaseModel):
    """PDF upload response"""
    document_id: str
    filename: str
    page_count: int
    message: str
