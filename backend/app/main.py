"""
CalQuity AI Search Chat - FastAPI Backend
Main application entry point
"""
import asyncio
import json
import uuid
import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse

from .models import (
    ChatRequest, ChatResponse, ChatMessage, 
    PDFMetadata, Citation, SourceCard, UploadResponse,
    JobStatus
)
from .pdf_service import (
    save_pdf, get_pdf_metadata, get_pdf_file_path,
    get_all_documents, delete_document, search_in_documents,
    find_text_position, PDF_STORAGE
)
from .queue_service import job_queue, streaming_results
from .ai_service import generate_streaming_response, process_chat_request


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    print("Starting CalQuity AI Backend...")
    print(f"Groq API Key configured: {'Yes' if os.getenv('GROQ_API_KEY') else 'No'}")
    
    # Register job handlers
    job_queue.register_handler("chat", process_chat_request)
    
    # Start queue workers
    await job_queue.start(num_workers=3)
    print("Queue workers started")
    
    yield
    
    # Shutdown
    await job_queue.stop()
    print("Queue workers stopped")


# Initialize FastAPI app
app = FastAPI(
    title="CalQuity AI Search Chat API",
    description="Backend API for AI-powered document search with PDF citations",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Health Check ==============

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "queue_stats": job_queue.get_queue_stats()
    }


# ============== Chat Endpoints ==============

@app.post("/api/chat")
async def create_chat(request: ChatRequest):
    """
    Create a new chat message and get job ID for streaming
    """
    stream_id = str(uuid.uuid4())
    
    # Enqueue the chat processing job
    job_id = await job_queue.enqueue("chat", {
        "query": request.query,
        "conversation_id": request.conversation_id,
        "stream_id": stream_id,
        "include_citations": request.include_citations
    })
    
    return {
        "job_id": job_id,
        "stream_id": stream_id,
        "message": "Chat request queued"
    }


@app.get("/api/chat/stream/{stream_id}")
async def stream_chat_response(stream_id: str):
    """
    Stream chat response via Server-Sent Events (SSE)
    """
    async def event_generator():
        # Wait for stream to be created (with timeout)
        max_wait = 10  # seconds
        waited = 0
        stream = None
        
        while waited < max_wait:
            stream = streaming_results.get_stream(stream_id)
            if stream:
                break
            await asyncio.sleep(0.1)
            waited += 0.1
        
        if not stream:
            yield {
                "event": "error",
                "data": json.dumps({"error": "Stream not found or timed out"})
            }
            return
        
        # Stream events
        while True:
            try:
                event = await asyncio.wait_for(stream.get(), timeout=30.0)
                
                if event is None:  # Stream closed
                    break
                
                yield {
                    "event": event.get("event_type", "message"),
                    "data": json.dumps(event.get("data", {}))
                }
                
                if event.get("event_type") == "done":
                    break
                    
            except asyncio.TimeoutError:
                # Send keepalive
                yield {
                    "event": "keepalive",
                    "data": json.dumps({"timestamp": datetime.utcnow().isoformat()})
                }
    
    return EventSourceResponse(event_generator())


@app.get("/api/chat/direct-stream")
async def direct_stream_chat(query: str = Query(..., min_length=1)):
    """
    Direct streaming endpoint (without queue) for simpler use cases
    """
    stream_id = str(uuid.uuid4())
    
    async def event_generator():
        async for event in generate_streaming_response(query, stream_id):
            yield {
                "event": event.event_type,
                "data": json.dumps(event.data)
            }
    
    return EventSourceResponse(event_generator())


@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a queued job"""
    job = job_queue.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatus(
        job_id=job.id,
        status=job.status.value,
        progress=job.progress,
        result=job.result,
        error=job.error
    )


# ============== PDF Endpoints ==============

@app.post("/api/documents/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload a PDF document"""
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    content = await file.read()
    
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    try:
        metadata = await save_pdf(content, file.filename)
        return UploadResponse(
            document_id=metadata.id,
            filename=metadata.filename,
            page_count=metadata.page_count,
            message="Document uploaded successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@app.get("/api/documents")
async def list_documents():
    """List all uploaded documents"""
    documents = get_all_documents()
    return {
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "page_count": doc.page_count,
                "file_size": doc.file_size,
                "upload_date": doc.upload_date.isoformat()
            }
            for doc in documents
        ],
        "total": len(documents)
    }


@app.get("/api/documents/{document_id}")
async def get_document(document_id: str):
    """Get document metadata"""
    metadata = get_pdf_metadata(document_id)
    
    if not metadata:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": metadata.id,
        "filename": metadata.filename,
        "page_count": metadata.page_count,
        "file_size": metadata.file_size,
        "upload_date": metadata.upload_date.isoformat()
    }


@app.get("/api/documents/{document_id}/file")
async def get_document_file(document_id: str):
    """Download/view the PDF file"""
    file_path = get_pdf_file_path(document_id)
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Document file not found")
    
    metadata = get_pdf_metadata(document_id)
    filename = metadata.filename if metadata else "document.pdf"
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename
    )


@app.get("/api/documents/{document_id}/page/{page_number}")
async def get_page_content(document_id: str, page_number: int):
    """Get text content for a specific page"""
    metadata = get_pdf_metadata(document_id)
    
    if not metadata:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if page_number not in metadata.text_content:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {
        "document_id": document_id,
        "page_number": page_number,
        "text": metadata.text_content[page_number],
        "total_pages": metadata.page_count
    }


@app.delete("/api/documents/{document_id}")
async def remove_document(document_id: str):
    """Delete a document"""
    success = delete_document(document_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}


@app.get("/api/documents/search")
async def search_documents(q: str = Query(..., min_length=1)):
    """Search across all documents"""
    results = search_in_documents(q, limit=10)
    
    return {
        "query": q,
        "results": [
            {
                "document_id": doc_id,
                "page_number": page_num,
                "snippet": snippet,
                "relevance_score": score,
                "document_name": get_pdf_metadata(doc_id).filename if get_pdf_metadata(doc_id) else "Unknown"
            }
            for doc_id, page_num, snippet, score in results
        ]
    }


@app.get("/api/citation/{document_id}/highlight")
async def get_citation_highlight(
    document_id: str,
    page: int = Query(..., ge=1),
    text: str = Query(...)
):
    """Get highlight information for a citation"""
    highlight = find_text_position(document_id, page, text)
    
    if not highlight:
        raise HTTPException(status_code=404, detail="Citation text not found")
    
    return {
        "document_id": document_id,
        "page_number": highlight.page_number,
        "text": highlight.text,
        "bounding_box": highlight.bounding_box
    }


# ============== Queue Stats ==============

@app.get("/api/queue/stats")
async def get_queue_stats():
    """Get queue statistics"""
    return job_queue.get_queue_stats()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
