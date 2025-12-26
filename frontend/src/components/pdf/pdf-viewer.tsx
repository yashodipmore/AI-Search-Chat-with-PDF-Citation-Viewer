"use client";

import { useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Search,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import { usePDFStore } from "@/store/pdf-store";
import { api } from "@/lib/api";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

export function PDFViewer() {
  const { selectedCitation, setSelectedCitation } = useChatStore();
  const { 
    currentPage, 
    totalPages, 
    zoom, 
    highlight,
    isLoading,
    error,
    setCurrentPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    setTotalPages,
    setIsLoading,
    setError,
    setHighlight,
  } = usePDFStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Get PDF URL from citation
  const pdfUrl = selectedCitation 
    ? api.documents.file(selectedCitation.documentId)
    : null;

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
    setIsLoading(false);
    setError(null);
    
    // Go to the citation's page
    if (selectedCitation?.pageNumber) {
      setCurrentPage(selectedCitation.pageNumber);
    }
    
    // Set highlight if citation has text
    if (selectedCitation?.textSnippet) {
      setHighlight({
        pageNumber: selectedCitation.pageNumber,
        text: selectedCitation.textSnippet,
      });
    }
  }, [selectedCitation, setTotalPages, setIsLoading, setError, setCurrentPage, setHighlight]);

  // Handle document load error
  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF load error:", error);
    setIsLoading(false);
    setError("Failed to load PDF. This might be a demo document.");
  }, [setIsLoading, setError]);

  // Close PDF viewer
  const handleClose = () => {
    setSelectedCitation(null);
    setHighlight(null);
  };

  // Update page when citation changes
  useEffect(() => {
    if (selectedCitation?.pageNumber) {
      setCurrentPage(selectedCitation.pageNumber);
    }
  }, [selectedCitation, setCurrentPage]);

  if (!selectedCitation) return null;

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black dark:border-surface-600 
                    bg-white dark:bg-surface-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-black dark:bg-white flex items-center justify-center">
            <FileText className="w-4 h-4 text-white dark:text-black" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-black dark:text-white truncate">
              {selectedCitation.documentName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-surface-400 font-medium">
              Page {currentPage} of {totalPages || numPages || '...'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="p-2 rounded-xl text-gray-500 hover:text-black dark:text-surface-400 
                   dark:hover:text-white hover:bg-gray-100 dark:hover:bg-surface-700 
                   transition-colors border-2 border-transparent hover:border-black dark:hover:border-surface-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black dark:border-surface-600
                    bg-white dark:bg-surface-800">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="p-2 rounded-xl text-black dark:text-surface-300 
                     hover:bg-gray-100 dark:hover:bg-surface-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value) || 1)}
              min={1}
              max={totalPages}
              className="w-12 px-2 py-1 text-center text-sm rounded-xl border-2 border-black 
                       dark:border-surface-600 bg-white dark:bg-surface-700 
                       text-black dark:text-white font-medium"
            />
            <span className="text-sm text-gray-600 dark:text-surface-400 font-medium">
              / {totalPages || numPages || '?'}
            </span>
          </div>
          
          <button
            onClick={nextPage}
            disabled={currentPage >= (totalPages || numPages)}
            className="p-2 rounded-xl text-black dark:text-surface-300 
                     hover:bg-gray-100 dark:hover:bg-surface-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-2 rounded-xl text-black dark:text-surface-300 
                     hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="w-14 text-center text-sm text-gray-600 dark:text-surface-300 font-medium">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            className="p-2 rounded-xl text-black dark:text-surface-300 
                     hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetZoom}
            className="p-2 rounded-xl text-black dark:text-surface-300 
                     hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Search (placeholder) */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in PDF..."
            className="pl-9 pr-3 py-1.5 text-sm rounded-xl border-2 border-black 
                     dark:border-surface-600 bg-white dark:bg-surface-700 
                     text-black dark:text-white placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-black w-40 font-medium"
          />
        </div>
      </div>

      {/* Citation Context */}
      {selectedCitation.textSnippet && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 py-3 bg-gray-100 dark:bg-surface-800 border-b-2 border-black dark:border-surface-600"
        >
          <p className="text-xs font-bold text-black dark:text-white mb-1">
            Cited Text:
          </p>
          <p className="text-sm text-gray-700 dark:text-surface-300 italic line-clamp-3 font-medium">
            &quot;{selectedCitation.textSnippet}&quot;
          </p>
        </motion.div>
      )}

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h4 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
              Unable to Load PDF
            </h4>
            <p className="text-sm text-surface-500 dark:text-surface-400 max-w-xs">
              {error}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-2">
              Document: {selectedCitation.documentName}
            </p>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Page: {selectedCitation.pageNumber}
            </p>
          </div>
        ) : pdfUrl ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            }
            className="flex flex-col items-center"
          >
            <Page
              pageNumber={currentPage}
              scale={zoom}
              className="shadow-lg"
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex items-center justify-center h-64 w-full bg-surface-100 dark:bg-surface-800 rounded-lg">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              }
            />
          </Document>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-surface-500 dark:text-surface-400">No PDF selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
