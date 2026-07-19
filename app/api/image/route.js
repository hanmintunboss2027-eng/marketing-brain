export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt) return Response.json({ error: "Missing prompt" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: "OPENAI_API_KEY is not set. Image generation needs an OpenAI key." }, { status: 500 });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
        prompt: String(prompt).slice(0, 3800),
        n: 1,
        size: "1024x1024",
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json({ error: data?.error?.message || "Image API error" }, { status: 500 });
    }
    return Response.json({ url: data.data?.[0]?.url || null });
  } catch (e) {
    return Response.json({ error: e.message || "Request failed" }, { status: 500 });
  }
}
