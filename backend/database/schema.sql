CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  output_mode TEXT NOT NULL DEFAULT 'text',
  language TEXT NOT NULL DEFAULT 'pt',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  meta TEXT DEFAULT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS summaries (
  session_id TEXT PRIMARY KEY,
  summary TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credits (
  session_id TEXT PRIMARY KEY,
  balance_cents INTEGER NOT NULL DEFAULT 100,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  type TEXT NOT NULL,
  input_units INTEGER NOT NULL DEFAULT 0,
  output_units INTEGER NOT NULL DEFAULT 0,
  cost_millicents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'student',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  user_id TEXT PRIMARY KEY,
  native_language TEXT DEFAULT 'pt',
  target_language TEXT NOT NULL,
  level TEXT DEFAULT 'A1',
  goals TEXT,
  correction_style TEXT DEFAULT 'moderado',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT,
  lesson_id TEXT,
  target_language TEXT,
  level TEXT,
  status TEXT,
  score INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  attempts INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS user_lesson_state (
  user_id TEXT PRIMARY KEY,
  lesson_id TEXT,
  step_index INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS lesson_attempt_details (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  lesson_id TEXT,
  step_index INTEGER,
  user_input TEXT,
  overall_score INTEGER,
  feedback_json TEXT,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS learning_memory (
  user_id TEXT,
  target_language TEXT,
  weak_vocab TEXT DEFAULT '[]',
  weak_grammar TEXT DEFAULT '[]',
  recurring_errors TEXT DEFAULT '[]',
  last_feedback TEXT DEFAULT '{}',
  updated_at TEXT,
  PRIMARY KEY (user_id, target_language)
);

CREATE TABLE IF NOT EXISTS review_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT,
  started_at TEXT,
  ended_at TEXT,
  items_total INTEGER,
  items_done INTEGER DEFAULT 0,
  avg_score INTEGER DEFAULT 0,
  focus TEXT
);

CREATE TABLE IF NOT EXISTS review_attempts (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  exercise_id TEXT,
  type TEXT,
  user_input TEXT,
  score INTEGER,
  feedback_json TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_date TEXT,
  daily_goal_xp INTEGER DEFAULT 50,
  daily_xp INTEGER DEFAULT 0,
  daily_xp_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS xp_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  event_type TEXT,
  ref_id TEXT,
  xp INTEGER,
  created_at TEXT
);
