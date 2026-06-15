import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { 
  Award, Trophy, Search, Loader2, ArrowUpRight, TrendingUp, AlertCircle, 
  Sparkles, Heart, HelpCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LeaderboardPage() {
  const [sort, setSort] = useState<string>('rate');
  const [search, setSearch] = useState<string>('');

  const { data: leaderboard = [], isLoading, error } = useQuery({
    queryKey: ['leaderboardData', sort],
    queryFn: () => api.getLeaderboard(sort),
    refetchInterval: 12000,
  });

  const filteredLeaderboard = leaderboard.filter(item => 
    item.ward.toLowerCase().includes(search.toLowerCase())
  );

  // Top 3 Podium spots
  const podium = filteredLeaderboard.slice(0, 3);
  const re_orderedPodium = [
    podium[1], // Silver #2 Left
    podium[0], // Gold #1 Center
    podium[2], // Bronze #3 Right
  ].filter(Boolean);

  const sortTabs = [
    { key: 'rate', label: 'Excavation Ratio' },
    { key: 'reports', label: 'Total Incidents' },
    { key: 'speed', label: 'Resolution Speed' },
    { key: 'upvotes', label: 'Citizen Priority' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-10 text-left">
      {/* HEADER BILLBOARD */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-[#DCFCE7] text-[#15803D] px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider font-display">
            <Award className="w-3.5 h-3.5" />
            <span>Nodal Performance Accountability</span>
          </div>
          <h1 className="font-display font-medium text-3xl tracking-tight text-gray-900">
            Mandya Ward Leaderboard
          </h1>
          <p className="text-gray-500 text-sm max-w-xl leading-relaxed">
            Transparent municipal ratings cataloging Mandya city wards. Rankings are computed on dynamic waste excavation statistics on reported dumps.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search specific ward..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] bg-white outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[300px] flex flex-col justify-center items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
          <span className="text-sm font-semibold text-gray-500 font-mono">Re-indexing municipal accountability ledgers...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-650" />
          <p className="text-sm font-bold text-gray-800">Connection Error</p>
          <p className="text-xs text-gray-400">Failed to synchronise with dynamic municipal database logs.</p>
        </div>
      ) : (
        <>
          {/* PODIUM SPOTLIGHTS */}
          {filteredLeaderboard.length >= 3 && search === '' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto pt-4 relative">
              <div className="absolute inset-0 bg-radial from-[#16A34A]/8 to-transparent blur-3xl -z-10" />
              
              {re_orderedPodium.map((pod, idx) => {
                const isGold = pod.ward === podium[0].ward;
                const isSilver = pod.ward === podium[1].ward;
                const positionText = isGold ? "#1 BEST PERFORMING" : isSilver ? "#2 SEC_PLACE" : "#3 THIRD_PLACE";
                const positionColor = isGold 
                  ? "bg-amber-100 text-amber-800 border-amber-200" 
                  : isSilver 
                  ? "bg-slate-100 text-slate-800 border-slate-200" 
                  : "bg-orange-50 text-orange-800 border-orange-200";

                return (
                  <div 
                    key={pod.ward}
                    className={`bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-3 relative overflow-hidden transition-all hover:scale-[1.02] ${
                      isGold ? 'border-amber-300 md:py-10 shadow-md ring-4 ring-amber-500/5' : ''
                    }`}
                  >
                    {isGold && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white px-3 py-1 text-[10px] uppercase font-bold tracking-widest font-mono">
                        TOP NODAL
                      </div>
                    )}
                    
                    <div className={`p-3 rounded-xl ${isGold ? 'bg-amber-50 text-amber-600' : isSilver ? 'bg-slate-50 text-slate-600' : 'bg-orange-50 text-orange-600'}`}>
                      <Trophy className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border tracking-wider ${positionColor}`}>
                        {positionText}
                      </span>
                      <h3 className="font-display font-bold text-base text-gray-900 truncate max-w-[200px]">{pod.ward}.</h3>
                      <p className="text-[10px] text-gray-400 font-mono">MUNICIPAL MANDYA</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full pt-2 font-display text-xs border-t border-gray-50">
                      <div>
                        <span className="block text-gray-400 font-mono text-[9px]">EXCAVATION</span>
                        <span className="font-bold text-[#16A34A]">{pod.cleanupRate}%</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 font-mono text-[9px]">AVG DAYS</span>
                        <span className="font-bold text-gray-900">{pod.averageCleanupTime}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE INTERSECTION METRIC TABS */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center md:justify-start border-b border-gray-100 pb-3">
              {sortTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSort(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all border ${
                    sort === tab.key
                      ? 'bg-gray-900 border-gray-900 text-white shadow-xs'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50/100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TABULAR LAYOUT */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-[10px] font-mono font-bold bg-[#F8FAFC] text-gray-400 uppercase tracking-widest border-b border-gray-150">
                    <tr>
                      <th scope="col" className="px-6 py-4">Ward Address</th>
                      <th scope="col" className="px-6 py-4">Excavated Ratio</th>
                      <th scope="col" className="px-6 py-4 text-center">Active incidents</th>
                      <th scope="col" className="px-6 py-4 text-center">Resolution days</th>
                      <th scope="col" className="px-6 py-4 text-center">Citizen Upvotes</th>
                      <th scope="col" className="px-6 py-4">Sovereign Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-display">
                    {filteredLeaderboard.map((row, index) => (
                      <tr key={row.ward} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3 text-left">
                            <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-150 text-[10px] font-mono font-bold flex items-center justify-center text-gray-650">
                              {index + 1}
                            </span>
                            <div>
                              <span className="font-bold text-gray-900 block">{row.ward}</span>
                              <span className="text-[10px] text-gray-400 block font-mono">MUNICIPAL CODE DISP</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
                              <div 
                                className="bg-[#16A34A] h-full"
                                style={{ width: `${row.cleanupRate}%` }}
                              />
                            </div>
                            <span className="font-semibold text-gray-900 font-mono text-xs">{row.cleanupRate}%</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            row.activeDumps > 3 ? 'bg-red-50 text-red-650' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {row.activeDumps} ACTIVE
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <span className="font-semibold text-gray-900">{row.averageCleanupTime}d</span>
                        </td>

                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <span className="font-semibold text-gray-750 flex items-center justify-center space-x-1">
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                            <span>{row.upvotes}</span>
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center space-x-1 text-xs font-semibold ${
                            row.cleanupRate >= 70 ? 'text-[#16A34A]' : 'text-amber-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              row.cleanupRate >= 70 ? 'bg-[#16A34A]' : 'bg-amber-500'
                            }`} />
                            <span>{row.cleanupRate >= 70 ? 'HIGH_COMPLIANCE' : 'CONGESTED_ZONE'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
