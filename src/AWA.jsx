// ⬡B:awa.genesis:APP:v1.0.0:20260228⬡
// AWA (Apply With ABA) — Job Application Pipeline
// ════════════════════════════════════════════════════════════════════════════
// FEATURES:
//   1. Job Pipeline: View all parsed jobs from Idealist
//   2. Team Assignment: Assign jobs to Brandon/Eric/BJ/CJ/Vante/Dwayne
//   3. Cover Letters: AI-generated using real team profiles
//   4. Resumes: Tailored resume generation
//   5. Status Tracking: New → Applied → Interview → Offer
// ARCHITECTURE:
//   - Firebase = AUTH ONLY (Google sign-in)
//   - Jobs = Supabase aba_memory (memory_type: parsed_job)
//   - Backend = aba-reach.onrender.com/api/awa/*
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, FileText, Send, Search, Filter, ChevronRight, ChevronDown,
  User, Users, X, Plus, Check, Clock, Star, ExternalLink, RefreshCw,
  Download, Copy, Edit2, Trash2, LogOut, Menu, Home, Mail, Phone,
  MapPin, DollarSign, Building, Calendar, CheckCircle, AlertCircle,
  Sparkles, Zap, Target, Award
} from "lucide-react";
import { auth, signInGoogle, signOutUser } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const REACH = "https://aba-reach.onrender.com";
const SUPABASE = "https://htlxjkbrstpwwtzsbyvb.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI4MjEsImV4cCI6MjA4NjEwODgyMX0.MOgNYkezWpgxTO3ZHd0omZ0WLJOOR-tL7hONXWG9eBw";

// Team members for assignment
const TEAM = [
  { id: "brandon", name: "Brandon Pierce", color: "#8B5CF6", roles: ["Executive Director", "CDO", "VP"], remote: true },
  { id: "eric", name: "Eric Lane", color: "#6366F1", roles: ["Executive Director", "CDO", "VP"], remote: true },
  { id: "bj", name: "BJ Pierce", color: "#EC4899", roles: ["Director of Development", "Marketing"], remote: true },
  { id: "cj", name: "CJ Moore", color: "#14B8A6", roles: ["Development Manager"], remote: true },
  { id: "vante", name: "Vante", color: "#F59E0B", roles: ["Development Manager"], remote: true },
  { id: "dwayne", name: "Dwayne", color: "#22C55E", roles: ["Finance", "Operations"], remote: true }
];

// Job statuses
const STATUSES = [
  { id: "new", label: "New", color: "#6B7280", icon: Sparkles },
  { id: "reviewing", label: "Reviewing", color: "#8B5CF6", icon: Search },
  { id: "applied", label: "Applied", color: "#3B82F6", icon: Send },
  { id: "interview", label: "Interview", color: "#F59E0B", icon: Calendar },
  { id: "offer", label: "Offer", color: "#22C55E", icon: Award },
  { id: "rejected", label: "Rejected", color: "#EF4444", icon: X },
  { id: "passed", label: "Passed", color: "#6B7280", icon: X }
];

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUNDS (matching MyABA)
// ═══════════════════════════════════════════════════════════════════════════
const BG = {
  pinkSmoke: { u: "https://i.imgur.com/3RkebB2.jpeg", l: "Pink Smoke" },
  eventHorizon: { u: "https://i.imgur.com/A44TxCq.jpeg", l: "Event Horizon" },
  nebula: { u: "https://i.imgur.com/nLBRQ82.jpeg", l: "Nebula" }
};

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
async function fetchJobs() {
  try {
    const res = await fetch(
      `${SUPABASE}/rest/v1/aba_memory?memory_type=eq.parsed_job&order=created_at.desc`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    );
    if (!res.ok) throw new Error("Failed to fetch jobs");
    const data = await res.json();
    return data.map(item => {
      const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
      return {
        id: item.id,
        title: content.title || "Untitled",
        url: content.url || "",
        source: content.source || "idealist",
        status: content.status || "new",
        assignee: content.assignee || null,
        company: extractCompany(content.title),
        location: extractLocation(content.title),
        seeded_at: content.seeded_at || item.created_at,
        notes: content.notes || ""
      };
    });
  } catch (e) {
    console.error("fetchJobs error:", e);
    return [];
  }
}

