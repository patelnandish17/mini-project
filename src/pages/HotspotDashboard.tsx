import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { 
  Flame, Landmark, ArrowRight, ShieldCheck, ShieldAlert, Loader2, 
  ChevronRight, TrendingUp, AlertTriangle, HelpCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HotspotDashboard() {
  const { data: hotspots = [], isLoading, error } = useQuery({
    queryKey: ['hotspotsSummary'],
    queryFn: api.getHotspots,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <span className="text-sm font-semibold text-gray-500 font-mono">Compiling Mandya chronic hotspot registers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-2">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-gray-800 font-display">Error Loading hot indices</p>
        <p className="text-xs text-gray-400">Failed to communicate with our indexing analytics service.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 text-left">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider font-display">
            <Flame className="w-3.5 h-3.5" />
            <span>GIS Chronicity Registry</span>
          </div>
          <h1 className="font-display font-medium text-3xl tracking-tight text-gray-900">
            Solid Waste Hotspots
          </h1>
          <p className="text-gray-500 text-sm max-w-xl">
            Algorithmic aggregations compiling chronic dumping zones in Mandya. These sectors triggers automated sanitation reminders for ward sanitizers.
          </p>
        </div>
      </div>

      {/* METRICS BILLBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">HIGH RISK WARD CORES</span>
          <div className="text-3xl font-display font-semibold text-rose-600">
            {hotspots.filter(h => h.score >= 50).length} Wards
          </div>
          <p className="text-xs text-gray-400 leading-normal">Requires critical dumper truck dispatch prioritization.</p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">ACTIVE MONITORING DECK</span>
          <div className="text-3xl font-display font-semibold text-amber-500">
            {hotspots.filter(h => h.escalationStatus === 'Monitoring').length} Wards
          </div>
          <p className="text-xs text-gray-400 leading-normal">Environmental parameters baseline checking hourly.</p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs space-y-1.5 font-display">
          <span className="text-[10px] font-bold text-[#16A34A] font-mono uppercase tracking-wider block">COMPLIANCE SECTORS SATELLITE</span>
          <div className="text-3xl font-semibold text-gray-800">
            {hotspots.length} Logged
          </div>
          <p className="text-xs text-gray-400 leading-normal">Wards with historical or active solid waste incidence lists.</p>
        </div>
      </div>

      {/* HOTSPOTS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotspots.map((hostpot, index) => {
          const scoreClass = hostpot.score >= 70
            ? 'bg-rose-50 border-rose-100 text-rose-800 shadow-sm'
            : hostpot.score >= 40
            ? 'bg-amber-50 border-amber-100 text-amber-800'
            : 'bg-emerald-55 border-emerald-100 text-emerald-800';

          return (
            <div 
              key={index} 
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-gray-300 hover:shadow-md transition-all relative transform hover:-translate-y-0.5"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider uppercase">
                    CHRONIC INDEX CORE
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border font-mono ${scoreClass}`}>
                    SCORE: {hostpot.score}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-lg text-gray-900 line-clamp-1">{hostpot.ward}</h3>
                  <p className="text-xs text-gray-500 leading-normal font-mono uppercase">{hostpot.city}, Karnataka</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-display">
                  <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-left">
                    <span className="text-[10px] font-mono text-gray-400 block mb-0.5">REPORTS COUNT</span>
                    <span className="text-sm font-semibold text-gray-800">{hostpot.totalReports} Incidents</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-left">
                    <span className="text-[10px] font-mono text-gray-400 block mb-0.5">AVG SEVERITY</span>
                    <span className="text-sm font-bold text-red-650">{hostpot.avgSeverity}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-6 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-semibold">
                  {hostpot.escalationStatus === 'Escalated' ? (
                    <>
                      <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0" />
                      <span className="text-rose-700 font-mono">ESCALATED ACTION</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4.5 h-4.5 text-[#16A34A] shrink-0" />
                      <span className="text-[#15803D] font-mono">MONITORING</span>
                    </>
                  )}
                </div>

                <Link
                  to="/map"
                  className="p-2 bg-[#DCFCE7] hover:bg-[#DCFCE7]/70 text-[#16A34A] rounded-lg transition-transform"
                  title="Center on Live Map"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
