import { create } from 'zustand';

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

  setUploadProgress: (pct) => set({ uploadProgress: pct }),
  setUploadStatus: (status) => set({ uploadStatus: status }),

  addUploadedDoc: (doc) =>
    set((state) => ({ uploadedDocs: [doc, ...state.uploadedDocs] })),

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
}));
