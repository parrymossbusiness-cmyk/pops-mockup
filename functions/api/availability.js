// GET /api/availability?date=YYYY-MM-DD&service=Haircut&barberId=1
// barberId is optional — omit it for "Any Available".
// Returns: { slots: ["09:00", "09:30", ...] }

import { SERVICES, POOLED_CAPACITY, generateDaySlots, rangesOverlap, isoRange } from "../_lib/schedule.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const service = url.searchParams.get("service");
  const barberIdParam = url.searchParams.get("barberId");
  const barberId = barberIdParam ? parseInt(barberIdParam, 10) : null;

  if (!date || !service || !SERVICES[service]) {
    return json({ error: "Missing or invalid date/service." }, 400);
  }

  const { category, durationMinutes } = SERVICES[service];
  const candidateSlots = generateDaySlots(date, durationMinutes);
  if (candidateSlots.length === 0) return json({ slots: [] });

  const dayStartISO = `${date}T00:00:00`;
  const dayEndISO = `${date}T23:59:59`;

  // Pull anything that could overlap this day: bookings + blocks.
  const bookingsRes = await env.DB.prepare(
    `SELECT barber_id, start_time, end_time FROM bookings
     WHERE status = 'confirmed' AND start_time < ? AND end_time > ?`
  ).bind(dayEndISO, dayStartISO).all();

  const blocksRes = await env.DB.prepare(
    `SELECT barber_id, start_time, end_time FROM blocks
     WHERE start_time < ? AND end_time > ?`
  ).bind(dayEndISO, dayStartISO).all();

  const bookings = bookingsRes.results || [];
  const blocks = blocksRes.results || [];

  const available = candidateSlots.filter((hhmm) => {
    const { startISO, endISO } = isoRange(date, hhmm, durationMinutes);

    // Shop-wide blocks (barber_id IS NULL) always remove the slot for everyone.
    const shopBlocked = blocks.some(
      (b) => b.barber_id === null && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
    );
    if (shopBlocked) return false;

    if (barberId) {
      // Specific barber: no double-booking that exact person, no personal block.
      const busy = bookings.some(
        (b) => b.barber_id === barberId && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
      );
      const personalBlock = blocks.some(
        (b) => b.barber_id === barberId && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
      );
      return !busy && !personalBlock;
    } else {
      // "Any Available": pooled capacity check within this service's category.
      const overlappingPoolBookings = bookings.filter(
        (b) => b.barber_id === null && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
      ).length;
      return overlappingPoolBookings < (POOLED_CAPACITY[category] || 1);
    }
  });

  return json({ slots: available });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
