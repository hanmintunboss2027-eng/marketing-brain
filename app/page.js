"use client";

import { useEffect, useState } from "react";

const FORMATS = [
  { id: "text", label: "Text", icon: "📝" },
  { id: "picture", label: "Picture", icon: "🖼️" },
  { id: "carousel", label: "Carousel", icon: "🗂️" },
  { id: "reels", label: "Reels", icon: "🎬" },
  { id: "longform", label: "Long-form", icon: "📰" },
  { id: "newsletter", label: "Newsletter", icon: "✉️" },
];

const FORMAT_LABELS = Object.fromEntries(FORMATS.map((f) => [f.id, f.label]));

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function md(text) {
  const lines = esc(text || "").split("\n");
  let html = "", inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bolded = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (/^#{1,4}\s/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${bolded.replace(/^#{1,4}\s*/, "")}</h3>`;
    } else if (/^\s*[-*•]\s+/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${bolded.replace(/^\s*[-*•]\s+/, "")}</li>`;
    } else if (/^-{3,}$/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<hr/>";
    } else if (line === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${bolded}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

async function callAgent(role, payload) {
  const r = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, ...payload }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d.text;
}

function parseCeo(text) {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : text);
    const formats = (j.formats || []).filter((f) => FORMAT_LABELS[f]);
    return { plan: j.plan || text, formats: formats.length ? formats : ["text", "picture", "reels"] };
  } catch {
    return { plan: text, formats: ["text", "picture", "reels"] };
  }
}

export default function Home() {
  const [brain, setBrain] = useState("");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState({});
  const [outputs, setOutputs] = useState(null);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brainDraft, setBrainDraft] = useState("");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("mb_brain") || "";
    setBrain(saved);
    if (!saved) setSettingsOpen(true);
    const t = setInterval(() => {
      const d = new Date();
      setClock(
        d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase() +
          "  " + d.toLocaleTimeString("en-GB")
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const setAgent = (id, st) => setStates((s) => ({ ...s, [id]: st }));

  async function run() {
    if (!input.trim() || running) return;
    setRunning(true);
    setError("");
    setOutputs(null);
    setPanelOpen(false);
    setStates({});
    const req = input.trim();
    try {
      setAgent("ceo", "working");
      const ceoRaw = await callAgent("ceo", { input: req, brain });
      const { plan, formats } = parseCeo(ceoRaw);
      setAgent("ceo", "done");

      setAgent("cmo", "working");
      setAgent("research", "working");
      const [cmo, research] = await Promise.all([
        callAgent("cmo", { input: req, brain, context: { ceoPlan: plan } }).then((t) => {
          setAgent("cmo", "done");
          return t;
        }),
        callAgent("research", { input: req, brain, context: { ceoPlan: plan } }).then((t) => {
          setAgent("research", "done");
          return t;
        }),
      ]);

      const context = { ceoPlan: plan, cmo, research };
      formats.forEach((f) => setAgent(f, "working"));
      const pieces = {};
      await Promise.all(
        formats.map((f) =>
          callAgent(f, { input: req, brain, context }).then((t) => {
            pieces[f] = t;
            setAgent(f, "done");
          })
        )
      );

      let imageUrl = null;
      if (pieces.picture) {
        const pm = pieces.picture.match(/\[PROMPT\]([\s\S]*?)\[\/PROMPT\]/);
        const iprompt = pm ? pm[1].trim() : "";
        if (iprompt) {
          try {
            setAgent("picture", "working");
            const ir = await fetch("/api/image", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ prompt: iprompt }),
            });
            const idata = await ir.json();
            if (ir.ok && idata.url) imageUrl = idata.url;
          } catch {}
          setAgent("picture", "done");
        }
      }

      setAgent("ceo", "working");
      const piecesSummary = formats.map((f) => `--- ${FORMAT_LABELS[f]} ---\n${pieces[f]}`).join("\n\n");
      const final = await callAgent("final", {
        input: req,
        brain,
        context: { ceoPlan: plan, cmo, research, pieces: piecesSummary },
      });
      setAgent("ceo", "done");

      setOutputs({ plan, cmo, research, pieces, formats, final, imageUrl });
      setPanelOpen(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function saveBrain() {
    setBrain(brainDraft);
    window.localStorage.setItem("mb_brain", brainDraft);
    setSettingsOpen(false);
  }

  const st = (id) => states[id] || "idle";

  return (
    <>
      <header className="header">
        <div className="logo">🧠 MARKETING <span>BRAIN</span></div>
        <div className="clock">{clock}</div>
        <button className="btn-ghost" onClick={() => { setBrainDraft(brain); setSettingsOpen(true); }}>
          ⚙ Settings
        </button>
      </header>

      <main className="main">
        <div className="section-label">ORGANIZATION</div>

        <div className="row">
          <div className={`card ${st("ceo")}`}>
            <span className="dot" />
            <div className="role">AI CEO</div>
            <div className="name">CEO</div>
            <div className="desc">Reads every request, routes the team</div>
          </div>
        </div>
        <div className="connector" />

        <div className="row">
          <div className={`card purple ${st("cmo")}`}>
            <span className="dot" />
            <div className="role" style={{ color: "var(--purple)" }}>STRATEGY</div>
            <div className="name">CMO</div>
            <div className="desc">Marketing strategy</div>
          </div>
          <div className={`card ${st("research")}`}>
            <span className="dot" />
            <div className="role">INSIGHT</div>
            <div className="name">Research</div>
            <div className="desc">Trends &amp; angles</div>
          </div>
        </div>
        <div className="connector" />

        <div className="formats">
          {FORMATS.map((f) => (
            <div key={f.id} className={`fcard ${st(f.id)} ${st(f.id) !== "idle" ? "active" : ""}`}>
              <span className="dot" />
              <div className="icon">{f.icon}</div>
              <div className="label">{f.label}</div>
            </div>
          ))}
        </div>

        <div className={`statusbar ${error ? "err" : outputs ? "ok" : ""}`}>
          {error
            ? `⚠ ${error}`
            : running
            ? "The team is working…"
            : outputs
            ? "✔ Run complete · deliverable ready — "
            : "Tell the CEO what you need. It routes the rest."}
          {outputs && !running && (
            <a style={{ color: "var(--cyan)", cursor: "pointer" }} onClick={() => setPanelOpen(true)}>
              open deliverable
            </a>
          )}
        </div>
      </main>

      <div className="inputbar">
        <div className="inner">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. Create a promotion campaign for this week…"
            disabled={running}
          />
          <button className="btn-send" onClick={run} disabled={running || !input.trim()}>
            {running ? "…" : "↑"}
          </button>
        </div>
      </div>

      <aside className={`panel ${panelOpen ? "open" : ""}`}>
        <div className="panel-head">
          <div className="t">✔ RUN COMPLETE · DELIVERABLE</div>
          <button className="btn-ghost" onClick={() => setPanelOpen(false)}>✕</button>
        </div>
        <div className="panel-body">
          {outputs && (
            <>
              <details className="piece" open>
                <summary>CEO Summary &amp; Action Items</summary>
                <div className="content md" dangerouslySetInnerHTML={{ __html: md(outputs.final) }} />
              </details>
              <details className="piece">
                <summary>CMO — Strategy Brief</summary>
                <div className="content md" dangerouslySetInnerHTML={{ __html: md(outputs.cmo) }} />
              </details>
              <details className="piece">
                <summary>Research Brief</summary>
                <div className="content md" dangerouslySetInnerHTML={{ __html: md(outputs.research) }} />
              </details>
              {outputs.formats.map((f) => (
                <details className="piece" key={f} open={f === "picture" && !!outputs.imageUrl}>
                  <summary>{FORMAT_LABELS[f]}</summary>
                  <div className="content">
                    {f === "picture" && outputs.imageUrl && (
                      <a href={outputs.imageUrl} target="_blank" rel="noreferrer">
                        <img
                          src={outputs.imageUrl}
                          alt="Generated marketing visual"
                          style={{ width: "100%", borderRadius: 12, marginBottom: 10, border: "1px solid var(--border)" }}
                        />
                      </a>
                    )}
                    <div className="md" dangerouslySetInnerHTML={{ __html: md(outputs.pieces[f]) }} />
                    <button className="copybtn" onClick={() => navigator.clipboard.writeText(outputs.pieces[f])}>
                      Copy
                    </button>
                  </div>
                </details>
              ))}
            </>
          )}
        </div>
      </aside>

      {settingsOpen && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
          <div className="modal">
            <h2>🧠 Your business brain</h2>
            <p>
              Describe your business: what you sell, who your customers are, prices, service area, tone.
              The whole team reads this before every job. (Saved in your browser only.)
            </p>
            <textarea
              value={brainDraft}
              onChange={(e) => setBrainDraft(e.target.value)}
              placeholder={"Example:\nWe are a sticker printing shop in Yangon.\nSame-day printing for small orders.\nCustomers: small businesses, cafes, event organizers.\nTone: friendly, local."}
            />
            <div className="actions">
              <button className="btn-ghost" onClick={() => setSettingsOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveBrain}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
