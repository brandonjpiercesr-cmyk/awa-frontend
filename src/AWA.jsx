// ⬡B:awa.genesis:APP:v3.0.0:20260301⬡
// AWA (Apply With ABA) — Job Application Pipeline
// ════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   - This file is SKIN. It has NO brain. ZERO hardcoded logic.
//   - ALL operations route through: USER → AWA → ABABASE → AIR → FCW (87 agents)
//   - Jobs, Cover Letters, Resumes, Interview Prep = ALL via AIR
// ROUTING: USER → AWA → ABABASE/api/air/process → FAT PROMPT → Response
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Briefcase, FileText, Send, Search, ChevronRight, ChevronDown, ChevronUp,
  User, Users, X, Check, Clock, Star, ExternalLink, RefreshCw,
  Copy, LogOut, MapPin, Building, Calendar, CheckCircle, AlertCircle,
  Sparkles, Target, Award, Bookmark, ThumbsDown, Eye, EyeOff, Edit3,
  FileEdit, UserCheck, MessageSquare, Mic, Save, Download, Plus
} from "lucide-react";
import { auth, signInGoogle, signOutUser } from "./firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { ABAPresence } from "./ABAPresence.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// ABABASE — ALL operations route through AIR. ZERO local logic.
// ═══════════════════════════════════════════════════════════════════════════
const ABABASE = "https://abacia-services.onrender.com";

function isOnline() { return navigator.onLine; }

async function airRequest(type, payload = {}, userId = "brandon", maxRetries = 3) {
  if (!isOnline()) return { response: null, offline: true };
  
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${ABABASE}/api/air/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payload.message || "",
          type,
          userId,
          channel: "awa",
          context: { ...payload, timestamp: Date.now() }
        })
      });
      if (!res.ok) throw new Error(`AIR ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return { response: null, error: true, errorMessage: lastError?.message };
}

// AWA Operations — ALL route through AIR
async function awaLoadJobs(userId) {
  return airRequest("awa_load_jobs", { message: "Load all AWA jobs for the team" }, userId);
}

async function awaUpdateJob(userId, jobId, updates) {
  return airRequest("awa_update_job", { jobId, updates, message: `Update job ${jobId}` }, userId);
}

async function awaGenerateCoverLetter(userId, job) {
  return airRequest("awa_cover_letter", { 
    job,
    message: `Generate cover letter for ${job.job_title} at ${job.organization}` 
  }, userId);
}

async function awaGenerateResume(userId, job) {
  return airRequest("awa_resume", { 
    job,
    message: `Generate tailored resume for ${job.job_title} at ${job.organization}` 
  }, userId);
}

async function awaInterviewPrep(userId, job) {
  return airRequest("awa_interview_prep", { 
    job,
    message: `Prepare interview questions and answers for ${job.job_title} at ${job.organization}` 
  }, userId);
}

async function awaChat(userId, job, message) {
  return airRequest("awa_chat", { 
    job,
    message 
  }, userId);
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUNDS (same as MyABA)
// ═══════════════════════════════════════════════════════════════════════════
const BG = "https://i.imgur.com/3RkebB2.jpeg"; // pinkSmoke

// Team config
const TEAM = {
  brandon: { name: "Brandon Pierce", initials: "BP", color: "#8B5CF6" },
  eric: { name: "Eric Lane", initials: "EL", color: "#6366F1" },
  bj: { name: "BJ Pierce", initials: "BJ", color: "#EC4899" },
  cj: { name: "CJ Moore", initials: "CJ", color: "#14B8A6" },
  vante: { name: "Vante", initials: "VT", color: "#F59E0B" },
  dwayne: { name: "Dwayne", initials: "DW", color: "#22C55E" },
  gmg: { name: "GMG", initials: "GMG", color: "#9333EA" }
};

const TABS = [
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "cover", label: "Cover Letter", icon: FileText },
  { id: "resume", label: "Resume", icon: FileEdit },
  { id: "prep", label: "Interview Prep", icon: MessageSquare },
  { id: "chat", label: "Chat with ABA", icon: Mic }
];

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

function TeamBadge({ id, size = "sm" }) {
  const t = TEAM[id];
  if (!t) return null;
  const s = size === "sm" ? 24 : 32;
  return (
    <div style={{
      width: s, height: s, borderRadius: 8,
      background: `linear-gradient(135deg, ${t.color}, ${t.color}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size === "sm" ? 8 : 10, fontWeight: 700, color: "white"
    }}>{t.initials}</div>
  );
}

