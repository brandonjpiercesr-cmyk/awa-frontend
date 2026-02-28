// ⬡B:awa.genesis:APP:v2.0.1:20260228⬡
// AWA (Apply With ABA) — Job Application Pipeline
// ════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   - Firebase = AUTH ONLY (Google sign-in, same as MyABA)
//   - Jobs = Direct Supabase (aba_memory, memory_type: parsed_job)
//   - Cover Letters = REACH /api/awa/cover-letters (uses JOBA agent)
//   - Updates = Direct Supabase
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import {
  Briefcase, FileText, Send, Search, ChevronRight, ChevronDown,
  User, Users, X, Check, Clock, Star, ExternalLink, RefreshCw,
  Copy, LogOut, MapPin, Building, Calendar, CheckCircle, AlertCircle,
  Sparkles, Target, Award, Bookmark, ThumbsDown, Eye, EyeOff
} from "lucide-react";
import { auth, signInGoogle, signOutUser } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { ABAPresence } from "./ABAPresence.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const SUPABASE = "https://htlxjkbrstpwwtzsbyvb.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI4MjEsImV4cCI6MjA4NjEwODgyMX0.MOgNYkezWpgxTO3ZHd0omZ0WLJOOR-tL7hONXWG9eBw";
const REACH = "https://aba-reach.onrender.com";

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUNDS (same as MyABA - pinkSmoke default)
// ═══════════════════════════════════════════════════════════════════════════
const BG = {
  pinkSmoke: "https://i.imgur.com/3RkebB2.jpeg",
  blackLandscape: "https://i.imgur.com/ZwVdgzN.jpeg",
  nebula: "https://i.imgur.com/nLBRQ82.jpeg"
};

// Team members
const TEAM = [
  { id: "brandon", name: "Brandon Pierce", initials: "BP", color: "#8B5CF6" },
  { id: "eric", name: "Eric Lane", initials: "EL", color: "#6366F1" },
  { id: "bj", name: "BJ Pierce", initials: "BJ", color: "#EC4899" },
  { id: "cj", name: "CJ Moore", initials: "CJ", color: "#14B8A6" },
  { id: "vante", name: "Vante", initials: "VT", color: "#F59E0B" },
  { id: "dwayne", name: "Dwayne", initials: "DW", color: "#22C55E" }
];

// Job statuses
const STATUSES = [
  { id: "new", label: "New", color: "#6B7280" },
  { id: "matched", label: "Matched", color: "#8B5CF6" },
  { id: "reviewing", label: "Reviewing", color: "#3B82F6" },
  { id: "applied", label: "Applied", color: "#6366F1" },
  { id: "interview", label: "Interview", color: "#F59E0B" },
  { id: "offer", label: "Offer", color: "#22C55E" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
  { id: "passed", label: "Passed", color: "#6B7280" }
];

// ═══════════════════════════════════════════════════════════════════════════
// DATA FUNCTIONS - Direct Supabase + REACH for AI
// ═══════════════════════════════════════════════════════════════════════════
function parseJobTitle(rawTitle) {
  const words = rawTitle.split(" ");
  const roleKeywords = ["Director", "Manager", "Coordinator", "Specialist", "Associate", "Officer", "Executive", "VP", "Chief", "Lead", "Senior", "Administrator"];
  let roleEndIndex = 0;
  for (let i = 0; i < words.length; i++) {
    if (roleKeywords.some(k => words[i].includes(k))) roleEndIndex = i + 1;
    if (["The", "Inc", "Foundation", "Organization", "Association", "Institute", "University"].includes(words[i]) && i > roleEndIndex) break;
  }
  if (roleEndIndex === 0) roleEndIndex = Math.min(3, words.length);
  const role = words.slice(0, roleEndIndex).join(" ");
  const rest = words.slice(roleEndIndex);
  const location = rest.length > 0 ? rest[rest.length - 1] : "Remote";
  const org = rest.slice(0, -1).join(" ") || "Organization";
  return { role, company: org, location };
}

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
      const parsed = parseJobTitle(content.title || "Untitled");
      return {
        id: item.id,
        rawTitle: content.title || "Untitled",
        role: parsed.role,
        company: parsed.company,
        location: parsed.location,
        url: content.url || "",
        source: content.source || "idealist",
        status: content.status || "new",
        assignee: content.assignee || null,
        seeded_at: content.seeded_at || item.created_at?.split("T")[0],
        notes: content.notes || "",
        saved: content.saved || false
      };
    });
  } catch (e) {
    console.error("fetchJobs error:", e);
    return [];
  }
}