function extractCompany(title) {
  const parts = title.split(" ");
  // Find organization name (usually capitalized words after position)
  const capitalWords = [];
  let foundRole = false;
  for (const part of parts) {
    if (part.match(/^(Director|Manager|Coordinator|Specialist|Associate|Officer|Executive|VP|Chief|Lead|Senior|Junior|Assistant)/i)) {
      foundRole = true;
    } else if (foundRole && part[0] === part[0].toUpperCase() && part.length > 2) {
      capitalWords.push(part);
    }
  }
  return capitalWords.slice(0, 4).join(" ") || "Organization";
}

function extractLocation(title) {
  const parts = title.split(" ");
  const last = parts[parts.length - 1];
  if (last && last[0] === last[0].toUpperCase()) {
    return last;
  }
  return "Remote";
}

async function updateJob(jobId, updates) {
  try {
    // Get current content
    const res = await fetch(
      `${SUPABASE}/rest/v1/aba_memory?id=eq.${jobId}&select=content`,
      { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } }
    );
    const [item] = await res.json();
    if (!item) return false;
    
    const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const newContent = { ...content, ...updates };
    
    // Update
    const updateRes = await fetch(
      `${SUPABASE}/rest/v1/aba_memory?id=eq.${jobId}`,
      {
        method: "PATCH",
        headers: {
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ content: JSON.stringify(newContent) })
      }
    );
    return updateRes.ok;
  } catch (e) {
    console.error("updateJob error:", e);
    return false;
  }
}

