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
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Interfaces
interface PublicState {
  votingConcluded: boolean;
  votingEndTime: string | null;
  options: Array<{
    id: string;
    category?: "phd_postdoc" | "master_student";
    title: string;
    author: string;
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
    category?: "phd_postdoc" | "master_student";
    title: string;
    author: string;
    votes: number; // Disclosed ONLY to admins
  }>;
  votes: Array<{
    voterEmail: string;
    optionId: string;
    timestamp: string;
    category?: "phd_postdoc" | "master_student";
  }>;
}

// ==================== FIREBASE DIRECT SECURE DATABASE INTEGRATION ====================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBTPln5uCix12NCWFguv3kjZrmpTXuKG_k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0510211953.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0510211953",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0510211953.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "186128313383",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:186128313383:web:edc78868f637ee7afaf202",
};

const firebaseApp = initializeApp(firebaseConfig);
const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-73c85276-581b-461e-940f-7ea37f7600b9";
const db = getFirestore(firebaseApp, dbId);

const initialDb = {
  settings: {
    votingConcluded: false,
    votingEndTime: null,
    adminPin: "1234",
  },
  voters: [
    { email: "pat.borra@ugent.be", pin: null, hasVoted: false, votedAt: null },
    { email: "els.bruneel@ugent.be", pin: null, hasVoted: false, votedAt: null },
    { email: "borrapat@gmail.com", pin: null, hasVoted: false, votedAt: null },
    { email: "fartmasterp2@gmail.com", pin: null, hasVoted: false, votedAt: null }
  ],
  options: [
    {
      id: "phd-1",
      category: "phd_postdoc",
      title: "The role of the parameter landscape in Hartree–Fock quantum computing benchmarks",
      author: "Ruben Van der Stichelen",
      abstract: "An in-depth investigation into parameter landscape characteristics in Hartree–Fock quantum computing benchmarks, exploring optimization challenges, convergence, and performance thresholds."
    },
    {
      id: "phd-2",
      category: "phd_postdoc",
      title: "InP Quantum Dots: from Atomistic Reconstruction to Opto-Electronic Properties",
      author: "Norick De Vlamynck",
      abstract: "Exploring indium phosphide (InP) quantum dots through atomistic reconstruction techniques and analyzing their corresponding opto-electronic signatures and potential applications."
    },
    {
      id: "phd-3",
      category: "phd_postdoc",
      title: "Improving Untargeted Metabolomic Analysis in HIV-Infected Plasma Through Miniaturized Reversed-Phase Chromatography",
      author: "Lander Iterbeke",
      abstract: "Methodologies and improvements for untargeted metabolomic screening of HIV-infected plasma utilizing state-of-the-art miniaturized reversed-phase high-performance liquid chromatography."
    },
    {
      id: "phd-4",
      category: "phd_postdoc",
      title: "Combining Per-Aqueous and Chiral Reversed-Phase Separation Modes Towards a Comprehensive Two-Dimensional LC Platform for Amino Acid Analysis",
      author: "José Meneses",
      abstract: "Developing a multi-dimensional liquid chromatography platform that integrates per-aqueous and chiral reversed-phase systems to provide highly comprehensive amino acid separations."
    },
    {
      id: "phd-5",
      category: "phd_postdoc",
      title: "Hide and Seek - Amide Rotation-induced Chirality Hidden in Plain Sight",
      author: "Sean Verschaeve",
      abstract: "Uncovering hidden conformational stereochemistry and dynamics arising from hindered amide rotation-induced chirality inside complex molecular assemblies."
    },
    {
      id: "phd-6",
      category: "phd_postdoc",
      title: "Exploring Tm-Yb(-Nd)-doped LiLuF4 NPs as a novel downshifting NIR thermometer",
      author: "Petryna Sofia",
      abstract: "Investigating trivalent thulium, ytterbium, and neodymium co-doped lithium lutetium fluoride nanoparticles as high-sensitivity luminescent probes for near-infrared temperature sensing."
    },
    {
      id: "phd-7",
      category: "phd_postdoc",
      title: "Biodegradable Na₃ZrF₇:Yb³⁺–Ho³⁺–Er³⁺ Nanoparticles as Luminescent Nanothermometers: From Downshifting Emission to Multifunctional Platforms",
      author: "Abedi Tameh Fatemeh",
      abstract: "Synthesis and optical characterization of biodegradable sodium zirconium fluoride nanothermometers co-doped with lanthanide ions for multi-functional biomedical imaging and thermal tracking."
    },
    {
      id: "phd-8",
      category: "phd_postdoc",
      title: "Terahertz Spectroscopy of Covalent Organic Frameworks",
      author: "Gitta Van Hoof",
      abstract: "Employing ultra-fast terahertz spectroscopy to investigate the structural dynamics, vibration modes, and charge transport behaviors inside crystalline covalent organic frameworks (COFs)."
    },
    {
      id: "phd-9",
      category: "phd_postdoc",
      title: "Metal Organic Frameworks for Supercapacitors",
      author: "Wafaa Ahmed Mohamed Moawad",
      abstract: "Design, syntheses, and electrochemical performances of custom porous metal-organic frameworks (MOFs) engineered to maximize specific capacitances and cycle life in supercapacitor applications."
    },
    {
      id: "master-1",
      category: "master_student",
      title: "The Evaluation of Data Processing Methods for Macro-Raman Mapping of Art Objects",
      author: "Rachael Britton",
      abstract: "Master research poster detailing the evaluation of alternative statistical processing and baseline correction methods of high-resolution micro/macro-Raman spectral mapping of cultural heritage artifacts."
    },
    {
      id: "master-2",
      category: "master_student",
      title: "Hybrid Nanomaterials Combining Thermometry and Photodynamic Therapy",
      author: "Brianna Woolery",
      abstract: "Investigating multifunctional hybrid nanocomposites capable of synergistic optical temperature reading along with localized targeted photodynamic therapeutic excitation."
    },
    {
      id: "master-3",
      category: "master_student",
      title: "Determination of Multi-Elemental Paleoclimate Proxies in Bivalve Shells via LA-ICP-TOF-MS Mapping",
      author: "Robbe Van Ryckeghem",
      abstract: "Utilizing advanced high-speed laser ablation inductively coupled plasma time-of-flight mass spectrometry to map high-resolution trace elements on bivalve shell thin sections as paleotemperature proxies."
    },
    {
      id: "master-4",
      category: "master_student",
      title: "XRFPM: A Fundamental Parameter Based Code for the Analysis of XRF Spectra",
      author: "Luca De Bruyn",
      abstract: "Developing and compiling a lightweight, high-performance physical script utilizing fundamental parameter models for swift quantitative calibration and deconvolution of complex X-ray fluorescence spectra."
    },
    {
      id: "master-5",
      category: "master_student",
      title: "Atomic Layer Deposition of functional coatings for Lithium-Ion batteries",
      author: "Mitch Bruyneel",
      abstract: "Employing precise nanoscale atomic layer deposition (ALD) techniques to engineer uniform, ultra-thin protecting layers stabilizing cathode interfaces against degradation in rechargeable batteries."
    },
    {
      id: "master-6",
      category: "master_student",
      title: "Gallium Incorporation in In(As,P)/InP Quantum Dots with Molten Salt Processing",
      author: "Ramón Coolens",
      abstract: "Synthesizing and structural tracking of gallium introduction inside indium arsenide phosphide quantum dots using controlled high-temperature molten salt reactions."
    },
    {
      id: "master-7",
      category: "master_student",
      title: "Optimisation of Thiolated Self-Assembled Monolayers for Antibody Attachment to Gold Electrodes",
      author: "Ruby Cornand",
      abstract: "Systematic optimization of gold surface self-assembly dynamics using thiolated organic chains designed to promote bio-compatible, high-density receptor and antibody immobilization."
    },
    {
      id: "master-8",
      category: "master_student",
      title: "Analysis of Surface Orbitals in III-V Core Quantum Dot Alloys",
      author: "Mattice Criel",
      abstract: "Theoretical modeling and experimental benchmarking of the electronic structure, valence boundaries, and surface dangling orbital states in III-V semiconductor quantum dot core-shell structures."
    },
    {
      id: "master-9",
      category: "master_student",
      title: "Dynamic poly(norbornene) networks making use of γ-hydroxy amide chemistry",
      author: "Kenny Deré",
      abstract: "Developing recyclable, self-healing polymer materials utilizing dynamic covalent exchange crossings based on retro-active γ-hydroxy amide reactions inside substituted norbornene backbones."
    },
    {
      id: "master-10",
      category: "master_student",
      title: "From Strong to Weak Magnetic Fields: Characterizing the Evolution and Persistence of Exotic Magnetic Effects",
      author: "Thibo Van Eeckhoorn",
      abstract: "Investigating high-field and low-field magnetic susceptibility alignments, and tracking structural phase changes with persistent macroscopic electronic interactions."
    },
    {
      id: "master-11",
      category: "master_student",
      title: "Modified gelatin as a biodegradable gene delivery system",
      author: "Kobe De Bruyne",
      abstract: "Synthesizing responsive chemically-modified gelatin nanopolyplexes as safe, non-toxic, and biological-stimuli micro-carriers for targeted intracellular gene therapeutics."
    },
    {
      id: "master-12",
      category: "master_student",
      title: "Ga Alloying in InAs Quantum Dots Enabling SWIR Emission",
      author: "Wiebe Volckaert",
      abstract: "Tuning structural bandgaps to enable deep short-wave infrared (SWIR) luminescence through precise gallium alloying on indium-arsenide crystal cores."
    },
    {
      id: "master-13",
      category: "master_student",
      title: "Statistical Characterization of Sampling Uncertainty in Maximal Probability Domains from Quantum Computing Wavefunctions",
      author: "Yarno De Jaeger",
      abstract: "Developing bounds and metrics for the estimation errors and sampling bounds of state probabilities drawn from simulated NISQ-era quantum computing wavefunctions."
    },
    {
      id: "master-14",
      category: "master_student",
      title: "Synthesis and biological evaluation of fluorinated morphine glucuronide analogues",
      author: "Agir Verhulst",
      abstract: "Synthesizing novel fluorinated organic structures imitating active morphine glucuronides to evaluate competitive biological receptor binding and structural metabolic stability."
    },
    {
      id: "master-15",
      category: "master_student",
      title: "Development of antioxidant hybrid hydrogel wound dressings via nanotechnology",
      author: "Hannah Meuleman",
      abstract: "Engineering highly bio-compatible hydrogel matrices embedded with antioxidant nanomaterials designed to actively scavenge reactive oxygen species (ROS) and accelerate wound recovery."
    }
  ],
  votes: []
};

