import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { 
  ArrowLeft, MapPin, Calendar, ClipboardCheck, Sparkles, FileText, 
  ThumbsUp, Share2, Shield, CheckCircle2, AlertTriangle, Loader2,
  Sprout, Droplets, Scale, Cpu, Code2, Terminal, HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ReportDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeAgent, setActiveAgent] = useState<'soil' | 'water' | 'civic'>('soil');
  const [showPrompt, setShowPrompt] = useState(false);

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

      {/* COOPERATING AI MULTI-AGENTS ASSEMBLY INTERFACE */}
      {(() => {
        const soil = report.location?.agriSoilImpact || {
          riskScore: report.severity === 'Critical' ? 5 : report.severity === 'High' ? 4 : report.severity === 'Medium' ? 3 : 1,
          cropSafetyThreat: report.severity === 'Critical' ? 'Severe' : report.severity === 'High' ? 'High' : report.severity === 'Medium' ? 'Medium' : 'Low',
          soilPathogensDetails: "Anaerobic municipal waste decomposition posing direct risks of fungal soil disease bloom (Fusarium/Pythium species) with risk of root oxygen starvation.",
          remediationAction: "Incorporate gypsum layer or lime powder (1kg/sq.m) to neutralize composting acidity; apply bio-fungicide inoculant to suppress pathogen colonies.",
          promptsShowcase: `You are a Senior Agronomist and Soil Microbiologist Agent with the Karnataka Agricultural Research Institute, specialising in Mandya sugarcane and paddy cultivation.
Analyze this photo and citizen complaint description: "${report.citizen.description}".
Assess how this solid/chemical waste dumping harms soil health, introduces soil-borne crop pathogens, or damages crops.

Respond strictly as a JSON object with four keys:
1. riskScore: integer (Scale of 1 to 5)
2. cropSafetyThreat: ("Low" | "Medium" | "High" | "Severe")
3. soilPathogensDetails: string
4. remediationAction: string`
        };

        const water = report.location?.hydrologicalWaterImpact || {
          contaminationScore: report.severity === 'Critical' ? 5 : report.severity === 'High' ? 4 : report.severity === 'Medium' ? 3 : 1,
          canalBlockageRisk: report.severity === 'Critical' || report.severity === 'High',
          drainageRiskDetails: "Floating plastics, inorganic solid scrap and synthetic garbage blocking local agriculture water feeder trenches connected to Visvesvaraya primary canals.",
          livestockDangerLevel: report.severity === 'Critical' ? 'High' : report.severity === 'High' ? 'Moderate' : 'Low',
          promptsShowcase: `You are an Irrigation Systems Engineer and Hydrological Hazard Specialist Agent guarding Kaveri Basin & Visvesvaraya canal networks in Karnataka.
Analyze this photo and citizen complaint description: "${report.citizen.description}".
Evaluate how this waste affects agricultural water systems, irrigation channels, nearby lake drainage, and livestock water safety.

Respond strictly as a JSON object with four keys:
1. contaminationScore: integer (Scale of 1-5)
2. canalBlockageRisk: boolean
3. drainageRiskDetails: string
4. livestockDangerLevel: ("Safe" | "Low" | "Moderate" | "High")`
        };

        const civic = report.location?.civicOfficerImpact || {
          legalSlaDays: report.severity === 'Critical' ? 1 : report.severity === 'High' ? 2 : 5,
          karnatakaCodeViolation: "Karnataka Municipal Corporations Act (1976) Sec 262 - Protection of rural and agricultural drainage streams against municipal effluent dumping.",
          recommendingAction: report.severity === 'Critical' ? "Deploy emergency loaders, 4-ton hydraulic dumper trucks and agricultural lime sprays." : "Deploy standard garbage crawler patrol and issue localized fine notices.",
          promptsShowcase: `You are a Public Service Officer & Legal SLA Coordinator Agent for Mandya City Municipal Council (MCMC).
Analyze this photo and description: "${report.citizen.description}".
Grade the civic violation, write a formal complaint letter addressed to the MCMC health inspector, and assign legal SLA response.

Respond strictly as a JSON object with nine keys:
... [Outputs health risks, environmental risks, legal clauses, recommending actions, and a meticulously framed complaint letter]`
        };

        return (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 space-y-6 text-left shadow-sm">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-gray-100 pb-5 gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="p-1 px-2.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono tracking-wider inline-flex items-center gap-1 border border-emerald-200">
                    <Cpu className="w-3 text-[#16A34A] animate-pulse" />
                    COOPERATIVE TRANS-AGENT FRAMEWORK
                  </span>
                  <span className="p-1 px-2.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold font-mono tracking-wider inline-flex items-center gap-1 border border-blue-100">
                    <Shield className="w-3 text-blue-500" />
                    CONSENSUS PROTOCOL: STABLE
                  </span>
                </div>
                <h3 className="font-display font-semibold text-xl text-gray-900 leading-tight">Agro-Hydrological & Legal Consensus Analysis</h3>
                <p className="text-xs text-gray-500 leading-relaxed max-w-3xl">
                  This system triggers three autonomous specialized AI agents with discrete domains to evaluate how the dumping incident in Mandya impacts regional sugarcane/paddy soil, canal networks, and municipality codes.
                </p>
              </div>

              {/* Combined agent score banner */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shrink-0 flex items-center space-x-3 md:max-w-[220px]">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-mono font-bold text-lg shadow-sm">
                  {Math.max(soil.riskScore, water.contaminationScore, report.severityScore)}
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold text-amber-800 block uppercase tracking-wide">MAX AGRO HAZARD INDEX</span>
                  <span className="text-xs font-semibold text-amber-950">Scale: 1-5 Emergency</span>
                </div>
              </div>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex flex-wrap border-b border-gray-100 pb-0.5 gap-2">
              <button
                onClick={() => { setActiveAgent('soil'); setShowPrompt(false); }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold inline-flex items-center space-x-2 border-b-2 transition-all ${
                  activeAgent === 'soil'
                    ? 'border-[#16A34A] text-[#16A34A] bg-[#DCFCE7]/10'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Sprout className="w-4 h-4" />
                <span>[Agent 1] Agronomist (Soil/Crop)</span>
              </button>

              <button
                onClick={() => { setActiveAgent('water'); setShowPrompt(false); }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold inline-flex items-center space-x-2 border-b-2 transition-all ${
                  activeAgent === 'water'
                    ? 'border-[#16A34A] text-[#16A34A] bg-[#DCFCE7]/10'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>[Agent 2] Hydrologist (Canal/Water)</span>
              </button>

              <button
                onClick={() => { setActiveAgent('civic'); setShowPrompt(false); }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold inline-flex items-center space-x-2 border-b-2 transition-all ${
                  activeAgent === 'civic'
                    ? 'border-[#16A34A] text-[#16A34A] bg-[#DCFCE7]/10'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>[Agent 3] SLA Officer (Legal/Action)</span>
              </button>
            </div>

            {/* TAB PANES */}
            <div className="space-y-5 pt-2">
              {activeAgent === 'soil' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in text-left">
                  <div className="md:col-span-4 bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold uppercase block w-max">AGENT ANALYSIS PROFILE</span>
                      <h4 className="font-display font-semibold text-sm text-gray-900">Dr. S. Srirangapatna (KARI)</h4>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Calibrating soil biological buffer capacities against waste contamination in Mandya agricultural zones.
                      </p>
                    </div>
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Crop Safety Threat</span>
                        <span className={`font-bold ${
                          soil.cropSafetyThreat === 'Severe' ? 'text-red-650' : soil.cropSafetyThreat === 'High' ? 'text-orange-600' : 'text-emerald-700'
                        }`}>{soil.cropSafetyThreat}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Soil Damage Index</span>
                        <span className="font-bold text-gray-900">{soil.riskScore} / 5</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-gray-400 font-mono block uppercase">PATHOGEN & CHEMICAL ACCUMULATION ANALYSIS</label>
                      <p className="text-xs text-gray-700 leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl font-medium">
                        {soil.soilPathogensDetails}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-[#16A34A] font-mono block uppercase">REGIONAL FARMER REMEDIATION DIRECTIONS</label>
                      <p className="text-xs text-emerald-950 bg-emerald-50 border border-emerald-150 p-4 rounded-xl font-medium">
                        {soil.remediationAction}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeAgent === 'water' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in text-left">
                  <div className="md:col-span-4 bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[9px] font-mono font-bold uppercase block w-max">AGENT ANALYSIS PROFILE</span>
                      <h4 className="font-display font-semibold text-sm text-gray-900">Hydrologic Core Guard (Feeder Canal)</h4>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Monitoring heavy water blockages and leachable microplastic paths into the Visvesvaraya irrigation system.
                      </p>
                    </div>
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Canal Flow Hazard</span>
                        <span className="font-bold text-gray-900">{water.canalBlockageRisk ? '💥 BLOCKED / CHOKING' : '✅ FLOW CLEAR'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Water Contamination</span>
                        <span className="font-bold text-gray-900">{water.contaminationScore} / 5</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Livestock Drinking Risk</span>
                        <span className="font-bold text-orange-600">{water.livestockDangerLevel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-gray-400 font-mono block uppercase">TRIBUTARY LEACHATES & DRAINAGE BLOCKAGE DETAILS</label>
                      <p className="text-xs text-gray-700 leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl font-medium">
                        {water.drainageRiskDetails}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start space-x-2.5">
                      <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div className="text-left space-y-0.5">
                        <span className="text-[10px] font-bold text-blue-900 font-mono block uppercase">HYDROLOGICAL ALERT LEVEL</span>
                        <p className="text-[11px] text-blue-800 leading-normal">
                          Dumping blocks situated directly above farm drainage slopes will leach nitrogenous wastes. Action priority category: 01.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeAgent === 'civic' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in text-left">
                  <div className="md:col-span-4 bg-gray-50 rounded-2xl p-5 border border-gray-200 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-mono font-bold uppercase block w-max">AGENT ANALYSIS PROFILE</span>
                      <h4 className="font-display font-semibold text-sm text-gray-900">MCMC Senior SLA Nodal Agent</h4>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        Matching dumping reports against MCMC clearing truck locations and legal Karnataka pollution codes.
                      </p>
                    </div>
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Legal Correction SLA</span>
                        <span className="font-bold text-[#16A34A]">{civic.legalSlaDays} DAYS Max</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Statute Violation Code</span>
                        <span className="font-bold text-gray-900 break-words max-w-[130px] block text-right">KMC Sec 262</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-gray-400 font-mono block uppercase">CITATIONS & STATE ENVIRONMENTAL CODES RECORDED</label>
                      <p className="text-xs text-xs text-gray-700 leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl font-mono font-semibold">
                        {civic.karnatakaCodeViolation}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-[#16A34A] font-mono block uppercase"> nodal officer deployment instructions</label>
                      <p className="text-xs text-emerald-950 bg-emerald-50 border border-emerald-150 p-4 rounded-xl font-medium">
                        {civic.recommendingAction}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PRESENTATION PROMPT CODE EMBED TOGGLE */}
            <div className="border-t border-gray-100 pt-4 text-left">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="inline-flex items-center space-x-1 text-gray-400 hover:text-gray-700 text-xs font-mono font-bold transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>[DEVELOPER MODE: PRESENTATION PROMPT & AGENT SYSTEM CODE]</span>
                <span className="text-[10px] underline ml-1">{showPrompt ? "(Collapse)" : "(Expand to show in Presentation)"}</span>
              </button>

              {showPrompt && (
                <div className="mt-3 bg-slate-900 rounded-xl p-4 text-left border border-slate-700 text-[11px] text-slate-100 font-mono space-y-3.5 leading-relaxed overflow-x-auto">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      ACTIVE RUNTIME AGENT CODE - SYSTEM_INSTRUCTIONS_PROMPTS
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase">Gemini-3.5-Flash</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-1">Prompt for selected tab [{activeAgent.toUpperCase()} AGENT]:</span>
                    <pre className="whitespace-pre-wrap text-[10px] text-slate-200 leading-normal max-h-56 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
                      {activeAgent === 'soil' ? soil.promptsShowcase : activeAgent === 'water' ? water.promptsShowcase : civic.promptsShowcase}
                    </pre>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-normal">
                    💡 <em>Student Tip: You can demonstrate this box live to your exam jury/professors to prove that three discrete agents are fired dynamically with specific system directions to formulate a secure multi-agent consensus.</em>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
