// ⬡B:awa.genesis:APP:v3.2.0:20260301⬡
// AWA (Apply With ABA) — Job Application Pipeline
// ════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   - This file is SKIN. It has NO brain. ZERO hardcoded logic.
//   - Jobs/CRUD → aba-reach.onrender.com/api/awa/* (JOBA agent)
//   - AI Chat → abacia-services.onrender.com/api/air/process (FCW, 87 agents)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Briefcase, FileText, Send, Search, ChevronRight, ChevronDown,
  User, Users, X, Check, Clock, Star, ExternalLink, RefreshCw,
  Copy, LogOut, MapPin, Building, Calendar, CheckCircle, AlertCircle,
  Sparkles, Target, Award, Bookmark, ThumbsDown, Edit3, Save, Download
} from "lucide-react";
import { auth, signInGoogle, signOutUser } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { ABAPresence } from "./ABAPresence.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS - AWA uses REACH for jobs/JOBA, ABABASE for FCW/AI
// ═══════════════════════════════════════════════════════════════════════════
const REACH = "https://aba-reach.onrender.com";
const ABABASE = "https://abacia-services.onrender.com";

// Jobs - REACH (JOBA agent)
async function loadJobs(assignee) {
  const url = assignee ? `${REACH}/api/awa/jobs?assignee=${assignee}` : `${REACH}/api/awa/jobs`;
  const res = await fetch(url);
  const data = await res.json();
  return data.jobs || [];
}

async function updateJob(jobId, updates) {
  const res = await fetch(`${REACH}/api/awa/jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  return res.ok;
}

// Cover Letters - REACH (JOBA agent with team profiles)
async function generateCoverLetter(userId, jobTitle, company) {
  const res = await fetch(`${REACH}/api/awa/cover-letters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, job_title: jobTitle, company_name: company })
  });
  const data = await res.json();
  return data.content || data.cover_letter?.content || null;
}

// Resume - REACH (JOBA agent)
async function generateResume(userId, targetRole) {
  const res = await fetch(`${REACH}/api/awa/resumes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, target_role: targetRole })
  });
  const data = await res.json();
  return data.content || data.resume?.content || null;
}

// AI Chat - ABABASE (FCW with 87 agents)
async function airChat(userId, message, jobContext) {
  const res = await fetch(`${ABABASE}/api/air/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `[AWA Context: Job "${jobContext.job_title}" at ${jobContext.organization}] ${message}`,
      userId,
      channel: "awa"
    })
  });
  const data = await res.json();
  return data.response || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const BG = "https://i.imgur.com/3RkebB2.jpeg";

const TEAM = {
  brandon: { name: "Brandon Pierce", initials: "BP", color: "#8B5CF6" },
  eric: { name: "Eric Lane", initials: "EL", color: "#6366F1" },
  bj: { name: "BJ Pierce", initials: "BJ", color: "#EC4899" },
  cj: { name: "CJ Moore", initials: "CJ", color: "#14B8A6" },
  vante: { name: "Vante", initials: "VT", color: "#F59E0B" },
  dwayne: { name: "Dwayne", initials: "DW", color: "#22C55E" },
  gmg: { name: "GMG", initials: "GMG", color: "#9333EA" }
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ message, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const colors = { error: "#EF4444", success: "#22C55E", warning: "#F59E0B", info: "#8B5CF6" };
  return <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", padding: "12px 20px", borderRadius: 12, background: colors[type], color: "white", fontSize: 13, fontWeight: 600, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>{message}</div>;
}

function TeamBadge({ id, size = "sm" }) {
  const t = TEAM[id];
  if (!t) return null;
  const s = size === "sm" ? 24 : 32;
  return <div style={{ width: s, height: s, borderRadius: 8, background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size === "sm" ? 8 : 10, fontWeight: 700, color: "white" }}>{t.initials}</div>;
}

