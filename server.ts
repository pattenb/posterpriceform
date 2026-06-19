import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Initialize Firebase Client SDK globally as a workaround for Admin SDK IAM constraints
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let firestoreDb: ReturnType<typeof getFirestore> | null = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    let app;
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
    } else {
      app = getApp();
    }
    const dbId = config.firestoreDatabaseId || "(default)";
    firestoreDb = getFirestore(app, dbId);
    console.log(`Firebase SDK initialized successfully with database ID: ${dbId}`);
  } catch (error) {
    console.error("Failed to initialize Firebase SDK, utilizing local database fallback:", error);
  }
} else {
  console.warn("firebase-applet-config.json not found, utilizing local database.");
}


// Define DB Types
interface Voter {
  email: string;
  pin: string | null;
  hasVoted: boolean;
  votedAt: string | null;
}

interface VotingOption {
  id: string;
  category?: "phd_postdoc" | "master_student";
  title: string;
  author: string;
  abstract: string;
}

interface VoteEntry {
  voterEmail: string;
  optionId: string;
  timestamp: string;
  category?: "phd_postdoc" | "master_student";
}

interface DbSchema {
  settings: {
    votingConcluded: boolean;
    votingEndTime: string | null; // ISO Date String
    adminPin: string;
  };
  voters: Voter[];
  options: VotingOption[];
  votes: VoteEntry[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

// Initial/default Database State
const DEFAULT_DB: DbSchema = {
  settings: {
    votingConcluded: false,
    votingEndTime: null,
    adminPin: "1234", // Default admin PIN, changeable or authenticable
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

// In-Memory global database cache to guarantee instant, cross-device multi-computer synchronization
let memoryDb: DbSchema | null = null;

// Helper to Read DB
async function readDb(): Promise<DbSchema> {
  // Always query cloud first if firestore exists to ensure multi-container synchronization
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "app", "state");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as DbSchema;
        if (data && data.voters && data.options) {
          memoryDb = data;
          return data;
        }
<<<<<<< HEAD
=======
      } else {
        console.log("No database state document in Firestore. Bootstrapping with DEFAULT_DB...");
        await setDoc(docRef, DEFAULT_DB);
        memoryDb = { ...DEFAULT_DB };
        return memoryDb;
>>>>>>> 10a97bcb927cd63327a6c864aa2d28f85756e090
      }
      
      console.log("No valid database state in Firestore. Bootstrapping with DEFAULT_DB...");
      await setDoc(docRef, DEFAULT_DB);
      memoryDb = { ...DEFAULT_DB };
      return memoryDb;
    } catch (error) {
      console.error("Error reading database state from Firestore, falling back to local storage:", error);
    }
  }

  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      memoryDb = JSON.parse(data);
      return memoryDb!;
    }
  } catch (error) {
    console.error("Error reading database file, using defaults:", error);
  }
  
  memoryDb = { ...DEFAULT_DB };
  return memoryDb;
}

