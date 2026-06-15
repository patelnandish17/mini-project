import axios from 'axios';
import { Report, SystemStats, LeaderboardWard, HotspotWard, NotificationLog } from './types';

const client = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // 1. Get Live Statistics
  getStats: async (): Promise<SystemStats> => {
    const res = await client.get('/api/stats');
    return res.data;
  },

  // 2. Reverse Geocoding
  geocode: async (lat: number, lng: number): Promise<{ address: string; ward: string; city: string }> => {
    const res = await client.get(`/api/geocode?lat=${lat}&lng=${lng}`);
    return res.data;
  },

  // 3. Get All Reports with query filter fields
  getReports: async (filters?: {
    status?: string;
    severity?: string;
    ward?: string;
    hotspot?: boolean;
    cleaned?: boolean;
    search?: string;
  }): Promise<Report[]> => {
    const res = await client.get('/api/reports', { params: filters });
    return res.data;
  },

  // 4. Get individual Report details
  getReportById: async (id: string): Promise<Report> => {
    const res = await client.get(`/api/reports/${id}`);
    return res.data;
  },

  // 5. Toggle report upvote
  toggleUpvote: async (id: string): Promise<{ upvotes: number; upvoted: boolean }> => {
    const res = await client.post(`/api/reports/${id}/upvote`);
    return res.data;
  },

  // 6. Admin Login
  login: async (email: string, password: string): Promise<{ success: boolean; token: string; admin: { email: string; name: string } }> => {
    const res = await client.post('/api/auth/login', { email, password });
    return res.data;
  },

  // 7. Admin: Update Report Status and upload cleanup proof
  updateReportStatus: async (
    id: string,
    status: string,
    remarks?: string,
    proofImage?: string
  ): Promise<{ success: boolean; report: Report }> => {
    const res = await client.put(`/api/reports/${id}/status`, { status, remarks, proofImage });
    return res.data;
  },

  // 8. Admin: Manually Escalate Report
  escalateReport: async (id: string): Promise<{ success: boolean; notification: NotificationLog }> => {
    const res = await client.post(`/api/reports/${id}/escalate`);
    return res.data;
  },

  // 9. Admin: Get Notifications Logs
  getNotifications: async (): Promise<NotificationLog[]> => {
    const res = await client.get('/api/notifications');
    return res.data;
  },

  // 10. Get Public Leaderboard
  getLeaderboard: async (sort: string = 'rate'): Promise<LeaderboardWard[]> => {
    const res = await client.get(`/api/leaderboard?sort=${sort}`);
    return res.data;
  },

  // 11. Get Hotspot summary
  getHotspots: async (): Promise<HotspotWard[]> => {
    const res = await client.get('/api/hotspots');
    return res.data;
  },

  // 12. Admin: Clear database / purge all reports
  clearAllReports: async (): Promise<{ success: boolean; message: string }> => {
    const res = await client.post('/api/admin/clear-all');
    return res.data;
  },
};

// 12. Submit Report with SSE Live Progress Monitoring (Chunk reader)
export function submitReportProgress(
  payload: { citizen: any; location: any; imageUrl: string },
  onProgress: (step: string, percent: number, data: any) => void,
  onComplete: (report: Report) => void,
  onError: (error: string) => void
) {
  fetch('/api/reports/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to communicate with submission server');
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error('Response body stream is not readable');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parseStr = line.slice(6).trim();
              const payload = JSON.parse(parseStr);
              onProgress(payload.step, payload.percent, payload.data);
              
              if (payload.percent === 100) {
                if (payload.data?.error) {
                  onError(payload.data.error);
                } else if (payload.data) {
                  onComplete(payload.data);
                }
              }
            } catch (err) {
              console.error('SSE JSON parse failed for chunk', err);
            }
          }
        }
      }
    })
    .catch((err) => {
      onError(err.message || String(err));
    });
}