function JobCard({ job, onSelect, selected }) {
  return (
    <div onClick={() => onSelect(job)} style={{ background: selected ? "rgba(139,92,246,.15)" : "rgba(255,255,255,.03)", border: `1px solid ${selected ? "rgba(139,92,246,.3)" : "rgba(255,255,255,.05)"}`, borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all .15s" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ color: "rgba(255,255,255,.9)", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{job.job_title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}><Building size={10} />{job.organization}</span>
            {job.salary && <span style={{ color: "rgba(139,92,246,.7)", fontSize: 10, fontWeight: 600 }}>{job.salary}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            {job.assignees?.map(a => <TeamBadge key={a} id={a} size="sm" />)}
            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 600, background: job.status === "LIVE" ? "rgba(34,197,94,.2)" : "rgba(107,114,128,.2)", color: job.status === "LIVE" ? "#22C55E" : "#6B7280" }}>{job.status}</span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,.2)", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function LiveEditor({ content, onChange, onSave, saving, title, onGenerate, generating }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ color: "white", fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {!content && onGenerate && (
            <button onClick={onGenerate} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.2))", border: "none", cursor: "pointer", color: "#8B5CF6", fontSize: 12, fontWeight: 600 }}>
              {generating ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} />}{generating ? "Generating..." : "Generate"}
            </button>
          )}
          {content && (
            <>
              <button onClick={() => navigator.clipboard.writeText(content)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: "none", cursor: "pointer", color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: 600 }}><Copy size={14} />Copy</button>
              <button onClick={onSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(139,92,246,.2)", border: "none", cursor: "pointer", color: "#8B5CF6", fontSize: 12, fontWeight: 600 }}>{saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}{saving ? "Saving..." : "Save"}</button>
            </>
          )}
        </div>
      </div>
      {content ? (
        <textarea value={content} onChange={e => onChange(e.target.value)} style={{ flex: 1, width: "100%", padding: 16, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.85)", fontSize: 13, lineHeight: 1.7, resize: "none", outline: "none", fontFamily: "inherit" }} />
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Click "Generate" to create {title.toLowerCase()}</div>
      )}
    </div>
  );
}

