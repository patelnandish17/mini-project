import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { 
  CheckCircle2, MapPin, Calendar, ShieldAlert, Sparkles, FileText, 
  Map, PlusCircle, Loader2, FileWarning, ArrowRight 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ReportSuccessPage() {
  const { id } = useParams<{ id: string }>();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['reportSuccess', id],
    queryFn: () => api.getReportById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <span className="text-sm font-semibold text-gray-500 font-mono">Retrieving dynamic compliance docket...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-16 space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full inline-block">
          <FileWarning className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-semibold text-gray-900">Docket Not Found</h2>
        <p className="text-sm text-gray-500">The requested report ID does not exist or has expired.</p>
        <Link to="/" className="inline-flex px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const severityColor = {
    Low: 'bg-[#DCFCE7] text-emerald-800 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-orange-50 text-orange-800 border-orange-200',
    Critical: 'bg-red-50 text-red-800 border-red-200',
  }[report.severity];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* HEADER BILLBOARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-[#86EFAC] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start text-center md:text-left space-y-4 md:space-y-0 md:space-x-6 relative spill"
      >
        <div className="p-4 bg-emerald-50 rounded-full text-[#16A34A] border border-emerald-100 flex-shrink-0 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 justify-center md:justify-start">
            <h2 className="text-2xl font-display font-medium text-gray-900">Report Case Approved</h2>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-905 border border-gray-200 text-gray-700">
              ID: {report.id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${severityColor}`}>
              {report.severity} Severity
            </span>
          </div>
          <p className="text-gray-600 text-sm max-w-xl leading-relaxed">
            Your complaint has been synchronized with the live database and formatted into an official civic petition. MCMC nodal sanitation officers have been notified.
          </p>
        </div>
      </motion.div>

      {/* CORE DETAIL GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
        
        {/* LEFT COLUMN: METADATA & RISKS */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 font-display">Docket Metadata</h3>
            
            <div className="space-y-3.5 text-xs text-gray-700 font-display">
              <div className="flex items-start space-x-2.5">
                <MapPin className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-gray-400 font-mono">LOCATION ADDRESS</span>
                  <p className="font-semibold text-gray-800 line-clamp-3 leading-relaxed">{report.location.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-1.5 border-t border-gray-100">
                <Sparkles className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-gray-400 font-mono">DECIDED MUNICIPAL WARD</span>
                  <p className="font-bold text-[#16A34A]">{report.location.ward}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5 pt-1.5 border-t border-gray-100">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-gray-400 font-mono font-medium">SUBMISSION TIMESTAMP</span>
                  <p className="font-semibold text-gray-800">{new Date(report.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Risk Assessments */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-5">
            <div className="flex items-center space-x-2 text-rose-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-gray-400 pt-0.5">AI Threat Analysis</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider block">HUMAN HEALTH RISKS</span>
                <ul className="text-xs text-gray-600 space-y-2">
                  {report.healthRisks.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                      <span className="leading-relaxed font-semibold text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider block">ENVIRONMENTAL THREATS</span>
                <ul className="text-xs text-gray-600 space-y-2">
                  {report.environmentalRisks.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                      <span className="leading-relaxed font-semibold text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REVENUE PETITION LETTER */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col h-full justify-between">
            <div className="space-y-4 h-full">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2 text-gray-900">
                  <FileText className="w-5 h-5 text-[#16A34A]" />
                  <span className="font-display font-medium text-base text-gray-900">Civic complaint petition</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-gray-50 text-[10px] text-gray-500 font-mono">GENAI COMPILED</span>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl max-h-[380px] overflow-y-auto">
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report.complaintLetter}
                </pre>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center gap-3 mt-6">
              <Link
                to="/map"
                className="w-full sm:w-1/2 inline-flex items-center justify-center space-x-1.5 px-4 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Map className="w-4 h-4" />
                <span>View on Live Map</span>
              </Link>
              <Link
                to="/report"
                className="w-full sm:w-1/2 inline-flex items-center justify-center space-x-1.5 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Another Dump</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
