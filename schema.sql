-- Pop's Barber & Beauty Shop — Booking Database Schema
-- Run this once in the Cloudflare D1 dashboard console (Workers & Pages > D1 >
-- your database > Console tab). No terminal needed.

CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT INTO barbers (name) VALUES ('Pop'), ('Cheston'), ('Johnnie'), ('Stevie');

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  service_category TEXT NOT NULL,       -- 'barber' or 'beauty'
  duration_minutes INTEGER NOT NULL,
  barber_id INTEGER,                    -- NULL = "Any Available" (pooled capacity, not a specific person)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  start_time TEXT NOT NULL,             -- ISO 8601, e.g. 2026-08-04T14:00:00
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' or 'cancelled'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (barber_id) REFERENCES barbers(id)
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barber_id INTEGER,                    -- NULL = blocks the whole shop (e.g. holiday)
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (barber_id) REFERENCES barbers(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_barber ON bookings(barber_id);
CREATE INDEX IF NOT EXISTS idx_blocks_start ON blocks(start_time);
