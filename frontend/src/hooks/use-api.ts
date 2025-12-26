import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchApi, uploadFile } from "@/lib/api";
import type { 
  ChatResponse, 
  UploadResponse, 
  PDFDocument, 
  JobStatus 
} from "@/types";

/**
 * Hook for uploading documents
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => 
      uploadFile<UploadResponse>(api.documents.upload, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Hook for listing documents
 */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await fetchApi<{ documents: PDFDocument[]; total: number }>(
        api.documents.list
      );
      return response.documents;
    },
  });
}

/**
 * Hook for getting a single document
 */
export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      return fetchApi<PDFDocument>(api.documents.get(documentId));
    },
    enabled: !!documentId,
  });
}

/**
 * Hook for deleting a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (documentId: string) =>
      fetchApi<{ message: string }>(api.documents.delete(documentId), {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * Hook for creating a chat and getting stream ID
 */
export function useCreateChat() {
  return useMutation({
    mutationFn: async (query: string) => {
      return fetchApi<ChatResponse>(api.chat.create, {
        method: 'POST',
        body: JSON.stringify({ query, include_citations: true }),
      });
    },
  });
}

/**
 * Hook for checking job status
 */
export function useJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      return fetchApi<JobStatus>(api.job.status(jobId));
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Stop polling when job is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        return false;
      }
      return 1000; // Poll every second
    },
  });
}

/**
 * Hook for health check
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      return fetchApi<{ status: string; timestamp: string }>(api.health);
    },
    refetchInterval: 30000, // Check every 30 seconds
  });
}
