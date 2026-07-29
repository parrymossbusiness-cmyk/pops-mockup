// GET /api/admin/bookings?date=YYYY-MM-DD
// Header: X-Admin-Pin: <pin>
// Returns all confirmed bookings and blocks for that day, across everyone,
// for the shared shop calendar view.

import { checkPin, unauthorized } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!checkPin(request, env)) return unauthorized();

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  if (!date) return json({ error: "Missing date." }, 400);

  const dayStartISO = `${date}T00:00:00`;
  const dayEndISO = `${date}T23:59:59`;

  const bookingsRes = await env.DB.prepare(
    `SELECT b.id, b.service_name, b.duration_minutes, b.barber_id, br.name AS barber_name,
            b.customer_name, b.customer_phone, b.start_time, b.end_time, b.status
     FROM bookings b LEFT JOIN barbers br ON br.id = b.barber_id
     WHERE b.status = 'confirmed' AND b.start_time < ? AND b.end_time > ?
     ORDER BY b.start_time`
  ).bind(dayEndISO, dayStartISO).all();

  const blocksRes = await env.DB.prepare(
    `SELECT bl.id, bl.barber_id, br.name AS barber_name, bl.start_time, bl.end_time, bl.reason
     FROM blocks bl LEFT JOIN barbers br ON br.id = bl.barber_id
     WHERE bl.start_time < ? AND bl.end_time > ?
     ORDER BY bl.start_time`
  ).bind(dayEndISO, dayStartISO).all();

  return json({
    bookings: bookingsRes.results || [],
    blocks: blocksRes.results || [],
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
