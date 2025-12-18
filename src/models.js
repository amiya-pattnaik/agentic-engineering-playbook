import fs from "fs";
import path from "path";

const DEFAULT_MODEL = "gpt-4o-mini";

function loadModelConfig() {
  const configPath = path.join(process.cwd(), "config", "model.json");
  if (!fs.existsSync(configPath)) return {};
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

class OpenAIModel {
  constructor({ apiKey, model = DEFAULT_MODEL, temperature = 0.3 } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
    this.kind = "openai";
  }

  async generate({ prompt, system, maxTokens = 800, agentName = "agent" }) {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAIModel.");
    }

    const body = {
      model: this.model,
      temperature: this.temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system || "You are an engineering copilot." },
        { role: "user", content: prompt }
      ]
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI call failed for ${agentName}: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }
}

class MockModel {
  constructor() {
    this.kind = "mock";
  }

  async generate({ prompt, context, agentName = "agent" }) {
    const scenario = context?.scenario || {};
    const constraints = (scenario.constraints || []).map((c, i) => `${i + 1}. ${c}`);
    const signals = scenario.inputs?.repoSignals || [];
    const tech = scenario.techStack || scenario.tech || [];
    const actions = [
      `Hypothesize root causes from signals (${signals.length || "n/a"} signals).`,
      "Draft plan that can be validated quickly.",
      "Highlight risks and observable outcomes.",
      "Propose fast, automatable checks."
    ];

    const output = [
      `[Mocked ${agentName}]`,
      `Scenario: ${scenario.title || scenario.problem || "Demo scenario"}`,
      `Goal: ${scenario.goal || "Improve reliability and developer speed."}`,
      constraints.length ? "Constraints:\n- " + constraints.join("\n- ") : "Constraints: none captured.",
      signals.length
        ? "Signals:\n- " + signals.slice(0, 4).join("\n- ")
        : "Signals: add repo or runtime signals for richer guidance.",
      tech.length ? "Tech focus: " + tech.join(", ") : "Tech focus: add techStack to scenario for specificity.",
      "Immediate actions:",
      ...actions.map((a) => `- ${a}`),
      "",
      "Prompt preview:",
      prompt
        .split("\n")
        .filter(Boolean)
        .slice(0, 4)
        .map((line) => `> ${line}`)
        .join("\n")
    ];

    return output.join("\n");
  }
}

export function selectModel(env = process.env) {
  const cfg = loadModelConfig();
  const apiKey = env.OPENAI_API_KEY || cfg.OPENAI_API_KEY;
  if (apiKey) {
    return new OpenAIModel({
      apiKey,
      model: env.OPENAI_MODEL || cfg.OPENAI_MODEL || DEFAULT_MODEL,
      temperature: env.OPENAI_TEMPERATURE
        ? Number(env.OPENAI_TEMPERATURE)
        : cfg.OPENAI_TEMPERATURE
          ? Number(cfg.OPENAI_TEMPERATURE)
          : 0.3
    });
  }
  return new MockModel();
}

export { OpenAIModel, MockModel };
