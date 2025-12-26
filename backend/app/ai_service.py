"""
AI Service - Real AI response generation with Groq API
Uses Groq's fast LLM inference for streaming responses
"""
import asyncio
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from groq import Groq

from .models import (
    Citation, SourceCard, ToolCall, ToolCallType, 
    UIComponent, ChatMessage, StreamEvent
)
from .pdf_service import search_in_documents, get_pdf_metadata, PDF_STORAGE, get_all_document_text
from .queue_service import streaming_results


# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = None


def get_groq_client():
    """Get or create Groq client"""
    global groq_client
    if groq_client is None and GROQ_API_KEY:
        groq_client = Groq(api_key=GROQ_API_KEY)
    return groq_client


def build_system_prompt(context: str = "", has_full_docs: bool = False) -> str:
    """Build system prompt with document context"""
    base_prompt = """You are CalQuity AI, an intelligent research assistant that helps users find information from their documents.

Your responses should be:
1. Accurate and based ONLY on the provided document context - never make up information
2. Well-structured and easy to read
3. Include citations in [1], [2], [3] format when referencing documents
4. Helpful and conversational
5. Thorough - use ALL relevant information from the documents

When citing sources, use the format [1], [2], etc. followed by the page number in parentheses like [1](Page 5).
If the answer is not in the documents, clearly state "This information is not found in the uploaded documents."

IMPORTANT: Read the ENTIRE document context carefully before answering. Do not skip any pages.
Always be thorough and comprehensive in your answers."""

    if context:
        if has_full_docs:
            return f"""{base_prompt}

=== COMPLETE DOCUMENT CONTENT ===
The following is the FULL TEXT of all uploaded documents. Read everything carefully to answer the user's question accurately.

{context}

=== END OF DOCUMENTS ===

Based on the COMPLETE document content above, answer the user's question thoroughly with proper citations [1], [2], etc."""
        else:
            return f"""{base_prompt}

DOCUMENT CONTEXT:
{context}

Use the above document context to answer the user's question. Cite sources using [1], [2], etc."""
    
    return base_prompt


async def generate_tool_calls() -> AsyncGenerator[StreamEvent, None]:
    """Generate tool call events for UI feedback"""
    tool_calls = [
        (ToolCallType.THINKING, "Analyzing your query...", 0.3),
        (ToolCallType.SEARCHING_DOCUMENTS, "Reading entire PDF documents...", 0.5),
        (ToolCallType.ANALYZING_CONTENT, "Processing full document content with AI...", 0.4),
    ]
    
    for tool_type, message, delay in tool_calls:
        yield StreamEvent(
            event_type="tool_call",
            data={
                "type": tool_type.value,
                "message": message,
                "status": "started"
            }
        )
        await asyncio.sleep(delay)
        yield StreamEvent(
            event_type="tool_call",
            data={
                "type": tool_type.value,
                "message": message,
                "status": "completed"
            }
        )