async function generateCoverLetter(userId, jobTitle, company) {
  try {
    const res = await fetch(`${REACH}/api/awa/cover-letters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        job_title: jobTitle,
        company_name: company
      })
    });
    if (!res.ok) throw new Error("Failed to generate cover letter");
    return await res.json();
  } catch (e) {
    console.error("generateCoverLetter error:", e);
    return null;
  }
}

async function generateResume(userId, targetRole) {
  try {
    const res = await fetch(`${REACH}/api/awa/resumes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        target_role: targetRole
      })
    });
    if (!res.ok) throw new Error("Failed to generate resume");
    return await res.json();
  } catch (e) {
    console.error("generateResume error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  
  const colors = { error: "#EF4444", success: "#22C55E", warning: "#F59E0B", info: "#8B5CF6" };
  const icons = { error: AlertCircle, success: CheckCircle, warning: AlertCircle, info: Sparkles };
  const Icon = icons[type];
  
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      padding: "14px 20px", borderRadius: 16, background: colors[type], color: "white",
      fontSize: 14, fontWeight: 500, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,.4)",
      display: "flex", alignItems: "center", gap: 10
    }}>
      <Icon size={18} />{message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB CARD
// ═══════════════════════════════════════════════════════════════════════════
function JobCard({ job, onSelect, onAssign, onStatusChange, selected }) {
  const status = STATUSES.find(s => s.id === job.status) || STATUSES[0];
  const StatusIcon = status.icon;
  const assignee = TEAM.find(t => t.id === job.assignee);
  
  return (
    <div
      onClick={() => onSelect(job)}
      style={{
        background: selected ? "rgba(139,92,246,.15)" : "rgba(255,255,255,.03)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${selected ? "rgba(139,92,246,.3)" : "rgba(255,255,255,.06)"}`,
        borderRadius: 16,
        padding: "16px 18px",
        marginBottom: 10,
        cursor: "pointer",
        transition: "all .2s"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${status.color}33, ${status.color}11)`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <StatusIcon size={18} style={{ color: status.color }} />
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: "rgba(255,255,255,.9)", fontSize: 14, fontWeight: 600, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {job.title.split(" ").slice(0, 4).join(" ")}
          </h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              color: "rgba(255,255,255,.5)", fontSize: 11
            }}>
              <Building size={11} />{job.company}
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 4,
              color: "rgba(255,255,255,.4)", fontSize: 11
            }}>
              <MapPin size={11} />{job.location}
            </span>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{
              padding: "4px 8px", borderRadius: 6,
              background: `${status.color}22`, color: status.color,
              fontSize: 10, fontWeight: 600
            }}>
              {status.label}
            </span>
            
            {assignee && (
              <span style={{
                padding: "4px 8px", borderRadius: 6,
                background: `${assignee.color}22`, color: assignee.color,
                fontSize: 10, fontWeight: 600
              }}>
                {assignee.name.split(" ")[0]}
              </span>
            )}
            
            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 10, marginLeft: "auto" }}>
              {job.source}
            </span>
          </div>
        </div>
        
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,.2)", flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════
function JobDetail({ job, onClose, onUpdate, onGenerateCoverLetter, onGenerateResume }) {
  const [loading, setLoading] = useState(null);
  const [coverLetter, setCoverLetter] = useState(null);
  const [assignDropdown, setAssignDropdown] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState(false);
  
  if (!job) return null;
  
  const status = STATUSES.find(s => s.id === job.status) || STATUSES[0];
  const assignee = TEAM.find(t => t.id === job.assignee);
  
  const handleAssign = async (teamId) => {
    setAssignDropdown(false);
    const success = await onUpdate(job.id, { assignee: teamId });
    if (success) job.assignee = teamId;
  };
  
  const handleStatus = async (statusId) => {
    setStatusDropdown(false);
    const success = await onUpdate(job.id, { status: statusId });
    if (success) job.status = statusId;
  };
  
  const handleCoverLetter = async () => {
    if (!job.assignee) return;
    setLoading("cover");
    const result = await onGenerateCoverLetter(job.assignee, job.title, job.company);
    if (result?.coverLetter) {
      setCoverLetter(result.coverLetter);
    }
    setLoading(null);
  };
  
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: "min(500px, 90vw)", background: "rgba(10,8,20,.98)",
      backdropFilter: "blur(24px)", borderLeft: "1px solid rgba(139,92,246,.15)",
      display: "flex", flexDirection: "column", zIndex: 100
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: 0 }}>Job Details</h2>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "rgba(255,255,255,.4)",
          cursor: "pointer", padding: 8
        }}>
          <X size={20} />
        </button>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <h3 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3 }}>
          {job.title}
        </h3>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.6)", fontSize: 13 }}>
            <Building size={14} />{job.company}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.5)", fontSize: 13 }}>
            <MapPin size={14} />{job.location}
          </span>
        </div>
        
        {/* Status & Assignee */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {/* Status Dropdown */}
          <div style={{ position: "relative" }}>
            <label style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Status</label>
            <button
              onClick={() => setStatusDropdown(!statusDropdown)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)",
                color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: status.color }} />
                {status.label}
              </span>
              <ChevronDown size={14} />
            </button>
            {statusDropdown && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                background: "rgba(20,18,30,.98)", border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 12, overflow: "hidden", zIndex: 10
              }}>
                {STATUSES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleStatus(s.id)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "none",
                      background: job.status === s.id ? "rgba(139,92,246,.15)" : "transparent",
                      color: "white", fontSize: 13, cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Assignee Dropdown */}
          <div style={{ position: "relative" }}>
            <label style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Assigned To</label>
            <button
              onClick={() => setAssignDropdown(!assignDropdown)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)",
                color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {assignee ? (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: assignee.color }} />
                    {assignee.name.split(" ")[0]}
                  </>
                ) : (
                  <span style={{ color: "rgba(255,255,255,.4)" }}>Unassigned</span>
                )}
              </span>
              <ChevronDown size={14} />
            </button>
            {assignDropdown && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
                background: "rgba(20,18,30,.98)", border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 12, overflow: "hidden", zIndex: 10
              }}>
                <button
                  onClick={() => handleAssign(null)}
                  style={{
                    width: "100%", padding: "10px 14px", border: "none",
                    background: !job.assignee ? "rgba(139,92,246,.15)" : "transparent",
                    color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", textAlign: "left"
                  }}
                >
                  Unassigned
                </button>
                {TEAM.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleAssign(t.id)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "none",
                      background: job.assignee === t.id ? "rgba(139,92,246,.15)" : "transparent",
                      color: "white", fontSize: 13, cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 20px", borderRadius: 14,
              background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))",
              color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none"
            }}
          >
            <ExternalLink size={16} />View Job Posting
          </a>
          
          <button
            onClick={handleCoverLetter}
            disabled={!job.assignee || loading === "cover"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 20px", borderRadius: 14,
              border: "1px solid rgba(139,92,246,.3)",
              background: job.assignee ? "rgba(139,92,246,.1)" : "rgba(255,255,255,.03)",
              color: job.assignee ? "rgba(139,92,246,.9)" : "rgba(255,255,255,.3)",
              fontSize: 14, fontWeight: 600, cursor: job.assignee ? "pointer" : "not-allowed"
            }}
          >
            {loading === "cover" ? (
              <><RefreshCw size={16} className="spin" />Generating...</>
            ) : (
              <><FileText size={16} />Generate Cover Letter</>
            )}
          </button>
          
          {!job.assignee && (
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, textAlign: "center", margin: 0 }}>
              Assign to a team member to generate materials
            </p>
          )}
        </div>
        
        {/* Cover Letter Result */}
        {coverLetter && (
          <div style={{
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 16, padding: 20, marginBottom: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ color: "white", fontSize: 14, fontWeight: 600, margin: 0 }}>Generated Cover Letter</h4>
              <button
                onClick={() => navigator.clipboard.writeText(coverLetter)}
                style={{ background: "none", border: "none", color: "rgba(139,92,246,.7)", cursor: "pointer", padding: 4 }}
              >
                <Copy size={16} />
              </button>
            </div>
            <pre style={{
              color: "rgba(255,255,255,.7)", fontSize: 12, lineHeight: 1.6,
              whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit"
            }}>
              {coverLetter}
            </pre>
          </div>
        )}
        
        {/* Metadata */}
        <div style={{
          background: "rgba(255,255,255,.02)", borderRadius: 12, padding: 16
        }}>
          <h4 style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 600, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>Details</h4>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>Source</span>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{job.source}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>Added</span>
              <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{job.seeded_at}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS BAR
// ═══════════════════════════════════════════════════════════════════════════
function StatsBar({ jobs }) {
  const stats = STATUSES.map(s => ({
    ...s,
    count: jobs.filter(j => j.status === s.id).length
  }));
  
  return (
    <div style={{
      display: "flex", gap: 8, padding: "12px 16px",
      background: "rgba(255,255,255,.02)", borderRadius: 14,
      overflowX: "auto", marginBottom: 16
    }}>
      {stats.map(s => (
        <div
          key={s.id}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 10,
            background: s.count > 0 ? `${s.color}15` : "transparent",
            flexShrink: 0
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 12 }}>{s.label}</span>
          <span style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.count}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const go = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInGoogle();
      onLogin(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG.pinkSmoke.u})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(.3) saturate(.6)"
      }} />
      
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 360, padding: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 24px",
          background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(139,92,246,.3)"
        }}>
          <Briefcase size={36} style={{ color: "white" }} />
        </div>
        
        <h1 style={{
          color: "white", fontSize: 28, fontWeight: 700, margin: "0 0 8px",
          background: "linear-gradient(135deg, #8B5CF6, #6366F1, #EC4899)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>
          AWA
        </h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, margin: "0 0 8px" }}>
          Apply With ABA
        </p>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 32px" }}>
          Job pipeline for the team
        </p>
        
        <button
          onClick={go}
          disabled={loading}
          style={{
            width: "100%", padding: "16px 24px", borderRadius: 16,
            border: "1px solid rgba(255,255,255,.1)", cursor: loading ? "wait" : "pointer",
            background: "linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.25))",
            color: "white", fontSize: 15, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            boxShadow: "0 4px 20px rgba(139,92,246,.2)"
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        
        {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p style={{ color: "rgba(255,255,255,.15)", fontSize: 10, marginTop: 24 }}>v1.0.0</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function AWA() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);
  
  // Load jobs
  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [user]);
  
  const loadJobs = async () => {
    setLoading(true);
    const data = await fetchJobs();
    setJobs(data);
    setLoading(false);
  };
  
  const handleUpdate = async (jobId, updates) => {
    const success = await updateJob(jobId, updates);
    if (success) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
      setToast({ message: "Job updated", type: "success" });
    } else {
      setToast({ message: "Failed to update", type: "error" });
    }
    return success;
  };
  
  const handleGenerateCoverLetter = async (userId, jobTitle, company) => {
    const result = await generateCoverLetter(userId, jobTitle, company);
    if (result?.coverLetter) {
      setToast({ message: "Cover letter generated", type: "success" });
    } else {
      setToast({ message: "Failed to generate", type: "error" });
    }
    return result;
  };
  
  // Filter jobs
  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || j.status === filterStatus;
    const matchAssignee = filterAssignee === "all" || j.assignee === filterAssignee || (filterAssignee === "unassigned" && !j.assignee);
    return matchSearch && matchStatus && matchAssignee;
  });
  
  if (authLoading) {
    return (
      <div style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#08080d"
      }}>
        <RefreshCw size={32} style={{ color: "#8B5CF6", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }
  
  if (!user) {
    return <Login onLogin={setUser} />;
  }
  
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#08080d",
      fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      display: "flex", flexDirection: "column"
    }}>
      {/* Background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${BG.eventHorizon.u})`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "brightness(.15) saturate(.5)", zIndex: 0
      }} />
      
      {/* Header */}
      <header style={{
        position: "relative", zIndex: 10,
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(10,8,20,.8)", backdropFilter: "blur(16px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Briefcase size={18} style={{ color: "white" }} />
          </div>
          <div>
            <h1 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: 0 }}>AWA</h1>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, margin: 0 }}>{jobs.length} jobs</p>
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={loadJobs} style={{
            background: "rgba(255,255,255,.05)", border: "none",
            borderRadius: 10, padding: 10, cursor: "pointer"
          }}>
            <RefreshCw size={16} style={{ color: "rgba(255,255,255,.5)" }} />
          </button>
          
          <div style={{
            width: 32, height: 32, borderRadius: 99, overflow: "hidden",
            background: "rgba(139,92,246,.3)"
          }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%" }} />
            ) : (
              <User size={16} style={{ color: "white" }} />
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{ position: "relative", zIndex: 5, flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {/* Stats */}
        <StatsBar jobs={jobs} />
        
        {/* Search & Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{
            flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", background: "rgba(255,255,255,.05)",
            borderRadius: 12, border: "1px solid rgba(255,255,255,.06)"
          }}>
            <Search size={16} style={{ color: "rgba(255,255,255,.3)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "white", fontSize: 14
              }}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.06)",
              color: "white", fontSize: 13, cursor: "pointer"
            }}
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.06)",
              color: "white", fontSize: 13, cursor: "pointer"
            }}
          >
            <option value="all">All Team</option>
            <option value="unassigned">Unassigned</option>
            {TEAM.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        
        {/* Jobs List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <RefreshCw size={24} style={{ color: "#8B5CF6", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)" }}>
            {search || filterStatus !== "all" || filterAssignee !== "all" ? "No jobs match filters" : "No jobs in pipeline"}
          </div>
        ) : (
          <div>
            {filtered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={setSelectedJob}
                onAssign={(id) => handleUpdate(job.id, { assignee: id })}
                onStatusChange={(s) => handleUpdate(job.id, { status: s })}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* Job Detail Panel */}
      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={handleUpdate}
          onGenerateCoverLetter={handleGenerateCoverLetter}
          onGenerateResume={generateResume}
        />
      )}
      
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        select option { background: #1a1625; color: white; }
      `}</style>
    </div>
  );
}