function AssigneeBadges({ assignees }) {
  if (!assignees || assignees.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {assignees.map(a => <TeamBadge key={a} id={a} size="sm" />)}
    </div>
  );
}

function JobCard({ job, onSelect, selected }) {
  return (
    <div onClick={() => onSelect(job)} style={{
      background: selected ? "rgba(139,92,246,.15)" : "rgba(255,255,255,.03)",
      border: `1px solid ${selected ? "rgba(139,92,246,.3)" : "rgba(255,255,255,.05)"}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer", transition: "all .15s"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            color: "rgba(255,255,255,.9)", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
          }}>{job.job_title}</h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ color: "rgba(255,255,255,.5)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              <Building size={10} />{job.organization}
            </span>
            {job.salary && (
              <span style={{ color: "rgba(139,92,246,.7)", fontSize: 10, fontWeight: 600 }}>
                {job.salary}
              </span>
            )}
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <AssigneeBadges assignees={job.assignees} />
            <span style={{
              padding: "3px 8px", borderRadius: 6, fontSize: 9, fontWeight: 600,
              background: job.status === "LIVE" ? "rgba(34,197,94,.2)" : "rgba(107,114,128,.2)",
              color: job.status === "LIVE" ? "#22C55E" : "#6B7280"
            }}>{job.status}</span>
            {job.cover_letter && <FileText size={12} style={{ color: "rgba(139,92,246,.5)" }} />}
            {job.resume_version && <FileEdit size={12} style={{ color: "rgba(99,102,241,.5)" }} />}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,.2)", flexShrink: 0 }} />
      </div>
    </div>
  );
}

function LiveEditor({ content, onChange, onSave, saving, title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ color: "white", fontSize: 14, fontWeight: 600, margin: 0 }}>{title}</h3>
        <button onClick={onSave} disabled={saving} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
          background: "rgba(139,92,246,.2)", border: "none", cursor: "pointer",
          color: "#8B5CF6", fontSize: 12, fontWeight: 600
        }}>
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, width: "100%", padding: 16, borderRadius: 12,
          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
          color: "rgba(255,255,255,.85)", fontSize: 13, lineHeight: 1.7,
          resize: "none", outline: "none", fontFamily: "inherit"
        }}
      />
    </div>
  );
}

function JobWorkspace({ job, userId, onUpdate, orbState, setOrbState }) {
  const [activeTab, setActiveTab] = useState("jobs");
  const [coverLetter, setCoverLetter] = useState(job.cover_letter || "");
  const [resume, setResume] = useState(job.resume_version || "");
  const [interviewPrep, setInterviewPrep] = useState(job.interview_prep || "");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [generating, setGenerating] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const handleGenerate = async (type) => {
    setGenerating(type);
    setOrbState("thinking");
    
    let result;
    if (type === "cover") {
      result = await awaGenerateCoverLetter(userId, job);
      if (result.response) setCoverLetter(result.response);
    } else if (type === "resume") {
      result = await awaGenerateResume(userId, job);
      if (result.response) setResume(result.response);
    } else if (type === "prep") {
      result = await awaInterviewPrep(userId, job);
      if (result.response) setInterviewPrep(result.response);
    }
    
    setGenerating(null);
    setOrbState("idle");
  };
  
  const handleSave = async (type, content) => {
    setSaving(true);
    setOrbState("thinking");
    
    const updates = {};
    if (type === "cover") updates.cover_letter = content;
    if (type === "resume") updates.resume_version = content;
    if (type === "prep") updates.interview_prep = content;
    
    await onUpdate(job.id, updates);
    setSaving(false);
    setOrbState("idle");
  };
  
  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setOrbState("thinking");
    
    const result = await awaChat(userId, job, chatInput);
    
    if (result.response) {
      setChatMessages(prev => [...prev, { role: "assistant", content: result.response }]);
    }
    setOrbState("idle");
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Job Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <h2 style={{ color: "white", fontSize: 18, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.3 }}>
          {job.job_title}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13 }}>{job.organization}</span>
          <span style={{ color: "rgba(139,92,246,.7)", fontSize: 12, fontWeight: 600 }}>{job.salary}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <AssigneeBadges assignees={job.assignees} />
          <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6,
            background: "rgba(139,92,246,.15)", color: "#8B5CF6", fontSize: 11, fontWeight: 600, textDecoration: "none"
          }}>
            <ExternalLink size={12} />View Posting
          </a>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", overflowX: "auto" }}>
        {TABS.slice(1).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              background: active ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.03)",
              border: "none", cursor: "pointer",
              color: active ? "#8B5CF6" : "rgba(255,255,255,.5)",
              fontSize: 12, fontWeight: 600, flexShrink: 0
            }}>
              <Icon size={14} />{tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {activeTab === "cover" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {!coverLetter ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <FileText size={48} style={{ color: "rgba(139,92,246,.3)", marginBottom: 16 }} />
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 16 }}>
                  No cover letter yet. Generate one with ABA.
                </p>
                <button onClick={() => handleGenerate("cover")} disabled={generating === "cover"} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))",
                  border: "none", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 600, margin: "0 auto"
                }}>
                  {generating === "cover" ? <><RefreshCw size={16} className="spin" />Generating...</> : <><Sparkles size={16} />Generate Cover Letter</>}
                </button>
              </div>
            ) : (
              <LiveEditor
                content={coverLetter}
                onChange={setCoverLetter}
                onSave={() => handleSave("cover", coverLetter)}
                saving={saving}
                title="Cover Letter"
              />
            )}
          </div>
        )}
        
        {activeTab === "resume" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {!resume ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <FileEdit size={48} style={{ color: "rgba(99,102,241,.3)", marginBottom: 16 }} />
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 16 }}>
                  Generate a tailored resume for this role.
                </p>
                <button onClick={() => handleGenerate("resume")} disabled={generating === "resume"} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(99,102,241,.4), rgba(139,92,246,.3))",
                  border: "none", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 600, margin: "0 auto"
                }}>
                  {generating === "resume" ? <><RefreshCw size={16} className="spin" />Generating...</> : <><Sparkles size={16} />Generate Resume</>}
                </button>
              </div>
            ) : (
              <LiveEditor
                content={resume}
                onChange={setResume}
                onSave={() => handleSave("resume", resume)}
                saving={saving}
                title="Tailored Resume"
              />
            )}
          </div>
        )}
        
        {activeTab === "prep" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {!interviewPrep ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <MessageSquare size={48} style={{ color: "rgba(245,158,11,.3)", marginBottom: 16 }} />
                <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 16 }}>
                  Prepare for your interview with AI-generated Q&A.
                </p>
                <button onClick={() => handleGenerate("prep")} disabled={generating === "prep"} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(245,158,11,.4), rgba(234,179,8,.3))",
                  border: "none", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 600, margin: "0 auto"
                }}>
                  {generating === "prep" ? <><RefreshCw size={16} className="spin" />Generating...</> : <><Sparkles size={16} />Generate Interview Prep</>}
                </button>
              </div>
            ) : (
              <LiveEditor
                content={interviewPrep}
                onChange={setInterviewPrep}
                onSave={() => handleSave("prep", interviewPrep)}
                saving={saving}
                title="Interview Prep"
              />
            )}
          </div>
        )}
        
        {activeTab === "chat" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto", marginBottom: 12 }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <ABAPresence state="idle" size={60} />
                  <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginTop: 16 }}>
                    Ask ABA anything about this job, organization, or how to prepare.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: "12px 16px", marginBottom: 8, borderRadius: 12,
                    background: msg.role === "user" ? "rgba(139,92,246,.15)" : "rgba(255,255,255,.03)",
                    marginLeft: msg.role === "user" ? "20%" : 0,
                    marginRight: msg.role === "assistant" ? "20%" : 0
                  }}>
                    <p style={{ color: "rgba(255,255,255,.8)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleChat()}
                placeholder="Ask about this job..."
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
                  color: "white", fontSize: 14, outline: "none"
                }}
              />
              <button onClick={handleChat} style={{
                padding: "12px 16px", borderRadius: 12,
                background: "linear-gradient(135deg, rgba(139,92,246,.4), rgba(99,102,241,.3))",
                border: "none", cursor: "pointer"
              }}>
                <Send size={18} style={{ color: "white" }} />
              </button>
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
    setError(null);
    try { const r = await signInGoogle(); onLogin(r.user); }
    catch (e) { setError(e.message || "Sign in failed"); }
    setLoading(false);
  };
  
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.3) saturate(.6)", animation: "kenBurns 30s ease-in-out infinite" }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: 24, maxWidth: 360 }}>
        <div style={{ marginBottom: 24 }}><ABAPresence state="idle" size={100} /></div>
        <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: "0 0 6px", background: "linear-gradient(135deg, #8B5CF6, #6366F1, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AWA</h1>
        <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, margin: "0 0 8px" }}>Apply With ABA</p>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12, margin: "0 0 32px" }}>143 Jobs • Cover Letters • Resumes • Interview Prep</p>
        <button onClick={go} disabled={loading} style={{ width: "100%", padding: "16px 24px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg, rgba(139,92,246,.3), rgba(99,102,241,.25))", color: "white", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 4px 20px rgba(139,92,246,.2)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
        {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 12 }}>{error}</p>}
        <p style={{ color: "rgba(255,255,255,.15)", fontSize: 10, marginTop: 24 }}>v3.0.0</p>
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
  
  useEffect(() => { if (user) loadJobs(); }, [user]);

  const loadJobs = async () => {
    setLoading(true);
    setOrbState("thinking");
    
    // Route through AIR - it will load from brain
    const result = await awaLoadJobs(userId);
    
    // AIR should return jobs from aba_memory where memory_type=awa_job
    // For now, also try direct load as fallback
    if (result.jobs) {
      setJobs(result.jobs);
    } else {
      // Fallback: direct Supabase (temporary until AIR handler is built)
      try {
        const res = await fetch(
          "https://htlxjkbrstpwwtzsbyvb.supabase.co/rest/v1/aba_memory?memory_type=eq.awa_job&order=created_at.desc",
          { headers: { 
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI4MjEsImV4cCI6MjA4NjEwODgyMX0.MOgNYkezWpgxTO3ZHd0omZ0WLJOOR-tL7hONXWG9eBw"
          }}
        );
        const data = await res.json();
        const parsed = data.map(item => {
          const content = typeof item.content === "string" ? JSON.parse(item.content) : item.content;
          return { id: item.id, ...content };
        });
        setJobs(parsed);
      } catch (e) {
        console.error("Load jobs error:", e);
      }
    }
    
    setLoading(false);
    setOrbState("idle");
  };

  const handleUpdate = async (jobId, updates) => {
    setOrbState("thinking");
    const result = await awaUpdateJob(userId, jobId, updates);
    
    // Update local state
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updates } : j));
    setSelectedJob(prev => prev?.id === jobId ? { ...prev, ...updates } : prev);
    
    setToast({ message: "Saved", type: "success" });
    setOrbState("idle");
    return result;
  };

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const matchSearch = !search || 
        j.job_title?.toLowerCase().includes(search.toLowerCase()) || 
        j.organization?.toLowerCase().includes(search.toLowerCase());
      const matchAssignee = assigneeFilter === "all" || j.assignees?.includes(assigneeFilter);
      return matchSearch && matchAssignee;
    });
  }, [jobs, search, assigneeFilter]);

  const assigneeCounts = useMemo(() => {
    const counts = { all: jobs.length };
    jobs.forEach(j => {
      j.assignees?.forEach(a => {
        counts[a] = (counts[a] || 0) + 1;
      });
    });
    return counts;
  }, [jobs]);

  if (authLoading) return <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#08080d" }}><ABAPresence state="thinking" size={80} /></div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#08080d", fontFamily: "'SF Pro Display', -apple-system, sans-serif", display: "flex" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(.12) saturate(.4)", zIndex: 0 }} />
      
      {/* Left Panel - Job List */}
      <div style={{ position: "relative", zIndex: 10, width: selectedJob ? "35%" : "100%", minWidth: 320, maxWidth: selectedJob ? 400 : "100%", borderRight: selectedJob ? "1px solid rgba(255,255,255,.05)" : "none", display: "flex", flexDirection: "column", background: "rgba(10,8,20,.7)", backdropFilter: "blur(16px)" }}>
        
        {/* Header */}
        <header style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ABAPresence state={orbState} size={36} />
            <div>
              <h1 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>AWA</h1>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 10, margin: 0 }}>{jobs.length} jobs</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={loadJobs} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
              <RefreshCw size={14} style={{ color: "rgba(255,255,255,.5)" }} />
            </button>
            <button onClick={() => signOutUser()} style={{ background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
              <LogOut size={14} style={{ color: "rgba(255,255,255,.5)" }} />
            </button>
          </div>
        </header>
        
        {/* Filters */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
            <button onClick={() => setAssigneeFilter("all")} style={{
              padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer", flexShrink: 0,
              background: assigneeFilter === "all" ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.05)",
              color: assigneeFilter === "all" ? "#8B5CF6" : "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600
            }}>All {assigneeCounts.all}</button>
            {Object.keys(TEAM).map(id => {
              const count = assigneeCounts[id] || 0;
              if (count === 0) return null;
              return (
                <button key={id} onClick={() => setAssigneeFilter(id)} style={{
                  padding: "6px 12px", borderRadius: 16, border: "none", cursor: "pointer", flexShrink: 0,
                  background: assigneeFilter === id ? `${TEAM[id].color}33` : "rgba(255,255,255,.05)",
                  color: assigneeFilter === id ? TEAM[id].color : "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600
                }}>{TEAM[id].initials} {count}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.05)" }}>
            <Search size={14} style={{ color: "rgba(255,255,255,.3)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: 13 }} />
          </div>
        </div>
        
        {/* Job List */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}><ABAPresence state="thinking" size={60} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)", fontSize: 13 }}>No jobs match filters</div>
          ) : (
            filtered.map(job => (
              <JobCard key={job.id} job={job} selected={selectedJob?.id === job.id} onSelect={setSelectedJob} />
            ))
          )}
        </div>
      </div>
      
      {/* Right Panel - Job Workspace */}
      {selectedJob && (
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", background: "rgba(12,10,20,.9)", backdropFilter: "blur(16px)" }}>
          <button onClick={() => setSelectedJob(null)} style={{
            position: "absolute", top: 16, right: 16, zIndex: 20,
            background: "rgba(255,255,255,.05)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer"
          }}>
            <X size={18} style={{ color: "rgba(255,255,255,.5)" }} />
          </button>
          <JobWorkspace 
            job={selectedJob} 
            userId={userId} 
            onUpdate={handleUpdate}
            orbState={orbState}
            setOrbState={setOrbState}
          />
        </div>
      )}
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
