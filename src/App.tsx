import React, { useState, useEffect } from "react";
import { 
  Vote, 
  Lock, 
  Unlock, 
  Settings, 
  Trophy, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  X, 
  Check, 
  Plus, 
  Trash2, 
  Calendar,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Interfaces
interface PublicState {
  votingConcluded: boolean;
  votingEndTime: string | null;
  options: Array<{
    id: string;
    title: string;
    author: string;
    abstract: string;
    votes: number | null; // Always null for voters in public route
  }>;
  totalVotersCount: number;
  totalVotesCast: number;
  votersList: Array<{
    email: string;
    hasVoted: boolean;
    votedAt: string | null;
  }>;
}

interface AdminState {
  settings: {
    votingConcluded: boolean;
    votingEndTime: string | null;
    adminPin: string;
  };
  voters: Array<{
    email: string;
    pin: string | null;
    hasVoted: boolean;
    votedAt: string | null;
  }>;
  options: Array<{
    id: string;
    title: string;
    author: string;
    abstract: string;
    votes: number; // Disclosed ONLY to admins
  }>;
  votes: Array<{
    voterEmail: string;
    optionId: string;
    timestamp: string;
  }>;
}

export default function App() {
  // --- Public / Voter State ---
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Voter Session State ---
  const [emailInput, setEmailInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [voterStep, setVoterStep] = useState<"enter-email" | "enter-pin" | "setup-pin" | "voting" | "thank-you">("enter-email");
  const [tempVoterEmail, setTempVoterEmail] = useState("");
  const [voterMessage, setVoterMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedPosterId, setSelectedPosterId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);

  // --- Admin Modal State ---
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminState, setAdminState] = useState<AdminState | null>(null);
  const [adminIsLoading, setAdminIsLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<"results" | "whitelist" | "posters" | "settings">("results");

  // --- Editing Buffers (Admin) ---
  const [editOptions, setEditOptions] = useState<any[]>([]);
  const [newVoterEmailList, setNewVoterEmailList] = useState("");
  const [adminEndTimeString, setAdminEndTimeString] = useState("");
  const [adminNewPin, setAdminNewPin] = useState("");
  const [adminSaveMessage, setAdminSaveMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // --- Timers & UI States ---
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [expandedPosterId, setExpandedPosterId] = useState<string | null>("1");

  // Fetch Public State
  const fetchPublicState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to load voting status");
      const data = await res.json();
      setPublicState(data);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Connection failure to the corporate backend");
    }
  };

  // Poll State every 4 seconds for turnout metrics
  useEffect(() => {
    fetchPublicState();
    const interval = setInterval(fetchPublicState, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync Countdown Clock
  useEffect(() => {
    if (!publicState?.votingEndTime) {
      setTimeLeft("");
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(publicState.votingEndTime!).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Voting concluded");
        clearInterval(timer);
        fetchPublicState();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        let display = "";
        if (hours > 0) display += `${hours}h `;
        display += `${minutes}m ${seconds}s`;
        setTimeLeft(display);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [publicState?.votingEndTime]);

  // Restore local session to persist login status on refresh
  useEffect(() => {
    const savedEmail = localStorage.getItem("voter_email");
    const savedPin = localStorage.getItem("voter_pin");

    if (savedEmail && savedPin) {
      fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: savedEmail })
      })
      .then(res => res.json())
      .then(data => {
        if (data.isWhitelisted) {
          setTempVoterEmail(savedEmail);
          setPinInput(savedPin);
          if (data.hasVoted) {
            setVoterStep("thank-you");
          } else {
            setVoterStep("voting");
          }
        }
      })
      .catch((e) => console.error("Error restoring session:", e));
    }
  }, []);

  // Voter check email
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);
    setVoterMessage(null);

    const email = emailInput.trim();
    if (!email) {
      setVoterMessage({ text: "Please enter your email", type: "error" });
      setCheckingEmail(false);
      return;
    }

    try {
      const res = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (!res.ok) throw new Error("Could not check email registry");
      const data = await res.json();

      if (!data.isWhitelisted) {
        setVoterMessage({
          text: `The address "${email}" is not whitelisted for the Poster Prize. Please check for spelling mistakes or consult organizers.`,
          type: "error"
        });
        setCheckingEmail(false);
        return;
      }

      setTempVoterEmail(email);

      if (data.hasVoted) {
        // Direct to PIN entry so they can authenticate and review their Receipt status
        setVoterStep("enter-pin");
        setVoterMessage({ text: "Account has already cast a ballot. Verify PIN to view receipt.", type: "success" });
      } else if (data.needsPinSetup) {
        setVoterStep("setup-pin");
      } else {
        setVoterStep("enter-pin");
      }
    } catch (err: any) {
      setVoterMessage({ text: err.message || "Failed to talk to system database", type: "error" });
    } finally {
      setCheckingEmail(false);
    }
  };

  // Setup PIN and Login
  const handleVoterAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);
    setVoterMessage(null);

    const pin = pinInput.trim();
    if (pin.length < 4) {
      setVoterMessage({ text: "PIN passcode must consist of 4 or more digits", type: "error" });
      setCheckingEmail(false);
      return;
    }

    try {
      const res = await fetch("/api/voter-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempVoterEmail, pin })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication verification failed");
      }

      // Store credentials locally
      localStorage.setItem("voter_email", tempVoterEmail);
      localStorage.setItem("voter_pin", pin);

      // Verify vote status
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempVoterEmail })
      });
      const checkData = await checkRes.json();

      if (checkData.hasVoted) {
        setVoterStep("thank-you");
      } else {
        setVoterStep("voting");
      }
    } catch (err: any) {
      setVoterMessage({ text: err.message || "Passcode verification rejected", type: "error" });
    } finally {
      setCheckingEmail(false);
    }
  };

  // Cast vote
  const handleCastVote = async () => {
    if (!selectedPosterId) {
      alert("Please select one of the poster options first!");
      return;
    }

    setSubmittingVote(true);
    try {
      const pin = localStorage.getItem("voter_pin") || pinInput;
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tempVoterEmail,
          pin,
          optionId: selectedPosterId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit ballot");
      }

      setVoterStep("thank-you");
      fetchPublicState();
    } catch (err: any) {
      alert(err.message || "An exception occurred while submitting your choice");
    } finally {
      setSubmittingVote(false);
    }
  };

  // Voter Sign Out
  const handleVoterLogout = () => {
    localStorage.removeItem("voter_email");
    localStorage.removeItem("voter_pin");
    setEmailInput("");
    setPinInput("");
    setTempVoterEmail("");
    setSelectedPosterId(null);
    setVoterMessage(null);
    setVoterStep("enter-email");
  };

  // Admin login credentials check
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: adminPinInput })
      });

      if (!res.ok) {
        throw new Error("Incorrect Administrative Security PIN");
      }

      setAdminAuthenticated(true);
      fetchAdminState(adminPinInput);
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Get Admin state payload
  const fetchAdminState = async (pin: string) => {
    setAdminIsLoading(true);
    try {
      const res = await fetch("/api/admin/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: pin })
      });

      if (!res.ok) throw new Error("Failed to load admin parameters");
      const data = (await res.json()) as AdminState;
      setAdminState(data);
      
      // Seed buffers
      setEditOptions(data.options);
      setNewVoterEmailList(data.voters.map(v => v.email).join("\n"));
      setAdminEndTimeString(
        data.settings.votingEndTime 
          ? new Date(data.settings.votingEndTime).toISOString().slice(0, 16) 
          : ""
      );
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminIsLoading(false);
    }
  };

  // Admin save changes
  const handleSaveAdminSettings = async () => {
    if (!adminState) return;
    setAdminSaveMessage(null);

    try {
      const timeParsed = adminEndTimeString ? new Date(adminEndTimeString).toISOString() : null;
      
      // 1. Update Core settings
      const res1 = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: adminPinInput,
          votingConcluded: adminState.settings.votingConcluded,
          votingEndTime: timeParsed,
          newAdminPin: adminNewPin.trim() || undefined
        })
      });

      if (!res1.ok) throw new Error("Could not update core parameters");

      // 2. Update Poster Details (Options)
      const res2 = await fetch("/api/admin/update-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: adminPinInput,
          options: editOptions
        })
      });

      if (!res2.ok) throw new Error("Could not update poster details");

      // 3. Update Whitelist Emails
      const emailsArray = newVoterEmailList
        .split("\n")
        .map(l => l.trim().toLowerCase())
        .filter(Boolean);

      const res3 = await fetch("/api/admin/update-whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: adminPinInput,
          emails: emailsArray
        })
      });

      if (!res3.ok) throw new Error("Could not save whitelist register");

      setAdminSaveMessage({ text: "All administrative parameters and Whitelist successfully locked in!", type: "success" });
      
      if (adminNewPin.trim()) {
        setAdminPinInput(adminNewPin.trim());
        setAdminNewPin("");
      }

      fetchAdminState(adminPinInput);
      fetchPublicState();
    } catch (err: any) {
      setAdminSaveMessage({ text: err.message || "An exception occurred while saving changes", type: "error" });
    }
  };

  // Toggle Concluded Live
  const toggleVotingConcludedState = async (forceState: boolean) => {
    if (!adminState) return;
    try {
      const res = await fetch("/api/admin/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: adminPinInput,
          votingConcluded: forceState,
          votingEndTime: adminState.settings.votingEndTime
        })
      });

      if (!res.ok) throw new Error("Failed to change voting timeline on server");
      fetchAdminState(adminPinInput);
      fetchPublicState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reset database values
  const handleResetDatabase = async () => {
    if (!confirm("CRITICAL ACTION: Resetting will clear all voter PIN setups and cast poster votes back to zero. Whitelist roster remains. Continue?")) return;
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPin: adminPinInput })
      });

      if (!res.ok) throw new Error("Database purge failed on server");
      alert("System database has been reset successfully.");
      fetchAdminState(adminPinInput);
      fetchPublicState();
      handleVoterLogout();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Close Admin
  const handleAdminModalClose = () => {
    setIsAdminOpen(false);
    setAdminError(null);
    setAdminSaveMessage(null);
    setAdminPinInput("");
    setAdminAuthenticated(false);
    setAdminState(null);
  };

  // Turnout Stats Helper
  const totalWhitelisted = publicState?.totalVotersCount || 3;
  const totalVotesCastCount = publicState?.totalVotesCast || 0;
  const turnoutPercent = totalWhitelisted > 0 ? Math.round((totalVotesCastCount / totalWhitelisted) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 font-sans flex flex-col selection:bg-ugent-yellow/40">
      
      {/* 1. BRAND HEADER RIBBON (Corporate Ghent University Huisstijl & Chemistry Department) */}
      <header className="bg-white text-slate-800 shadow-md relative z-10 border-b border-slate-200">
        {/* Yellow top accent border block */}
        <div className="absolute top-0 left-0 right-0 h-[5px] bg-[#FFD200]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          {/* Logo Brand Title Group */}
          <div className="flex items-center gap-4">
            <div className="select-none shrink-0">
              <img
                src="https://www.nolan.ugent.be/images/logo_ugent_en.svg"
                alt="Ghent University Logo"
                className="h-14 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm tracking-wide text-[#1E64C8]">
                  UNIVERSITEIT
                </span>
                <span className="font-display font-extrabold text-sm tracking-wide text-[#1E64C8]">
                  GENT
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                Department of Chemistry • Poster Prize (PhD & Post-Docs)
              </span>
              <h1 className="text-xl sm:text-2xl font-display font-bold leading-tight tracking-tight text-slate-900 mt-1">
                Poster Prize Ballot Roster
              </h1>
            </div>
          </div>

          {/* Quick-Stats & Admin Authentication button */}
          <div className="flex flex-wrap items-center gap-3.5">
            {publicState && (
              <div className="bg-slate-105 bg-slate-100 rounded-lg px-4 py-2 border border-slate-200 flex items-center gap-4 text-xs font-semibold text-slate-700">
                {publicState.votingConcluded ? (
                  <div className="flex items-center gap-1.5 text-red-600">
                    <Award className="w-4 h-4" />
                    <span>Ballot Stage Concluded</span>
                  </div>
                ) : (
                  <>
                    {publicState.votingEndTime && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-4 h-4 text-[#1E64C8]" />
                        <span>Timer: <strong className="font-mono text-[#1E64C8]">{timeLeft || "Checking..."}</strong></span>
                      </div>
                    )}
                    <div className="h-4 w-px bg-slate-300/60"></div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Users className="w-4 h-4 text-[#1E64C8]" />
                      <span>Ballots Counted: <strong className="text-slate-900">{totalVotesCastCount} / {totalWhitelisted}</strong></span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
               id="admin-results-toggle-btn"
              onClick={() => setIsAdminOpen(true)}
              className="bg-[#FFD200] hover:bg-[#FFE04D] text-slate-900 font-semibold px-4.5 py-2 rounded-lg text-xs md:text-sm shadow-md transition-all flex items-center gap-2 border border-[#FFD200] hover:scale-[1.02] cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-950" />
              <span>🔑 Admin & Results Page</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN HUB WORKSPACE LAYOUT (Bento-inspired columns mimicking corporate website design) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* ================= LEFT 3/5 COLUMN: POSTER LIST & DETAILS ================= */}
        <section id="academic-poster-showcase" className="flex-1 lg:max-w-[62%] flex flex-col gap-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-display font-extrabold text-[#1E64C8] mb-1">
              Ghent University Academic Posters
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              To casting your vote, please review the academic poster options below. Click any card to expand its theoretical abstract. Enter your credentials on the right board to sign in and register your secure prize vote choice.
            </p>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#1E64C8] animate-spin mb-3" />
                <span className="text-xs font-mono text-slate-400">Loading catalog...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-4 bg-red-50 border border-red-100 text-red-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span>Error: {errorMessage}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {publicState?.options.map((poster) => {
                  const isExpanded = expandedPosterId === poster.id;
                  const isSelectableToVote = voterStep === "voting" && !publicState?.votingConcluded;
                  const isBallotChoice = selectedPosterId === poster.id;

                  return (
                    <div 
                      key={poster.id}
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isBallotChoice 
                          ? "border-[#1E64C8] ring-1 ring-[#1E64C8]/30 shadow-sm" 
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Accordion Trigger area */}
                      <button
                        type="button"
                        onClick={() => setExpandedPosterId(isExpanded ? null : poster.id)}
                        className={`w-full text-left p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors ${
                          isExpanded ? "bg-slate-50/50" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Option Badge */}
                          <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                            isBallotChoice 
                              ? "bg-[#1E64C8] text-white" 
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {poster.id}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 block uppercase">
                              Option {poster.id}
                            </span>
                            <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-800 leading-tight mt-0.5">
                              {poster.title}
                            </h3>
                            <span className="text-xs font-medium text-[#1E64C8] mt-1 inline-block">
                              Presenter: {poster.author}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 self-center">
                          {isBallotChoice && (
                            <span className="text-[10px] font-mono font-bold uppercase bg-[#1E64C8] text-white rounded px-2 py-0.5 flex items-center gap-1 shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" /> Selected Choice
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                      </button>

                      {/* Expanding Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white border-t border-slate-150"
                          >
                            <div className="p-4 sm:p-5 flex flex-col gap-4">
                              <div className="bg-[#1E64C8]/5 p-4 rounded-lg border border-[#1E64C8]/10">
                                <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#1E64C8]" />
                                  Theoretical Poster Abstract
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                                  {poster.abstract || "Detailed content abstracts scheduled by academic presenter will appear here."}
                                </p>
                              </div>

                              {isSelectableToVote && (
                                <div className="flex justify-end pt-2 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPosterId(poster.id)}
                                    className={`text-xs font-semibold py-2 px-4 rounded-lg transition flex items-center gap-1.5 cursor-pointer hover:shadow-sm ${
                                      isBallotChoice 
                                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-default" 
                                        : "bg-[#1E64C8] border border-[#1E64C8] text-white hover:bg-[#15458c]"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isBallotChoice ? "Currently Selected" : "Select Option " + poster.id + " as my Choice"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= RIGHT 2/5 COLUMN: INTERACTIVE BALLOT BOX ================= */}
        <section id="interactive-ballot-box" className="w-full lg:max-w-[38%] flex flex-col gap-6">
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Top Indicator bar */}
            <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-[#FFD200]" />
                <h2 className="font-display font-extrabold text-sm tracking-tight text-white uppercase">
                  Ballot Box Console
                </h2>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-[#1E64C8] animate-spin mb-3" />
                  <span className="text-xs font-mono text-slate-400">Loading auth...</span>
                </div>
              ) : publicState?.votingConcluded ? (
                /* INSTRUCTION FOR CONCLUDED VOTING */
                <div className="text-center py-6">
                  <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto mb-4 scale-105">
                    <Trophy className="w-7 h-7 text-[#FFD200]" />
                  </div>
                  <h3 className="font-display font-extrabold text-slate-800 text-base leading-tight">
                    Voting Cycle Concluded
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal max-w-xs mx-auto mt-2.5">
                    This official Poster Prize voting period has completed. Organizers are now auditing outcomes internally.
                  </p>
                  
                  <div className="mt-6 p-4 bg-[#1E64C8]/5 border border-[#1E64C8]/10 text-[#1E64C8] text-xs font-medium rounded-lg text-left leading-relaxed">
                    <h4 className="font-bold mb-1">How can I view outcomes?</h4>
                    The final figures are confidential and accessible to authorized Ghent University administrators via the admin credential option below.
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: Enter Email address */}
                  {voterStep === "enter-email" && (
                    <motion.div
                      key="v-email"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h3 className="text-base font-bold text-slate-800 font-display">
                        Identify Yourself
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1 mb-5">
                        Input your registered University email to authenticate or check ballot verification status.
                      </p>

                      <form onSubmit={handleCheckEmail} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5 uppercase">
                            Voter Email Address
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. Els.bruneel@ugent.be"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="bg-slate-50 hover:bg-white border border-slate-300 focus:border-[#1E64C8] focus:ring-1 focus:ring-[#1E64C8] rounded-lg p-2.5 w-full text-xs transition duration-150"
                          />
                        </div>

                        {voterMessage && (
                          <div className={`p-3 rounded-lg border text-xs leading-normal flex gap-2 ${
                            voterMessage.type === "success" 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                              : "bg-red-50 border-red-100 text-red-800"
                          }`}>
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{voterMessage.text}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={checkingEmail}
                          className="bg-[#1E64C8] hover:bg-[#15458c] text-white font-bold py-2.5 px-4 rounded-lg text-xs tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                        >
                          {checkingEmail ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Verify Whitelist Status →</span>
                          )}
                        </button>
                      </form>

                      {/* Demo testing helpers */}
                      <div className="mt-8 pt-5 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider block uppercase mb-2">
                          📋 Preapproved Whitelist (For Testing)
                        </span>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1 text-[11px] font-mono select-all">
                          <div className="flex justify-between hover:text-[#1E64C8] cursor-pointer" onClick={() => setEmailInput("Els.bruneel@ugent.be")}>
                            <span>Els.bruneel@ugent.be</span>
                            <span className="text-[9px] text-[#1E64C8] font-bold">Paste</span>
                          </div>
                          <div className="flex justify-between hover:text-[#1E64C8] cursor-pointer" onClick={() => setEmailInput("Pat.Borra@ugent.be")}>
                            <span>Pat.Borra@ugent.be</span>
                            <span className="text-[9px] text-[#1E64C8] font-bold">Paste</span>
                          </div>
                          <div className="flex justify-between hover:text-[#1E64C8] cursor-pointer" onClick={() => setEmailInput("borrapat@gmail.com")}>
                            <span>borrapat@gmail.com</span>
                            <span className="text-[9px] text-[#1E64C8] font-bold">Paste</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Setup secure PIN code (First login) */}
                  {voterStep === "setup-pin" && (
                    <motion.div
                      key="v-setup"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h3 className="text-base font-bold text-[#1E64C8] font-display flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>First Login PIN Registration</span>
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal mt-1 mb-5">
                        Configure a custom <strong>4-digit passcode PIN</strong> for <span className="font-semibold text-slate-700">{tempVoterEmail}</span>. You will use this key if you need to access your ballot verification receipt later.
                      </p>

                      <form onSubmit={handleVoterAuth} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5">
                            Setup Custom PIN (4-Digit numeric code)
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="e.g. 8493"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                            className="bg-slate-50 border border-slate-300 focus:border-[#1E64C8] focus:ring-1 focus:ring-[#1E64C8] rounded-lg p-2.5 w-full text-xs font-mono tracking-widest text-center"
                          />
                        </div>

                        {voterMessage && (
                          <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-lg">
                            {voterMessage.text}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-md transition cursor-pointer"
                        >
                          Confirm & Save Security PIN
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setVoterStep("enter-email")}
                          className="text-xs text-slate-400 hover:text-slate-600 hover:underline transition self-center"
                        >
                          ← Go Back
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* STEP 3: Unlock with PIN */}
                  {voterStep === "enter-pin" && (
                    <motion.div
                      key="v-pin"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-[#1E64C8]" />
                        <span>Security PIN Verification</span>
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal mt-1 mb-5">
                        Please unlock your security lock for <strong className="text-slate-700">{tempVoterEmail}</strong> to enter your voting pane.
                      </p>

                      <form onSubmit={handleVoterAuth} className="flex flex-col gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5">
                            Enter Your 4-Digit PIN
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="••••"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                            className="bg-slate-50 border border-slate-300 focus:border-[#1E64C8] focus:ring-1 focus:ring-[#1E64C8] rounded-lg p-2.5 w-full text-xs font-mono tracking-widest text-center"
                          />
                        </div>

                        {voterMessage && (
                          <div className={`p-3 rounded-lg text-xs ${voterMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-red-50 text-red-800 border border-red-100"}`}>
                            {voterMessage.text}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="bg-[#1E64C8] hover:bg-[#15458c] text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow transition cursor-pointer"
                        >
                          Unlock Voting Deck
                        </button>

                        <button
                          type="button"
                          onClick={handleVoterLogout}
                          className="text-xs text-slate-400 hover:text-slate-600 hover:underline transition self-center"
                        >
                          ← Cancel & Change Email
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* STEP 4: Cast Ballot Pane */}
                  {voterStep === "voting" && (
                    <motion.div
                      key="v-ballot"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="flex flex-col gap-5"
                    >
                      <div className="bg-slate-50 border border-slate-200/55 rounded-xl p-3 flex justify-between items-center gap-4">
                        <div className="truncate">
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Logged In</span>
                          <span className="text-xs font-bold text-slate-600 truncate block">{tempVoterEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleVoterLogout}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 border border-red-100/50 rounded px-2 py-1 transition"
                        >
                          Sign Out
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                        <h4 className="text-xs font-bold text-slate-700 font-display">
                          Your Active Choice selection:
                        </h4>

                        {selectedPosterId ? (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl mt-3">
                            <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded uppercase font-bold">
                              Poster Choice {selectedPosterId}
                            </span>
                            <div className="font-display font-extrabold text-sm text-slate-800 mt-2 leading-snug">
                              "{publicState?.options.find(o => o.id === selectedPosterId)?.title}"
                            </div>
                            <span className="text-xs text-slate-400 font-medium block mt-1">
                              Presenter: {publicState?.options.find(o => o.id === selectedPosterId)?.author}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center text-xs text-slate-400 mt-3 font-medium">
                            No Poster Selected Yet.<br />
                            <span className="text-[10px] text-slate-400 font-normal">Please select an option from the showcase catalog list on the left column.</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleCastVote}
                        disabled={submittingVote || !selectedPosterId}
                        className={`w-full py-3 px-5 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                          selectedPosterId 
                            ? "bg-[#1E64C8] hover:bg-[#15458c] text-white shadow-md hover:shadow-lg" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        }`}
                      >
                        {submittingVote ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Cast My Vote Permanently</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {/* STEP 5: Thank you Receipt */}
                  {voterStep === "thank-you" && (
                    <motion.div
                      key="v-receipt"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center"
                    >
                      <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-7 h-7 stroke-[2]" />
                      </div>
                      
                      <h3 className="font-display font-extrabold text-[#1E64C8] text-base leading-tight">
                        Thank You! Ballot Logged
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1.5 max-w-xs mx-auto">
                        Your secure, authoritative choice choice has been locked on the UGent central portal for <strong className="text-slate-700">{tempVoterEmail}</strong>.
                      </p>

                      {/* Receipt audit structure */}
                      <div className="bg-slate-50 rounded-lg border border-slate-200/60 p-4 mt-6 text-left font-mono text-[11px] flex flex-col gap-2 relative">
                        <div className="absolute top-2 right-2 flex items-center shadow-sm border border-emerald-200 gap-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> SECURE
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400">EMAIL</span>
                          <span className="text-slate-700 font-bold truncate max-w-[130px]">{tempVoterEmail}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span className="text-slate-400">BALLOT</span>
                          <span className="text-slate-700 font-bold">1 BALLOT CAST</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">DATE</span>
                          <span className="text-slate-500">{new Date().toLocaleString()}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleVoterLogout}
                        className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline transition mt-6 font-semibold cursor-pointer block mx-auto"
                      >
                        Reset / Sign Out session
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              )}
            </div>
          </div>

          {/* TURN-OUT AUDIT MONITOR */}
          {publicState && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#1E64C8]" />
                  <h3 className="font-display font-extrabold text-xs tracking-tight text-slate-800 uppercase">
                    Voter Attendance
                  </h3>
                </div>
                <div className="bg-slate-100 text-[#1E64C8] text-[10px] font-mono font-bold rounded px-1.5 py-0.5">
                  {turnoutPercent}% Turnout
                </div>
              </div>

              {/* Progress bar visualizer */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-4 border border-slate-150">
                <div 
                  className="bg-[#1E64C8] h-2 rounded-full transition-all duration-[1200ms] ease-out" 
                  style={{ width: `${turnoutPercent}%` }}
                ></div>
              </div>

              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {publicState.votersList.map((v) => (
                  <div key={v.email} className="flex justify-between items-center bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg font-mono text-[11px]">
                    <span className="text-slate-600 truncate max-w-[170px]">{v.email}</span>
                    <span className={`inline-flex items-center gap-1 font-sans font-bold text-[9px] rounded px-2 py-0.5 ${
                      v.hasVoted 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-slate-200 text-slate-400"
                    }`}>
                      {v.hasVoted ? "✓ Cast Voted" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

      </main>

      {/* ========================================================================= */}
      {/* ============================ SECURED ADMIN CONSOLE ====================== */}
      {/* ========================================================================= */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden my-8 border border-slate-200 flex flex-col"
          >
            {/* Header bar */}
            <div className="bg-[#1E64C8] text-white p-5 flex justify-between items-center relative border-b border-[#1E64C8]">
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#FFD200]"></div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FFD200]" />
                <h3 className="font-display font-extrabold text-base tracking-tight">Admin & Certified Results Portal</h3>
              </div>
              <button 
                onClick={handleAdminModalClose}
                className="text-slate-100 hover:text-white transition p-1 rounded hover:bg-white/10 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CASE A: PIN Setup login */}
            {!adminAuthenticated ? (
              <div className="p-8 text-center max-w-md mx-auto my-6 flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-[#1E64C8]/10 text-[#1E64C8] flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="font-display font-extrabold text-slate-800 text-lg">Administrative Authentication</h4>
                <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
                  Enter the secret designated administrator PIN code to access the locked Certified Live Results panel, Voter Whitelist rosters, and election configuration variables.
                </p>

                <form onSubmit={handleAdminLogin} className="w-full text-left flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono mb-1.5 uppercase">
                      Admin Security PIN (Def: 1234)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      className="bg-slate-50 border border-slate-300 focus:border-[#1E64C8] focus:ring-1 focus:ring-[#1E64C8] p-2.5 w-full rounded-lg text-center font-mono tracking-widest text-sm focus:bg-white"
                    />
                  </div>

                  {adminError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-lg flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>{adminError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="bg-[#1E64C8] hover:bg-[#15458c] text-white py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider shadow mt-2 cursor-pointer"
                  >
                    Unlock Admin & Results dashboard
                  </button>
                </form>
              </div>
            ) : (
              /* CASE B: Authenticated Admin Dashboard panel view */
              <div className="flex flex-col h-[75vh] shrink-0">
                
                {/* Horizontal Tab Headers */}
                <div className="bg-slate-100 border-b border-slate-200 px-4 flex gap-1 overflow-x-auto shrink-0 select-none">
                  <button
                    onClick={() => { setActiveAdminTab("results"); setAdminSaveMessage(null); }}
                    className={`py-3.5 px-4 font-display font-extrabold text-xs whitespace-nowrap border-b-2 transition cursor-pointer ${
                      activeAdminTab === "results" 
                        ? "border-[#1E64C8] text-[#1E64C8]" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📊 Certified Results Live
                  </button>
                  <button
                    onClick={() => { setActiveAdminTab("whitelist"); setAdminSaveMessage(null); }}
                    className={`py-3.5 px-4 font-display font-extrabold text-xs whitespace-nowrap border-b-2 transition cursor-pointer ${
                      activeAdminTab === "whitelist" 
                        ? "border-[#1E64C8] text-[#1E64C8]" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    👥 Whitelist Roster ({adminState?.voters.length || 0})
                  </button>
                  <button
                    onClick={() => { setActiveAdminTab("posters"); setAdminSaveMessage(null); }}
                    className={`py-3.5 px-4 font-display font-extrabold text-xs whitespace-nowrap border-b-2 transition cursor-pointer ${
                      activeAdminTab === "posters" 
                        ? "border-[#1E64C8] text-[#1E64C8]" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    📝 Poster Definitions (1-4)
                  </button>
                  <button
                    onClick={() => { setActiveAdminTab("settings"); setAdminSaveMessage(null); }}
                    className={`py-3.5 px-4 font-display font-extrabold text-xs whitespace-nowrap border-b-2 transition cursor-pointer ${
                      activeAdminTab === "settings" 
                        ? "border-[#1E64C8] text-[#1E64C8]" 
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ⚙️ Parameters & Control
                  </button>
                </div>

                {/* Tab content area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-white">
                  
                  {adminIsLoading ? (
                    <div className="py-16 text-center flex flex-col justify-center items-center">
                      <RefreshCw className="w-8 h-8 text-[#1E64C8] animate-spin mb-3" />
                      <span className="text-xs font-mono text-slate-400">Loading secured logs...</span>
                    </div>
                  ) : (
                    <>
                      {/* 1. Tab Results Panel */}
                      {activeAdminTab === "results" && adminState && (
                        <div className="flex flex-col gap-6">
                          
                          {/* Live turnout dashboard box */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">turnout percent</span>
                              <div className="text-3xl font-display font-black text-[#1E64C8] mt-1.5">
                                {adminState.voters.length > 0 ? Math.round((adminState.votes.length / adminState.voters.length) * 100) : 0}%
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">of total whitelisted users</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Cast Ballots Tally</span>
                              <div className="text-3xl font-display font-black text-slate-800 mt-1.5">
                                {adminState.votes.length}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">secure ballots registered</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center sm:col-span-2 md:col-span-1 flex flex-col justify-center items-center">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">voter roster count</span>
                              <div className="text-3xl font-display font-black text-slate-800 mt-1">
                                {adminState.voters.length}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">approved addresses whitelisted</span>
                            </div>
                          </div>

                          {/* Winner Showcase Badge */}
                          {(() => {
                            const validOptions = adminState.options.filter(o => typeof o.votes === "number");
                            if (validOptions.length === 0) return null;
                            const maxVotes = Math.max(...validOptions.map(o => o.votes));
                            const winners = validOptions.filter(o => o.votes === maxVotes && maxVotes > 0);

                            if (winners.length === 0) {
                              return (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 text-center font-medium">
                                  No secure ballots have been cast under the currently loaded whitelist system.
                                </div>
                              );
                            }

                            return (
                              <div className="bg-gradient-to-br from-[#1E64C8] to-[#15458c] text-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-sm border border-[#1E64C8]">
                                <div className="absolute -right-5 -bottom-5 opacity-10 select-none">
                                  <Trophy className="w-28 h-28 text-white" />
                                </div>
                                <div className="z-10">
                                  <span className="bg-[#FFD200] text-slate-900 text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full select-none">
                                    ★ Primary Recipient ★
                                  </span>
                                  <h4 className="font-display font-extrabold text-lg tracking-tight mt-2.5 text-[#FFD200]">
                                    {winners.map(w => `Option ${w.id}: "${w.title}"`).join(" & ")}
                                  </h4>
                                  <span className="text-xs text-slate-200 mt-1 block">
                                    Author presenters: {winners.map(w => w.author).join(", ")}
                                  </span>
                                </div>
                                <div className="z-10 bg-white/20 px-4 py-2.5 rounded-lg border border-white/25 shrink-0 text-center">
                                  <span className="text-[9px] font-mono text-slate-200 uppercase block">Total Ballots</span>
                                  <span className="font-mono text-xl font-bold text-[#FFD200]">{maxVotes}</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Certified Bar Tally Display */}
                          <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
                            <h4 className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-wider">
                              OFFICIAL BALLOT RECIPIENT GRAPH CHART
                            </h4>

                            <div className="flex flex-col gap-4">
                              {(() => {
                                const totalCast = adminState.votes.length;
                                const maxVotesVal = Math.max(...adminState.options.map(o => o.votes), 1);
                                
                                return adminState.options.map((opt) => {
                                  const votes = opt.votes || 0;
                                  const pctVal = totalCast > 0 ? Math.round((votes / totalCast) * 100) : 0;
                                  const barWidthPct = Math.max((votes / maxVotesVal) * 100, 3);

                                  return (
                                    <div key={opt.id} className="text-xs flex flex-col gap-1.5">
                                      <div className="flex justify-between font-bold text-slate-700">
                                        <span className="flex items-center gap-1.5">
                                          <span className="h-5 w-5 bg-slate-100 text-slate-600 font-mono font-bold flex items-center justify-center rounded">
                                            {opt.id}
                                          </span>
                                          <span className="truncate max-w-[250px] sm:max-w-md">{opt.title} ({opt.author})</span>
                                        </span>
                                        <span className="font-mono text-slate-500">
                                          <strong>{votes} votes</strong> ({pctVal}%)
                                        </span>
                                      </div>
                                      
                                      <div className="w-full bg-slate-100 border border-slate-200/50 rounded-lg h-5 overflow-hidden flex relative">
                                        <div 
                                          className="bg-[#1E64C8] h-full rounded-l transition-all duration-[1000ms]"
                                          style={{ width: `${barWidthPct}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* Ballot Verification Audit Logs */}
                          <div className="border border-slate-200 rounded-xl p-5">
                            <h4 className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#1E64C8]" />
                              CONSECUTIVE BALLOT SYSTEM AUDIT LOG (Admins Eyes Only)
                            </h4>
                            {adminState.votes.length === 0 ? (
                              <p className="text-xs text-slate-400">No audits recorded. Ballots registry is clear.</p>
                            ) : (
                              <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                                {adminState.votes.map((vote, idx) => (
                                  <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg font-mono text-[11px] gap-2">
                                    <div className="truncate">
                                      <span className="text-slate-400 font-bold shrink-0 block sm:inline">Voter:</span>{" "}
                                      <span className="text-slate-700 truncate font-semibold block sm:inline">{vote.voterEmail}</span>
                                    </div>
                                    <div className="flex gap-4 shrink-0 text-slate-500">
                                      <div>
                                        <span className="text-slate-400">Ballot choice:</span>{" "}
                                        <span className="text-[#1E64C8] font-black uppercase">Option {vote.optionId}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 pt-0.5">{new Date(vote.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}

                      {/* 2. Tab Whitelist Roster Panel */}
                      {activeAdminTab === "whitelist" && adminState && (
                        <div className="flex flex-col gap-5">
                          <div className="bg-[#1E64C8]/5 border border-[#1E64C8]/10 p-4 rounded-xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-[#1E64C8] shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-600 leading-normal">
                              To introduce additional voters, register their official emails inside the field below (one email address per line). Removing lines and saving will automatically purge their registered credential indexes and keys from the voter database to protect platform integrity.
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
                              Whitelisted Email Directory (Paste one email per line)
                            </label>
                            <textarea
                              rows={6}
                              value={newVoterEmailList}
                              onChange={(e) => setNewVoterEmailList(e.target.value)}
                              placeholder="voter.email@ugent.be"
                              className="w-full bg-white border border-slate-300 rounded-lg p-3 font-mono text-xs focus:ring-1 focus:ring-[#1E64C8] focus:border-[#1E64C8] focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 leading-normal">
                              Voters listed here can immediately establish their passcode setup on their first portal session to participate in the Poster Prize.
                            </span>
                          </div>

                          {/* Current Status Log Table */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                              CURRENT ROSTER STATUS
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                              {adminState.voters.map((voter) => (
                                <div key={voter.email} className="px-4 py-3 text-xs flex justify-between items-center bg-white">
                                  <div>
                                    <span className="font-mono text-slate-700 font-semibold">{voter.email}</span>
                                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                      Passcode: {voter.pin ? `Registered PIN: [ ${voter.pin} ]` : "[ NOT REGISTERED YET ]"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded uppercase ${
                                      voter.hasVoted 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                        : "bg-slate-100 text-slate-400 border border-slate-200"
                                    }`}>
                                      {voter.hasVoted ? "Has Voted" : "Pending"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* 3. Tab Poster Options Configuration */}
                      {activeAdminTab === "posters" && (
                        <div className="flex flex-col gap-5">
                          <h4 className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                            CONFIGURE PRESENTATION PARAMETERS FOR POSTERS 1 TO 4
                          </h4>

                          <div className="flex flex-col gap-5">
                            {editOptions.map((opt, idx) => (
                              <div key={opt.id} className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col gap-3 shadow-sm">
                                <span className="font-mono text-[10px] font-black bg-[#1E64C8]/15 text-[#1E64C8] self-start px-2 py-0.5 rounded">
                                  POSTER OPTION ENTRY ID: {opt.id}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Title Heading</label>
                                    <input
                                      type="text"
                                      value={opt.title}
                                      onChange={(e) => {
                                        const buffer = [...editOptions];
                                        buffer[idx].title = e.target.value;
                                        setEditOptions(buffer);
                                      }}
                                      className="bg-white border border-slate-300 p-2 rounded-lg text-xs font-bold text-slate-800"
                                      placeholder="Poster Title..."
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Academic Author / Presenter</label>
                                    <input
                                      type="text"
                                      value={opt.author}
                                      onChange={(e) => {
                                        const buffer = [...editOptions];
                                        buffer[idx].author = e.target.value;
                                        setEditOptions(buffer);
                                      }}
                                      className="bg-white border border-slate-300 p-2 rounded-lg text-xs text-slate-700"
                                      placeholder="Presenter Name/Department..."
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Presentation Abstract</label>
                                  <textarea
                                    rows={3}
                                    value={opt.abstract}
                                    onChange={(e) => {
                                      const buffer = [...editOptions];
                                      buffer[idx].abstract = e.target.value;
                                      setEditOptions(buffer);
                                    }}
                                    className="bg-white border border-slate-300 p-2.5 rounded-lg text-xs text-slate-600 resize-none font-sans"
                                    placeholder="Enter descriptive poster abstract text..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                        </div>
                      )}

                      {/* 4. Tab Parameters & Control Panel */}
                      {activeAdminTab === "settings" && adminState && (
                        <div className="flex flex-col gap-6">
                          
                          {/* Conclude Switch controllers */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <h4 className="font-display font-extrabold text-[#1E64C8] text-sm leading-tight">
                                Election Gate Trigger
                              </h4>
                              <p className="text-xs text-slate-500 leading-normal max-w-md mt-1">
                                Manually trigger closure of the active voting period. When closed, public access to log votes is locked immediately.
                              </p>
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto shrink-0 select-none">
                              <button
                                type="button"
                                onClick={() => toggleVotingConcludedState(true)}
                                className={`flex-1 md:flex-none py-2 px-4 rounded-lg text-xs font-bold border transition ${
                                  adminState.settings.votingConcluded 
                                    ? "bg-[#1E64C8] text-white border-[#1E64C8]" 
                                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                ✓ Concluded / Closed
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleVotingConcludedState(false)}
                                className={`flex-1 md:flex-none py-2 px-4 rounded-lg text-xs font-bold border transition ${
                                  !adminState.settings.votingConcluded 
                                    ? "bg-emerald-600 text-white border-emerald-600" 
                                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                ✗ Open / Accepting Votes
                              </button>
                            </div>
                          </div>

                          {/* Countdown timers parameters */}
                          <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
                            <h4 className="text-xs font-mono font-extrabold text-slate-400 tracking-wider uppercase">
                              AUTOMATIC TIME SCHEDULE CLOSURE
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Scheduled Conclude Time (Optional)</label>
                                <input
                                  type="datetime-local"
                                  value={adminEndTimeString}
                                  onChange={(e) => setAdminEndTimeString(e.target.value)}
                                  className="border border-slate-300 bg-white rounded-lg p-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-[#1E64C8] focus:outline-none"
                                />
                                <span className="text-[9px] text-slate-400 mt-0.5">Allows the election gate to close automatically at a set local clock time.</span>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Update Administrative Security Access PIN</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 5621"
                                  value={adminNewPin}
                                  onChange={(e) => setAdminNewPin(e.target.value.replace(/\s/g, ""))}
                                  className="border border-slate-300 bg-white rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-[#1E64C8] focus:outline-none"
                                />
                                <span className="text-[9px] text-slate-400 mt-0.5">Set a custom admin entry PIN passcode. Ensure it has at least 4 digits.</span>
                              </div>
                            </div>
                          </div>

                          {/* Reset Core parameters button */}
                          <div className="border border-red-100 rounded-xl p-5 bg-red-50/70 border-dashed flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
                            <div>
                              <h4 className="text-xs font-bold text-red-800 uppercase font-mono leading-none flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                WIPE VOTES & PURGE SEED DATA
                              </h4>
                              <p className="text-[11px] text-red-600 leading-normal max-w-sm mt-1.5">
                                Erases all voter-registered security PIN passcodes and current cast ballots back to zero. Whitelisted accounts lists are preserved intact.
                              </p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={handleResetDatabase}
                              className="bg-red-650 hover:bg-red-700 text-white font-mono font-bold text-[10px] hover:shadow-sm px-4 py-2.5 rounded-lg border border-red-700 transition"
                            >
                              PURGE BALLOTS DATABASES
                            </button>
                          </div>

                        </div>
                      )}

                    </>
                  )}

                </div>

                {/* Sticky Admin save indicator & button overlay footer */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="text-xs font-medium">
                    {adminSaveMessage ? (
                      <div className={`p-2.5 rounded-lg border ${adminSaveMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-red-50 text-red-800 border-red-100"}`}>
                        {adminSaveMessage.text}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px]">Secure 256-Bit SSL Administrative Tunnel Active</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2.5">
                    {activeAdminTab !== "results" && (
                      <button
                        type="button"
                        onClick={handleSaveAdminSettings}
                        className="bg-[#1E64C8] hover:bg-[#15458c] text-white font-bold py-2 px-5 rounded-lg text-xs shadow-md transition cursor-pointer"
                      >
                        Apply Configurations & Save
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAdminModalClose}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
                    >
                      Close Control Console
                    </button>
                  </div>
                </div>

              </div>
            )}

          </motion.div>
        </div>
      )}

      {/* 3. FOOTER COPYRIGHT */}
      <footer className="bg-[#1E64C8] text-white border-t-4 border-[#FFD200] py-8 text-xs text-center mt-auto font-sans shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-3 font-semibold text-white">
            <img
              src="https://www.nolan.ugent.be/images/logo_ugent_en.svg"
              alt="Ghent University Logo"
              className="h-8 w-auto object-contain bg-white px-1.5 py-0.5 rounded shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="tracking-wide">GHENT UNIVERSITY • DEPARTMENT OF CHEMISTRY © 2026</span>
          </div>
          <div className="flex gap-4">
            <a 
              href="https://www.chemistry.ugent.be" 
              target="_blank" 
              referrerPolicy="no-referrer"
              className="text-[#FFD200] hover:text-white transition flex items-center gap-1.5 font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
            >
              www.chemistry.ugent.be <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
