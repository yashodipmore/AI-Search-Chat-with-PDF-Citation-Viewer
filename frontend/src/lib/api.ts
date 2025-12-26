/**
 * API configuration and utility functions
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  baseUrl: API_BASE_URL,
  
  // Chat endpoints
  chat: {
    create: `${API_BASE_URL}/api/chat`,
    stream: (streamId: string) => `${API_BASE_URL}/api/chat/stream/${streamId}`,
    directStream: (query: string) => 
      `${API_BASE_URL}/api/chat/direct-stream?query=${encodeURIComponent(query)}`,
  },
  
  // Document endpoints
  documents: {
    list: `${API_BASE_URL}/api/documents`,
    upload: `${API_BASE_URL}/api/documents/upload`,
    get: (id: string) => `${API_BASE_URL}/api/documents/${id}`,
    file: (id: string) => `${API_BASE_URL}/api/documents/${id}/file`,
    page: (id: string, page: number) => `${API_BASE_URL}/api/documents/${id}/page/${page}`,
    delete: (id: string) => `${API_BASE_URL}/api/documents/${id}`,
    search: (query: string) => `${API_BASE_URL}/api/documents/search?q=${encodeURIComponent(query)}`,
  },
  
  // Citation endpoints
  citation: {
    highlight: (docId: string, page: number, text: string) => 
      `${API_BASE_URL}/api/citation/${docId}/highlight?page=${page}&text=${encodeURIComponent(text)}`,
  },
  
  // Job endpoints
  job: {
    status: (jobId: string) => `${API_BASE_URL}/api/job/${jobId}`,
  },
  
  // Health check
  health: `${API_BASE_URL}/health`,
};

/**
 * Generic fetch wrapper with error handling
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload a file with multipart form data
 */
export async function uploadFile<T>(
  url: string,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || `Upload Error: ${response.status}`);
  }

  return response.json();
}
