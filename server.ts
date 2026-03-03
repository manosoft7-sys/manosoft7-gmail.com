import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: 'uploads/' });

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";
let db = new Database("colis.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'agent',
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS parcels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking TEXT UNIQUE,
    sender TEXT,
    mobile TEXT,
    willaya TEXT,
    location TEXT,
    amount REAL,
    product TEXT,
    status TEXT,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add role column if not exists
try {
  db.prepare("SELECT role FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'agent'");
}

// Migration: Add active column if not exists
try {
  db.prepare("SELECT active FROM users LIMIT 1").get();
} catch (e) {
  db.exec("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1");
}

// Create default admin user if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
} else {
  // Ensure existing admin has admin role
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Admin only." });
    }
  };

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
      if (user.active === 0) {
        return res.status(403).json({ error: "Account is deactivated" });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // User Management Routes
  app.get("/api/users", authenticateToken, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, role, active FROM users").all();
    res.json(users);
  });

  app.post("/api/users", authenticateToken, isAdmin, (req, res) => {
    const { username, password, role, active } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (username, password, role, active) VALUES (?, ?, ?, ?)").run(username, hashedPassword, role || 'agent', active !== undefined ? active : 1);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { username, password, role, active } = req.body;
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET username = ?, password = ?, role = ?, active = ? WHERE id = ?").run(username, hashedPassword, role, active, id);
      } else {
        db.prepare("UPDATE users SET username = ?, role = ?, active = ? WHERE id = ?").run(username, role, active, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/users/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    // Prevent deleting the last admin or the current user if needed, but keeping it simple for now
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/parcels", authenticateToken, (req, res) => {
    const parcels = db.prepare("SELECT * FROM parcels ORDER BY created_at DESC").all();
    res.json(parcels);
  });

  app.post("/api/parcels", authenticateToken, (req, res) => {
    const { tracking, sender, mobile, willaya, location, amount, product, status, image } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO parcels (tracking, sender, mobile, willaya, location, amount, product, status, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(tracking, sender, mobile, willaya, location, amount, product, status, image);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/parcels/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { tracking, sender, mobile, willaya, location, amount, product, status, image } = req.body;
    try {
      db.prepare(`
        UPDATE parcels 
        SET tracking = ?, sender = ?, mobile = ?, willaya = ?, location = ?, amount = ?, product = ?, status = ?, image = ?
        WHERE id = ?
      `).run(tracking, sender, mobile, willaya, location, amount, product, status, image, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/parcels/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM parcels WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/stats", authenticateToken, (req, res) => {
    try {
      const stats = db.prepare("SELECT status, COUNT(*) as count FROM parcels GROUP BY status").all();
      res.json(stats);
    } catch (error: any) {
      console.error("Stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/db/backup", authenticateToken, isAdmin, (req, res) => {
    const dbPath = path.join(__dirname, "colis.db");
    res.download(dbPath, `backup_${new Date().toISOString().split('T')[0]}.db`);
  });

  app.post("/api/db/restore", authenticateToken, isAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const dbPath = path.join(__dirname, "colis.db");
    const tempPath = req.file.path;

    try {
      db.close();
      fs.copyFileSync(tempPath, dbPath);
      fs.unlinkSync(tempPath);
      db = new Database("colis.db");
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
