import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase Client Initialized. Cloud persistence layer is connected.");
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
} else {
  console.log("Supabase parameters missing in secrets profile. Operating with fallback Local JSON database.");
}

export async function uploadBase64ToSupabase(base64Str: string, folder: string = "reports"): Promise<string> {
  if (!supabase) {
    console.log("No Supabase client initialized. Skipping base64 upload, storing inline.");
    return base64Str;
  }
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }
  try {
    const match = base64Str.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return base64Str;
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const extension = mimeType.split('/')[1] || 'jpg';
    
    // Set up safe random path
    const filename = `${folder}/${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;

    // Standard bucket from user is "-dump-images"
    const bucketName = 'dump-images';
    const altBucketName = '-dump-images';
    
    console.log(`Uploading base64 image block to bucket "${altBucketName}" as "${filename}"...`);
    
    // Try primary altBucketName because of user input "-dump-images"
    let uploadResult = await supabase.storage
      .from(altBucketName)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true
      });

    let usedBucket = altBucketName;

    // Fallback in case bucket is named "dump-images" without leading hyphen
    if (uploadResult.error) {
      console.warn(`Upload to "${altBucketName}" failed: ${uploadResult.error.message}. Attempting "dump-images" storage bucket...`);
      uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true
        });
      usedBucket = bucketName;
    }

    if (uploadResult.error) {
      console.error("Supabase Storage Upload failed on both bucket candidate variations:", uploadResult.error.message);
      return base64Str;
    }

    // Retrieve public CDN URL
    const { data: urlData } = supabase.storage
      .from(usedBucket)
      .getPublicUrl(filename);

    console.log("Successfully generated public Supabase image CDN URL:", urlData?.publicUrl);
    return urlData?.publicUrl || base64Str;
  } catch (err) {
    console.error("Critical error during Supabase image storage upload workflow:", err);
    return base64Str;
  }
}

function fromRow(row: any): Report {
  return {
    id: row.id,
    citizen: typeof row.citizen === 'string' ? JSON.parse(row.citizen) : row.citizen,
    location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
    imageUrl: row.image_url,
    status: row.status,
    severity: row.severity,
    severityScore: row.severity_score,
    upvotes: row.upvotes,
    upvotedBy: typeof row.upvoted_by === 'string' ? JSON.parse(row.upvoted_by) : (row.upvoted_by || []),
    createdAt: row.created_at,
    healthRisks: typeof row.health_risks === 'string' ? JSON.parse(row.health_risks) : (row.health_risks || []),
    environmentalRisks: typeof row.environmental_risks === 'string' ? JSON.parse(row.environmental_risks) : (row.environmental_risks || []),
    complaintLetter: row.complaint_letter,
    notifiedAuthority: row.notified_authority,
    timeline: typeof row.timeline === 'string' ? JSON.parse(row.timeline) : (row.timeline || [])
  };
}

function toRow(report: Report): any {
  return {
    id: report.id,
    citizen: report.citizen,
    location: report.location,
    image_url: report.imageUrl,
    status: report.status,
    severity: report.severity,
    severity_score: report.severityScore,
    upvotes: report.upvotes,
    upvoted_by: report.upvotedBy,
    created_at: report.createdAt,
    health_risks: report.healthRisks,
    environmental_risks: report.environmentalRisks,
    complaint_letter: report.complaintLetter,
    notified_authority: report.notifiedAuthority,
    timeline: report.timeline
  };
}

function fromNotificationRow(row: any): NotificationLog {
  return {
    id: row.id,
    reportId: row.report_id,
    type: row.type,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    timestamp: row.timestamp,
    details: row.details
  };
}

function toNotificationRow(log: NotificationLog): any {
  return {
    id: log.id,
    report_id: log.reportId,
    type: log.type,
    recipient: log.recipient,
    subject: log.subject,
    status: log.status,
    timestamp: log.timestamp,
    details: log.details
  };
}

function fromAdminRow(row: any): { email: string; passwordHash: string } {
  return {
    email: row.email,
    passwordHash: row.password_hash
  };
}

function toAdminRow(admin: { email: string; passwordHash: string }): any {
  return {
    email: admin.email,
    password_hash: admin.passwordHash
  };
}

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
  imageUrl: string; // Base64 or standard reference
  status: 'Submitted' | 'Validated' | 'Reported' | 'In Progress' | 'Cleaned' | 'Closed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  severityScore: number; // 1-5
  upvotes: number;
  upvotedBy: string[]; // List of IPs or custom session IDs to prevent duplicate votes
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

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Initial seed data is kept completely empty to collect real-time data only!
const SEED_REPORTS: Report[] = [];

export interface DBStructure {
  reports: Report[];
  notifications: NotificationLog[];
  admins: { email: string; passwordHash: string }[];
}

export class Database {
  private static data: DBStructure | null = null;

  static init() {
    if (this.data) return;

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(DB_PATH)) {
      try {
        const fileContent = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);

        // Auto-migration: Reset to Mandya if database contains elements from Bengaluru
        if (this.data && this.data.reports && this.data.reports.length > 0) {
          const firstCity = this.data.reports[0].location.city;
          if (firstCity === 'Bengaluru') {
            console.log("Migrating older Bengaluru seed database to Mandya database...");
            this.data = this.getDefaultDB();
            this.save();
          }
        }

        // Force Mandya and MCMC admin credentials into the administrator cache
        if (this.data && this.data.admins) {
          const hasMandyaAdmin = this.data.admins.some(a => a.email.toLowerCase() === 'admin@mandya.gov.in');
          if (!hasMandyaAdmin) {
            this.data.admins.push({
              email: "admin@mandya.gov.in",
              passwordHash: "admin123"
            });
          }
          const hasBbmpAdmin = this.data.admins.some(a => a.email.toLowerCase() === 'admin@bbmp.gov.in');
          if (!hasBbmpAdmin) {
            this.data.admins.push({
              email: "admin@bbmp.gov.in",
              passwordHash: "admin123"
            });
          }
          const hasDefaultAdmin = this.data.admins.some(a => a.email.toLowerCase() === 'admin@trashtalk.in');
          if (!hasDefaultAdmin) {
            this.data.admins.push({
              email: "admin@trashtalk.in",
              passwordHash: "admin123"
            });
          }
          this.save();
        }
      } catch (e) {
        console.error("Failed to parse db.json, recreating standard db structure.", e);
        this.data = this.getDefaultDB();
        this.save();
      }
    } else {
      this.data = this.getDefaultDB();
      this.save();
    }
  }

  private static getDefaultDB(): DBStructure {
    return {
      reports: SEED_REPORTS,
      notifications: [],
      admins: [
        {
          email: "admin@mandya.gov.in",
          passwordHash: "admin123"
        },
        {
          email: "admin@bbmp.gov.in",
          passwordHash: "admin123"
        },
        {
          email: "admin@trashtalk.in",
          passwordHash: "admin123"
        }
      ]
    };
  }

  private static save() {
    if (!this.data) return;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to write to db.json", e);
    }
  }

  // --- LOCAL FALLBACK ENGINE GETTERS & SETTERS ---
  private static getLocalReports(): Report[] {
    this.init();
    return this.data?.reports || [];
  }

  private static getLocalReportById(id: string): Report | null {
    this.init();
    return this.data?.reports.find(r => r.id === id) || null;
  }

  private static addLocalReport(report: Report) {
    this.init();
    if (this.data) {
      this.data.reports.unshift(report);
      this.save();
    }
  }

  private static updateLocalReport(id: string, updates: Partial<Report>): Report | null {
    this.init();
    if (this.data) {
      const index = this.data.reports.findIndex(r => r.id === id);
      if (index !== -1) {
        this.data.reports[index] = { ...this.data.reports[index], ...updates };
        this.save();
        return this.data.reports[index];
      }
    }
    return null;
  }

  private static toggleLocalUpvote(id: string, userIp: string): { upvotes: number; upvoted: boolean } {
    this.init();
    if (this.data) {
      const index = this.data.reports.findIndex(r => r.id === id);
      if (index !== -1) {
        const report = this.data.reports[index];
        if (!report.upvotedBy) {
          report.upvotedBy = [];
        }
        const hasVoted = report.upvotedBy.includes(userIp);
        if (hasVoted) {
          report.upvotedBy = report.upvotedBy.filter(ip => ip !== userIp);
          report.upvotes = Math.max(0, report.upvotes - 1);
        } else {
          report.upvotedBy.push(userIp);
          report.upvotes += 1;
        }
        this.save();
        return { upvotes: report.upvotes, upvoted: !hasVoted };
      }
    }
    return { upvotes: 0, upvoted: false };
  }

  private static getLocalNotifications(): NotificationLog[] {
    this.init();
    return this.data?.notifications || [];
  }

  private static addLocalNotification(log: NotificationLog) {
    this.init();
    if (this.data) {
      this.data.notifications.unshift(log);
      this.save();
    }
  }

  private static getLocalAdmins() {
    this.init();
    return this.data?.admins || [];
  }

  // --- PUBLIC ASYNCHRONOUS SUPABASE CONNECTED API METHODS ---
  static async getReports(): Promise<Report[]> {
    this.init();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Supabase getReports error, falling back locally:", error.message);
          return this.getLocalReports();
        }
        
        if (data && data.length > 0) {
          return data.map(fromRow);
        } else {
          const localReports = this.getLocalReports();
          if (localReports.length > 0) {
            console.log("Auto-seeding local reports into empty Supabase reports table...");
            await supabase.from('reports').upsert(localReports.map(toRow));
            return localReports;
          }
        }
        return [];
      } catch (err) {
        console.error("Failed to query Supabase reports, using local fallback:", err);
        return this.getLocalReports();
      }
    }
    return this.getLocalReports();
  }

  static async getReportById(id: string): Promise<Report | null> {
    this.init();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (error) {
          console.error("Supabase getReportById error, falling back locally:", error.message);
          return this.getLocalReportById(id);
        }
        return data ? fromRow(data) : this.getLocalReportById(id);
      } catch (err) {
        console.error("Supabase execution error in getReportById:", err);
        return this.getLocalReportById(id);
      }
    }
    return this.getLocalReportById(id);
  }

  static async addReport(report: Report): Promise<void> {
    this.init();
    if (report.imageUrl && report.imageUrl.startsWith('data:image/')) {
      report.imageUrl = await uploadBase64ToSupabase(report.imageUrl, 'reports');
    }
    this.addLocalReport(report);
    if (supabase) {
      try {
        const { error } = await supabase
          .from('reports')
          .insert(toRow(report));
        if (error) {
          console.error("Supabase addReport error:", error.message);
        }
      } catch (err) {
        console.error("Supabase error during addReport:", err);
      }
    }
  }

  static async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    this.init();
    if (updates.imageUrl && updates.imageUrl.startsWith('data:image/')) {
      updates.imageUrl = await uploadBase64ToSupabase(updates.imageUrl, 'reports');
    }
    if (updates.timeline) {
      // Find and upload any new proof images
      for (const event of updates.timeline) {
        if (event.proofImage && event.proofImage.startsWith('data:image/')) {
          event.proofImage = await uploadBase64ToSupabase(event.proofImage, 'proofs');
        }
      }
    }
    const updatedLocal = this.updateLocalReport(id, updates);
    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.citizen !== undefined) dbUpdates.citizen = updates.citizen;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
        if (updates.severityScore !== undefined) dbUpdates.severity_score = updates.severityScore;
        if (updates.upvotes !== undefined) dbUpdates.upvotes = updates.upvotes;
        if (updates.upvotedBy !== undefined) dbUpdates.upvoted_by = updates.upvotedBy;
        if (updates.createdAt !== undefined) dbUpdates.created_at = updates.createdAt;
        if (updates.healthRisks !== undefined) dbUpdates.health_risks = updates.healthRisks;
        if (updates.environmentalRisks !== undefined) dbUpdates.environmental_risks = updates.environmentalRisks;
        if (updates.complaintLetter !== undefined) dbUpdates.complaint_letter = updates.complaintLetter;
        if (updates.notifiedAuthority !== undefined) dbUpdates.notified_authority = updates.notifiedAuthority;
        if (updates.timeline !== undefined) dbUpdates.timeline = updates.timeline;

        const { data, error } = await supabase
          .from('reports')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) {
          console.error("Supabase updateReport error, using local fallback state:", error.message);
          return updatedLocal;
        }
        return data ? fromRow(data) : updatedLocal;
      } catch (err) {
        console.error("Supabase error during updateReport:", err);
        return updatedLocal;
      }
    }
    return updatedLocal;
  }

  static async toggleUpvote(id: string, userIp: string): Promise<{ upvotes: number; upvoted: boolean }> {
    this.init();
    if (supabase) {
      try {
        const report = await this.getReportById(id);
        if (report) {
          if (!report.upvotedBy) {
            report.upvotedBy = [];
          }
          const hasVoted = report.upvotedBy.includes(userIp);
          let updatedUpvotedBy = [...report.upvotedBy];
          let updatedUpvotes = report.upvotes;

          if (hasVoted) {
            updatedUpvotedBy = updatedUpvotedBy.filter(ip => ip !== userIp);
            updatedUpvotes = Math.max(0, updatedUpvotes - 1);
          } else {
            updatedUpvotedBy.push(userIp);
            updatedUpvotes += 1;
          }

          const { error } = await supabase
            .from('reports')
            .update({
              upvoted_by: updatedUpvotedBy,
              upvotes: updatedUpvotes
            })
            .eq('id', id);

          if (!error) {
            this.updateLocalReport(id, { upvotes: updatedUpvotes, upvotedBy: updatedUpvotedBy });
            return { upvotes: updatedUpvotes, upvoted: !hasVoted };
          } else {
            console.error("Supabase toggleUpvote failed, using local fallback:", error.message);
          }
        }
      } catch (err) {
        console.error("Supabase error during toggleUpvote, falling back locally:", err);
      }
    }
    return this.toggleLocalUpvote(id, userIp);
  }

  static async getNotifications(): Promise<NotificationLog[]> {
    this.init();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          console.error("Supabase getNotifications error, using local fallback:", error.message);
          return this.getLocalNotifications();
        }

        if (data && data.length > 0) {
          return data.map(fromNotificationRow);
        } else {
          const localNotifs = this.getLocalNotifications();
          if (localNotifs.length > 0) {
            await supabase.from('notifications').upsert(localNotifs.map(toNotificationRow));
            return localNotifs;
          }
        }
        return [];
      } catch (err) {
        console.error("Supabase notifications fetch error:", err);
        return this.getLocalNotifications();
      }
    }
    return this.getLocalNotifications();
  }

  static async addNotification(log: NotificationLog): Promise<void> {
    this.init();
    this.addLocalNotification(log);
    if (supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .insert(toNotificationRow(log));
        if (error) {
          console.error("Supabase addNotification error:", error.message);
        }
      } catch (err) {
        console.error("Supabase error during addNotification:", err);
      }
    }
  }

  static async getAdmins(): Promise<{ email: string; passwordHash: string }[]> {
    this.init();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admins')
          .select('*');

        if (error) {
          console.error("Supabase getAdmins error, falling back locally:", error.message);
          return this.getLocalAdmins();
        }

        if (data && data.length > 0) {
          return data.map(fromAdminRow);
        } else {
          const localAdmins = this.getLocalAdmins();
          if (localAdmins.length > 0) {
            await supabase.from('admins').upsert(localAdmins.map(toAdminRow));
            return localAdmins;
          }
        }
        return [];
      } catch (err) {
        console.error("Supabase admins fetch error, resorting to local file fallback:", err);
        return this.getLocalAdmins();
      }
    }
    return this.getLocalAdmins();
  }

  static async clearAllReports(): Promise<void> {
    this.init();
    if (this.data) {
      this.data.reports = [];
      this.data.notifications = [];
      this.save();
    }
    if (supabase) {
      try {
        const { error: reportsError } = await supabase
          .from('reports')
          .delete()
          .neq('id', 'clear-all-placeholder');
        if (reportsError) {
          console.error("Supabase clear reports error:", reportsError.message);
        }
        const { error: notifError } = await supabase
          .from('notifications')
          .delete()
          .neq('id', 'clear-all-placeholder');
        if (notifError) {
          console.error("Supabase clear notifications error:", notifError.message);
        }
      } catch (err) {
        console.error("Supabase error during clearAllReports:", err);
      }
    }
  }
}
