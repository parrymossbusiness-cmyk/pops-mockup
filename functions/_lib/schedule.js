// Shared scheduling constants & helpers for Pop's booking system.
// Edit the numbers below (durations, capacity, hours) any time — this is a
// plain JS file, editable straight in the GitHub web editor, no terminal.

// Shop hours by day-of-week (0 = Sunday ... 6 = Saturday), 24h time.
export const SHOP_HOURS = {
  0: null,                  // Sunday: closed
  1: null,                  // Monday: closed
  2: { open: "07:00", close: "18:00" }, // Tuesday
  3: { open: "07:00", close: "18:00" }, // Wednesday
  4: { open: "07:00", close: "18:00" }, // Thursday
  5: { open: "05:00", close: "18:00" }, // Friday
  6: { open: "05:00", close: "17:00" }, // Saturday
};

// Service catalog: name -> { category, durationMinutes }
// category "barber" requires/allows picking Pop, Cheston, Johnnie, or Stevie.
// category "beauty" is always booked as "Any Available" (no named stylist on file yet).
export const SERVICES = {
  "Haircut":                   { category: "barber", durationMinutes: 30 },
  "Kids' Cut":                  { category: "barber", durationMinutes: 30 },
  "Bang Trim / Neck Trim":       { category: "barber", durationMinutes: 15 },
  "Relaxer":                    { category: "beauty", durationMinutes: 90 },
  "Color":                      { category: "beauty", durationMinutes: 90 },
  "Flat Iron / Curling":         { category: "beauty", durationMinutes: 60 },
  "Highlights / Partial Foil":   { category: "beauty", durationMinutes: 90 },
  "Shampoo & Set":               { category: "beauty", durationMinutes: 60 },
  "Relax & Permanent":           { category: "beauty", durationMinutes: 120 },
};

// How many "Any Available" appointments can run at the same time, per category.
// This stands in for the barbers/stylists on staff who aren't individually
// named/scheduled yet. Raise or lower as you learn real staffing levels.
export const POOLED_CAPACITY = {
  barber: 3,
  beauty: 2,
};

export const SLOT_MINUTES = 30;

// --- Helpers ---

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Returns array of "HH:MM" slot start times for a given YYYY-MM-DD date string,
// respecting shop hours and the service duration (so the last slot always
// finishes before closing).
export function generateDaySlots(dateStr, durationMinutes) {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids timezone edge issues
  const dow = d.getDay();
  const hours = SHOP_HOURS[dow];
  if (!hours) return [];

  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const slots = [];
  for (let t = openMin; t + durationMinutes <= closeMin; t += SLOT_MINUTES) {
    slots.push(minutesToHHMM(t));
  }
  return slots;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function isoRange(dateStr, hhmm, durationMinutes) {
  const start = new Date(`${dateStr}T${hhmm}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return { startISO: start.toISOString().slice(0, 19), endISO: end.toISOString().slice(0, 19) };
}
