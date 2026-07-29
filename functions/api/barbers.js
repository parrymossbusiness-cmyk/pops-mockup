// GET /api/barbers — returns the list of barbers customers can pick by name.
export async function onRequestGet(context) {
  const { env } = context;
  const res = await env.DB.prepare(
    `SELECT id, name FROM barbers WHERE active = 1 ORDER BY name`
  ).all();
  return new Response(JSON.stringify({ barbers: res.results || [] }), {
    headers: { "Content-Type": "application/json" },
  });
}
