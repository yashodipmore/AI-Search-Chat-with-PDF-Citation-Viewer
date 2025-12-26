"""
Queue Service - Handles async job processing with in-memory queue
Can be swapped with Redis Queue (RQ) or Celery for production
"""
import asyncio
import uuid
from typing import Optional, Callable, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Job:
    id: str
    task_name: str
    params: dict
    status: JobStatus = JobStatus.QUEUED
    progress: float = 0.0
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class AsyncQueue:
    """
    In-memory async queue for job processing
    Supports rate limiting and concurrent job management
    """
    
    def __init__(self, max_concurrent: int = 5):
        self.queue: asyncio.Queue[Job] = asyncio.Queue()
        self.jobs: dict[str, Job] = {}
        self.handlers: dict[str, Callable] = {}
        self.max_concurrent = max_concurrent
        self.current_running = 0
        self._running = False
        self._workers: list[asyncio.Task] = []
    
    def register_handler(self, task_name: str, handler: Callable):
        """Register a handler function for a task type"""
        self.handlers[task_name] = handler
    
    async def enqueue(self, task_name: str, params: dict) -> str:
        """Add a job to the queue and return job ID"""
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            task_name=task_name,
            params=params
        )
        self.jobs[job_id] = job
        await self.queue.put(job)
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        return self.jobs.get(job_id)
    
    async def update_progress(self, job_id: str, progress: float):
        """Update job progress"""
        if job_id in self.jobs:
            self.jobs[job_id].progress = min(1.0, max(0.0, progress))
    
    async def _process_job(self, job: Job):
        """Process a single job"""
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        
        try:
            handler = self.handlers.get(job.task_name)
            if not handler:
                raise ValueError(f"No handler registered for task: {job.task_name}")
            
            # Call handler with job params
            result = await handler(job.params, job.id, self.update_progress)
            
            job.result = result
            job.status = JobStatus.COMPLETED
            job.progress = 1.0
            
        except Exception as e:
            job.error = str(e)
            job.status = JobStatus.FAILED
        
        finally:
            job.completed_at = datetime.utcnow()
            self.current_running -= 1
    
    async def _worker(self):
        """Worker that processes jobs from the queue"""
        while self._running:
            try:
                # Wait for a job with timeout
                try:
                    job = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Rate limiting - wait if at max concurrent
                while self.current_running >= self.max_concurrent:
                    await asyncio.sleep(0.1)
                
                self.current_running += 1
                
                # Process job (don't await, let it run in background)
                asyncio.create_task(self._process_job(job))
                
            except Exception as e:
                print(f"Worker error: {e}")
    
    async def start(self, num_workers: int = 3):
        """Start the queue workers"""
        self._running = True
        for _ in range(num_workers):
            worker = asyncio.create_task(self._worker())
            self._workers.append(worker)
    
    async def stop(self):
        """Stop all workers"""
        self._running = False
        for worker in self._workers:
            worker.cancel()
        self._workers.clear()
    
    def get_queue_stats(self) -> dict:
        """Get queue statistics"""
        return {
            "queued": sum(1 for j in self.jobs.values() if j.status == JobStatus.QUEUED),
            "processing": sum(1 for j in self.jobs.values() if j.status == JobStatus.PROCESSING),
            "completed": sum(1 for j in self.jobs.values() if j.status == JobStatus.COMPLETED),
            "failed": sum(1 for j in self.jobs.values() if j.status == JobStatus.FAILED),
            "current_running": self.current_running,
            "max_concurrent": self.max_concurrent
        }


# Global queue instance
job_queue = AsyncQueue(max_concurrent=5)


# Streaming results storage for SSE
class StreamingResults:
    """Store streaming results that can be consumed via SSE"""
    
    def __init__(self):
        self.streams: dict[str, asyncio.Queue] = {}
    
    def create_stream(self, stream_id: str) -> asyncio.Queue:
        """Create a new stream for a job"""
        self.streams[stream_id] = asyncio.Queue()
        return self.streams[stream_id]
    
    def get_stream(self, stream_id: str) -> Optional[asyncio.Queue]:
        """Get stream by ID"""
        return self.streams.get(stream_id)
    
    async def push(self, stream_id: str, event: dict):
        """Push an event to a stream"""
        if stream_id in self.streams:
            await self.streams[stream_id].put(event)
    
    async def close_stream(self, stream_id: str):
        """Close and cleanup a stream"""
        if stream_id in self.streams:
            await self.streams[stream_id].put(None)  # Signal end
            del self.streams[stream_id]


streaming_results = StreamingResults()
