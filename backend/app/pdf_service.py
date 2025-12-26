"""
PDF Processing Service - Handles PDF text extraction and metadata
"""
import os
import uuid
import hashlib
from typing import Optional
from pathlib import Path
import pdfplumber
from PyPDF2 import PdfReader
import aiofiles
import asyncio
from concurrent.futures import ThreadPoolExecutor

from .models import PDFMetadata, PDFHighlight, Citation


# In-memory storage for demo (use database in production)
PDF_STORAGE: dict[str, PDFMetadata] = {}
PDF_FILES_DIR = Path("./uploaded_pdfs")
PDF_FILES_DIR.mkdir(exist_ok=True)

executor = ThreadPoolExecutor(max_workers=4)


def extract_text_from_pdf(file_path: str) -> dict[int, str]:
    """Extract text from each page of a PDF"""
    text_by_page: dict[int, str] = {}
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                text_by_page[i] = text
    except Exception as e:
        print(f"Error extracting text: {e}")
        # Fallback to PyPDF2
        try:
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages, start=1):
                text = page.extract_text() or ""
                text_by_page[i] = text
        except Exception as e2:
            print(f"PyPDF2 fallback also failed: {e2}")
    
    return text_by_page


def get_page_count(file_path: str) -> int:
    """Get the number of pages in a PDF"""
    try:
        reader = PdfReader(file_path)
        return len(reader.pages)
    except Exception:
        return 0


async def save_pdf(file_content: bytes, filename: str) -> PDFMetadata:
    """Save uploaded PDF and extract metadata"""
    # Generate unique ID
    file_hash = hashlib.md5(file_content).hexdigest()[:8]
    doc_id = f"{uuid.uuid4().hex[:8]}_{file_hash}"
    
    # Save file
    file_path = PDF_FILES_DIR / f"{doc_id}.pdf"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)
    
    # Extract text in background thread
    loop = asyncio.get_event_loop()
    text_content = await loop.run_in_executor(
        executor, 
        extract_text_from_pdf, 
        str(file_path)
    )
    
    page_count = await loop.run_in_executor(
        executor,
        get_page_count,
        str(file_path)
    )
    
    # Create metadata
    from datetime import datetime
    metadata = PDFMetadata(
        id=doc_id,
        filename=filename,
        page_count=page_count,
        file_size=len(file_content),
        upload_date=datetime.utcnow(),
        text_content=text_content
    )
    
    # Store in memory
    PDF_STORAGE[doc_id] = metadata
    
    return metadata


def get_pdf_metadata(document_id: str) -> Optional[PDFMetadata]:
    """Get PDF metadata by ID"""
    return PDF_STORAGE.get(document_id)


def get_pdf_file_path(document_id: str) -> Optional[Path]:
    """Get the file path for a PDF"""
    file_path = PDF_FILES_DIR / f"{document_id}.pdf"
    if file_path.exists():
        return file_path
    return None


def search_in_documents(query: str, limit: int = 5) -> list[tuple[str, int, str, float]]:
    """
    Search for relevant content across all documents
    Returns: list of (document_id, page_number, text_snippet, relevance_score)
    """
    results: list[tuple[str, int, str, float]] = []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    for doc_id, metadata in PDF_STORAGE.items():
        for page_num, text in metadata.text_content.items():
            if not text:
                continue
                
            text_lower = text.lower()
            
            # Simple relevance scoring based on word matches
            words_found = sum(1 for word in query_words if word in text_lower)
            if words_found == 0:
                continue
                
            relevance = words_found / len(query_words)
            
            # Extract relevant snippet
            snippet = extract_snippet(text, query, max_length=200)
            
            results.append((doc_id, page_num, snippet, relevance))
    
    # Sort by relevance and limit
    results.sort(key=lambda x: x[3], reverse=True)
    return results[:limit]


def get_all_document_text(max_chars_per_doc: int = 50000) -> dict[str, dict]:
    """
    Get full text content from all uploaded documents.
    Returns: dict with document_id as key and {filename, full_text, page_count} as value
    """
    all_docs = {}
    
    for doc_id, metadata in PDF_STORAGE.items():
        # Combine all page text
        full_text = ""
        for page_num in sorted(metadata.text_content.keys()):
            page_text = metadata.text_content.get(page_num, "")
            if page_text:
                full_text += f"\n--- Page {page_num} ---\n{page_text}\n"
        
        # Truncate if too long (to fit in context window)
        if len(full_text) > max_chars_per_doc:
            full_text = full_text[:max_chars_per_doc] + "\n\n[... Document truncated due to length ...]"
        
        all_docs[doc_id] = {
            "filename": metadata.filename,
            "full_text": full_text,
            "page_count": metadata.page_count
        }
    
    return all_docs


def get_document_full_text(document_id: str) -> Optional[str]:
    """
    Get full text content of a specific document
    Returns: Full text with page markers
    """
    metadata = PDF_STORAGE.get(document_id)
    if not metadata:
        return None
    
    full_text = f"Document: {metadata.filename}\n"
    full_text += f"Total Pages: {metadata.page_count}\n"
    full_text += "=" * 50 + "\n\n"
    
    for page_num in sorted(metadata.text_content.keys()):
        page_text = metadata.text_content.get(page_num, "")
        if page_text:
            full_text += f"\n=== PAGE {page_num} ===\n{page_text}\n"
    
    return full_text


def extract_snippet(text: str, query: str, max_length: int = 200) -> str:
    """Extract a relevant text snippet around the query terms"""
    text_lower = text.lower()
    query_words = query.lower().split()
    
    # Find first matching word position
    best_pos = 0
    for word in query_words:
        pos = text_lower.find(word)
        if pos != -1:
            best_pos = pos
            break
    
    # Extract context around the match
    start = max(0, best_pos - 50)
    end = min(len(text), best_pos + max_length - 50)
    
    snippet = text[start:end].strip()
    
    # Add ellipsis if truncated
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    
    return snippet


def find_text_position(document_id: str, page_number: int, search_text: str) -> Optional[PDFHighlight]:
    """
    Find the position of text in a PDF page for highlighting
    """
    metadata = get_pdf_metadata(document_id)
    if not metadata or page_number not in metadata.text_content:
        return None
    
    page_text = metadata.text_content[page_number]
    if search_text.lower() not in page_text.lower():
        return None
    
    return PDFHighlight(
        page_number=page_number,
        text=search_text,
        bounding_box=None  # Would need PDF coordinate extraction for precise highlighting
    )


def get_all_documents() -> list[PDFMetadata]:
    """Get all uploaded documents"""
    return list(PDF_STORAGE.values())


def delete_document(document_id: str) -> bool:
    """Delete a document"""
    if document_id not in PDF_STORAGE:
        return False
    
    # Remove from storage
    del PDF_STORAGE[document_id]
    
    # Delete file
    file_path = PDF_FILES_DIR / f"{document_id}.pdf"
    if file_path.exists():
        file_path.unlink()
    
    return True


# Initialize with sample PDFs if available
def init_sample_documents():
    """Initialize with sample documents for demo"""
    sample_dir = Path("./sample_pdfs")
    if sample_dir.exists():
        for pdf_file in sample_dir.glob("*.pdf"):
            with open(pdf_file, 'rb') as f:
                content = f.read()
            # Synchronous version for startup
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(save_pdf(content, pdf_file.name))
            loop.close()
