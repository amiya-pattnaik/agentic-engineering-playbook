import { nowIso } from "./utils.js";
import { evaluateMetrics } from "./tools.js";

class Agent {
  constructor({ name, title, instructions, model, promptBuilder, mockBuilder }) {
    this.name = name;
    this.title = title || name;
    this.instructions = instructions;
    this.model = model;
    this.promptBuilder = promptBuilder;
    this.mockBuilder = mockBuilder;
  }

  buildPrompt(context) {
    if (this.promptBuilder) {
      return this.promptBuilder(context);
    }
    const scenario = context.scenario || {};
    return [
      `Scenario: ${scenario.title || scenario.problem || "Agentic AI Works demo"}`,
      `Goal: ${scenario.goal || ""}`,
      `Tech: ${(scenario.techStack || scenario.tech || []).join(", ")}`,
      `Constraints: ${(scenario.constraints || []).join("; ")}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  async run(context) {
    const prompt = this.buildPrompt(context);
    const isMock = this.model.kind === "mock";
    const body = isMock && this.mockBuilder ? this.mockBuilder(context, prompt) : await this.model.generate({
      prompt,
      system: this.instructions,
      context,
      agentName: this.name
    });

    return {
      agent: this.name,
      title: this.title,
      content: body,
      createdAt: nowIso()
    };
  }
}

function previousArtifacts(context) {
  return (context.artifacts || [])
    .map((a) => `- ${a.agent}: ${a.title}`)
    .join("\n");
}

export function buildAgents(model) {
  const metricsAgent = new Agent({
    name: "Metrics",
    title: "Metrics Health",
    instructions:
      "You evaluate engineering, CI/CD, and post-release metrics. Call out pass/at-risk items and propose one action per at-risk item.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      const metrics = context.metrics;
      const { summary, details } = evaluateMetrics(metrics || {});
      return [
        `Scenario: ${scenario.title}`,
        `Goal: ${scenario.goal}`,
        "Metrics status (pre-computed):",
        summary.length ? summary.join("\n") : "No at-risk items detected.",
        "",
        "Full metrics:",
        details.join("\n"),
        "Deliverable: concise list of at-risk metrics with one recommended action each."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const { summary, details } = evaluateMetrics(context.metrics || {});
      const risks = summary.length ? summary.map((s) => `- ${s}`) : ["- All metrics meet targets."];
      const actions = summary.length
        ? summary.map((s) => `- Action: ${s.split(":")[0]} — add targeted fix/automation.`)
        : ["- Action: maintain baselines; add anomaly alerts."];
      return [
        `[Mocked Metrics] ${context.scenario?.title || "Demo Scenario"}`,
        "At-risk:",
        ...risks,
        "Actions:",
        ...actions,
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 6)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const discovery = new Agent({
    name: "Discovery",
    title: "Discovery + Requirements",
    instructions:
      "You are a pragmatic staff engineer. Extract goals, constraints, risks, and a lightweight plan with measurable outcomes. Avoid filler.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      return [
        `Scenario: ${scenario.title}`,
        `Problem: ${scenario.problem}`,
        `Goal: ${scenario.goal}`,
        `Signals: ${(scenario.inputs?.repoSignals || []).join(" | ")}`,
        `Constraints: ${(scenario.constraints || []).join(" | ")}`,
        `Tech: ${(scenario.techStack || scenario.tech || []).join(" | ")}`,
        "Deliverable: 1) crisp objective, 2) top risks, 3) 3-step plan with success metrics."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const scenario = context.scenario || {};
      const risks = (scenario.constraints || []).slice(0, 3).map((c) => `- Risk: ${c}`);
      const actions = [
        "- Map signals to likely failure points.",
        "- Propose quick instrumentation for evidence.",
        "- Define what a good outcome looks like."
      ];
      return [
        `[Mocked Discovery] ${scenario.title || "Demo Scenario"}`,
        `Objective: ${scenario.goal || scenario.problem || "Stabilize and accelerate delivery."}`,
        risks.join("\n") || "- Risk: add constraints for richer guidance.",
        "Plan:",
        ...actions,
        "Success metrics: reduced flake %, lead time improvement, alert precision.",
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 5)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const coding = new Agent({
    name: "Engineering",
    title: "Engineering Plan",
    instructions:
      "You act like a senior engineer shipping a slice fast. Produce proposed code changes, refactors, and pairing plan. Link each change to validation and rollback.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      return [
        `Scenario: ${scenario.title}`,
        `Problem: ${scenario.problem}`,
        `Signals: ${(scenario.inputs?.repoSignals || []).join(" | ")}`,
        "Previous artifacts:",
        previousArtifacts(context),
        "Deliverable: a short plan of code changes + checkpoints + rollback/feature flag guidance."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const scenario = context.scenario || {};
      const steps = [
        "- Harden auth flow: add basic auth guard + feature flag for MFA rollout.",
        "- Add health/readiness probe for the API backing balances/transactions.",
        "- Add structured logs for login success/failure and dashboard data fetch.",
        "- Gate deploy with coverage threshold + lint/security checks."
      ];
      return [
        `[Mocked Engineering] ${scenario.title || "Demo Scenario"}`,
        "Plan:",
        ...steps,
        "Checkpoints: green unit suite, integration < 10 min, auth errors observable via logs.",
        "Rollback: flip flag to disable new auth checks; revert readiness gate if needed.",
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 4)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const qa = new Agent({
    name: "Quality",
    title: "Quality + Testing",
    instructions:
      "You are a quality engineer. Produce a coverage plan (unit, integration, contract), fast validations, and observability checks. Keep it actionable.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      return [
        `Scenario: ${scenario.title}`,
        `Problem: ${scenario.problem}`,
        `Signals: ${(scenario.inputs?.repoSignals || []).join(" | ")}`,
        `Constraints: ${(scenario.constraints || []).join(" | ")}`,
        "Previous artifacts:",
        previousArtifacts(context),
        "Deliverable: test matrix with owners, data needs, and automation notes."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const scenarios = [
        "- Unit: auth guard allows valid users and rejects invalid creds; logs include reason.",
        "- Contract: dashboard API returns balances/transactions schema; handles 401/429 gracefully.",
        "- Integration: simulate slow backend; ensure UI shows loading and recovers without error.",
        "- Reliability: run login flow 30x; capture flake rate and attach histogram artifact."
      ];
      return [
        `[Mocked Quality] ${context.scenario?.title || "Demo Scenario"}`,
        "Test matrix:",
        ...scenarios,
        "Automation: add CI step to rerun flaky spec N=5 and publish histogram.",
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 4)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const platform = new Agent({
    name: "Platform",
    title: "Platform + Delivery",
    instructions:
      "You are a platform engineer. Propose CI/CD and runtime guardrails, SLOs, and telemetry. Prefer incremental changes with clear owners.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      return [
        `Scenario: ${scenario.title}`,
        `Goal: ${scenario.goal}`,
        `Signals: ${(scenario.inputs?.repoSignals || []).join(" | ")}`,
        "Previous artifacts:",
        previousArtifacts(context),
        "Deliverable: pipeline changes, runtime checks, and dashboards with owners."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const steps = [
        "- Add CI job `readiness-check` to block integration until service reports healthy.",
        "- Publish retry/latency metrics to dashboard; alert when p95 > budget.",
        "- Add canary deploy step with 5% traffic + auto rollback on error spike.",
        "- Bake slowness simulation into nightly chaos run."
      ];
      return [
        `[Mocked Platform] ${context.scenario?.title || "Demo Scenario"}`,
        "Guardrails:",
        ...steps,
        "Owner: platform + service team; review weekly until flake rate < 1%.",
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 4)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const storyteller = new Agent({
    name: "Storyteller",
    title: "Executive Summary",
    instructions:
      "You summarize for an engineering leader. Be concise, outcome-driven, and list what to demo.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      const artifactSummary = (context.artifacts || [])
        .map((a) => `- ${a.title}`)
        .join("\n");
      return [
        `Scenario: ${scenario.title}`,
        `Goal: ${scenario.goal}`,
        "Artifacts:",
        artifactSummary,
        "Deliverable: 4 bullet summary + demo script (what to show in 3 minutes)."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const items = (context.artifacts || []).map((a) => `- ${a.agent}: ${a.title}`);
      const demo = [
        "- Show repo signals -> Discovery output.",
        "- Walk through Engineering plan with checkpoints.",
        "- Run Quality matrix to show coverage delta.",
        "- Show Platform guardrail diffs in CI pipeline."
      ];
      return [
        `[Mocked Summary] ${context.scenario?.title || "Demo Scenario"}`,
        "Summary:",
        ...items,
        "Demo (3 minutes):",
        ...demo,
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 4)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  const testDesigner = new Agent({
    name: "TestDesigner",
    title: "Test Scenarios (BDD)",
    instructions:
      "You design BDD-style scenarios for API and UI. Use concise Given/When/Then with data. Aim for coverage of auth, dashboard, latency/error handling.",
    model,
    promptBuilder: (context) => {
      const scenario = context.scenario || {};
      return [
        `Scenario: ${scenario.title}`,
        `Signals: ${(scenario.inputs?.repoSignals || []).join(" | ")}`,
        "Previous artifacts:",
        previousArtifacts(context),
        "Deliverable: 2 API scenarios + 2 UI scenarios in Gherkin outline, focused on auth and dashboard data."
      ]
        .filter(Boolean)
        .join("\n");
    },
    mockBuilder: (context, prompt) => {
      const apiScenarios = [
        "Scenario: Fetch account data with auth\n  Given an authenticated user token\n  When I GET /api/account\n  Then I receive balance, credit, and transactions with 200",
        "Scenario: Reject unauthorized account fetch\n  Given no auth token\n  When I GET /api/account\n  Then I receive 401 with an error message"
      ];
      const uiScenarios = [
        "Scenario: Login success and dashboard render\n  Given I am on the login page\n  When I sign in with valid credentials\n  Then I see balance and recent transactions",
        "Scenario: Handle slow backend gracefully\n  Given the backend responds slowly\n  When I navigate to the dashboard\n  Then I see a loader and the UI recovers without errors"
      ];
      return [
        `[Mocked BDD] ${context.scenario?.title || "Demo Scenario"}`,
        "API scenarios:",
        ...apiScenarios,
        "",
        "UI scenarios:",
        ...uiScenarios,
        "",
        "Prompt preview:",
        prompt
          .split("\n")
          .slice(0, 6)
          .map((l) => `> ${l}`)
          .join("\n")
      ].join("\n");
    }
  });

  return [metricsAgent, discovery, coding, qa, platform, testDesigner, storyteller];
}
