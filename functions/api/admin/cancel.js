// POST /api/admin/cancel
// Header: X-Admin-Pin: <pin>
// Body: { bookingId }

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

  if (!body.bookingId) return json({ error: "Missing bookingId." }, 400);

  await env.DB.prepare(
    `UPDATE bookings SET status = 'cancelled' WHERE id = ?`
  ).bind(body.bookingId).run();

  return json({ cancelled: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