async def generate_streaming_response(
    query: str,
    stream_id: str
) -> AsyncGenerator[StreamEvent, None]:
    """
    Generate a real streaming AI response using Groq API
    Sends FULL document text to AI for comprehensive understanding
    """
    # Step 1: Generate tool calls for UI feedback
    async for event in generate_tool_calls():
        yield event
    
    # Step 2: Get ALL document content (full text, not just snippets)
    all_docs = get_all_document_text(max_chars_per_doc=80000)  # ~80k chars per doc
    
    # Also do a targeted search for specific citations
    search_results = search_in_documents(query, limit=10)
    
    # Create citations from search results
    citations: list[Citation] = []
    source_cards: list[SourceCard] = []
    
    for idx, (doc_id, page_num, snippet, relevance) in enumerate(search_results, start=1):
        metadata = get_pdf_metadata(doc_id)
        if metadata:
            citations.append(Citation(
                id=idx,
                document_id=doc_id,
                document_name=metadata.filename,
                page_number=page_num,
                text_snippet=snippet
            ))
            
            # Only add unique source cards
            if not any(sc.document_id == doc_id for sc in source_cards):
                source_cards.append(SourceCard(
                    document_id=doc_id,
                    document_name=metadata.filename,
                    page_count=metadata.page_count,
                    preview_text=snippet[:100] + "..." if len(snippet) > 100 else snippet,
                    relevance_score=relevance
                ))
    
    # Build FULL document context for AI
    full_context = ""
    doc_index = 1
    for doc_id, doc_info in all_docs.items():
        full_context += f"\n\n{'='*60}\n"
        full_context += f"[{doc_index}] DOCUMENT: {doc_info['filename']}\n"
        full_context += f"Total Pages: {doc_info['page_count']}\n"
        full_context += f"{'='*60}\n"
        full_context += doc_info['full_text']
        doc_index += 1
    
    # If no documents uploaded, use empty context
    has_full_docs = bool(all_docs)
    
    # Log context size for debugging
    print(f"📄 Documents loaded: {len(all_docs)}")
    print(f"📝 Total context size: {len(full_context)} characters")
    
    # Step 3: Generate AI response using Groq
    client = get_groq_client()
    
    if client:
        try:
            # Build messages for Groq with FULL document context
            system_prompt = build_system_prompt(full_context, has_full_docs=has_full_docs)
            
            # Groq llama-3.3-70b has 128k context window - we can use it!
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query}
                ],
                temperature=0.5,  # Lower temperature for more accurate answers
                max_tokens=4096,  # Allow longer responses
                stream=True
            )
            
            # Stream text chunks
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    yield StreamEvent(
                        event_type="text_chunk",
                        data={"text": text}
                    )
                    await asyncio.sleep(0.01)
                    
        except Exception as e:
            print(f"Groq API error: {e}")
            error_msg = f"Error generating response: {str(e)}"
            yield StreamEvent(
                event_type="text_chunk",
                data={"text": error_msg}
            )
    else:
        # No API key configured
        no_key_msg = """⚠️ **Groq API Key Not Configured**

Please set the GROQ_API_KEY environment variable and restart the server.

Your query: "{}"
Documents found: {}""".format(query, len(citations))
        
        yield StreamEvent(
            event_type="text_chunk",
            data={"text": no_key_msg}
        )
    
    # Step 4: Send citations
    for citation in citations:
        yield StreamEvent(
            event_type="citation",
            data=citation.model_dump()
        )
    
    # Step 5: Generate analytics UI component if we have data
    if source_cards:
        ui_component = UIComponent(
            type="chart",
            id=str(uuid.uuid4()),
            title="Document Relevance",
            data={
                "chart_type": "bar",
                "labels": [sc.document_name[:15] + "..." if len(sc.document_name) > 15 else sc.document_name for sc in source_cards[:4]],
                "datasets": [{
                    "label": "Relevance Score",
                    "data": [int(sc.relevance_score * 100) for sc in source_cards[:4]],
                    "backgroundColor": ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"]
                }]
            }
        )
        
        yield StreamEvent(
            event_type="ui_component",
            data=ui_component.model_dump()
        )
    
    await asyncio.sleep(0.2)
    
    # Step 6: Send source cards
    if source_cards:
        yield StreamEvent(
            event_type="source_cards",
            data={"cards": [sc.model_dump() for sc in source_cards]}
        )
    
    # Step 7: Done event
    yield StreamEvent(
        event_type="done",
        data={
            "message_id": stream_id,
            "total_citations": len(citations)
        }
    )


async def process_chat_request(
    params: dict,
    job_id: str,
    update_progress
) -> dict:
    """
    Process a chat request (used by queue system)
    """
    query = params.get("query", "")
    stream_id = params.get("stream_id", job_id)
    
    # Create stream
    stream = streaming_results.create_stream(stream_id)
    
    try:
        progress = 0.0
        async for event in generate_streaming_response(query, stream_id):
            # Push to stream for SSE consumption
            await streaming_results.push(stream_id, {
                "event_type": event.event_type,
                "data": event.data,
                "timestamp": event.timestamp.isoformat()
            })
            
            # Update progress based on event type
            if event.event_type == "tool_call":
                progress = min(0.3, progress + 0.05)
            elif event.event_type == "text_chunk":
                progress = min(0.8, progress + 0.01)
            elif event.event_type in ["citation", "ui_component", "source_cards"]:
                progress = min(0.95, progress + 0.05)
            elif event.event_type == "done":
                progress = 1.0
            
            await update_progress(job_id, progress)
        
        return {"status": "completed", "stream_id": stream_id}
    
    finally:
        await streaming_results.close_stream(stream_id)
