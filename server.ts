import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Define DB Types
interface Voter {
  email: string;
  pin: string | null;
  hasVoted: boolean;
  votedAt: string | null;
}

interface VotingOption {
  id: string;
  title: string;
  author: string;
  abstract: string;
}

interface VoteEntry {
  voterEmail: string;
  optionId: string;
  timestamp: string;
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
    { email: "borrapat@gmail.com", pin: null, hasVoted: false, votedAt: null }
  ],
  options: [
    {
      id: "1",
      title: "Poster 1",
      author: "Presenter 1",
      abstract: "Abstract or description for Poster 1. The admin can update this text to its final title, presenter and content later using the settings gear in the top right."
    },
    {
      id: "2",
      title: "Poster 2",
      author: "Presenter 2",
      abstract: "Abstract or description for Poster 2. The admin can update this text to its final title, presenter and content later using the settings gear in the top right."
    },
    {
      id: "3",
      title: "Poster 3",
      author: "Presenter 3",
      abstract: "Abstract or description for Poster 3. The admin can update this text to its final title, presenter and content later using the settings gear in the top right."
    },
    {
      id: "4",
      title: "Poster 4",
      author: "Presenter 4",
      abstract: "Abstract or description for Poster 4. The admin can update this text to its final title, presenter and content later using the settings gear in the top right."
    }
  ],
  votes: []
};

// Helper to Read DB
function readDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, using defaults:", error);
  }
  return DEFAULT_DB;
}

// Helper to Write DB
function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Ensure database file exists on startup
if (!fs.existsSync(DB_FILE)) {
  writeDb(DEFAULT_DB);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==================== API ROUTES ====================

  // Public state: get list of options (with votes hidden if not concluded) and end status
  app.get("/api/state", (req, res) => {
    const db = readDb();
    
    // Check if time has concluded voting automatically
    let concluded = db.settings.votingConcluded;
    if (db.settings.votingEndTime) {
      const endTime = new Date(db.settings.votingEndTime).getTime();
      const now = new Date().getTime();
      if (now >= endTime && !db.settings.votingConcluded) {
        db.settings.votingConcluded = true;
        writeDb(db);
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
      votersList: db.voters.map(v => ({
        email: v.email,
        hasVoted: v.hasVoted,
        votedAt: v.votedAt
      }))
    });
  });

  // Check email status
  app.post("/api/check-email", (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const db = readDb();
    const normalizedEmail = email.trim().toLowerCase();
    const voter = db.voters.find(v => v.email.toLowerCase() === normalizedEmail);

    if (!voter) {
      res.json({
        isWhitelisted: false,
        hasVoted: false,
        needsPinSetup: false
      });
      return;
    }

    res.json({
      isWhitelisted: true,
      hasVoted: voter.hasVoted,
      needsPinSetup: voter.pin === null
    });
  });

  // Authenticate / Register PIN for voter
  app.post("/api/voter-login", (req, res) => {
    const { email, pin } = req.body;
    if (!email || !pin || typeof email !== "string" || typeof pin !== "string") {
      res.status(400).json({ error: "Email and PIN are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (cleanPin.length < 4) {
      res.status(400).json({ error: "PIN must be at least 4 digits" });
      return;
    }

    const db = readDb();
    const voterIndex = db.voters.findIndex(v => v.email.toLowerCase() === normalizedEmail);

    if (voterIndex === -1) {
      res.status(403).json({ error: "Email not whitelisted" });
      return;
    }

    const voter = db.voters[voterIndex];

    if (voter.pin === null) {
      // Setup new PIN
      db.voters[voterIndex].pin = cleanPin;
      writeDb(db);
      res.json({ success: true, message: "PIN registered successfully" });
      return;
    } else if (voter.pin !== cleanPin) {
      res.status(401).json({ error: "Incorrect PIN" });
      return;
    }

    res.json({ success: true, message: "Logged in successfully" });
  });

  // Cast vote
  app.post("/api/vote", (req, res) => {
    const { email, pin, optionId } = req.body;
    if (!email || !pin || !optionId) {
      res.status(400).json({ error: "Email, PIN, and Option are required" });
      return;
    }

    const db = readDb();
    
    // Check if voting is concluded first
    let concluded = db.settings.votingConcluded;
    if (db.settings.votingEndTime) {
      const endTime = new Date(db.settings.votingEndTime).getTime();
      const now = new Date().getTime();
      if (now >= endTime) {
        db.settings.votingConcluded = true;
        writeDb(db);
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

    const voter = db.voters[voterIndex];

    if (voter.pin !== pin) {
      res.status(401).json({ error: "Incorrect PIN. Cannot complete vote." });
      return;
    }

    if (voter.hasVoted) {
      res.status(400).json({ error: "You have already cast your vote!" });
      return;
    }

    const optionExists = db.options.some(o => o.id === optionId);
    if (!optionExists) {
      res.status(400).json({ error: "Invalid poster option selected." });
      return;
    }

    // Cast the vote
    const timestamp = new Date().toISOString();
    db.votes.push({
      voterEmail: normalizedEmail,
      optionId,
      timestamp
    });

    db.voters[voterIndex].hasVoted = true;
    db.voters[voterIndex].votedAt = timestamp;

    writeDb(db);
    res.json({ success: true, message: "Vote cast successfully!" });
  });

  // Admin login check
  app.post("/api/admin/login", (req, res) => {
    const { adminPin } = req.body;
    const db = readDb();
    if (adminPin === db.settings.adminPin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid Admin PIN" });
    }
  });

  // Admin: Get Full State (including raw votes with counts)
  app.post("/api/admin/state", (req, res) => {
    const { adminPin } = req.body;
    const db = readDb();
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
  app.post("/api/admin/update-settings", (req, res) => {
    const { adminPin, votingConcluded, votingEndTime, newAdminPin } = req.body;
    const db = readDb();
    if (adminPin !== db.settings.adminPin) {
      res.status(401).json({ error: "Access Denied" });
      return;
    }

    db.settings.votingConcluded = votingConcluded;
    db.settings.votingEndTime = votingEndTime;
    if (newAdminPin && typeof newAdminPin === "string" && newAdminPin.trim().length >= 4) {
      db.settings.adminPin = newAdminPin.trim();
    }

    writeDb(db);
    res.json({ success: true, settings: db.settings });
  });

  // Admin: Update Whitelist
  app.post("/api/admin/update-whitelist", (req, res) => {
    const { adminPin, emails } = req.body;
    const db = readDb();
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

    writeDb(db);
    res.json({ success: true, voters: db.voters });
  });

  // Admin: Update Posters Details (options)
  app.post("/api/admin/update-options", (req, res) => {
    const { adminPin, options } = req.body;
    const db = readDb();
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
      title: String(opt.title || `Poster ${opt.id}`),
      author: String(opt.author || `Presenter ${opt.id}`),
      abstract: String(opt.abstract || "")
    }));

    writeDb(db);
    res.json({ success: true, options: db.options });
  });

  // Admin: Reset Votes and PINs
  app.post("/api/admin/reset", (req, res) => {
    const { adminPin } = req.body;
    const db = readDb();
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

    writeDb(db);
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
