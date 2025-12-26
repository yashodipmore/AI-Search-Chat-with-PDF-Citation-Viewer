# CalQuity Backend

This is the backend API for CalQuity AI Search Chat, built with FastAPI.

## Getting Started

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API documentation available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Key Features

- **SSE Streaming** - Real-time response streaming
- **PDF Processing** - Text extraction with PyPDF2 and pdfplumber
- **Async Queue** - In-memory job queue for request management
- **RESTful API** - Clean API design with Pydantic validation

## API Endpoints

### Chat
- `POST /api/chat` - Create chat request
- `GET /api/chat/stream/{stream_id}` - SSE stream
- `GET /api/chat/direct-stream?query=` - Direct SSE stream

### Documents
- `POST /api/documents/upload` - Upload PDF
- `GET /api/documents` - List documents
- `GET /api/documents/{id}` - Get document
- `GET /api/documents/{id}/file` - Download PDF
- `DELETE /api/documents/{id}` - Delete document

### System
- `GET /health` - Health check
- `GET /api/queue/stats` - Queue statistics

## Tech Stack

- FastAPI 0.109
- Python 3.11+
- Pydantic 2.5
- sse-starlette
- PyPDF2 / pdfplumber
- Uvicorn
