import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { 
  ArrowLeft, MapPin, Calendar, ClipboardCheck, Sparkles, FileText, 
  ThumbsUp, Share2, Shield, CheckCircle2, AlertTriangle, Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ReportDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['reportDetails', id],
    queryFn: () => api.getReportById(id!),
    enabled: !!id,
    refetchInterval: 12000,
  });

  const upvoteMutation = useMutation({
    mutationFn: api.toggleUpvote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportDetails', id] });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <span className="text-sm font-semibold text-gray-500 font-mono">Loading civic compliance docket...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center px-4 py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-display font-semibold text-gray-900">Case Docket Not Found</h2>
        <p className="text-sm text-gray-500">The requested docket ID is invalid or cannot be retrieved at this moment.</p>
        <Link to="/map" className="inline-flex px-4 py-2 bg-[#16A34A] text-white rounded-lg text-xs font-semibold">
          Return to map
        </Link>
      </div>
    );
  }

  const severityColor = {
    Low: 'bg-[#DCFCE7] text-emerald-800 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-orange-50 text-orange-850 border-orange-200',
    Critical: 'bg-red-50 text-red-800 border-red-200',
  }[report.severity];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Case Docket Link Copied!");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      {/* Back to Map button */}
      <div className="flex items-center justify-between text-left">
        <Link 
          to="/map" 
          className="inline-flex items-center space-x-1 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Map</span>
        </Link>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleShare}
            className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-500 text-xs font-semibold inline-flex items-center space-x-1 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-400" />
            <span>COPY LINK</span>
          </button>
        </div>
      </div>

      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        <div className="w-full md:w-56 h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative shrink-0">
          <img 
            src={report.imageUrl} 
            alt="Report dump site" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 space-y-3.5 text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 justify-center md:justify-start">
            <h1 className="font-display font-medium text-2xl text-gray-900">{report.location.ward}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${severityColor}`}>
              {report.severity} Severity
            </span>
          </div>

          <div className="text-xs text-gray-500 font-mono space-y-1.5 font-medium leading-relaxed">
            <div className="flex items-center justify-center md:justify-start space-x-1.5">
              <MapPin className="w-4 h-4 text-[#16A34A]" />
              <span className="truncate max-w-md">{report.location.address}</span>
            </div>
            <div className="flex items-center justify-center md:justify-start space-x-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>Created on {new Date(report.createdAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start space-x-3">
            <button
              onClick={() => upvoteMutation.mutate(report.id)}
              disabled={upvoteMutation.isPending}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#DCFCE7] hover:bg-[#DCFCE7]/70 text-[#16A34A] border border-[#86EFAC]/30 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Upvote ({report.upvotes})</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
              {report.status}
            </span>
          </div>
        </div>
      </div>

      {/* COMPARISON AND CLEANUP VERIFICATION PANEL */}
      {(report.status === 'Cleaned' || report.status === 'Closed') && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="font-display font-semibold text-lg text-emerald-950 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-[#16A34A]" />
                <span>Verify MCMC Cleanup Initiative</span>
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-2xl">
                The respective Ward solid waste truck has declared this area completely cleared. Look at the live photos below and upvote to confirm that the site has been fully sanitized.
              </p>
            </div>
            <div>
              <button
                onClick={() => upvoteMutation.mutate(report.id)}
                disabled={upvoteMutation.isPending}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Upvote Cleaned Status ({report.upvotes})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <span className="text-[10px] font-bold text-gray-400 font-mono block mb-2 uppercase tracking-wide">REPORT AREA PHOTO (INITIAL EVIDENCE)</span>
              <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video bg-gray-100 shadow-inner">
                <img 
                  src={report.imageUrl} 
                  alt="Original dump evidence" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 font-mono block mb-2 uppercase tracking-wide">CLOSING AREA PHOTO (CLEANED PROOF)</span>
              <div className="rounded-xl overflow-hidden border border-emerald-200 aspect-video bg-gray-100 shadow-inner">
                <img 
                  src={report.timeline.find(e => e.proofImage)?.proofImage || report.imageUrl} 
                  alt="Certified clean proof photo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT SCREEN INFO */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
        
        {/* TIMELINE OF EVENT LOGS */}
        <div className="md:col-span-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center space-x-2 text-gray-900 border-b border-gray-100 pb-3">
              <ClipboardCheck className="w-5 h-5 text-[#16A34A]" />
              <span className="font-display font-semibold text-base">MCMC Officer Action Tracker</span>
            </div>

            <div className="relative pl-6 space-y-6">
              {/* Connecting logical track lines */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

              {report.timeline.map((event, index) => (
                <div key={index} className="relative space-y-1">
                  {/* Indicator disk */}
                  <span className={`absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ring-offset-0 ${
                    event.status === 'Cleaned' || event.status === 'Closed'
                      ? 'bg-[#16A34A] ring-emerald-100'
                      : event.status === 'In Progress'
                      ? 'bg-amber-500 ring-amber-100'
                      : 'bg-blue-500 ring-blue-100'
                  }`} />

                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900">{event.title}</h4>
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">{event.description}</p>
                  
                  {/* Proof visual upload if available */}
                  {event.proofImage && (
                    <div className="mt-2 text-xs text-[#16A34A]">
                      <span className="font-semibold block mb-1">Uploaded Clearing Proof:</span>
                      <div className="rounded-lg overflow-hidden border border-emerald-100 max-h-[140px] flex items-center justify-center bg-gray-50">
                        <img 
                          src={event.proofImage} 
                          alt="Cleanup proof" 
                          className="w-full h-full object-cover max-h-[140px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COMPLAINT LETTER & PETITION DETAILS */}
        <div className="md:col-span-6 space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#16A34A]" />
                <span className="font-display font-semibold text-base">MCMC Nodal complaint letter</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[10px] text-[#15803D] font-mono font-bold">
                {report.notifiedAuthority ? 'SENT' : 'DRAFTED'}
              </span>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto max-h-[300px]">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                {report.complaintLetter}
              </pre>
            </div>
            
            <div className="pt-2 text-[10px] text-gray-400 font-mono text-right flex items-center justify-end space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Digital SHA-256 Verified Compliance Block</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
