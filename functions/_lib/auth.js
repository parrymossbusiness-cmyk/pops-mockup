// Simple shared-PIN check for the shop's internal admin page.
// The real PIN lives in the ADMIN_PIN environment variable (set in the
// Cloudflare Pages dashboard: Settings > Environment variables), never in code.
export function checkPin(request, env) {
  const providedPin = request.headers.get("X-Admin-Pin");
  if (!env.ADMIN_PIN) return false; // fail closed if not configured yet
  return providedPin === env.ADMIN_PIN;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Incorrect PIN." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
