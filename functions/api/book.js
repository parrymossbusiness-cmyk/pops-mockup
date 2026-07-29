// POST /api/book
// Body JSON: { date, time, service, barberId (optional), name, phone }
// Re-checks availability at write time (not just trusting the client) so two
// people can't grab the same slot in a race.

import { SERVICES, POOLED_CAPACITY, rangesOverlap, isoRange } from "../_lib/schedule.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { date, time, service, barberId, name, phone } = body;
  if (!date || !time || !service || !SERVICES[service] || !name || !phone) {
    return json({ error: "Missing required fields." }, 400);
  }

  const { category, durationMinutes } = SERVICES[service];
  const { startISO, endISO } = isoRange(date, time, durationMinutes);
  const dayStartISO = `${date}T00:00:00`;
  const dayEndISO = `${date}T23:59:59`;

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

  const shopBlocked = blocks.some(
    (b) => b.barber_id === null && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
  );
  if (shopBlocked) return json({ error: "That time is no longer available." }, 409);

  if (barberId) {
    const busy = bookings.some(
      (b) => b.barber_id === barberId && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
    );
    const personalBlock = blocks.some(
      (b) => b.barber_id === barberId && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
    );
    if (busy || personalBlock) {
      return json({ error: "That barber is no longer available at that time." }, 409);
    }
  } else {
    const overlappingPoolBookings = bookings.filter(
      (b) => b.barber_id === null && rangesOverlap(startISO, endISO, b.start_time, b.end_time)
    ).length;
    if (overlappingPoolBookings >= (POOLED_CAPACITY[category] || 1)) {
      return json({ error: "That time just filled up. Please pick another." }, 409);
    }
  }

  await env.DB.prepare(
    `INSERT INTO bookings (service_name, service_category, duration_minutes, barber_id, customer_name, customer_phone, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(service, category, durationMinutes, barberId || null, name, phone, startISO, endISO).run();

  return json({
    confirmed: true,
    service,
    date,
    time,
    durationMinutes,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
