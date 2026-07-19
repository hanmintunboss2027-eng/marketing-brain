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

  const models = [process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", "dall-e-3", "dall-e-2"];
  let lastError = "Image API error";

  for (const model of models) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: String(prompt).slice(0, 3800),
          n: 1,
          size: "1024x1024",
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        lastError = data?.error?.message || "Image API error";
        continue;
      }
      const item = data.data?.[0];
      const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      if (url) return Response.json({ url, model });
      lastError = "No image returned";
    } catch (e) {
      lastError = e.message || "Request failed";
    }
  }

  return Response.json({ error: lastError }, { status: 500 });
}