const getDisplayId = (id: string | null) => {
  if (!id) return "";
  const parts = id.split("-");
  return parts[parts.length - 1] || id;
};

export default function App() {
  // --- Public / Voter State ---
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Voter Session State ---
  const [emailInput, setEmailInput] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [voterStep, setVoterStep] = useState<"enter-email" | "voting" | "thank-you">("enter-email");
  const [tempVoterEmail, setTempVoterEmail] = useState("");
  const [voterMessage, setVoterMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedPhdPosterId, setSelectedPhdPosterId] = useState<string | null>(null);
  const [selectedMasterPosterId, setSelectedMasterPosterId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [votedCategories, setVotedCategories] = useState<{ phd_postdoc: boolean; master_student: boolean }>({
    phd_postdoc: false,
    master_student: false
  });
  const [alreadyVotedOptionIds, setAlreadyVotedOptionIds] = useState<string[]>([]);

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
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        let settings = data.settings || {};
        let voters = data.voters || [];
        let options = data.options || [];
        let votes = data.votes || [];

        let concluded = settings.votingConcluded;
        if (settings.votingEndTime) {
          const endTime = new Date(settings.votingEndTime).getTime();
          const now = new Date().getTime();
          if (now >= endTime && !settings.votingConcluded) {
            concluded = true;
            const updatedSettings = { ...settings, votingConcluded: true };
            await updateDoc(docRef, { settings: updatedSettings });
          }
        }

        const displayOptions = options.map((opt: any) => ({ ...opt, votes: null }));

        setPublicState({
          votingConcluded: concluded,
          votingEndTime: settings.votingEndTime,
          options: displayOptions,
          totalVotersCount: voters.length,
          totalVotesCast: votes.length,
          votersList: []
        });
        setErrorMessage(null);
      } else {
        await setDoc(docRef, initialDb);
        setTimeout(fetchPublicState, 500);
      }
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Connection failure to the remote Firestore database");
      setLoading(false);
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

    if (savedEmail) {
      const email = savedEmail.trim().toLowerCase();
      const docRef = doc(db, "app", "main");
      getDoc(docRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            const dbState = docSnap.data();
            const voters = dbState.voters || [];
            const votes = dbState.votes || [];

            const voter = voters.find((v: any) => v.email.toLowerCase() === email);
            if (voter) {
              const userVotes = votes.filter((v: any) => v.voterEmail.toLowerCase() === email);
              const votedPhd = userVotes.some((v: any) => v.category === "phd_postdoc");
              const votedMaster = userVotes.some((v: any) => v.category === "master_student");
              const hasVotedAll = votedPhd && votedMaster;

              setTempVoterEmail(savedEmail);
              setVotedCategories({
                phd_postdoc: votedPhd,
                master_student: votedMaster
              });
              setAlreadyVotedOptionIds(userVotes.map((v: any) => v.optionId));
              if (hasVotedAll) {
                setVoterStep("thank-you");
              } else {
                setVoterStep("voting");
              }
            }
          }
        })
        .catch((e) => console.error("Error restoring session:", e));
    }
  }, []);

  // Sync selected choices when public options and cast votes details load
  useEffect(() => {
    if (publicState?.options && alreadyVotedOptionIds.length > 0) {
      const phdOpt = publicState.options.find(o => alreadyVotedOptionIds.includes(o.id) && (o.category === "phd_postdoc" || (o.category === undefined && parseInt(o.id) <= 2)));
      if (phdOpt) setSelectedPhdPosterId(phdOpt.id);
      
      const masterOpt = publicState.options.find(o => alreadyVotedOptionIds.includes(o.id) && (o.category === "master_student" || (o.category === undefined && parseInt(o.id) > 2)));
      if (masterOpt) setSelectedMasterPosterId(masterOpt.id);
    }
  }, [publicState, alreadyVotedOptionIds]);

  // Voter check email
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckingEmail(true);
    setVoterMessage(null);

    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setVoterMessage({ text: "Please enter your email", type: "error" });
      setCheckingEmail(false);
      return;
    }

    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Application state document not found.");
      }
      const dbState = docSnap.data();
      const voters = dbState.voters || [];
      const votes = dbState.votes || [];

      const voter = voters.find((v: any) => v.email.toLowerCase() === email);
      if (!voter) {
        setVoterMessage({
          text: `The address "${email}" is not whitelisted for the Poster Prize. Please check for spelling mistakes or consult organizers.`,
          type: "error"
        });
        setCheckingEmail(false);
        return;
      }

      const userVotes = votes.filter((v: any) => v.voterEmail.toLowerCase() === email);
      const votedPhd = userVotes.some((v: any) => v.category === "phd_postdoc");
      const votedMaster = userVotes.some((v: any) => v.category === "master_student");
      const hasVotedAll = votedPhd && votedMaster;

      setTempVoterEmail(email);
      localStorage.setItem("voter_email", email);
      setVotedCategories({
        phd_postdoc: votedPhd,
        master_student: votedMaster
      });
      setAlreadyVotedOptionIds(userVotes.map((v: any) => v.optionId));

      if (hasVotedAll) {
        setVoterStep("thank-you");
      } else {
        setVoterStep("voting");
      }
    } catch (err: any) {
      setVoterMessage({ text: err.message || "Failed to talk to system database", type: "error" });
    } finally {
      setCheckingEmail(false);
    }
  };

  // Cast vote
  const handleCastVote = async () => {
    const needPhdChoice = !votedCategories.phd_postdoc;
    const needMasterChoice = !votedCategories.master_student;

    if (needPhdChoice && !selectedPhdPosterId && needMasterChoice && !selectedMasterPosterId) {
      alert("Please select at least one poster option before submitting your ballot!");
      return;
    }

    setSubmittingVote(true);
    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Application state document not found.");
      }

      const dbState = docSnap.data();
      let settings = dbState.settings || {};
      let voters = dbState.voters || [];
      let options = dbState.options || [];
      let votes = dbState.votes || [];

      // Check if concluded
      let concluded = settings.votingConcluded;
      if (settings.votingEndTime) {
        const endTime = new Date(settings.votingEndTime).getTime();
        const now = new Date().getTime();
        if (now >= endTime) {
          concluded = true;
        }
      }

      if (concluded) {
        throw new Error("The voting period has concluded!");
      }

      const email = tempVoterEmail.trim().toLowerCase();
      const voterIndex = voters.findIndex((v: any) => v.email.toLowerCase() === email);
      if (voterIndex === -1) {
        throw new Error("Email not whitelisted");
      }

      const userVotes = votes.filter((v: any) => v.voterEmail.toLowerCase() === email);
      const votedPhd = userVotes.some((v: any) => v.category === "phd_postdoc");
      const votedMaster = userVotes.some((v: any) => v.category === "master_student");

      if (votedPhd && votedMaster) {
        throw new Error("You have already cast ballots for both categories!");
      }

      const selections: string[] = [];
      if (needPhdChoice && selectedPhdPosterId) {
        const exists = options.some((o: any) => String(o.id) === String(selectedPhdPosterId));
        if (!exists) {
          throw new Error("Selected PhD/Postdoc option is invalid");
        }
        selections.push(String(selectedPhdPosterId));
      }
      if (needMasterChoice && selectedMasterPosterId) {
        const exists = options.some((o: any) => String(o.id) === String(selectedMasterPosterId));
        if (!exists) {
          throw new Error("Selected Master Student option is invalid");
        }
        selections.push(String(selectedMasterPosterId));
      }

      if (selections.length === 0) {
        throw new Error("You have already voted for the selected category or made no selection!");
      }

      const timestamp = new Date().toISOString();
      for (const sId of selections) {
        const opt = options.find((o: any) => String(o.id) === sId);
        votes.push({
          voterEmail: email,
          optionId: sId,
          timestamp,
          category: opt?.category
        });
      }

      const allVotesAfter = votes.filter((v: any) => v.voterEmail.toLowerCase() === email);
      const hasPhdAfter = allVotesAfter.some((v: any) => v.category === "phd_postdoc");
      const hasMasterAfter = allVotesAfter.some((v: any) => v.category === "master_student");

      voters[voterIndex].hasVoted = hasPhdAfter && hasMasterAfter;
      voters[voterIndex].votedAt = timestamp;

      await updateDoc(docRef, {
        votes,
        voters
      });

      // Update local choices
      setVotedCategories({
        phd_postdoc: hasPhdAfter,
        master_student: hasMasterAfter
      });
      setAlreadyVotedOptionIds(allVotesAfter.map((v: any) => v.optionId));

      if (hasPhdAfter && hasMasterAfter) {
        setVoterStep("thank-you");
      } else {
        setVoterMessage({ text: "Your vote has been registered dynamically! Please complete the other category choice below.", type: "success" });
      }
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
    setEmailInput("");
    setTempVoterEmail("");
    setSelectedPhdPosterId(null);
    setSelectedMasterPosterId(null);
    setVoterMessage(null);
    setVotedCategories({ phd_postdoc: false, master_student: false });
    setAlreadyVotedOptionIds([]);
    setVoterStep("enter-email");
  };

  // Helper to extract state and load it into editing buffers
  const fetchAdminStateWithData = (dbState: any, pin: string) => {
    const displayOptions = (dbState.options || []).map((opt: any) => {
      const voteCount = (dbState.votes || []).filter((v: any) => String(v.optionId) === String(opt.id)).length;
      return { ...opt, votes: voteCount };
    });

    const fullAdminState = {
      settings: dbState.settings,
      voters: dbState.voters,
      options: displayOptions,
      votes: dbState.votes
    };

    setAdminState(fullAdminState);
    setEditOptions(displayOptions);
    setNewVoterEmailList((dbState.voters || []).map((v: any) => v.email).join("\n"));
    setAdminEndTimeString(
      dbState.settings?.votingEndTime 
        ? new Date(dbState.settings.votingEndTime).toISOString().slice(0, 16) 
        : ""
    );
  };

  // Admin login credentials check
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Database state document not found.");
      }
      const dbState = docSnap.data();
      const pin = adminPinInput.trim();
      if (pin === dbState.settings?.adminPin) {
        setAdminAuthenticated(true);
        fetchAdminStateWithData(dbState, pin);
      } else {
        throw new Error("Incorrect Administrative Security PIN");
      }
    } catch (err: any) {
      setAdminError(err.message);
    }
  };

  // Get Admin state payload
  const fetchAdminState = async (pin: string) => {
    setAdminIsLoading(true);
    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Database state document not found.");
      }
      const dbState = docSnap.data();
      if (pin !== dbState.settings?.adminPin) {
        throw new Error("Access Denied");
      }
      fetchAdminStateWithData(dbState, pin);
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
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Application state document not found.");
      }
      const dbState = docSnap.data();

      // Verify PIN
      if (adminPinInput !== dbState.settings?.adminPin) {
        throw new Error("Access Denied");
      }

      const timeParsed = adminEndTimeString ? new Date(adminEndTimeString).toISOString() : null;

      // 1. Prepare Settings
      const newSettings = {
        votingConcluded: adminState.settings.votingConcluded,
        votingEndTime: timeParsed,
        adminPin: (adminNewPin && adminNewPin.trim().length >= 4) ? adminNewPin.trim() : dbState.settings.adminPin
      };

      // 2. Prepare Options
      const updatedOptions = editOptions.map((opt: any) => ({
        id: String(opt.id),
        title: String(opt.title || `Poster ${opt.id}`),
        author: String(opt.author || `Presenter ${opt.id}`),
        abstract: opt.abstract || "",
        category: opt.category || "phd_postdoc"
      }));

      // 3. Prepare Whitelist Voters
      const cleanEmails = newVoterEmailList
        .split("\n")
        .map(l => l.trim().toLowerCase())
        .filter(Boolean);

      const existingVoters = dbState.voters || [];
      const updatedVoters = cleanEmails.map(email => {
        const existing = existingVoters.find((v: any) => v.email.toLowerCase() === email);
        if (existing) {
          return existing;
        } else {
          return { email, pin: null, hasVoted: false, votedAt: null };
        }
      });

      // Filter votes to only allow votes from currently whitelisted emails
      const updatedVotes = (dbState.votes || []).filter((v: any) => cleanEmails.includes(v.voterEmail.toLowerCase()));

      // Write directly to Firestore
      await setDoc(docRef, {
        settings: newSettings,
        voters: updatedVoters,
        options: updatedOptions,
        votes: updatedVotes
      });

      setAdminSaveMessage({ text: "All administrative parameters and Whitelist successfully locked in!", type: "success" });

      const finalPin = newSettings.adminPin;
      setAdminPinInput(finalPin);
      setAdminNewPin("");

      // Refresh admin and public state
      fetchAdminState(finalPin);
      fetchPublicState();
    } catch (err: any) {
      setAdminSaveMessage({ text: err.message || "An exception occurred while saving changes", type: "error" });
    }
  };

  // Toggle Concluded Live
  const toggleVotingConcludedState = async (forceState: boolean) => {
    if (!adminState) return;
    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Application state document not found.");
      }
      const dbState = docSnap.data();
      if (adminPinInput !== dbState.settings?.adminPin) {
        throw new Error("Access Denied");
      }

      const settings = {
        ...dbState.settings,
        votingConcluded: forceState
      };

      await updateDoc(docRef, { settings });

      await fetchAdminState(adminPinInput);
      await fetchPublicState();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reset database values
  const handleResetDatabase = async () => {
    if (!confirm("CRITICAL ACTION: Resetting will clear all voter PIN setups and cast poster votes back to zero. Whitelist roster remains. Continue?")) return;
    try {
      const docRef = doc(db, "app", "main");
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Application state document not found.");
      }
      const dbState = docSnap.data();
      if (adminPinInput !== dbState.settings?.adminPin) {
        throw new Error("Access Denied");
      }

      const voters = (dbState.voters || []).map((v: any) => ({
        ...v,
        pin: null,
        hasVoted: false,
        votedAt: null
      }));

      const settings = {
        ...dbState.settings,
        votingConcluded: false,
        votingEndTime: null
      };

      await updateDoc(docRef, {
        votes: [],
        voters,
        settings
      });

      alert("System database has been reset successfully.");
      await fetchAdminState(adminPinInput);
      await fetchPublicState();
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
              To cast your vote, please review the academic poster options below. Enter your credentials on the right board to sign in and register your secure prize vote choice.
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
              <div className="flex flex-col gap-6">
                {/* CATEGORY A: PhD & Postdoc */}
                <div>
                  <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="font-display font-extrabold text-[#1E64C8] text-xs uppercase tracking-wider">
                      PhD & Postdoc Poster Prize
                    </h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    {(publicState?.options || [])
                      .filter(o => o.category === "phd_postdoc" || (o.category === undefined && parseInt(o.id) <= 2))
                      .map((poster) => {
                        const isSelectableToVote = voterStep === "voting" && !publicState?.votingConcluded;
                        const isBallotChoice = selectedPhdPosterId === poster.id;
                        const isLocked = votedCategories.phd_postdoc;

                        return (
                          <div 
                            key={poster.id}
                            onClick={() => {
                              if (isSelectableToVote && !isLocked) {
                                setSelectedPhdPosterId(isBallotChoice ? null : poster.id);
                              }
                            }}
                            className={`border rounded-xl transition-all overflow-hidden ${
                              isBallotChoice 
                                ? "border-[#1E64C8] ring-1 ring-[#1E64C8]/30 shadow-sm bg-slate-50/30" 
                                : "border-slate-200"
                            } ${isSelectableToVote && !isLocked ? "cursor-pointer hover:border-[#1E64C8]/50 hover:bg-slate-50/70" : ""}`}
                          >
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex gap-3">
                                <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                                  isBallotChoice 
                                    ? "bg-[#1E64C8] text-white" 
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {getDisplayId(poster.id)}
                                </span>
                                <div>
                                  <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 block uppercase">
                                    Option {getDisplayId(poster.id)}
                                  </span>
                                  <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-800 leading-tight mt-0.5">
                                    {poster.title}
                                  </h3>
                                  <span className="text-xs font-medium text-[#1E64C8] mt-1 inline-block">
                                    Presenter: {poster.author}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Selection status or select button */}
                              {isSelectableToVote && (
                                <div className="shrink-0 sm:self-center flex justify-end">
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    className={`text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 ${
                                      isLocked
                                        ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                        : isBallotChoice 
                                          ? "bg-amber-500 border border-amber-600 text-white hover:bg-amber-600 animate-pulse" 
                                          : "bg-[#1E64C8]/10 text-[#1E64C8] border border-[#1E64C8]/20 hover:bg-[#1E64C8] hover:text-white"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {isLocked
                                        ? "Locked"
                                        : isBallotChoice ? "Selected" : "Select Poster"
                                      }
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* CATEGORY B: Master Students */}
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-display font-extrabold text-emerald-700 text-xs uppercase tracking-wider">
                      Master Student Poster Prize
                    </h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    {(publicState?.options || [])
                      .filter(o => o.category === "master_student" || (o.category === undefined && parseInt(o.id) > 2))
                      .map((poster) => {
                        const isSelectableToVote = voterStep === "voting" && !publicState?.votingConcluded;
                        const isBallotChoice = selectedMasterPosterId === poster.id;
                        const isLocked = votedCategories.master_student;

                        return (
                          <div 
                            key={poster.id}
                            onClick={() => {
                              if (isSelectableToVote && !isLocked) {
                                setSelectedMasterPosterId(isBallotChoice ? null : poster.id);
                              }
                            }}
                            className={`border rounded-xl transition-all overflow-hidden ${
                              isBallotChoice 
                                ? "border-emerald-600 ring-1 ring-emerald-600/30 shadow-sm bg-slate-50/30" 
                                : "border-slate-200"
                            } ${isSelectableToVote && !isLocked ? "cursor-pointer hover:border-emerald-600/50 hover:bg-slate-50/70" : ""}`}
                          >
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                              <div className="flex gap-3">
                                <span className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                                  isBallotChoice 
                                    ? "bg-emerald-600 text-white" 
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  {getDisplayId(poster.id)}
                                </span>
                                <div>
                                  <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 block uppercase">
                                    Option {getDisplayId(poster.id)}
                                  </span>
                                  <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-800 leading-tight mt-0.5">
                                    {poster.title}
                                  </h3>
                                  <span className="text-xs font-medium text-emerald-700 mt-1 inline-block">
                                    Presenter: {poster.author}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Selection status or select button */}
                              {isSelectableToVote && (
                                <div className="shrink-0 sm:self-center flex justify-end">
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    className={`text-xs font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 ${
                                      isLocked
                                        ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                        : isBallotChoice 
                                          ? "bg-amber-500 border border-amber-600 text-white hover:bg-amber-600 animate-pulse" 
                                          : "bg-emerald-600/10 text-emerald-700 border border-emerald-650/20 hover:bg-emerald-600 hover:text-white"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>
                                      {isLocked
                                        ? "Locked"
                                        : isBallotChoice ? "Selected" : "Select Poster"
                                      }
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
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
                        Input your registered email to authenticate or check ballot verification status.
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

                      <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-slate-700 font-display">
                          Your Active Choice selections:
                        </h4>

                        {/* PhD selection card */}
                        <div className="bg-slate-50 border border-slate-250/50 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                              Category A: PhD & Postdoc Poster Prize
                            </span>
                            {votedCategories.phd_postdoc && (
                              <span className="text-[8px] tracking-wider uppercase font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                                Cast
                              </span>
                            )}
                          </div>
                          {selectedPhdPosterId ? (
                            <div className="bg-white border border-emerald-100 p-2 rounded-lg flex items-start gap-2 shadow-sm">
                              <span className={`h-5 w-5 ${votedCategories.phd_postdoc ? "bg-slate-400" : "bg-[#1E64C8]"} text-white rounded font-mono font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5`} title={`Option ID: ${selectedPhdPosterId}`}>
                                {getDisplayId(selectedPhdPosterId)}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-slate-800 truncate">
                                  "{publicState?.options.find(o => o.id === selectedPhdPosterId)?.title}"
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Presenter: {publicState?.options.find(o => o.id === selectedPhdPosterId)?.author}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No selection yet</span>
                          )}
                        </div>

                        {/* Master selection card */}
                        <div className="bg-slate-50 border border-slate-250/50 rounded-xl p-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                              Category B: Master Student Poster Prize
                            </span>
                            {votedCategories.master_student && (
                              <span className="text-[8px] tracking-wider uppercase font-extrabold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                                Cast
                              </span>
                            )}
                          </div>
                          {selectedMasterPosterId ? (
                            <div className="bg-white border border-emerald-100 p-2 rounded-lg flex items-start gap-2 shadow-sm">
                              <span className={`h-5 w-5 ${votedCategories.master_student ? "bg-slate-400" : "bg-emerald-600"} text-white rounded font-mono font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5`} title={`Option ID: ${selectedMasterPosterId}`}>
                                {getDisplayId(selectedMasterPosterId)}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-slate-800 truncate">
                                  "{publicState?.options.find(o => o.id === selectedMasterPosterId)?.title}"
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  Presenter: {publicState?.options.find(o => o.id === selectedMasterPosterId)?.author}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No selection yet</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCastVote}
                        disabled={
                          submittingVote || 
                          ((!votedCategories.phd_postdoc && !selectedPhdPosterId) && 
                           (!votedCategories.master_student && !selectedMasterPosterId))
                        }
                        className={`w-full py-3 px-5 text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                          ((!votedCategories.phd_postdoc && selectedPhdPosterId) || (!votedCategories.master_student && selectedMasterPosterId)) 
                            ? "bg-[#1E64C8] hover:bg-[#15458c] text-white shadow-md hover:shadow-lg" 
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        }`}
                      >
                        {submittingVote ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {votedCategories.phd_postdoc || votedCategories.master_student
                                ? "Cast Remaining Ballot"
                                : "Cast Selected Ballot(s)"
                              }
                            </span>
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
                        Your secure, authoritative choices have been locked on the UGent central portal for <strong className="text-slate-700">{tempVoterEmail}</strong>.
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
                          <span className="text-slate-400">BALLOTS</span>
                          <span className="text-slate-700 font-bold">UGENT BOTH CATEGORIES CAST</span>
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
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2 border border-slate-150">
                <div 
                  className="bg-[#1E64C8] h-2 rounded-full transition-all duration-[1200ms] ease-out" 
                  style={{ width: `${turnoutPercent}%` }}
                ></div>
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

                            // 1. PhD winners
                            const phdOpts = validOptions.filter(o => o.category === "phd_postdoc" || (o.category === undefined && parseInt(o.id) <= 2));
                            const phdMaxVotes = phdOpts.length > 0 ? Math.max(...phdOpts.map(o => o.votes || 0)) : 0;
                            const phdWinners = phdOpts.filter(o => (o.votes || 0) === phdMaxVotes && phdMaxVotes > 0);

                            // 2. Master Student winners
                            const masterOpts = validOptions.filter(o => o.category === "master_student" || (o.category === undefined && parseInt(o.id) > 2));
                            const masterMaxVotes = masterOpts.length > 0 ? Math.max(...masterOpts.map(o => o.votes || 0)) : 0;
                            const masterWinners = masterOpts.filter(o => (o.votes || 0) === masterMaxVotes && masterMaxVotes > 0);

                            const noVotesCast = phdMaxVotes === 0 && masterMaxVotes === 0;

                            if (noVotesCast) {
                              return (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 text-center font-medium">
                                  No secure ballots have been cast under the currently loaded whitelist system yet.
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* PhD Winner Badge */}
                                <div className="bg-gradient-to-br from-[#1E64C8] to-[#15458c] text-white p-4.5 rounded-xl flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm border border-[#1E64C8]">
                                  <div className="absolute -right-4 -bottom-4 opacity-10 select-none">
                                    <Trophy className="w-20 h-20 text-white" />
                                  </div>
                                  <div className="z-10">
                                    <span className="bg-[#FFD200] text-slate-900 text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded select-none">
                                      ★ PhD & Postdoc Winner ★
                                    </span>
                                    {phdWinners.length > 0 ? (
                                      <>
                                        <h4 className="font-display font-extrabold text-sm tracking-tight mt-2 text-[#FFD200]">
                                          {phdWinners.map(w => `Option ${getDisplayId(w.id)}: "${w.title}"`).join(" & ")}
                                        </h4>
                                        <span className="text-[10px] text-slate-200 mt-0.5 block truncate">
                                          Presenter: {phdWinners.map(w => w.author).join(", ")}
                                        </span>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-200 mt-2">No votes cast</p>
                                    )}
                                  </div>
                                  <div className="z-10 bg-white/20 px-3 py-1.5 rounded-lg border border-white/25 self-start text-center">
                                    <span className="text-[8px] font-mono text-slate-200 uppercase block">Ballots</span>
                                    <span className="font-mono text-sm font-bold text-[#FFD200]">{phdMaxVotes}</span>
                                  </div>
                                </div>

                                {/* Master Winner Badge */}
                                <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white p-4.5 rounded-xl flex flex-col justify-between gap-3 relative overflow-hidden shadow-sm border border-emerald-800">
                                  <div className="absolute -right-4 -bottom-4 opacity-10 select-none">
                                    <Trophy className="w-20 h-20 text-white" />
                                  </div>
                                  <div className="z-10">
                                    <span className="bg-[#FFD200] text-slate-900 text-[8px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded select-none">
                                      ★ Master Student Winner ★
                                    </span>
                                    {masterWinners.length > 0 ? (
                                      <>
                                        <h4 className="font-display font-extrabold text-sm tracking-tight mt-2 text-[#FFD200]">
                                          {masterWinners.map(w => `Option ${getDisplayId(w.id)}: "${w.title}"`).join(" & ")}
                                        </h4>
                                        <span className="text-[10px] text-slate-200 mt-0.5 block truncate">
                                          Presenter: {masterWinners.map(w => w.author).join(", ")}
                                        </span>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-200 mt-2">No votes cast</p>
                                    )}
                                  </div>
                                  <div className="z-10 bg-white/20 px-3 py-1.5 rounded-lg border border-white/25 self-start text-center">
                                    <span className="text-[8px] font-mono text-slate-200 uppercase block">Ballots</span>
                                    <span className="font-mono text-sm font-bold text-[#FFD200]">{masterMaxVotes}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Certified Bar Tally Display */}
                          <div className="border border-slate-200 rounded-xl p-5 flex flex-col gap-5">
                            <h4 className="text-xs font-mono font-extrabold text-slate-450 uppercase tracking-wide">
                              OFFICIAL BALLOT RECIPIENT GRAPH CHARTS
                            </h4>

                            <div className="flex flex-col gap-6">
                              {/* PHD CATEGORY GRAPH */}
                              <div className="border-b border-slate-100 pb-4">
                                <span className="text-[10px] uppercase font-bold text-slate-500 font-mono block mb-2.5">
                                  Category A: PhD & Postdoc Tallies
                                </span>
                                <div className="flex flex-col gap-3">
                                  {(() => {
                                    const phdOpts = adminState.options.filter(o => o.category === "phd_postdoc" || (o.category === undefined && parseInt(o.id) <= 2));
                                    const phdVotesTotal = adminState.votes.filter(v => phdOpts.some(o => o.id === v.optionId)).length;
                                    const maxPhdVotesVal = Math.max(...phdOpts.map(o => o.votes), 1);

                                    return phdOpts.map((opt) => {
                                      const votes = opt.votes || 0;
                                      const pctVal = phdVotesTotal > 0 ? Math.round((votes / phdVotesTotal) * 100) : 0;
                                      const barWidthPct = Math.max((votes / maxPhdVotesVal) * 100, 3);

                                      return (
                                        <div key={opt.id} className="text-xs flex flex-col gap-1">
                                          <div className="flex justify-between font-medium text-slate-700">
                                            <span className="truncate max-w-[250px]">
                                              Option {getDisplayId(opt.id)}: {opt.title} ({opt.author})
                                            </span>
                                            <span className="font-mono text-slate-500 font-bold shrink-0">
                                              {votes} votes ({pctVal}%)
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded h-3 overflow-hidden">
                                            <div 
                                              className="bg-[#1E64C8] h-full rounded transition-all duration-[800ms]"
                                              style={{ width: `${barWidthPct}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>

                              {/* MASTER CATEGORY GRAPH */}
                              <div>
                                <span className="text-[10px] uppercase font-bold text-emerald-700 font-mono block mb-2.5">
                                  Category B: Master Student Tallies
                                </span>
                                <div className="flex flex-col gap-3">
                                  {(() => {
                                    const masterOpts = adminState.options.filter(o => o.category === "master_student" || (o.category === undefined && parseInt(o.id) > 2));
                                    const masterVotesTotal = adminState.votes.filter(v => masterOpts.some(o => o.id === v.optionId)).length;
                                    const maxMasterVotesVal = Math.max(...masterOpts.map(o => o.votes), 1);

                                    return masterOpts.map((opt) => {
                                      const votes = opt.votes || 0;
                                      const pctVal = masterVotesTotal > 0 ? Math.round((votes / masterVotesTotal) * 100) : 0;
                                      const barWidthPct = Math.max((votes / maxMasterVotesVal) * 100, 3);

                                      return (
                                        <div key={opt.id} className="text-xs flex flex-col gap-1">
                                          <div className="flex justify-between font-medium text-slate-700">
                                            <span className="truncate max-w-[250px]">
                                              Option {getDisplayId(opt.id)}: {opt.title} ({opt.author})
                                            </span>
                                            <span className="font-mono text-emerald-700 font-bold shrink-0">
                                              {votes} votes ({pctVal}%)
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-100 rounded h-3 overflow-hidden">
                                            <div 
                                              className="bg-emerald-600 h-full rounded transition-all duration-[800ms]"
                                              style={{ width: `${barWidthPct}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
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
                                        <span className="text-[#1E64C8] font-black uppercase">Option {getDisplayId(vote.optionId)}</span>
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
                              To introduce additional voters, register their official emails inside the field below (one email address per line). Saving will automatically update the authorized email list for the Poster Prize.
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
                              Voters listed here can immediately sign in and vote using their email address.
                            </span>
                          </div>

                          {/* Current Status Log Table */}
                           <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                              CURRENT ROSTER STATUS
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
                              {adminState.voters.map((voter) => {
                                const vVotes = adminState.votes.filter(v => v.voterEmail.toLowerCase() === voter.email.toLowerCase());
                                const hasVotedPhd = vVotes.some(v => {
                                  if (v.category === "phd_postdoc") return true;
                                  const opt = adminState.options.find(o => o.id === v.optionId);
                                  return opt?.category === "phd_postdoc" || (!v.category && !opt?.category && parseInt(v.optionId) <= 2);
                                });
                                const hasVotedMaster = vVotes.some(v => {
                                  if (v.category === "master_student") return true;
                                  const opt = adminState.options.find(o => o.id === v.optionId);
                                  return opt?.category === "master_student" || (!v.category && !opt?.category && parseInt(v.optionId) > 2);
                                });

                                return (
                                  <div key={voter.email} className="px-4 py-3 text-xs flex justify-between items-center bg-white">
                                    <div>
                                      <span className="font-mono text-slate-700 font-semibold block">{voter.email}</span>
                                      <div className="flex gap-2.5 mt-1 text-[10px]">
                                        <span className={`font-medium ${hasVotedPhd ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                                          PhD: {hasVotedPhd ? "Cast" : "Pending"}
                                        </span>
                                        <span className="text-slate-300">|</span>
                                        <span className={`font-medium ${hasVotedMaster ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                                          Master: {hasVotedMaster ? "Cast" : "Pending"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                      <span className={`inline-flex items-center gap-1 font-bold text-[9px] px-2 py-0.5 rounded uppercase ${
                                        voter.hasVoted 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                          : (hasVotedPhd || hasVotedMaster)
                                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                                            : "bg-slate-100 text-slate-400 border border-slate-200"
                                      }`}>
                                        {voter.hasVoted ? "Both Cast" : (hasVotedPhd || hasVotedMaster) ? "Partial" : "Pending"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
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
                                    <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Prize Category Type</label>
                                    <select
                                      value={opt.category || "phd_postdoc"}
                                      onChange={(e) => {
                                        const buffer = [...editOptions];
                                        buffer[idx].category = e.target.value;
                                        setEditOptions(buffer);
                                      }}
                                      className="bg-white border border-[#1E64C8] p-2 rounded-lg text-xs text-[#1E64C8] font-bold"
                                    >
                                      <option value="phd_postdoc">PhD & Postdoc Poster Prize</option>
                                      <option value="master_student">Master Student Poster Prize</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1 mt-1">
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
