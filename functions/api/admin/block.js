// POST /api/admin/block
// Header: X-Admin-Pin: <pin>
// Body: { barberId (optional, omit for whole-shop block), date, startTime, endTime, reason }

import { checkPin, unauthorized } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkPin(request, env)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { barberId, date, startTime, endTime, reason } = body;
  if (!date || !startTime || !endTime) {
    return json({ error: "Missing date/startTime/endTime." }, 400);
  }

  const startISO = `${date}T${startTime}:00`;
  const endISO = `${date}T${endTime}:00`;

  await env.DB.prepare(
    `INSERT INTO blocks (barber_id, start_time, end_time, reason) VALUES (?, ?, ?, ?)`
  ).bind(barberId || null, startISO, endISO, reason || null).run();

  return json({ blocked: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
