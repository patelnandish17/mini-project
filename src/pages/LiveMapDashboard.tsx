import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Report } from '../types';
import L from 'leaflet';
import { 
  Search, SlidersHorizontal, MapPin, AlertCircle, Calendar, ThumbsUp, 
  Share2, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, X, AlertTriangle, FileText 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function LiveMapDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [hotspotOnly, setHotspotOnly] = useState(false);
  const [cleanedOnly, setCleanedOnly] = useState(false);

  // Selected report for side pocket / drawer detail view
  const [focusedReport, setFocusedReport] = useState<Report | null>(null);

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Query database reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['mapReports', selectedStatus, selectedSeverity, selectedWard, hotspotOnly, cleanedOnly, search],
    queryFn: () => api.getReports({
      status: selectedStatus || undefined,
      severity: selectedSeverity || undefined,
      ward: selectedWard || undefined,
      hotspot: hotspotOnly || undefined,
      cleaned: cleanedOnly || undefined,
      search: search || undefined
    }),
    refetchInterval: 15000, // Sync live updates
  });

  // Extract unique Wards from reports to populate filter search
  const availableWards = Array.from(new Set(reports.map(r => r.location.ward))).filter(Boolean);

  // Upvote mutation
  const upvoteMutation = useMutation({
    mutationFn: api.toggleUpvote,
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['mapReports'] });
      // Update focused report state too
      if (focusedReport && focusedReport.id === id) {
        setFocusedReport({
          ...focusedReport,
          upvotes: data.upvotes
        });
      }
    }
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered in Mandya coordinate zone
    const initLat = 12.5218;
    const initLng = 76.8951;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: 13,
      zoomControl: false // Disable to put modern zoom control on top right
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Modern clean grey/streets basemap style from Stadia/CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    }).addTo(map);

    markersGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Leaflet Markers on Reports database query returns
  useEffect(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    if (reports.length === 0) return;

    reports.forEach((report) => {
      const { latitude, longitude } = report.location;
      if (!latitude || !longitude) return;

      // Color based on Severity
      const severityColor = {
        Low: '#10B981',      // Emerald
        Medium: '#F59E0B',   // Amber
        High: '#EF4444',     // Red
        Critical: '#7F1D1D', // Deep Maroon
      }[report.severity];

      // Circular dimension adapts directly with Severity & Upvotes + base dimension
      const radiusBase = {
        Low: 12,
        Medium: 14,
        High: 17,
        Critical: 20,
      }[report.severity];
      
      const bounceUpvoteOffset = Math.min(10, Math.floor(report.upvotes / 10));
      const finalRadius = radiusBase + bounceUpvoteOffset;

      const marker = L.circleMarker([latitude, longitude], {
        radius: finalRadius,
        fillColor: severityColor,
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      });

      // Simple informative popup with CTA hook
      const popupHtml = `
        <div class="p-2 font-sans w-52 text-left space-y-1.5 leading-relaxed rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-mono tracking-wide font-bold" style="color: ${severityColor};">
              ${report.severity} Priority
            </span>
            <span class="text-[10px] font-mono text-gray-400 font-semibold">${report.id}</span>
          </div>
          <p class="text-xs font-semibold text-gray-900 line-clamp-1 m-0">${report.location.ward}</p>
          <div class="text-[10px] text-gray-500 m-0 line-clamp-2">${report.location.address}</div>
          <div class="h-px bg-gray-100 my-1"></div>
          <div class="text-[10px] font-medium text-[#16A34A] m-0 cursor-pointer">
            Click marker or listing to open AI dossier
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, -5] });

      // Click callback to toggle focused report drawer
      marker.on('click', () => {
        setFocusedReport(report);
      });

      marker.addTo(markersGroup);
    });

    // Auto-adjust bounds to fit visible reports smoothly
    if (reports.length > 0) {
      const bounds = L.latLngBounds(reports.map(r => [r.location.latitude, r.location.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [reports]);

  // Command center helper: centers map view on a chosen report coordinates
  const handleFocusOnReport = (report: Report) => {
    setFocusedReport(report);
    if (mapRef.current) {
      mapRef.current.setView([report.location.latitude, report.location.longitude], 15, {
        animate: true,
        duration: 1.0
      });
    }
  };

  const shareDocketUrl = (id: string) => {
    const url = `${window.location.origin}/reports/${id}`;
    navigator.clipboard.writeText(url);
    alert("Shareable case docket URL copied to clipboard!");
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white relative">
      
      {/* LEFT SIDEBAR CODES */}
      <aside className="w-96 flex flex-col border-r border-[#E5E7EB] bg-white h-full shrink-0 z-10 shadow-sm">
        
        {/* HEADER & SEARCH BAR */}
        <div className="p-4 border-b border-gray-100 bg-[#F8FAFC]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-lg text-gray-900">Sovereign Live Map</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#16A34A] text-[10px] font-mono font-bold tracking-wider">
                {reports.length} DUMPS VISIBLE
              </span>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search Ward, address, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* COMPREHENSIVE FILTERS */}
        <div className="p-4 border-b border-gray-100 flex flex-col space-y-3.5 select-none text-left">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#16A34A] uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Refine Area parameters</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase font-mono">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white outline-none"
              >
                <option value="">All Severities</option>
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase font-mono">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Validated">Validated</option>
                <option value="Reported">Reported</option>
                <option value="In Progress">In Progress</option>
                <option value="Cleaned">Cleaned</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase font-mono">Sourced Ward</label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white outline-none"
            >
              <option value="">All Mandya Wards</option>
              {availableWards.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* CHECKBOX SWIPES */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <label className="flex items-center space-x-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={hotspotOnly}
                onChange={(e) => setHotspotOnly(e.target.checked)}
                className="w-4 h-4 text-[#16A34A] rounded-sm focus:ring-[#16A34A] accent-[#16A34A]"
              />
              <span>High / Critical Only</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanedOnly}
                onChange={(e) => setCleanedOnly(e.target.checked)}
                className="w-4 h-4 text-[#16A34A] rounded-sm focus:ring-[#16A34A] accent-[#16A34A]"
              />
              <span>Cleaned Only</span>
            </label>
          </div>
        </div>

        {/* SCROLLABLE LIST OF ENCLOSING DUMPS */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 text-left">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-gray-400 animate-pulse font-mono">
              Quering spatial database indexes...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-semibold text-gray-800">No active dumps found</p>
              <p className="text-[11px] text-gray-400">Try loosening filter parameters or adjust the search term.</p>
            </div>
          ) : (
            reports.map((r) => {
              const severityBadge = {
                Low: 'border-emerald-200 bg-[#DCFCE7] text-emerald-800',
                Medium: 'border-amber-200 bg-amber-50 text-amber-800',
                High: 'border-orange-200 bg-orange-50 text-orange-850',
                Critical: 'border-red-200 bg-red-50 text-red-800',
              }[r.severity];

              return (
                <div
                  key={r.id}
                  onClick={() => handleFocusOnReport(r)}
                  className={`p-4 hover:bg-gray-50/75 cursor-pointer transition-colors space-y-2.5 relative leading-relaxed block ${
                    focusedReport?.id === r.id ? 'bg-[#DCFCE7]/20 border-l-4 border-[#16A34A]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-gray-400">ID: {r.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${severityBadge}`}>
                      {r.severity}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-800 truncate">{r.location.ward}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-normal">{r.location.address}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-display">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-500 font-semibold">
                      <div className="flex items-center space-x-0.5">
                        <ThumbsUp className="w-3.5 h-3.5 text-gray-400" />
                        <span>{r.upvotes}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[9px] text-gray-600">
                        {r.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* CORE LEAFLET MAP ELEMENT */}
      <main className="flex-1 h-full relative">
        <div ref={mapContainerRef} className="w-full h-full bg-slate-100" />
        
        {/* Offline overlay notice */}
        <div className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl border border-gray-200 shadow-md flex items-center space-x-3 text-left max-w-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
          <div className="space-y-0.5 font-display">
            <span className="text-xs font-semibold text-gray-800 block">Civic GPS Link Active</span>
            <span className="text-[10px] text-gray-450 block leading-relaxed">Direct GIS feedback established. Mandya municipal servers responsive.</span>
          </div>
        </div>
      </main>

      {/* RIGHT SIDE DRAWER DETAIL PANEL */}
      <AnimatePresence>
        {focusedReport && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="absolute right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col justify-between"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-gray-400">ID: {focusedReport.id}</span>
                <span className="h-4 w-px bg-gray-300" />
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-150 text-gray-600">
                  {focusedReport.status}
                </span>
              </div>
              <button 
                onClick={() => setFocusedReport(null)}
                className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-left">
              {/* Photo */}
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-[180px] flex items-center justify-center">
                <img 
                  src={focusedReport.imageUrl} 
                  alt="Garbage dump site" 
                  className="w-full h-full object-cover max-h-[180px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Severity Priority Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-gray-900">{focusedReport.location.ward}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    {
                      Low: 'border-emerald-200 bg-[#DCFCE7] text-emerald-800',
                      Medium: 'border-amber-200 bg-amber-50 text-amber-800',
                      High: 'border-orange-200 bg-orange-50 text-orange-850',
                      Critical: 'border-red-200 bg-red-50 text-red-800',
                    }[focusedReport.severity]
                  }`}>
                    {focusedReport.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-mono">{focusedReport.location.address}</p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Citizen Details */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 font-mono">REPORTER TESTIMONY</span>
                <p className="text-xs text-gray-650 leading-relaxed italic bg-gray-50 border border-gray-100 p-3 rounded-xl">
                  &ldquo;{focusedReport.citizen.description}&rdquo;
                </p>
                <p className="text-[10px] font-medium text-gray-400 text-right">— {focusedReport.citizen.name}</p>
              </div>

              <div className="h-px bg-gray-100" />

              {/* AI Analysis Cards */}
              <div className="space-y-4">
                <div className="flex items-center space-x-1.5 text-orange-800 bg-orange-50/70 border border-orange-200/50 p-2.5 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 text-orange-600 flex-shrink-0" />
                  <span>Interactive Threat Registry</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 font-mono block mb-1">HEALTH VECTORS</span>
                    <ul className="text-[11px] text-gray-650 space-y-1.5">
                      {focusedReport.healthRisks.slice(0, 2).map((r, i) => (
                        <li key={i} className="flex items-start space-x-1.5 font-medium">
                          <span className="w-1 h-1 rounded-full bg-red-650 mt-1.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 font-mono block mb-1">ECOLOGICAL RISK</span>
                    <ul className="text-[11px] text-gray-650 space-y-1.5">
                      {focusedReport.environmentalRisks.slice(0, 2).map((r, i) => (
                        <li key={i} className="flex items-start space-x-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Before/After Cleanup Proof segment (Only present if Cleaned Status!) */}
              {focusedReport.status === 'Cleaned' && (
                <div className="border border-emerald-100 bg-emerald-50/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-1.5 text-[#16A34A] text-xs font-bold font-display">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Certified Cleanup Proof Verified</span>
                  </div>
                  {focusedReport.timeline.find(t => t.proofImage)?.proofImage && (
                    <div className="rounded-lg overflow-hidden border border-emerald-250 bg-white max-h-[140px] flex items-center justify-center">
                      <img 
                        src={focusedReport.timeline.find(t => t.proofImage)?.proofImage} 
                        alt="Garbage cleaned visual proof" 
                        className="w-full h-full object-cover max-h-[140px]"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-[#15803D] font-mono">
                    Audit Date: {new Date(focusedReport.timeline.find(t => t.status === 'Cleaned')?.timestamp || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              )}

            </div>

            {/* Actions bottom Footer */}
            <div className="p-4 border-t border-gray-100 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => upvoteMutation.mutate(focusedReport.id)}
                  disabled={upvoteMutation.isPending}
                  className="w-1/2 inline-flex items-center justify-center space-x-1.5 bg-[#DCFCE7] hover:bg-[#DCFCE7]/75 text-[#16A34A] border border-[#86EFAC]/40 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Upvote ({focusedReport.upvotes})</span>
                </button>

                <button
                  onClick={() => shareDocketUrl(focusedReport.id)}
                  className="w-1/2 inline-flex items-center justify-center space-x-1.5 bg-gray-50 hover:bg-gray-150 text-gray-700 border border-gray-200 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <span>Share docket</span>
                </button>
              </div>

              <button
                onClick={() => navigate(`/success/${focusedReport.id}`)}
                className="w-full mt-2.5 inline-flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                type="button"
              >
                <span>View Full AI Docket</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#16A34A]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
