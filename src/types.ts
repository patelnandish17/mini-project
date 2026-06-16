export interface AgriSoilImpact {
  riskScore: number; // 1-5
  cropSafetyThreat: 'Low' | 'Medium' | 'High' | 'Severe';
  soilPathogensDetails: string;
  remediationAction: string;
  promptsShowcase?: string;
  completionTimeMs?: number;
}

export interface HydrologicalWaterImpact {
  contaminationScore: number; // 1-5
  canalBlockageRisk: boolean;
  drainageRiskDetails: string;
  livestockDangerLevel: 'Safe' | 'Low' | 'Moderate' | 'High';
  promptsShowcase?: string;
  completionTimeMs?: number;
}

export interface CivicOfficerImpact {
  legalSlaDays: number;
  karnatakaCodeViolation: string;
  recommendingAction: string;
  promptsShowcase?: string;
  completionTimeMs?: number;
}

export interface Citizen {
  name: string;
  email: string;
  phone: string;
  description: string;
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
  ward: string;
  city: string;
  agriSoilImpact?: AgriSoilImpact;
  hydrologicalWaterImpact?: HydrologicalWaterImpact;
  civicOfficerImpact?: CivicOfficerImpact;
}

export interface TimelineEvent {
  status: string;
  timestamp: string;
  title: string;
  description: string;
  proofImage?: string;
}

export interface Report {
  id: string;
  citizen: Citizen;
  location: LocationInfo;
  imageUrl: string;
  status: 'Submitted' | 'Validated' | 'Reported' | 'In Progress' | 'Cleaned' | 'Closed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  severityScore: number;
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
  healthRisks: string[];
  environmentalRisks: string[];
  complaintLetter: string;
  notifiedAuthority: boolean;
  timeline: TimelineEvent[];
}

export interface NotificationLog {
  id: string;
  reportId: string;
  type: 'Email' | 'SMS' | 'Escalation Alert';
  recipient: string;
  subject: string;
  status: 'Sent' | 'Failed';
  timestamp: string;
  details: string;
}

export interface SystemStats {
  totalReports: number;
  activeDumps: number;
  cleanedDumps: number;
  averageCleanupTime: string;
}

export interface LeaderboardWard {
  ward: string;
  city: string;
  cleanupRate: number;
  totalReports: number;
  activeDumps: number;
  averageCleanupTime: number;
  upvotes: number;
}

export interface HotspotWard {
  ward: string;
  city: string;
  totalReports: number;
  avgSeverity: 'Low' | 'Medium' | 'High' | 'Critical';
  score: number;
  escalationStatus: 'Monitoring' | 'Escalated';
  lastEscalationDate: string;
}