async function updateJob(jobId, updates) {
  try {
    const res = await fetch(`${SUPABASE}/rest/v1/aba_memory?id=eq.${jobId}&select=content`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    });
    const [item] = await res.json();
    if (!item) return false;
    const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
    const newContent = { ...content, ...updates };
    const updateRes = await fetch(`${SUPABASE}/rest/v1/aba_memory?id=eq.${jobId}`, {
      method: "PATCH",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ content: JSON.stringify(newContent) })
    });
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
      body: JSON.stringify({ user_id: userId, job_title: jobTitle, company_name: company })
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch (e) {
    console.error("generateCoverLetter error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ message, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const colors = { error: "#EF4444", success: "#22C55E", warning: "#F59E0B", info: "#8B5CF6" };
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      padding: "12px 20px", borderRadius: 12, background: colors[type], color: "white",
      fontSize: 13, fontWeight: 600, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,.4)"
    }}>{message}</div>
  );
}

function TeamBadge({ memberId, size = "sm" }) {
  const member = TEAM.find(t => t.id === memberId);
  if (!member) return null;
  const s = size === "sm" ? 24 : 32;
  return (
    <div style={{
      width: s, height: s, borderRadius: 8,
      background: `linear-gradient(135deg, ${member.color}, ${member.color}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size === "sm" ? 9 : 11, fontWeight: 700, color: "white"
    }}>{member.initials}</div>
  );
}

function JobCard({ job, onSelect, onQuickAction, selected }) {
  const status = STATUSES.find(s => s.id === job.status) || STATUSES[0];
  const assignee = TEAM.find(t => t.id === job.assignee);
  return (
    <div onClick={() => onSelect(job)} style={{
      background: selected ? "rgba(139,92,246,.12)" : "rgba(255,255,255,.03)",
      border: `1px solid ${selected ? "rgba(139,92,246,.3)" : "rgba(255,255,255,.05)"}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all .15s"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 4, height: 50, borderRadius: 2, background: status.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: "rgba(255,255,255,.9)", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
          }}>{job.role}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              <Building size={10} />{(job.company || "").substring(0, 25)}
            </span>
            <span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              <MapPin size={10} />{job.location}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {assignee && <TeamBadge memberId={job.assignee} size="sm" />}
            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 600, background: `${status.color}22`, color: status.color }}>{status.label}</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)", marginLeft: "auto" }}>{job.source}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onQuickAction(job, "save")} style={{
            background: job.saved ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.05)",
            border: "none", borderRadius: 6, padding: 6, cursor: "pointer"
          }}><Bookmark size={12} style={{ color: job.saved ? "#8B5CF6" : "rgba(255,255,255,.3)" }} /></button>
          <button onClick={() => onQuickAction(job, "pass")} style={{
            background: "rgba(255,255,255,.05)", border: "none", borderRadius: 6, padding: 6, cursor: "pointer"
          }}><ThumbsDown size={12} style={{ color: "rgba(255,255,255,.3)" }} /></button>
        </div>
      </div>
    </div>
  );
}

