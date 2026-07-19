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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it in Vercel -> Settings -> Environment Variables." },
      { status: 500 }
    );
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: agent.maxTokens,
        system: agent.system,
        messages: [{ role: "user", content: agent.buildUser({ input, brain, context }) }],
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
  } catch (e) {
    return Response.json({ error: e.message || "Request failed" }, { status: 500 });
  }
}
