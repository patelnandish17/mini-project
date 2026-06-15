import { create } from 'zustand';
import { Citizen, LocationInfo } from './types';

interface DraftReport {
  citizen: Citizen;
  location: LocationInfo | null;
  imageUrl: string | null;
}

interface TrashTalkState {
  // Admin Authentication
  adminToken: string | null;
  adminUser: { email: string; name: string } | null;
  setAdminAuth: (token: string, admin: { email: string; name: string }) => void;
  logoutAdmin: () => void;

  // Report Submission Draft State
  draftReport: DraftReport;
  setDraftCitizen: (citizen: Partial<Citizen>) => void;
  setDraftLocation: (location: LocationInfo) => void;
  setDraftImage: (base64: string) => void;
  clearDraft: () => void;

  // UI State
  selectedReportId: string | null;
  setSelectedReportId: (id: string | null) => void;
}

export const useTrashTalkStore = create<TrashTalkState>((set) => {
  // Load token from local storage safely
  const savedToken = localStorage.getItem('trash_talk_admin_token');
  const savedUser = localStorage.getItem('trash_talk_admin_user');

  return {
    // Admin Session
    adminToken: savedToken || null,
    adminUser: savedUser ? JSON.parse(savedUser) : null,

    setAdminAuth: (token, admin) => {
      localStorage.setItem('trash_talk_admin_token', token);
      localStorage.setItem('trash_talk_admin_user', JSON.stringify(admin));
      set({ adminToken: token, adminUser: admin });
    },

    logoutAdmin: () => {
      localStorage.removeItem('trash_talk_admin_token');
      localStorage.removeItem('trash_talk_admin_user');
      set({ adminToken: null, adminUser: null });
    },

    // Multi-Step Draft State
    draftReport: {
      citizen: { name: '', email: '', phone: '', description: '' },
      location: null,
      imageUrl: null,
    },

    setDraftCitizen: (citizenUpdates) =>
      set((state) => ({
        draftReport: {
          ...state.draftReport,
          citizen: { ...state.draftReport.citizen, ...citizenUpdates },
        },
      })),

    setDraftLocation: (location) =>
      set((state) => ({
        draftReport: {
          ...state.draftReport,
          location,
        },
      })),

    setDraftImage: (base64) =>
      set((state) => ({
        draftReport: {
          ...state.draftReport,
          imageUrl: base64,
        },
      })),

    clearDraft: () =>
      set(() => ({
        draftReport: {
          citizen: { name: '', email: '', phone: '', description: '' },
          location: null,
          imageUrl: null,
        },
      })),

    // Active Modal Detail Selector
    selectedReportId: null,
    setSelectedReportId: (id) => set({ selectedReportId: id }),
  };
});
