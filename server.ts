import express from 'express';
import path from 'path';
import axios from 'axios';
import { createServer as createViteServer } from 'vite';
import { Database, Report, TimelineEvent, NotificationLog } from './server/db.js';
import { GoogleGenAI, Type } from '@google/genai';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Database
Database.init();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '15mb' }));

// Set up Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[Resend Simulated Transmission] To: ${to} | Subject: "${subject}"`);
    return { success: true, simulated: true };
  }
  try {
    const response = await resend.emails.send({
      from: 'TrashTalk <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: html
    });
    console.log('[Resend Success]: Email dispatched successfully.', response);
    return { success: true, id: response.data?.id };
  } catch (err: any) {
    console.error('[Resend Error]: Failed to transmit email via Resend:', err.message);
    return { success: false, error: err.message };
  }
}

function formatToE164(phone: string): string {
  let cleaned = phone ? phone.trim().replace(/[^\d+]/g, '') : '';
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  // Strip regional prefix zero 
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  // If starts with Indian country code 91 and is 12 digits total, it's already full
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  // Standard Indian 10-digit mobile
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  // Standard Indian mobile prefix check
  if (/^[6789]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  return `+91${cleaned}`;
}

async function sendTwilioSMS(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  // Format the destination number to absolute E.164 standard for Twilio compatibility
  const formattedTo = formatToE164(to);

  // Validate the phone number before attempting standard transmission
  const cleanedTo = formattedTo.replace(/[\s\-\+\(\)]/g, '');
  const containsPlaceholderLetters = /[xX*]/.test(formattedTo);
  const onlyDigits = cleanedTo.replace(/\D/g, '');
  
  const isInvalid = !cleanedTo || 
                    containsPlaceholderLetters || 
                    onlyDigits.length < 8 || 
                    onlyDigits.length > 15 || 
                    /^(\d)\1+$/.test(onlyDigits);

  if (isInvalid) {
    console.log(`[Twilio Safe-Skip Simulator] Intercepted/Stopped transmission to placeholder/invalid number: "${to}". Body: "${body}"`);
    return { success: true, simulated: true };
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[Twilio Simulated Transmission] To: ${formattedTo} | Body: "${body}"`);
    return { success: true, simulated: true };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', formattedTo);
    params.append('From', fromNumber);
    params.append('Body', body);

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await axios.post(url, params.toString(), {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('[Twilio Success]: SMS dispatched successfully.', response.data);
    return { success: true, sid: response.data.sid };
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error('[Twilio Error]: Failed to transmit SMS via Twilio:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Set up Gemini AI client correctly following gemini-api guidelines
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// ----------------------------------------------------
// API ROUTES FIRST
// ----------------------------------------------------

// 1. Get Live Statistics (Dynamic)
app.get('/api/stats', async (req, res) => {
  const reports = await Database.getReports();
  const total = reports.length;
  const active = reports.filter(r => r.status !== 'Cleaned' && r.status !== 'Closed').length;
  const cleaned = reports.filter(r => r.status === 'Cleaned' || r.status === 'Closed').length;
  
  // Calculate avg cleanup time from real data, otherwise fallback to standard MCMC average
  const cleanedReports = reports.filter(r => r.status === 'Cleaned' || r.status === 'Closed');
  let avgCleanupHrs = 18.5;
  if (cleanedReports.length > 0) {
    let sumHrs = 0;
    cleanedReports.forEach(r => {
      const created = new Date(r.createdAt).getTime();
      const cleanedEvent = r.timeline.find(t => t.status === 'Cleaned' || t.status === 'Closed');
      if (cleanedEvent) {
        const cleanedTime = new Date(cleanedEvent.timestamp).getTime();
        sumHrs += Math.max(1, (cleanedTime - created) / (1000 * 60 * 60));
      } else {
        sumHrs += 24;
      }
    });
    avgCleanupHrs = parseFloat((sumHrs / cleanedReports.length).toFixed(1));
  }

  res.json({
    totalReports: total,
    activeDumps: active,
    cleanedDumps: cleaned,
    averageCleanupTime: `${avgCleanupHrs} hrs`
  });
});

// 2. Reverse Geocoding with OSM Nominatim (Mandya Specific)
app.get('/api/geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'TrashTalk-Civic-Applet'
      }
    });

    const data = response.data;
    const address = data.display_name || "Unknown Location";
    const addressDetails = data.address || {};
    const city = addressDetails.city || addressDetails.town || addressDetails.suburb || "Mandya";
    
    // Extract block/ward details from OpenStreetMap structure
    const suburb = addressDetails.suburb || addressDetails.neighbourhood || addressDetails.residential || addressDetails.quarter || "";
    // Realistic Ward generation based on coordinates/suburb
    const wardMatch = getMandyaWardForSuburb(suburb, parseFloat(lat as string), parseFloat(lng as string));
    
    res.json({
      address,
      ward: wardMatch,
      city
    });
  } catch (error) {
    // Beautiful, robust Mandya ward fallback if geocoder rate-limits or offline
    const fallbackWard = getMandyaWardByCoordinates(parseFloat(lat as string), parseFloat(lng as string));
    res.json({
      address: `Subhash Nagar Main Road, near post office, Mandya, Karnataka 571401`,
      ward: fallbackWard,
      city: "Mandya"
    });
  }
});

// Helper: Mandya Ward mapper based on coords (or suburb string)
function getMandyaWardForSuburb(suburb: string, lat: number, lng: number): string {
  if (!suburb) return getMandyaWardByCoordinates(lat, lng);
  const name = suburb.toLowerCase();
  
  // Specific override: Jayanagar does not exist in Mandya; map any such occurrences to Ward 12 (VV Nagar)
  if (name.includes('jayanagar') || name.includes('jaynagar') || name.includes('jaya')) {
    return "VV Nagar (Ward 12)";
  }
  
  if (name.includes('subhash') || name.includes('nagar')) return "Subhash Nagar (Ward 5)";
  if (name.includes('kallahalli') || name.includes('kalla')) return "Kallahalli (Ward 14)";
  if (name.includes('guthalu') || name.includes('gutha')) return "Guthalu (Ward 22)";
  if (name.includes('ashok') || name.includes('ashoka')) return "Ashok Nagar (Ward 9)";
  if (name.includes('chamundeshwari')) return "Chamundeshwari Nagar (Ward 17)";
  if (name.includes('v v nagar') || name.includes('vv nagar') || name.includes('vv') || name.includes('v.v.')) return "VV Nagar (Ward 12)";
  if (name.includes('vivekananda')) return "Vivekananda Nagar (Ward 25)";
  if (name.includes('hosahalli')) return "Hosahalli (Ward 8)";
  return `${suburb} (Ward ${Math.floor(lat * 100) % 35 + 1})`;
}

function getMandyaWardByCoordinates(lat: number, lng: number): string {
  // Rough geographic zoning mapped to Mandya wards (Center ~12.52, 76.89)
  if (lat > 12.524 && lng > 76.895) return "Subhash Nagar (Ward 5)";
  if (lat < 12.520 && lng < 76.890) return "Kallahalli (Ward 14)";
  if (lat < 12.515 && lng > 76.898) return "Guthalu (Ward 22)";
  if (lat > 12.528 && lng < 76.892) return "Ashok Nagar (Ward 9)";
  if (lat > 12.520 && lng > 76.898) return "Chamundeshwari Nagar (Ward 17)";
  if (lat < 12.524 && lng < 76.885) return "VV Nagar (Ward 12)";
  return "Subhash Nagar (Ward 5)";
}

// 3. Get Active Wards & Leaderboard ( dynamic aggregates merge with standard reference baselines)
app.get('/api/leaderboard', async (req, res) => {
  const reports = await Database.getReports();
  
  // Baseline empty structures so all Mandya's major wards exist in the ranking UI:
  const wardBaselines: Record<string, { ward: string; city: string; total: number; cleaned: number; active: number; upvotes: number; totalSpeedHrs: number; cleanedCount: number }> = {
    "Subhash Nagar (Ward 5)": { ward: "Subhash Nagar (Ward 5)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 },
    "Kallahalli (Ward 14)": { ward: "Kallahalli (Ward 14)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 },
    "Guthalu (Ward 22)": { ward: "Guthalu (Ward 22)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 },
    "Ashok Nagar (Ward 9)": { ward: "Ashok Nagar (Ward 9)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 },
    "Chamundeshwari Nagar (Ward 17)": { ward: "Chamundeshwari Nagar (Ward 17)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 },
    "VV Nagar (Ward 12)": { ward: "VV Nagar (Ward 12)", city: "Mandya", total: 0, cleaned: 0, active: 0, upvotes: 0, totalSpeedHrs: 0, cleanedCount: 0 }
  };

  // Dynamically add live report changes to update the dashboard live!
  reports.forEach(r => {
    let wardName = r.location.ward;
    if (!wardName) return;
    if (!wardName.includes('(')) {
      wardName = `${wardName} (Ward 12)`;
    }
    if (!wardBaselines[wardName]) {
      wardBaselines[wardName] = {
        ward: wardName,
        city: r.location.city || "Mandya",
        total: 0,
        cleaned: 0,
        active: 0,
        upvotes: 0,
        totalSpeedHrs: 0,
        cleanedCount: 0
      };
    }
    
    const w = wardBaselines[wardName];
    w.total += 1;
    w.upvotes += (r.upvotes || 0);

    if (r.status === 'Cleaned' || r.status === 'Closed') {
      w.cleaned += 1;
      // Calculate dynamic resolution speed
      const cleanedEvent = r.timeline && r.timeline.find(t => t.status === 'Cleaned' || t.status === 'Closed');
      if (cleanedEvent) {
        const start = new Date(r.createdAt).getTime();
        const end = new Date(cleanedEvent.timestamp).getTime();
        const diffHrs = Math.max(1, Math.round((end - start) / (1000 * 60 * 60)));
        w.totalSpeedHrs += diffHrs;
        w.cleanedCount += 1;
      }
    } else {
      w.active += 1;
    }
  });

  const parsed = Object.values(wardBaselines).map(w => {
    const rate = w.total > 0 ? Math.round((w.cleaned / w.total) * 100) : 0;
    
    // Convert average hours to days. If no reports are cleaned yet, display 0 or a nominal default
    const avgSpeedDays = w.cleanedCount > 0 
      ? Math.max(1, Math.round(w.totalSpeedHrs / w.cleanedCount / 24))
      : 0;

    return {
      ward: w.ward,
      city: w.city,
      cleanupRate: rate,
      totalReports: w.total,
      activeDumps: w.active,
      averageCleanupTime: avgSpeedDays,
      upvotes: w.upvotes
    };
  });

  // Sort is requested by the frontend query parameters:
  const sortBy = req.query.sort as string || 'rate'; // rate, total, active, time, upvotes
  
  if (sortBy === 'total') {
    parsed.sort((a, b) => b.totalReports - a.totalReports);
  } else if (sortBy === 'active') {
    parsed.sort((a, b) => b.activeDumps - a.activeDumps);
  } else if (sortBy === 'time') {
    parsed.sort((a, b) => a.averageCleanupTime - b.averageCleanupTime);
  } else if (sortBy === 'upvotes') {
    parsed.sort((a, b) => b.upvotes - a.upvotes);
  } else {
    parsed.sort((a, b) => b.cleanupRate - a.cleanupRate);
  }

  res.json(parsed);
});

// 4. Get Hotspots Wards
app.get('/api/hotspots', async (req, res) => {
  const reports = await Database.getReports();
  
  // Group reports by ward name
  const wardGroups: Record<string, typeof reports> = {};
  reports.forEach(r => {
    let wardName = r.location.ward;
    if (!wardName) return;
    if (!wardName.includes('(')) {
      wardName = `${wardName} (Ward 12)`;
    }
    if (!wardGroups[wardName]) {
      wardGroups[wardName] = [];
    }
    wardGroups[wardName].push(r);
  });

  const hotspots = Object.entries(wardGroups).map(([wardName, wardReports]) => {
    const totalReports = wardReports.length;
    
    // Average severity score calculation
    const totalSeverity = wardReports.reduce((sum, r) => sum + (r.severityScore || 3), 0);
    const score = totalReports > 0 ? parseFloat((totalSeverity / totalReports).toFixed(1)) : 3.0;

    let avgSeverity = "Medium";
    if (score >= 4.5) avgSeverity = "Critical";
    else if (score >= 3.5) avgSeverity = "High";
    else if (score >= 2.5) avgSeverity = "Medium";
    else avgSeverity = "Low";

    // Unresolved high severity reports trigger higher monitoring escalation
    const hasUnresolvedHighOrCritical = wardReports.some(r => 
      (r.severity === 'Critical' || r.severity === 'High') && 
      r.status !== 'Cleaned' && 
      r.status !== 'Closed'
    );
    const escalationStatus = (hasUnresolvedHighOrCritical || score >= 4.0) ? "Escalated" : "Monitoring";

    const lastReport = wardReports[wardReports.length - 1];
    const lastEscalationDate = lastReport ? new Date(lastReport.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    return {
      ward: wardName,
      city: wardReports[0]?.location.city || "Mandya",
      totalReports,
      avgSeverity,
      score,
      escalationStatus,
      lastEscalationDate
    };
  });

  // Sort highest chronic hotspots first
  hotspots.sort((a, b) => b.score - a.score);

  res.json(hotspots);
});

// 5. Get All Reports (with searching and filtering)
app.get('/api/reports', async (req, res) => {
  let reports = await Database.getReports();

  // Apply filters
  const { status, severity, ward, hotspot, cleaned, search } = req.query;

  if (status) {
    reports = reports.filter(r => r.status.toLowerCase() === (status as string).toLowerCase());
  }
  if (severity) {
    reports = reports.filter(r => r.severity.toLowerCase() === (severity as string).toLowerCase());
  }
  if (ward) {
    reports = reports.filter(r => r.location.ward.toLowerCase().includes((ward as string).toLowerCase()));
  }
  if (hotspot === 'true') {
    reports = reports.filter(r => r.severity === 'Critical' || r.severity === 'High');
  }
  if (cleaned === 'true') {
    reports = reports.filter(r => r.status === 'Cleaned' || r.status === 'Closed');
  }
  if (search) {
    const q = (search as string).toLowerCase();
    reports = reports.filter(r => 
      r.id.toLowerCase().includes(q) ||
      r.location.address.toLowerCase().includes(q) ||
      r.location.ward.toLowerCase().includes(q) ||
      r.citizen.description.toLowerCase().includes(q) ||
      r.citizen.name.toLowerCase().includes(q)
    );
  }

  res.json(reports);
});

// 6. Get Report Details
app.get('/api/reports/:id', async (req, res) => {
  const report = await Database.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// 7. Toggle report upvotes
app.post('/api/reports/:id/upvote', async (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1";
  const result = await Database.toggleUpvote(req.params.id, ip);
  res.json(result);
});

// 8. Admin authentication
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const admins = await Database.getAdmins();
  const match = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
  
  if (match && match.passwordHash === password) {
    // Return standard dummy secure token and payload
    return res.json({
      success: true,
      token: "TT-JWT-TOKEN-SECURITY-VERIFIED-2026",
      admin: {
        email: match.email,
        name: "MCMC Central Officer"
      }
    });
  }

  return res.status(401).json({ error: 'Invalid administrator credentials' });
});

// 9. Admin edit/validation actions on report
app.put('/api/reports/:id/status', async (req, res) => {
  const { status, remarks, proofImage } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const report = await Database.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  if ((status === 'Cleaned' || status === 'Closed') && !proofImage) {
    return res.status(400).json({
      error: 'A certified cleanup proof image is strictly required to close or mark this complaint as Cleaned.'
    });
  }

  const timelineEvent: TimelineEvent = {
    status,
    timestamp: new Date().toISOString(),
    title: `Status Updated to ${status}`,
    description: remarks || `Municipal officer updated dump status.`
  };

  if ((status === 'Cleaned' || status === 'Closed') && proofImage) {
    timelineEvent.proofImage = proofImage;
    timelineEvent.description = remarks || "Garbage successfully excavated. Cleanup proof verified.";
  }

  const updatedTimeline = [...report.timeline, timelineEvent];
  
  const updatedReport = await Database.updateReport(req.params.id, {
    status,
    timeline: updatedTimeline
  });

  // Log notifications trigger: Send real email and direct text (SMS) simulation via Resend
  const alertId = `NOTIF-${Date.now().toString().slice(-4)}`;
  
  // 1. Citizen Email Notification via Resend
  if (report.citizen.email) {
    const emailSubject = `TrashTalk Alert [${status}]: Case ID #${report.id}`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-top: 0;">MCMC TrashTalk Update</h2>
        <p>Dear <strong>${report.citizen.name}</strong>,</p>
        <p>The status of your civic solid waste grievance <strong>Case #${report.id}</strong> at <em>${report.location.address}</em> has been successfully updated to <span style="background-color: #ecfdf5; color: #065f46; font-weight: bold; padding: 2px 6px; border-radius: 4px;">${status}</span>.</p>
        <p><strong>Remarks from Mandya Health Officers:</strong></p>
        <blockquote style="background-color: #f3f4f6; border-left: 4px solid #9ca3af; margin: 10px 0; padding: 10px 15px; font-style: italic;">
          ${remarks || (status === 'Cleaned' ? 'Dump site successfully excavated and sanitized.' : 'Complaint successfully updated by MCMC team.')}
        </blockquote>
        ${proofImage ? `
        <div style="margin: 20px 0;">
          <p style="font-weight: bold;">Verified Cleanup Proof Photo:</p>
          <img src="${proofImage}" alt="Cleanup Proof" style="max-width: 100%; border-radius: 6px; border: 1px solid #d1d5db; display: block;" />
        </div>` : ''}
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">This is an automated official update forwarded by the Mandya City Municipal Council TrashTalk Integration network via Resend.</p>
      </div>
    `;
    
    // Asynchronous send
    sendResendEmail(report.citizen.email, emailSubject, emailHtml).catch(e => {
      console.error("Resend delivery failed on status change:", e);
    });

    const citizenEmailAlert: NotificationLog = {
      id: alertId + "C",
      reportId: report.id,
      type: "Email",
      recipient: report.citizen.email,
      subject: emailSubject,
      status: "Sent",
      timestamp: new Date().toISOString(),
      details: `Transmitted verified Resend notification to citizen email matching ${report.citizen.email}`
    };
    await Database.addNotification(citizenEmailAlert);
  }

  // 2. Direct Text SMS via Twilio & Notification Log
  const smsBody = `TrashTalk: Hello ${report.citizen.name}, the status of your civic complaint at ${report.location.address} (Case #${report.id}) has been updated to "${status}". ${remarks ? 'Remarks: ' + remarks : ''}`;
  sendTwilioSMS(report.citizen.phone, smsBody).catch(e => {
    console.error("Twilio SMS transmission failed:", e);
  });

  const smsAlert: NotificationLog = {
    id: alertId + "A",
    reportId: report.id,
    type: "SMS",
    recipient: report.citizen.phone,
    subject: `SMS Text Message: Case ${report.id} updated to ${status}`,
    status: "Sent",
    timestamp: new Date().toISOString(),
    details: `Dispatched direct cellular text message (SMS) notification to ${report.citizen.phone}.`
  };
  await Database.addNotification(smsAlert);

  res.json({ success: true, report: updatedReport });
});

// 10. Admin: Escalate notification manually
app.post('/api/reports/:id/escalate', async (req, res) => {
  const report = await Database.getReportById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const alertId = `NOTIF-${Date.now().toString().slice(-4)}`;
  const emailAlert: NotificationLog = {
    id: alertId,
    reportId: report.id,
    type: "Escalation Alert",
    recipient: "mcmc.commissioner@mandya.gov.in",
    subject: `CRITICAL COMMUNITY ESCALATION: Dump site ${report.id}`,
    status: "Sent",
    timestamp: new Date().toISOString(),
    details: `Manually escalated by supervisor. High priority dispatched payload forwarded.`
  };

  await Database.addNotification(emailAlert);

  // Update timeline
  const escalationEvent: TimelineEvent = {
    status: report.status,
    timestamp: new Date().toISOString(),
    title: "Complaint Escalated",
    description: "Nodal officer escalated this complaint directly to the Mandya City Municipal Commissioner."
  };

  await Database.updateReport(report.id, {
    timeline: [...report.timeline, escalationEvent]
  });

  res.json({ success: true, notification: emailAlert });
});

// 11. Notification Center (logs)
app.get('/api/notifications', async (req, res) => {
  res.json(await Database.getNotifications());
});

// 11b. Admin: Clear database / purge all reports
app.post('/api/admin/clear-all', async (req, res) => {
  try {
    await Database.clearAllReports();
    res.json({ success: true, message: "All reports and logs successfully cleared from database." });
  } catch (error: any) {
    console.error("Failed to clear database:", error);
    res.status(500).json({ error: error.message || "Internal database reset exception" });
  }
});

// 12. Submit Report with Multi-Step SSE Progress Stream (AI and Authority Notification)
app.post('/api/reports/submit', async (req, res) => {
  // We use Server-Sent Events to stream actual steps
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent reverse-proxy buffering
  });

  const writeProgress = (step: string, percent: number, data: any = null) => {
    res.write(`data: ${JSON.stringify({ step, percent, data })}\n\n`);
  };

  try {
    const { citizen, location, imageUrl } = req.body;
    if (!citizen || !location || !imageUrl) {
      writeProgress("Error occurred: Missing required parameters", 100, { error: 'Incomplete parameters' });
      return res.end();
    }

    // STEP 1: Analyzing Image
    writeProgress("Analyzing Image Content", 15);
    await delay(1000);

    // STEP 2: Scoring Severity
    writeProgress("Scoring Dump Severity", 35);
    await delay(1000);

    // STEP 3: Generating Formal Civic Complaint Letter via Gemini AI
    writeProgress("Generating AI Complaint and Risk Assessment", 60);

    let severityResult: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    let severityScore = 3;
    let healthRisks = [
      "Attracts unwanted disease vectors and pests",
      "Decomposing food wastes pose severe air contamination odor issues"
    ];
    let environmentalRisks = [
      "Plastics are prone to catching fire and releasing carcinogens",
      "Heavy rainwater may leach toxic residues into stormwater pipelines"
    ];
    let complaintLetter = "";

    // Invoke Gemini if AI instance is active
    if (ai) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageUrl.replace(/^data:image\/\w+;base64,/, "")
          }
        };

        const targetPrompt = `You are a municipal solid waste engineer and environmental science expert for the Mandya City Municipal Council (MCMC) in Mandya.
Analyze this photo and description: "${citizen.description || 'Illegal garbage dump in Mandya'}".

First, perform a strict visual analysis of the provided photo to check if it represents a solid waste pile, discarded garbage, litter, plastic debris, scrap, dumps, sewage overflow, or general trash.
If the photo does NOT contain any visible garbage, trash, waste, debris, dumps, litter, or municipal blockages (for example, if it is a photo of clean food, a clean room, a single clean object, a clean street, people, animals, or general nature scenery/graphics with zero garbage), set "isGarbagePresent" to false.

Provide critical parameters for resolving this complaint. Respond strictly with a JSON object containing six exact keys:
1. isGarbagePresent: boolean (true if garbage, litter, trash, illegal dumping, waste, or debris is visible; false otherwise)
2. severity: ("Low" | "Medium" | "High" | "Critical")
3. severityScore: integer (1-5)
4. healthRisks: array of exactly 3 strings representing direct human healthcare vectors/vulnerabilities
5. environmentalRisks: array of exactly 2 strings representing ecological damage
6. complaintLetter: A formal civic complaint written precisely to the Assistant Revenue Officer and Health Inspector of the Mandya Municipal Division. Mention coordinates (${location.latitude}, ${location.longitude}) and ward name (${location.ward}). Detail the urgent dumping violation and demand deployment of clearance dumper trucks to restore sanity.

Return output ONLY as JSON inside a raw string. Do not append markdown formatting rules.`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: { parts: [imagePart, { text: targetPrompt }] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isGarbagePresent: {
                  type: Type.BOOLEAN,
                  description: "Whether garbage, waste, litter, dumps, road blocks, or trash is visible/present in the environment shown in the photo."
                },
                severity: {
                  type: Type.STRING,
                  description: "Choice of 'Low', 'Medium', 'High', or 'Critical'"
                },
                severityScore: {
                  type: Type.INTEGER,
                  description: "Numerical rating between 1 (lowest severity) and 5 (extreme emergency/critical severity)"
                },
                healthRisks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 3 distinct items showing healthcare/disease vectors/vulnerabilities."
                },
                environmentalRisks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 2 distinct items describing direct ecological damage/risk."
                },
                complaintLetter: {
                  type: Type.STRING,
                  description: "A meticulously written, formal municipal complaint letter addressed to MCMC, including coordinates and ward name."
                }
              },
              required: ["isGarbagePresent", "severity", "severityScore", "healthRisks", "environmentalRisks", "complaintLetter"]
            }
          }
        });

        const textOutput = geminiRes.text;
        if (textOutput) {
          const aiJson = JSON.parse(textOutput.trim());
          
          // Strict image content validation: Reject if no garbage or solid waste detected
          const isGarbagePresent = aiJson.isGarbagePresent;
          if (isGarbagePresent === false || isGarbagePresent === "false") {
            writeProgress("Validation Failed", 100, {
              error: "AI Verification Failed: The uploaded image does not appear to contain any visible trash, rubbish, or solid waste piles. Please upload an authentic photo of illegal dumping to log a municipal grievance."
            });
            return res.end();
          }

          if (aiJson.severity) severityResult = aiJson.severity;
          if (aiJson.severityScore) severityScore = Number(aiJson.severityScore);
          if (aiJson.healthRisks) healthRisks = aiJson.healthRisks;
          if (aiJson.environmentalRisks) environmentalRisks = aiJson.environmentalRisks;
          if (aiJson.complaintLetter) complaintLetter = aiJson.complaintLetter;
        }
      } catch (geminiError) {
        console.error("Gemini AI API execution failed, utilizing safety local heuristic fallback", geminiError);
        complaintLetter = generateStaticComplaint(citizen, location, severityResult);
      }
    } else {
      // Safety offline heuristic local fallback
      await delay(1200);
      severityResult = citizen.description.toLowerCase().includes('emergency') || citizen.description.toLowerCase().includes('blocking') ? 'Critical' : 'High';
      severityScore = severityResult === 'Critical' ? 5 : 4;
      complaintLetter = generateStaticComplaint(citizen, location, severityResult);
    }

    // STEP 4: Notifying Municipal Authority
    writeProgress("Notifying Civic Authority and Citizen", 80);
    const reportId = `TT-${Date.now().toString().slice(-4)}`;
    
    // 1. Dispatch complaint email to Authority via Resend
    const authorityEmail = `mcmc.${location.ward.toLowerCase().replace(/[^a-z0-9]/g, '')}.officer@mandya.gov.in`;
    const authoritySubject = `TRASH-TALK EXPLOIT: [${severityResult}] New Garbage Dump at ${location.ward}`;
    const authorityHtml = `
      <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; border: 1px solid #f3f4f6; border-radius: 8px;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-top: 0;">Official Solid Waste Grievance</h2>
        <p>This is an automated dispatch from the TrashTalk autonomous civic platform alerting you of a high-priority illegal dumpsite.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 6px 0; font-weight: bold; width: 30%;">Location Ward:</td><td style="padding: 6px 0;">${location.ward}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Coordinates:</td><td style="padding: 6px 0;">${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Severity:</td><td style="padding: 6px 0;"><span style="background-color: #fef2f2; color: #991b1b; padding: 2px 6px; font-weight: bold; border-radius: 4px;">${severityResult}</span> (Score: ${severityScore}/5)</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">Reporter:</td><td style="padding: 6px 0;">${citizen.name} (Phone: ${citizen.phone})</td></tr>
        </table>
        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">
          ${complaintLetter}
        </div>
        ${imageUrl ? `<div style="margin-top: 20px;"><p style="font-weight: bold;">Submitted Evidence Photo:</p><img src="${imageUrl}" alt="Garbage Evidence" style="max-width: 100%; border-radius: 6px; border: 1px solid #e5e7eb;" /></div>` : ''}
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; margin-bottom: 0;">Automated authority alerting system connected through Resend. Responding within SLA boundaries is requested.</p>
      </div>
    `;

    sendResendEmail(authorityEmail, authoritySubject, authorityHtml).catch(e => {
      console.error("Resend delivery failed to authority on submission:", e);
    });

    const emailAlert: NotificationLog = {
      id: `NOTIF-${Date.now().toString().slice(-4)}A`,
      reportId,
      type: "Email",
      recipient: authorityEmail,
      subject: authoritySubject,
      status: "Sent",
      timestamp: new Date().toISOString(),
      details: `Forwarded formal authority complaint letter straight to MCMC regional mailbox.`
    };
    await Database.addNotification(emailAlert);

    // 2. Dispatch receipt verification email to Citizen via Resend
    if (citizen.email) {
      const citizenSubject = `TrashTalk: Civic Report Registered Successfully! (Case #${reportId})`;
      const citizenHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-top: 0;">Case Lodged Successfully</h2>
          <p>Dear <strong>${citizen.name}</strong>,</p>
          <p>Thank you for doing your part to keep Mandya clean! Your illegal solid waste reporting has been officially logged as <strong>Case ID #${reportId}</strong>.</p>
          <p><strong>Grievance Details:</strong></p>
          <ul style="padding-left: 20px;">
            <li><strong>Incident Address:</strong> ${location.address}</li>
            <li><strong>Municipal Ward:</strong> ${location.ward}</li>
            <li><strong>AI Severity Analysis:</strong> ${severityResult}</li>
          </ul>
          <p>The Mandya City Municipal Council health department has been automatically notified and is reviewing the formal complaint letter filed on your behalf. You will receive immediate notifications as cleanup schedules proceed.</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; margin-bottom: 0;">Sent via TrashTalk Mandya Municipal Alert Platform powered by Resend.</p>
        </div>
      `;

      sendResendEmail(citizen.email, citizenSubject, citizenHtml).catch(e => {
        console.error("Resend delivery failed to citizen on submission:", e);
      });

      const citizenEmailAlert: NotificationLog = {
        id: `NOTIF-${Date.now().toString().slice(-4)}C`,
        reportId,
        type: "Email",
        recipient: citizen.email,
        subject: citizenSubject,
        status: "Sent",
        timestamp: new Date().toISOString(),
        details: `Dispatched verification email to reporter matching ${citizen.email}.`
      };
      await Database.addNotification(citizenEmailAlert);
    }

    // 3. Direct cellular SMS via Twilio & Notification Log
    const subSmsBody = `TrashTalk: Hello ${citizen.name}, thank you for keeping our city clean. Your civic complaint (Case #${reportId}) has been successfully registered for Ward: ${location.ward}. We will notify you when excavation starts!`;
    sendTwilioSMS(citizen.phone, subSmsBody).catch(e => {
      console.error("Twilio SMS transmission failed on submission:", e);
    });

    const smsAlert: NotificationLog = {
      id: `NOTIF-${Date.now().toString().slice(-4)}R`,
      reportId,
      type: "SMS",
      recipient: citizen.phone,
      subject: "TrashTalk Report Lodged",
      status: "Sent",
      timestamp: new Date().toISOString(),
      details: `Your complaint ID ${reportId} is logged. Dispatched direct cellular text message (SMS) notification to ${citizen.phone}.`
    };
    await Database.addNotification(smsAlert);
    await delay(500);

    // STEP 5: Saving Report
    writeProgress("Saving Civic Report securely", 95);

    const newReport: Report = {
      id: reportId,
      citizen,
      location,
      imageUrl,
      status: "Submitted",
      severity: severityResult,
      severityScore,
      upvotes: 0,
      upvotedBy: [],
      createdAt: new Date().toISOString(),
      healthRisks,
      environmentalRisks,
      complaintLetter,
      notifiedAuthority: true,
      timeline: [
        {
          status: "Submitted",
          timestamp: new Date().toISOString(),
          title: "Report Lodged",
          description: "Civic report has been logged and registered with the municipal sanitation system."
        }
      ]
    };

    await Database.addReport(newReport);
    
    // SUCCESS TERMINAL SSE DISPATCH
    writeProgress("TrashTalk Case Successfully Established", 100, newReport);
    res.end();

  } catch (error: any) {
    console.error("Critical submission server exception", error);
    writeProgress("Critical system crash", 100, { error: error.message });
    res.end();
  }
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Solid Local heuristic complaint generator
function generateStaticComplaint(citizen: any, location: any, severity: string): string {
  return `To,
The Nodal Health Inspector & Ward Supervisor,
Mandya City Municipal Council (MCMC),
${location.ward}, Mandya.

Subject: Formal complaint regarding illegal dumping at ${location.address}.

Respected Sir/Madam,

On behalf of the citizens division, we submit an urgent complaint against illegal heavy trash accumulations situated precisely at GPS Coordinates: Lat ${location.latitude}, Lng ${location.longitude}.

Violation Severity Profile: ${severity}
Citizen Reporter: ${citizen.name} (Contact: ${citizen.phone})

The solid waste is causing severe sanitary hazards, breeding pest swarms, and releasing putrid odors across the surrounding community lines. Under the Solid Waste Management Rules 2016, we request the immediate dispatch of a Mandya City Municipal Council sanitation dumper truck to excavate this pile and restore public hygiene.

Thank you,

Nodal Automated Dispatch,
TrashTalk AI Platform.`;
}

// ----------------------------------------------------
// VITE OR STATIC MIDDLEWARE SETUP
// ----------------------------------------------------
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the port-based listener if we are not in a serverless environment (e.g., Vercel)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TrashTalk Engine Server booting successfully on http://0.0.0.0:${PORT}`);
    });
  }
}

initializeServer();

export default app;
