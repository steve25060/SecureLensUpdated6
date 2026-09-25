-- Migration 0001: Initial schema for SecureLens
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'USER',
  organization TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'WEBSITE',
  target_url TEXT,
  repo_url TEXT,
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  type TEXT DEFAULT 'WEBSITE',
  mode TEXT DEFAULT 'website',
  profile TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'COMPLETED',
  target TEXT NOT NULL,
  target_url TEXT,
  engines TEXT DEFAULT '[]',
  risk_score INTEGER DEFAULT 0,
  findings_count INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 100,
  current_phase TEXT DEFAULT 'Completed',
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  workspace_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  cve TEXT,
  cwe TEXT,
  engine TEXT,
  target TEXT,
  file_path TEXT,
  line_number INTEGER,
  status TEXT DEFAULT 'OPEN',
  remediation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  user_id TEXT,
  title TEXT NOT NULL,
  format TEXT DEFAULT 'PDF',
  status TEXT DEFAULT 'COMPLETED',
  risk_score INTEGER DEFAULT 0,
  summary TEXT,
  findings_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  level TEXT DEFAULT 'INFO',
  message TEXT NOT NULL,
  engine TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial demo user and default workspace
INSERT OR IGNORE INTO users (id, email, name, password_hash, role, organization)
VALUES (
  'usr_demo_001',
  'test@gmail.com',
  'Stavan Shah',
  'demo_hashed_pw',
  'USER',
  'SecureLens Security'
);

INSERT OR IGNORE INTO workspaces (id, user_id, name, description, type, target_url, tags)
VALUES (
  'ws_default_001',
  'usr_demo_001',
  'Production Web App',
  'Primary production web surface audit',
  'WEBSITE',
  'https://uptoskills.com',
  '["production", "primary"]'
);
