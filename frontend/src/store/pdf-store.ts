import { create } from 'zustand';
import type { PDFDocument, PDFHighlight } from '@/types';

interface PDFStore {
  // State
  currentDocument: PDFDocument | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  highlight: PDFHighlight | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: number[];
  
  // Actions
  setDocument: (document: PDFDocument | null) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setHighlight: (highlight: PDFHighlight | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTotalPages: (totalPages: number) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: number[]) => void;
  reset: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export const usePDFStore = create<PDFStore>((set, get) => ({
  // Initial State
  currentDocument: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  highlight: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  searchResults: [],

  // Actions
  setDocument: (document) => {
    set({
      currentDocument: document,
      currentPage: 1,
      totalPages: document?.pageCount ?? 0,
      zoom: 1,
      highlight: null,
      error: null,
    });
  },

  setCurrentPage: (page) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page });
    }
  },

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  goToPage: (page) => {
    const { totalPages } = get();
    const validPage = Math.max(1, Math.min(page, totalPages));
    set({ currentPage: validPage });
  },

  setZoom: (zoom) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom });
  },

  zoomIn: () => {
    const { zoom } = get();
    set({ zoom: Math.min(MAX_ZOOM, zoom + ZOOM_STEP) });
  },

  zoomOut: () => {
    const { zoom } = get();
    set({ zoom: Math.max(MIN_ZOOM, zoom - ZOOM_STEP) });
  },

  resetZoom: () => {
    set({ zoom: 1 });
  },

  setHighlight: (highlight) => {
    set({ highlight });
    if (highlight) {
      set({ currentPage: highlight.pageNumber });
    }
  },

  setIsLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  setTotalPages: (totalPages) => {
    set({ totalPages });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  setSearchResults: (results) => {
    set({ searchResults: results });
  },

  reset: () => {
    set({
      currentDocument: null,
      currentPage: 1,
      totalPages: 0,
      zoom: 1,
      highlight: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      searchResults: [],
    });
  },
}));
