import { AGENTS } from "../../../lib/agents";

export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role, input, brain, context } = body;
  const agent = AGENTS[role];
  if (!agent) return Response.json({ error: `Unknown agent role: ${role}` }, { status: 400 });
  if (!input) return Response.json({ error: "Missing input" }, { status: 400 });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!anthropicKey && !openaiKey) {
    return Response.json(
      { error: "No API key set. Add ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel -> Settings -> Environment Variables, then redeploy." },
      { status: 500 }
    );
  }

  const userMsg = agent.buildUser({ input, brain, context });

  try {
    if (anthropicKey) {
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: agent.maxTokens,
          system: agent.system,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        return Response.json({ error: data?.error?.message || "Anthropic API error" }, { status: 500 });
      }
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return Response.json({ text });
    }

    // OpenAI fallback
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: agent.maxTokens,
        messages: [
          { role: "system", content: agent.system },
          { role: "user", content: userMsg },
        ],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return Response.json({ error: data?.error?.message || "OpenAI API error" }, { status: 500 });
    }
    return Response.json({ text: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    return Response.json({ error: e.message || "Request failed" }, { status: 500 });
  }
}