// Helper to Write DB
async function writeDb(data: DbSchema): Promise<void> {
  memoryDb = data;
  
  if (firestoreDb) {
    try {
      const docRef = doc(firestoreDb, "app", "state");
      await setDoc(docRef, data);
    } catch (error) {
      console.error("Error writing database state to Firestore:", error);
    }
  }

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

async function startServer() {
  // Bootstrap global database state (async)
  const initialDb = await readDb();
  await writeDb(initialDb);

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==================== API ROUTES ====================

  // Public state: get list of options (with votes hidden if not concluded) and end status
  app.get(["/api/state", "/posterpriceform/api/state"], async (req, res) => {
    const db = await readDb();
    
    // Check if time has concluded voting automatically
    let concluded = db.settings.votingConcluded;
    if (db.settings.votingEndTime) {
      const endTime = new Date(db.settings.votingEndTime).getTime();
      const now = new Date().getTime();
      if (now >= endTime && !db.settings.votingConcluded) {
        db.settings.votingConcluded = true;
        await writeDb(db);
        concluded = true;
      }
    }

    // ALWAYS hide specific poster vote counts in the public API state to ensure results are restricted to admin
    const displayOptions = db.options.map(opt => {
      return { ...opt, votes: null };
    });

    res.json({
      votingConcluded: concluded,
      votingEndTime: db.settings.votingEndTime,
      options: displayOptions,
      totalVotersCount: db.voters.length,
      totalVotesCast: db.votes.length,
      votersList: []
    });
  });

  // Check email status
  app.post(["/api/check-email", "/posterpriceform/api/check-email"], async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const db = await readDb();
    const normalizedEmail = email.trim().toLowerCase();
    const voter = db.voters.find(v => v.email.toLowerCase() === normalizedEmail);

    if (!voter) {
      res.json({
        isWhitelisted: false,
        hasVoted: false,
        votedCategories: {
          phd_postdoc: false,
          master_student: false
        },
        votedOptionIds: []
      });
      return;
    }

    const userVotes = db.votes.filter(v => v.voterEmail.toLowerCase() === normalizedEmail);
    const votedPhd = userVotes.some(v => v.category === "phd_postdoc");
    const votedMaster = userVotes.some(v => v.category === "master_student");
    const hasVotedAll = votedPhd && votedMaster;

    res.json({
      isWhitelisted: true,
      hasVoted: hasVotedAll,
      votedCategories: {
        phd_postdoc: votedPhd,
        master_student: votedMaster
      },
      votedOptionIds: userVotes.map(v => v.optionId)
    });
  });

  // Cast vote
  app.post(["/api/vote", "/posterpriceform/api/vote"], async (req, res) => {
    const { email, phdPosterId, masterPosterId, optionId } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const db = await readDb();
    
    // Check if voting is concluded first
    let concluded = db.settings.votingConcluded;
    if (db.settings.votingEndTime) {
      const endTime = new Date(db.settings.votingEndTime).getTime();
      const now = new Date().getTime();
      if (now >= endTime) {
        db.settings.votingConcluded = true;
        await writeDb(db);
        concluded = true;
      }
    }

    if (concluded) {
      res.status(400).json({ error: "The voting period has concluded!" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const voterIndex = db.voters.findIndex(v => v.email.toLowerCase() === normalizedEmail);

    if (voterIndex === -1) {
      res.status(403).json({ error: "Email not whitelisted" });
      return;
    }

    const userVotes = db.votes.filter(v => v.voterEmail.toLowerCase() === normalizedEmail);
    const votedPhd = userVotes.some(v => v.category === "phd_postdoc");
    const votedMaster = userVotes.some(v => v.category === "master_student");

    if (votedPhd && votedMaster) {
      res.status(400).json({ error: "You have already cast ballots for both categories!" });
      return;
    }

    // Determine the selections
    const selections: string[] = [];
    if (phdPosterId && !votedPhd) {
      const exists = db.options.some(o => o.id === phdPosterId);
      if (!exists) {
        res.status(400).json({ error: "Selected PhD/Postdoc option is invalid" });
        return;
      }
      selections.push(phdPosterId);
    }
    if (masterPosterId && !votedMaster) {
      const exists = db.options.some(o => o.id === masterPosterId);
      if (!exists) {
        res.status(400).json({ error: "Selected Master Student option is invalid" });
        return;
      }
      selections.push(masterPosterId);
    }

    // If they used a legacy API route or direct single submission
    if (selections.length === 0 && optionId) {
      const opt = db.options.find(o => o.id === optionId);
      if (!opt) {
        res.status(400).json({ error: "Invalid poster option selected." });
        return;
      }
      const alreadyVotedCat = userVotes.some(v => v.category === opt.category);
      if (alreadyVotedCat) {
        res.status(400).json({ error: "You have already cast a ballot for this category!" });
        return;
      }
      selections.push(optionId);
    }

    if (selections.length === 0) {
      res.status(400).json({ error: "You have already voted for the selected category or made no selection!" });
      return;
    }

    const timestamp = new Date().toISOString();
    for (const sId of selections) {
      const opt = db.options.find(o => o.id === sId);
      db.votes.push({
        voterEmail: normalizedEmail,
        optionId: sId,
        timestamp,
        category: opt?.category
      });
    }

    // Re-evaluate if voter has now voted in both categories
    const allVotesAfter = db.votes.filter(v => v.voterEmail.toLowerCase() === normalizedEmail);
    const hasPhdAfter = allVotesAfter.some(v => v.category === "phd_postdoc");
    const hasMasterAfter = allVotesAfter.some(v => v.category === "master_student");

    db.voters[voterIndex].hasVoted = hasPhdAfter && hasMasterAfter;
    db.voters[voterIndex].votedAt = timestamp;

    await writeDb(db);
    res.json({ 
      success: true, 
      message: "Vote cast successfully!", 
      isComplete: hasPhdAfter && hasMasterAfter 
    });
  });

  // Admin login check
  app.post(["/api/admin/login", "/posterpriceform/api/admin/login"], async (req, res) => {
    const { adminPin } = req.body;
    const db = await readDb();
    if (adminPin === db.settings.adminPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid Admin PIN" });
    }
  });

  // Admin: Get Full State (including raw votes with counts)
  app.post(["/api/admin/state", "/posterpriceform/api/admin/state"], async (req, res) => {
    const { adminPin } = req.body;
    const db = await readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    const displayOptions = db.options.map(opt => {
      const voteCount = db.votes.filter(v => v.optionId === opt.id).length;
      return { ...opt, votes: voteCount };
    });

    res.json({
      settings: db.settings,
      voters: db.voters,
      options: displayOptions,
      votes: db.votes
    });
  });

  // Admin: Update settings
  app.post(["/api/admin/update-settings", "/posterpriceform/api/admin/update-settings"], async (req, res) => {
    const { adminPin, votingConcluded, votingEndTime, newAdminPin } = req.body;
    const db = await readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    db.settings.votingConcluded = votingConcluded;
    db.settings.votingEndTime = votingEndTime;
    if (newAdminPin && typeof newAdminPin === "string" && newAdminPin.trim().length >= 4) {
      db.settings.adminPin = newAdminPin.trim();
    }

    await writeDb(db);
    res.json({ success: true, settings: db.settings });
  });

  // Admin: Update Whitelist
  app.post(["/api/admin/update-whitelist", "/posterpriceform/api/admin/update-whitelist"], async (req, res) => {
    const { adminPin, emails } = req.body;
    const db = await readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    if (!Array.isArray(emails)) {
      res.status(400).json({ error: "Emails must be an array" });
      return;
    }

    // Process new whitelist
    const currentVoters = db.voters;
    const cleanEmails = emails.map(e => e.trim().toLowerCase()).filter(Boolean);

    const updatedVoters = cleanEmails.map(email => {
      const existing = currentVoters.find(v => v.email.toLowerCase() === email);
      if (existing) {
        return existing;
      } else {
        return { email, pin: null, hasVoted: false, votedAt: null };
      }
    });

    db.voters = updatedVoters;
    
    // Purge votes from voters no longer in whitelist to keep integrity
    db.votes = db.votes.filter(v => cleanEmails.includes(v.voterEmail));

    await writeDb(db);
    res.json({ success: true, voters: db.voters });
  });

  // Admin: Update Posters Details (options)
  app.post(["/api/admin/update-options", "/posterpriceform/api/admin/update-options"], async (req, res) => {
    const { adminPin, options } = req.body;
    const db = await readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    if (!Array.isArray(options)) {
      res.status(400).json({ error: "Options must be an array" });
      return;
    }

    db.options = options.map((opt: any) => ({
      id: String(opt.id),
      category: opt.category === "phd_postdoc" ? "phd_postdoc" : "master_student",
      title: String(opt.title || `Poster ${opt.id}`),
      author: String(opt.author || `Presenter ${opt.id}`),
      abstract: String(opt.abstract || "")
    }));

    await writeDb(db);
    res.json({ success: true, options: db.options });
  });

  // Admin: Reset Votes and PINs
  app.post(["/api/admin/reset", "/posterpriceform/api/admin/reset"], async (req, res) => {
    const { adminPin } = req.body;
    const db = await readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    db.votes = [];
    db.voters = db.voters.map(v => ({
      ...v,
      pin: null,
      hasVoted: false,
      votedAt: null
    }));
    db.settings.votingConcluded = false;
    db.settings.votingEndTime = null;

    await writeDb(db);
    res.json({ success: true });
  });

  // ==================== END PUBLIC API ====================

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/posterpriceform", express.static(distPath));
    app.use(express.static(distPath));
    // Serve client
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL ERROR STARTING SERVER:", err);
  process.exit(1);
});
