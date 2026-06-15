import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTrashTalkStore } from '../store';
import { api } from '../api';
import { Report, NotificationLog } from '../types';
import { 
  ShieldCheck, AlertTriangle, CheckCircle, RefreshCw, AlertOctagon, Terminal, 
  MapPin, Loader2, Bell, Heart, Send, Sparkles, Filter, CheckSquare, PlusCircle,
  Camera, UploadCloud, X, FileImage
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { adminToken, adminUser } = useTrashTalkStore();

  // Selected filter criteria for administrative list
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Proof resolution modal state
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [selectedPresetImage, setSelectedPresetImage] = useState('https://images.unsplash.com/photo-1607513746994-51f7bb02bf3e?auto=format&fit=crop&w=600&q=80');
  const [customProofImage, setCustomProofImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Administrative webcam states & controllers
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startWebcam = async () => {
    setCameraActive(true);
    setCameraLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera connection error:", err);
      setCameraError("Unable to access camera hardware. Please check your camera permissions.");
      setCameraLoading(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.85);
          setCustomProofImage(base64);
          setSelectedPresetImage('');
        }
        stopWebcam();
      } catch (err) {
        console.error("Capture failed:", err);
        setCameraError("Failed to capture photo frame.");
      }
    }
  };

  // Clearing database controls
  const [clearingAll, setClearingAll] = useState(false);

  const handleClearAllReports = async () => {
    if (!window.confirm("Warning: This will permanently delete all logged civic reports and notification logs from both your local json fallback and Supabase database. This is of absolute finality. Proceed?")) {
      return;
    }
    setClearingAll(true);
    try {
      await api.clearAllReports();
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      alert("Database purged completely.");
    } catch (err: any) {
      alert("Failed to clear reports: " + (err.message || String(err)));
    } finally {
      setClearingAll(false);
    }
  };

  // Load Admin reports
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['adminReports', statusFilter, severityFilter],
    queryFn: () => api.getReports({
      status: statusFilter || undefined,
      severity: severityFilter || undefined
    }),
    refetchInterval: 8000, // Frequent background checks 
  });

  // Load SMS Logs
  const { data: notificationLogs = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: api.getNotifications,
    refetchInterval: 8000,
  });

  // Load dynamic statistics
  const { data: stats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: api.getStats,
  });

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, remarks, proofImage }: { id: string; status: string; remarks?: string; proofImage?: string }) => 
      api.updateReportStatus(id, status, remarks, proofImage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      setResolvingReportId(null);
      setRemarks('');
      setCustomProofImage(null);
      alert("Executive report status updated!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || err.message || "Failed to update report status.");
    }
  });

  // Escalation mutation
  const escalateMutation = useMutation({
    mutationFn: api.escalateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['systemStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      alert("Manual MCMC Ward escalation log triggered! Recipient inspector notified.");
    }
  });

  // Clean-street preset images for easy proof documentation
  const cleanupPresets = [
    { name: "Paved Roadway", url: "https://images.unsplash.com/photo-1607513746994-51f7bb02bf3e?auto=format&fit=crop&w=600&q=80" },
    { name: "Cleared Sidewalk", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80" },
    { name: "Subsurface Drain Clear", url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80" }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Only standard image formats (.png, .jpeg, .jpg) are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image exceeds 10MB. Please use a compressed or smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCustomProofImage(reader.result);
        setSelectedPresetImage(''); // Clear active preset if custom is uploaded
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResolveOpen = (id: string) => {
    setResolvingReportId(id);
    setRemarks('The physical excavation has been completed under ward inspector watch. Certified resolved.');
    setCustomProofImage(null);
    setSelectedPresetImage('https://images.unsplash.com/photo-1607513746994-51f7bb02bf3e?auto=format&fit=crop&w=600&q=80');
  };

  const handleResolveSubmit = () => {
    if (!resolvingReportId) return;
    const finalProofImage = customProofImage || selectedPresetImage;
    if (!finalProofImage) {
      alert("Please upload a custom cleaned photo or select a verified preset to proceed.");
      return;
    }

    updateStatusMutation.mutate({
      id: resolvingReportId,
      status: 'Cleaned',
      remarks,
      proofImage: finalProofImage
    });
  };

  // Guard routing
  if (!adminToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-10 text-left">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold font-display uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Nodal Executive Control Center ({adminUser?.name})</span>
          </div>
          <h1 className="font-display font-medium text-3xl tracking-tight text-gray-900">
            Inspector Command Panel
          </h1>
          <p className="text-gray-500 text-sm max-w-xl leading-relaxed">
            Validate reports, update dumper truck progress, certify excavations with visual proof, and trigger manual escalations.
          </p>
        </div>
        <div className="pt-2 md:pt-0">
          <button
            onClick={handleClearAllReports}
            disabled={clearingAll}
            className="inline-flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono tracking-wide transition-colors duration-150 disabled:opacity-50 shadow-sm"
          >
            {clearingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>PURGING SYSTEM STATS...</span>
              </>
            ) : (
              <>
                <AlertOctagon className="w-4 h-4 text-red-500" />
                <span>PURGE DATABASE / CLEAR REPORTS</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-gray-400 font-mono block">PENDING INVESTIGATION</span>
          <div className="mt-1 text-2xl font-display font-semibold text-amber-500">
            {reports.filter(r => r.status === 'Submitted').length} reports
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-gray-400 font-mono block">IN EXCAVATION PROGRESS</span>
          <div className="mt-1 text-2xl font-display font-semibold text-blue-600">
            {reports.filter(r => r.status === 'In Progress').length} cases
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-gray-400 font-mono block">RESOLVED COMPLIANCE</span>
          <div className="mt-1 text-2xl font-display font-semibold text-[#16A34A]">
            {reports.filter(r => r.status === 'Cleaned').length} certifications
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-[#16A34A] font-mono block">TOTAL LIVE SENSORS</span>
          <div className="mt-1 text-2xl font-display font-semibold text-gray-900">
            {reports.length} units
          </div>
        </div>
      </section>

      {/* TABLE CONTROLS & FILTER ROW */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase font-mono">
            <Filter className="w-4 h-4" />
            <span>Filter Dispatch Registers:</span>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2 bg-white outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Validated">Validated</option>
              <option value="In Progress">In Progress</option>
              <option value="Cleaned">Cleaned</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg p-2 bg-white outline-none"
            >
              <option value="">All Severities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* REPORTS DISPATCH TABLE */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-[10px] font-mono font-bold bg-[#F8FAFC] text-gray-400 uppercase tracking-widest border-b border-gray-150">
                <tr>
                  <th scope="col" className="px-6 py-4">Case Docket</th>
                  <th scope="col" className="px-6 py-4">Sectors & Coordinates</th>
                  <th scope="col" className="px-6 py-4">Citizen Witness</th>
                  <th scope="col" className="px-6 py-4">Priority / Status</th>
                  <th scope="col" className="px-6 py-4 text-center">Executive Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-display">
                {loadingReports ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 font-mono text-xs text-gray-400">
                      Querying local SQLite/JSON filesystem layers...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No matching cases in this filter index.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const badgeColor = {
                      Low: 'border-emerald-200 bg-[#DCFCE7] text-emerald-800',
                      Medium: 'border-amber-200 bg-amber-50 text-amber-800',
                      High: 'border-orange-200 bg-orange-50 text-orange-850',
                      Critical: 'border-red-200 bg-red-50 text-red-800',
                    }[report.severity];

                    return (
                      <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                        
                        {/* ID, PHOTO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-12 rounded-lg bg-gray-50 border border-gray-150 overflow-hidden flex-shrink-0 flex items-center justify-center">
                              <img src={report.imageUrl} alt="preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-gray-400 text-[10px]">ID: {report.id}</span>
                              <span className="text-[10px] text-gray-400 block">{new Date(report.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>

                        {/* WARD AND ADDRESS */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#16A34A] block truncate max-w-[200px]">{report.location.ward}</span>
                            <span className="text-[11px] text-gray-500 block truncate max-w-[240px] leading-relaxed">{report.location.address}</span>
                          </div>
                        </td>

                        {/* CITIZEN WITNESS */}
                        <td className="px-6 py-4 text-xs">
                          <div>
                            <span className="font-semibold text-gray-800 block">{report.citizen.name}</span>
                            <span className="text-[10px] text-gray-400 block font-mono">{report.citizen.phone}</span>
                          </div>
                        </td>

                        {/* STATUS AND SEVERITY Badge */}
                        <td className="px-6 py-4 space-y-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className={`px-2 py-0.5 font-bold rounded text-[9px] border uppercase ${badgeColor}`}>
                              {report.severity}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-semibold border border-gray-200">
                              {report.status}
                            </span>
                          </div>
                        </td>

                        {/* ACTION DISPATCH WORKFLOWS */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {report.status === 'Submitted' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'Validated' })}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-105 border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                              >
                                Validate
                              </button>
                            )}

                            {(report.status === 'Validated' || report.status === 'Reported' || report.status === 'Submitted') && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'In Progress' })}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 transition-colors"
                              >
                                Progress
                              </button>
                            )}

                            {report.status !== 'Cleaned' && (
                              <button
                                onClick={() => handleResolveOpen(report.id)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-250 hover:bg-[#DCFCE7] text-[#15803D] transition-colors"
                              >
                                excavation complete
                              </button>
                            )}

                            {report.status !== 'Cleaned' && (
                              <button
                                onClick={() => escalateMutation.mutate(report.id)}
                                disabled={escalateMutation.isPending}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 border border-red-200 hover:bg-red-50 text-red-700 disabled:opacity-50 transition-colors"
                                title="Escalate manually to Commissioner level"
                              >
                                Escalate
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SMS & EMAIL NOTIFICATIONS CONSOLE FEED CONTAINER */}
      <section className="space-y-3.5 text-left select-none">
        <div className="flex items-center space-x-2 text-rose-800 text-sm font-semibold font-display">
          <Terminal className="w-5 h-5 text-red-650" />
          <span>Real-time SMS & escalation dispatch logging console</span>
        </div>

        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
            <span className="text-emerald-500 font-bold animate-pulse flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-450 animate-ping" />
              <span>LIVE CELLULAR SMS STREAM CONNECTION CONNECTED</span>
            </span>
            <span className="text-[10px] text-slate-500">MCMC_NODAL_ALERT_TABS</span>
          </div>

          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
            {loadingNotifications ? (
              <div className="text-slate-500 animate-pulse">Establishing interface hooks...</div>
            ) : notificationLogs.length === 0 ? (
              <div className="text-slate-600 italic">Console static. Trigger an escalation or submit a complaint to roll logs.</div>
            ) : (
              notificationLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-900/60 border border-slate-900/100 rounded-xl space-y-2 text-slate-350">
                  <div className="flex items-center justify-between">
                    <span className="text-rose-500 font-bold text-[10px] uppercase">
                      [{log.type}] Alert Token ID #{log.id.slice(0, 5)}
                    </span>
                    <span className="text-[9px] text-slate-500 text-right">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 block leading-relaxed text-slate-300">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">RECIPIENT INSPECTOR MOBILE</span>
                      <span className="font-semibold">{log.recipient}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">MESSAGE PAYLOAD PACKET</span>
                      <p className="line-clamp-2 text-[11px] leading-normal font-mono text-emerald-400">{log.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-bold border-t border-slate-900 pt-1.5">
                    <span className="text-slate-500">DOCKET ID REFR: {log.reportId}</span>
                    <span className="text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">
                      {log.status} Dispatched
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* RESOLUTION PROOF DIALOG MODAL */}
      <AnimatePresence>
        {resolvingReportId && (
          <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 space-y-6 text-left"
            >
              <div className="space-y-1">
                <h3 className="font-display font-medium text-base text-gray-900">
                  Certify Physical Excavation Complete
                </h3>
                <p className="text-gray-500 text-xs text-left">
                  Upload a real-time photo of the cleaned street/spot, provide operational logs, and certify the dumper vehicle completion.
                </p>
              </div>

              {/* Remarks Field */}
              <div className="space-y-1.5 font-display text-sm text-left">
                <label className="text-xs font-semibold text-gray-600 uppercase">INSPECTOR REMARKS & LOGS</label>
                <textarea
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none resize-none bg-white font-sans focus:border-[#16A34A]"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              {/* Real-time Cleanup Photo Upload */}
              <div className="space-y-3 font-display text-left">
                <label className="text-xs font-semibold text-gray-600 uppercase block">
                  REAL-TIME CLEANUP EVIDENCE PHOTO
                </label>

                {cameraActive ? (
                  <div className="border border-gray-200 rounded-xl p-4 bg-slate-50 text-center space-y-3">
                    <div className="relative aspect-video max-h-[220px] bg-black rounded-lg overflow-hidden mx-auto flex items-center justify-center shadow-inner">
                      {cameraLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-white bg-slate-950/80">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-55" />
                          <span className="text-[10px]">Accessing camera stream...</span>
                        </div>
                      )}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        onLoadedMetadata={() => setCameraLoading(false)}
                      />
                    </div>
                    
                    {cameraError && (
                      <div className="text-[10px] text-red-655 font-semibold bg-red-50 px-2.5 py-1.5 rounded-lg">
                        {cameraError}
                      </div>
                    )}

                    <div className="flex justify-center space-x-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={cameraLoading}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Capture Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopWebcam}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold"
                      >
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : customProofImage ? (
                  <div className="relative border border-gray-250 bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={customProofImage} alt="Cleanup proof" className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-xs" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-gray-800 block">Custom Cleanup Photo Uploaded</span>
                        <span className="text-[10px] text-[#16A34A] font-semibold font-mono px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100">
                          VERIFIED CLEAN EVIDENCE
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomProofImage(null)}
                      className="p-1.5 hover:bg-rose-50 text-rose-550 rounded-lg hover:text-rose-700 transition-colors"
                      title="Remove clean photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 hover:border-[#16A34A] rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all hover:bg-gray-50"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                      <div className="p-2.5 bg-[#DCFCE7]/50 rounded-full text-[#16A34A]">
                        <UploadCloud className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-700">Drag & drop cleanup photo here</p>
                        <p className="text-[10px] text-gray-400">or click to browse files (max 10MB)</p>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={startWebcam}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:scale-[1.01]"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Or Snap Cleanup Photo Live</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cleanup presets selecting fallback */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 uppercase block font-display">
                    OR CHOOSE A REGISTERED PRESET
                  </label>
                  {customProofImage && (
                    <span className="text-[10px] text-gray-400 italic">Custom photo takes priority</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {cleanupPresets.map((preset) => (
                    <div 
                      key={preset.name}
                      onClick={() => {
                        setSelectedPresetImage(preset.url);
                        setCustomProofImage(null); // Clear custom upload
                      }}
                      className={`cursor-pointer border rounded-xl overflow-hidden p-1 bg-gray-50 flex flex-col justify-between transition-all ${
                        selectedPresetImage === preset.url && !customProofImage
                          ? 'border-[#16A34A] ring-2 ring-[#16A34A]/10 scale-[1.02]'
                          : 'border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="h-14 w-full object-cover rounded-lg" />
                      <span className="text-[9px] text-gray-500 block font-bold text-center mt-1 truncate">
                        {preset.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action workflows */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResolvingReportId(null)}
                  className="px-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl"
                >
                  Abandon
                </button>
                <button
                  type="button"
                  onClick={handleResolveSubmit}
                  disabled={updateStatusMutation.isPending}
                  className="px-4.5 py-2.5 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl shadow-sm transition-all"
                >
                  Transmit Certification & Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
