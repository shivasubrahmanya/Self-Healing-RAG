import { create } from 'zustand';
import { getConfig, getDocuments, deleteDocument } from '../services/api';

export const useAppStore = create((set, get) => ({
  // ---- Chat state ----
  messages: [],
  isLoading: false,
  sessionId: null,
  currentSources: [],
  currentConfidence: null,
  currentHealing: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setLoading: (loading) => set({ isLoading: loading }),

  setSessionId: (id) => set({ sessionId: id }),

  setCurrentResponse: ({ sources, confidence, healing }) =>
    set({ currentSources: sources, currentConfidence: confidence, currentHealing: healing }),

  clearChat: () =>
    set({
      messages: [],
      currentSources: [],
      currentConfidence: null,
      currentHealing: null,
      sessionId: null,
    }),

  // ---- Upload state ----
  uploadProgress: 0,
  uploadStatus: null, // 'uploading' | 'success' | 'error' | null
  uploadedDocs: [],
  config: null,
  configLoading: false,

  setUploadProgress: (pct) => set({ uploadProgress: pct }),
  setUploadStatus: (status) => set({ uploadStatus: status }),
  setUploadedDocs: (docs) => set({ uploadedDocs: docs }),

  addUploadedDoc: (doc) =>
    set((state) => ({ uploadedDocs: [doc, ...state.uploadedDocs] })),

  fetchConfig: async () => {
    set({ configLoading: true });
    try {
      const data = await getConfig();
      set({ config: data });
    } catch (e) {
      console.error('Failed to fetch config:', e);
    } finally {
      set({ configLoading: false });
    }
  },

  fetchDocuments: async () => {
    try {
      const data = await getDocuments();
      set({ uploadedDocs: data });
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    }
  },

  deleteUploadedDoc: async (docId) => {
    try {
      await deleteDocument(docId);
      set((state) => ({
        uploadedDocs: state.uploadedDocs.filter((d) => d.document_id !== docId)
      }));
    } catch (e) {
      console.error('Failed to delete document:', e);
      throw e;
    }
  },

  // ---- Metrics state ----
  metrics: null,
  metricsLoading: false,
  health: null,
  metricsHistory: (() => {
    try {
      const stored = localStorage.getItem('rag_metrics_history');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })(),
  queryHistory: (() => {
    try {
      const stored = localStorage.getItem('rag_query_history');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })(),

  setMetrics: (metrics) => set({ metrics }),
  setMetricsLoading: (loading) => set({ metricsLoading: loading }),
  setHealth: (health) => set({ health }),
  addMetricsHistoryPoint: (point) =>
    set((state) => {
      const newHistory = [...state.metricsHistory.slice(-19), point];
      try {
        localStorage.setItem('rag_metrics_history', JSON.stringify(newHistory));
      } catch (e) { /* silent */ }
      return { metricsHistory: newHistory };
    }),
  addQueryHistoryPoint: (point) =>
    set((state) => {
      const newHistory = [point, ...state.queryHistory.slice(0, 49)];
      try {
        localStorage.setItem('rag_query_history', JSON.stringify(newHistory));
      } catch (e) { /* silent */ }
      return { queryHistory: newHistory };
    }),
  clearQueryHistory: () => {
    localStorage.removeItem('rag_query_history');
    set({ queryHistory: [] });
  }
}));