function JobWorkspace({ job, userId, onUpdate, setOrbState }) {
  const [tab, setTab] = useState("cover");
  const [coverLetter, setCoverLetter] = useState(job.cover_letter || "");
  const [resume, setResume] = useState(job.resume_version || "");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [generating, setGenerating] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async (type) => {
    setGenerating(type);
    setOrbState("thinking");
    if (type === "cover") {
      const content = await generateCoverLetter(userId, job.job_title, job.organization);
      if (content) setCoverLetter(content);
    } else if (type === "resume") {
      const content = await generateResume(userId, job.job_title);
      if (content) setResume(content);
    }
    setGenerating(null);
    setOrbState("idle");
  };

  const handleSave = async (type) => {
    setSaving(true);
    setOrbState("thinking");
    const updates = type === "cover" ? { cover_letter: coverLetter } : { resume_version: resume };
    await onUpdate(job.id, updates);
    setSaving(false);
    setOrbState("idle");
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: "user", content: chatInput }]);
    const msg = chatInput;
    setChatInput("");
    setOrbState("thinking");
    const response = await airChat(userId, msg, job);
    if (response) setChatMessages(prev => [...prev, { role: "assistant", content: response }]);
    setOrbState("idle");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>{job.job_title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13 }}>{job.organization}</span>
          <span style={{ color: "rgba(139,92,246,.7)", fontSize: 12, fontWeight: 600 }}>{job.salary}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          {job.assignees?.map(a => <TeamBadge key={a} id={a} />)}
          <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, background: "rgba(139,92,246,.15)", color: "#8B5CF6", fontSize: 11, fontWeight: 600, textDecoration: "none" }}><ExternalLink size={12} />View Posting</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        {["cover", "resume", "chat"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "8px 14px", borderRadius: 8, background: tab === t ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.03)", border: "none", cursor: "pointer", color: tab === t ? "#8B5CF6" : "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{t === "cover" ? "Cover Letter" : t === "resume" ? "Resume" : "Chat with ABA"}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {tab === "cover" && <LiveEditor content={coverLetter} onChange={setCoverLetter} onSave={() => handleSave("cover")} saving={saving} title="Cover Letter" onGenerate={() => handleGenerate("cover")} generating={generating === "cover"} />}
        {tab === "resume" && <LiveEditor content={resume} onChange={setResume} onSave={() => handleSave("resume")} saving={saving} title="Resume" onGenerate={() => handleGenerate("resume")} generating={generating === "resume"} />}
        {tab === "chat" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto", marginBottom: 12 }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}><ABAPresence state="idle" size={60} /><p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginTop: 16 }}>Ask ABA about this job, interview prep, or anything else.</p></div>
              ) : chatMessages.map((m, i) => (
                <div key={i} style={{ padding: "12px 16px", marginBottom: 8, borderRadius: 12, background: m.role === "user" ? "rgba(139,92,246,.15)" : "rgba(255,255,255,.03)", marginLeft: m.role === "user" ? "20%" : 0, marginRight: m.role === "assistant" ? "20%" : 0 }}><p style={{ color: "rgba(255,255,255,.8)", fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p></div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()} placeholder="Ask about this job..." style={{ flex: 1, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", color: "white", fontSize: 14, outline: "none" }} />
              <button onClick={handleChat} style={{ padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))", border: "none", cursor: "pointer" }}><Send size={18} style={{ color: "white" }} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const go = async () => {
    setLoading(true);
    try { const r = await signInGoogle(); onLogin(r.user); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.3) saturate(.6)", animation: "kenBurns 30s ease-in-out infinite" }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: 24, maxWidth: 360 }}>
        <div style={{ marginBottom: 24 }}><ABAPresence state="idle" size={100} /></div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: "0 0 6px", background: "linear-gradient(135deg, #8B5CF6, #6366F1, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AWA</h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, margin: "0 0 8px" }}>Apply With ABA</p>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 32px" }}>143 Jobs • Cover Letters • Resumes • AI Chat</p>
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: "16px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.25))", color: "white", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 4px 20px rgba(139,92,246,.2)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p style={{ color: "rgba(255,255,255,.15)", fontSize: 10, marginTop: 24 }}>v3.2.0</p>
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
  const [assigneeFilter, setAssigneeFilter] = useState("all");
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
  useEffect(() => { if (user) fetchJobs(); }, [user]);

  const fetchJobs = async () => {
    setLoading(true);
    setOrbState("thinking");
    const data = await loadJobs();
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
      setToast({ message: "Saved", type: "success" });
    } else {
      setToast({ message: "Save failed", type: "error" });
    }
    setOrbState("idle");
  };

  const filtered = useMemo(() => jobs.filter(j => {
    const matchSearch = !search || j.job_title?.toLowerCase().includes(search.toLowerCase()) || j.organization?.toLowerCase().includes(search.toLowerCase());
    const matchAssignee = assigneeFilter === "all" || j.assignees?.includes(assigneeFilter);
    return matchSearch && matchAssignee;
  }), [jobs, search, assigneeFilter]);

  const counts = useMemo(() => {
    const c = { all: jobs.length };
    jobs.forEach(j => j.assignees?.forEach(a => { c[a] = (c[a] || 0) + 1; }));
    return c;
  }, [jobs]);

  if (authLoading) return <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d" }}><ABAPresence state="thinking" size={80} /></div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif", display: "flex" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.12) saturate(.4)", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 10, width: selectedJob ? "35%" : "100%", minWidth: 320, maxWidth: selectedJob ? 400 : "100%", borderRight: selectedJob ? "1px solid rgba(255,255,255,.05)" : "none", display: "flex", flexDirection: "column", background: "rgba(10,8,20,.7)", backdropFilter: "blur(16px)" }}>
        <header style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><ABAPresence state={orbState} size={36} /><div><h1 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>AWA</h1><p style={{ color: "rgba(255,255,255,.4)", fontSize: 10, margin: 0 }}>{jobs.length} jobs</p></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={fetchJobs} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><RefreshCw size={14} style={{ color: "rgba(255,255,255,.5)" }} /></button>
            <button onClick={() => signOutUser()} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><LogOut size={14} style={{ color: "rgba(255,255,255,.5)" }} /></button>
          </div>
        </header>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
            <button onClick={() => setAssigneeFilter("all")} style={{ padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer", flexShrink: 0, background: assigneeFilter === "all" ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.05)", color: assigneeFilter === "all" ? "#8B5CF6" : "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600 }}>All {counts.all}</button>
            {Object.keys(TEAM).map(id => counts[id] ? <button key={id} onClick={() => setAssigneeFilter(id)} style={{ padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer", flexShrink: 0, background: assigneeFilter === id ? `${TEAM[id].color}33` : "rgba(255,255,255,.05)", color: assigneeFilter === id ? TEAM[id].color : "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600 }}>{TEAM[id].initials} {counts[id]}</button> : null)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.05)" }}><Search size={14} style={{ color: "rgba(255,255,255,.3)" }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 13 }} /></div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {loading ? <div style={{ textAlign: "center", padding: 40 }}><ABAPresence state="thinking" size={60} /></div> : filtered.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)", fontSize: 13 }}>No jobs match</div> : filtered.map(job => <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onSelect={setSelectedJob} />)}
        </div>
      </div>
      {selectedJob && (
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", background: "rgba(12,10,20,.9)", backdropFilter: "blur(16px)" }}>
          <button onClick={() => setSelectedJob(null)} style={{ position: "absolute", top: 16, right: 16, zIndex: 20, background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}><X size={18} style={{ color: "rgba(255,255,255,.5)" }} /></button>
          <JobWorkspace job={selectedJob} userId={userId} onUpdate={handleUpdate} setOrbState={setOrbState} />
        </div>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
