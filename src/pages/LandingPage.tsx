import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  FileText, Shield, MapPin, CheckCircle, Flame, ArrowRight, ShieldCheck, 
  Sparkles, Bell, ThumbsUp, Layers, TrendingUp 
} from 'lucide-react';

export default function LandingPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['systemStats'],
    queryFn: api.getStats,
    refetchInterval: 12000, // Keep counters fresh
  });

  const steps = [
    {
      num: "01",
      title: "Upload Photo",
      description: "Snap and upload an image of the dumping site in Mandya using your phone or browser.",
      icon: MapPin,
    },
    {
      num: "02",
      title: "AI Verification",
      description: "Our Gemini AI models verify waste profiles, calculate severity levels, and isolate public healthcare risks.",
      icon: Sparkles,
    },
    {
      num: "03",
      title: "Complaint Drafted",
      description: "A formal PDF-grade municipal petition is compiled on coordinates and forwarded to MCMC authorities.",
      icon: FileText,
    },
    {
      num: "04",
      title: "Track Cleanup",
      description: "Civic inspectors dispatch dumper trucks. Monitor progress live and review visual cleanup certificates.",
      icon: CheckCircle,
    },
  ];

  const features = [
    {
      title: "Architectural AI Verification",
      description: "Multimodal Gemini intelligence processes physical solid wastes, assessing toxicity indexes instantly.",
      icon: Sparkles,
      color: "bg-emerald-50 text-[#16A34A]"
    },
    {
      title: "Geo-Spatial Hotspots",
      description: "Algorithmic cluster indexing aggregates chronic dumping sectors on public live heatmaps.",
      icon: Flame,
      color: "bg-red-50 text-red-600"
    },
    {
      title: "Direct Cellular SMS Alerts",
      description: "Keep complainants continuously updated with prompt cellular text messages and official email dispatches as cases progress.",
      icon: Bell,
      color: "bg-amber-50 text-amber-600"
    },
    {
      title: "Sovereign Community Upvotes",
      description: "Local residents amplify neighborhood issues to elevate cleanup urgency dynamically on supervisors' dashboards.",
      icon: ThumbsUp,
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      title: "Transparency Cleanup Certificates",
      description: "Review physical before/after photo documentation uploaded by inspectors upon successfully excavating dumps.",
      icon: ShieldCheck,
      color: "bg-teal-50 text-teal-600"
    },
    {
      title: "Dynamic Accountability Podium",
      description: "Sort municipal performance rankings of Mandya wards based on active response and cleanup metrics.",
      icon: Layers,
      color: "bg-blue-50 text-blue-600"
    }
  ];

  return (
    <div className="w-full">
      {/* HERO SECTION */}
      <section className="relative bg-white pt-20 pb-24 overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center space-x-2 bg-[#DCFCE7]/70 border border-[#86EFAC] px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#15803D] uppercase tracking-wider font-display">
              <Shield className="w-3.5 h-3.5" />
              <span>Sovereign Mandya Civic Tech Initiative</span>
            </div>
            
            <h1 className="font-display font-medium tracking-tight text-4xl sm:text-5xl lg:text-6xl text-gray-900 leading-[1.1]">
              Report Illegal Dumping. <br />
              <span className="text-[#16A34A]">Improve Your City.</span>
            </h1>
            
            <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
              Upload a photo, share your location, and let AI handle the complaint process. No red tape. Direct accountability mapped to Mandya municipal authorities.
            </p>
            
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link
                to="/report"
                className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-base font-medium text-white bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] transition-all shadow-sm"
              >
                <span>Report a Dump</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl text-base font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 active:scale-[0.98] transition-all"
              >
                <span>View Live Map</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="absolute inset-0 bg-radial from-[#16A34A]/20 to-transparent blur-3xl -z-10" />
              <div className="relative border border-gray-200/80 rounded-2xl bg-white shadow-xl overflow-hidden p-3 transform lg:rotate-2">
                <img
                  src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80"
                  alt="Healthy green park in Mandya"
                  className="rounded-xl w-full h-[320px] object-cover"
                />
                <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-ping" />
                  <span className="text-xs font-semibold text-gray-800 font-display">Ward 5 Nodal Cleanup Active</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* STATISTICS MODULE */}
      <section className="bg-[#F8FAFC] py-14 border-b border-gray-100">
        <div id="stats-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
            
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Total Reports</div>
              <div className="mt-2 text-3xl sm:text-4xl font-display font-semibold text-gray-900">
                {isLoading ? (
                  <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-md" />
                ) : (
                  stats?.totalReports
                )}
              </div>
              <div className="mt-1 text-xs text-gray-400">Total registered database counts</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Active Hazards</div>
              <div className="mt-2 text-3xl sm:text-4xl font-display font-semibold text-red-600">
                {isLoading ? (
                  <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-md" />
                ) : (
                  stats?.activeDumps
                )}
              </div>
              <div className="mt-1 text-xs text-red-400">Undergoing municipal verification</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Cleaned Dumps</div>
              <div className="mt-2 text-3xl sm:text-4xl font-display font-semibold text-[#16A34A]">
                {isLoading ? (
                  <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-md" />
                ) : (
                  stats?.cleanedDumps
                )}
              </div>
              <div className="mt-1 text-xs text-emerald-400">Excavated and certified resolved</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Avg Cleanup Speed</div>
              <div className="mt-2 text-3xl sm:text-4xl font-display font-semibold text-gray-900">
                {isLoading ? (
                  <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-md" />
                ) : (
                  stats?.averageCleanupTime
                )}
              </div>
              <div className="mt-1 text-xs text-[#16A34A] font-semibold flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Fastest track in Mandya</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-white py-24 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="font-display font-medium tracking-tight text-3xl sm:text-4xl text-gray-900">
              Interactive Clearing Protocol
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              Transparent, automated step structure mapping civic concerns instantly into official public administrative actions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((st, i) => (
              <div key={st.num} className="relative z-10 bg-white border border-gray-200/90 rounded-2xl p-6 text-left hover:border-[#16A34A]/40 transition-colors shadow-xs flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-display text-4xl font-bold bg-linear-to-b from-[#16A34A] to-emerald-800 bg-clip-text text-transparent opacity-85">
                      {st.num}
                    </span>
                    <div className="p-3 bg-[#DCFCE7]/40 rounded-xl text-[#16A34A] group-hover:scale-105 transition-transform">
                      <st.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">{st.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{st.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID SECTION */}
      <section className="bg-[#F8FAFC] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-display font-medium tracking-tight text-3xl sm:text-4xl text-gray-900">
              Municipal Sovereignty Dashboard Tools
            </h2>
            <p className="text-gray-500 text-base leading-relaxed">
              Every system asset complies with zero-latency full-stack data parameters, connecting citizens directly with MCMC inspectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((fe, i) => (
              <div key={fe.title} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
                <div className="space-y-4">
                  <div className={`p-3 rounded-xl inline-block ${fe.color}`}>
                    <fe.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 font-display">{fe.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{fe.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