function JobDetail({ job, onClose, onUpdate, onGenerateCoverLetter }) {
  const [loading, setLoading] = useState(null);
  const [coverLetter, setCoverLetter] = useState(null);
  const [dropdown, setDropdown] = useState(null);
  if (!job) return null;
  const status = STATUSES.find(s => s.id === job.status) || STATUSES[0];
  const assignee = TEAM.find(t => t.id === job.assignee);
  
  const handleAssign = async (teamId) => {
    setDropdown(null);
    await onUpdate(job.id, { assignee: teamId, status: teamId ? "reviewing" : "new" });
  };
  const handleStatus = async (statusId) => {
    setDropdown(null);
    await onUpdate(job.id, { status: statusId });
  };
  const handleCoverLetter = async () => {
    if (!job.assignee) return;
    setLoading("cover");
    const result = await onGenerateCoverLetter(job.assignee, job.role, job.company);
    if (result?.content || result?.coverLetter || result?.cover_letter?.content) {
      setCoverLetter(result.content || result.coverLetter || result.cover_letter?.content);
    }
    setLoading(null);
  };
  
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div style={{ width: "min(480px, 95vw)", height: "100%", background: "rgba(12,10,20,.98)", borderLeft: "1px solid rgba(139,92,246,.15)", display: "flex", flexDirection: "column", animation: "slideIn .2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>Job Details</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><X size={18} style={{ color: "rgba(255,255,255,.5)" }} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <h3 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3 }}>{job.role}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}>{job.company}</span>
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 14 }}>• {job.location}</span>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ position: "relative" }}>
              <label style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 6 }}>STATUS</label>
              <button onClick={() => setDropdown(dropdown === "status" ? null : "status")} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: status.color }} />{status.label}</span><ChevronDown size={14} />
              </button>
              {dropdown === "status" && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "rgba(20,18,30,.98)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, overflow: "hidden", zIndex: 10 }}>
                  {STATUSES.map(s => (
                    <button key={s.id} onClick={() => handleStatus(s.id)} style={{ width: "100%", padding: "10px 14px", border: "none", background: job.status === s.id ? "rgba(139,92,246,.15)" : "transparent", color: "white", fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />{s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <label style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 600, display: "block", marginBottom: 6 }}>ASSIGNED</label>
              <button onClick={() => setDropdown(dropdown === "assign" ? null : "assign")} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {assignee ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><TeamBadge memberId={job.assignee} size="sm" />{assignee.name.split(" ")[0]}</span> : <span style={{ color: "rgba(255,255,255,.4)" }}>Unassigned</span>}
                <ChevronDown size={14} />
              </button>
              {dropdown === "assign" && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "rgba(20,18,30,.98)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, overflow: "hidden", zIndex: 10 }}>
                  <button onClick={() => handleAssign(null)} style={{ width: "100%", padding: "10px 14px", border: "none", background: !job.assignee ? "rgba(139,92,246,.15)" : "transparent", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", textAlign: "left" }}>Unassigned</button>
                  {TEAM.map(t => (
                    <button key={t.id} onClick={() => handleAssign(t.id)} style={{ width: "100%", padding: "10px 14px", border: "none", background: job.assignee === t.id ? "rgba(139,92,246,.15)" : "transparent", color: "white", fontSize: 12, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                      <TeamBadge memberId={t.id} size="sm" />{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 12, background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              <ExternalLink size={16} />View Posting
            </a>
            <button onClick={handleCoverLetter} disabled={!job.assignee || loading === "cover"} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(139,92,246,.3)", background: job.assignee ? "rgba(139,92,246,.1)" : "rgba(255,255,255,.02)", color: job.assignee ? "rgba(139,92,246,.9)" : "rgba(255,255,255,.25)", fontSize: 14, fontWeight: 600, cursor: job.assignee ? "pointer" : "not-allowed" }}>
              {loading === "cover" ? <><RefreshCw size={16} className="spin" />Generating...</> : <><FileText size={16} />Generate Cover Letter</>}
            </button>
            {!job.assignee && <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, textAlign: "center", margin: 0 }}>Assign to a team member first</p>}
          </div>
          
          {coverLetter && (
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "rgba(139,92,246,.8)", fontSize: 11, fontWeight: 600 }}>COVER LETTER</span>
                <button onClick={() => navigator.clipboard.writeText(coverLetter)} style={{ background: "rgba(139,92,246,.1)", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <Copy size={12} style={{ color: "#8B5CF6" }} /><span style={{ color: "#8B5CF6", fontSize: 10, fontWeight: 600 }}>Copy</span>
                </button>
              </div>
              <pre style={{ color: "rgba(255,255,255,.7)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>{coverLetter}</pre>
            </div>
          )}
          <div style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>Added {job.seeded_at} • {job.source}</div>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const go = async () => {
    setLoading(true);
    setError(null);
    try { const r = await signInGoogle(); onLogin(r.user); }
    catch (e) { console.error("Sign in error:", e); setError(e.message || "Sign in failed"); }
    setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG.pinkSmoke})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.3) saturate(.6)", animation: "kenBurns 30s ease-in-out infinite" }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: 24, maxWidth: 360 }}>
        <div style={{ marginBottom: 24 }}><ABAPresence state="idle" size={100} /></div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: "0 0 6px", background: "linear-gradient(135deg, #8B5CF6, #6366F1, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AWA</h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, margin: "0 0 8px" }}>Apply With ABA</p>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 32px" }}>Job pipeline for the team</p>
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: "16px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.25))", color: "white", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 4px 20px rgba(139,92,246,.2)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p style={{ color: "rgba(255,255,255,.15)", fontSize: 10, marginTop: 24 }}>v2.0.1</p>
      </div>
      <style>{`@keyframes kenBurns { 0%, 100% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.1) translate(-2%, -2%); } }`}</style>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [orbState, setOrbState] = useState("idle");

  const userId = useMemo(() => {
    if (!user?.email) return "guest";
    const email = user.email.toLowerCase();
    if (email.includes("brandon")) return "brandon";
    if (email.includes("eric")) return "eric";
    if (email.includes("bj") || email.includes("bryan")) return "bj";
    if (email.includes("cj")) return "cj";
    if (email.includes("vante")) return "vante";
    if (email.includes("dwayne")) return "dwayne";
    return "brandon";
  }, [user]);

  useEffect(() => { const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); }); return () => unsub(); }, []);
  useEffect(() => { if (user) loadJobs(); }, [user]);

  const loadJobs = async () => {
    setLoading(true);
    setOrbState("thinking");
    const data = await fetchJobs();
    setJobs(data);
    setLoading(false);
    setOrbState("idle");
  };

  const handleUpdate = async (jobId, updates) => {
    setOrbState("thinking");
    const success = await updateJob(jobId, updates);
    if (success) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
      setSelectedJob(prev => prev?.id === jobId ? { ...prev, ...updates } : prev);
      setToast({ message: "Updated", type: "success" });
    } else {
      setToast({ message: "Update failed", type: "error" });
    }
    setOrbState("idle");
    return success;
  };

  const handleQuickAction = async (job, action) => {
    if (action === "save") await handleUpdate(job.id, { saved: !job.saved });
    else if (action === "pass") await handleUpdate(job.id, { status: "passed" });
  };

  const handleGenerateCoverLetter = async (assigneeId, role, company) => {
    setOrbState("thinking");
    const result = await generateCoverLetter(assigneeId, role, company);
    setOrbState("idle");
    if (result?.content || result?.coverLetter || result?.cover_letter?.content) {
      setToast({ message: "Cover letter ready", type: "success" });
    } else {
      setToast({ message: "Generation failed", type: "error" });
    }
    return result;
  };

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !search || j.role.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, statusFilter]);

  if (authLoading) return <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d" }}><ABAPresence state="thinking" size={80} /></div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG.pinkSmoke})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.15) saturate(.5)", zIndex: 0 }} />
      <header style={{ position: "relative", zIndex: 10, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(10,8,20,.85)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ABAPresence state={orbState} size={36} />
          <div><h1 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>AWA</h1><p style={{ color: "rgba(255,255,255,.4)", fontSize: 10, margin: 0 }}>{jobs.length} jobs</p></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={loadJobs} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><RefreshCw size={14} style={{ color: "rgba(255,255,255,.5)" }} /></button>
          <button onClick={() => signOutUser()} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><LogOut size={14} style={{ color: "rgba(255,255,255,.5)" }} /></button>
          <div style={{ width: 28, height: 28, borderRadius: 99, overflow: "hidden", background: "rgba(139,92,246,.3)" }}>{user.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%" }} /> : <User size={14} style={{ color: "white" }} />}</div>
        </div>
      </header>
      <main style={{ position: "relative", zIndex: 5, flex: 1, overflow: "auto", padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: 6, padding: "8px 0", overflowX: "auto", marginBottom: 12 }}>
          <button onClick={() => setStatusFilter("all")} style={{ padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: statusFilter === "all" ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.05)", color: statusFilter === "all" ? "#8B5CF6" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>All {jobs.length}</button>
          {STATUSES.map(s => { const count = jobs.filter(j => j.status === s.id).length; if (count === 0) return null; return <button key={s.id} onClick={() => setStatusFilter(s.id)} style={{ padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: statusFilter === s.id ? `${s.color}22` : "rgba(255,255,255,.05)", color: statusFilter === s.id ? s.color : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{s.label} {count}</button>; })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, marginBottom: 12, border: "1px solid rgba(255,255,255,.05)" }}>
          <Search size={14} style={{ color: "rgba(255,255,255,.3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 13 }} />
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 40 }}><ABAPresence state="thinking" size={60} /></div> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)", fontSize: 13 }}>No jobs match filters</div> : <div>{filtered.map(job => <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onSelect={setSelectedJob} onQuickAction={handleQuickAction} />)}</div>}
      </main>
      {selectedJob && <JobDetail job={selectedJob} onClose={() => setSelectedJob(null)} onUpdate={handleUpdate} onGenerateCoverLetter={handleGenerateCoverLetter} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
