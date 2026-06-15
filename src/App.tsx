import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './components/Navigation';

// Sourced Page Components
import LandingPage from './pages/LandingPage';
import LiveMapDashboard from './pages/LiveMapDashboard';
import ReportSubmissionPage from './pages/ReportSubmissionPage';
import ReportSuccessPage from './pages/ReportSuccessPage';
import ReportDetailsPage from './pages/ReportDetailsPage';
import HotspotDashboard from './pages/HotspotDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';

// Client query router cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent redundant requests
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans transition-colors duration-150">
          
          {/* Header layout */}
          <Navigation />

          {/* Semicolon-safe routing modules */}
          <main className="flex-grow w-full">
            <Routes>
              {/* Public Citizen Gates */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/map" element={<LiveMapDashboard />} />
              <Route path="/report" element={<ReportSubmissionPage />} />
              <Route path="/success/:id" element={<ReportSuccessPage />} />
              <Route path="/reports/:id" element={<ReportDetailsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/hotspots" element={<HotspotDashboard />} />

              {/* Administrative Gates */}
              <Route path="/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Redirect wildcards */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
