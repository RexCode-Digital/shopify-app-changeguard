export async function POST(request: Request) {
  const payload = await request.json();
  return Response.json({ received: Boolean(payload) });
}
