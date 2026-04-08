import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { buildAgents } from "./agents.js";
import { selectModel } from "./models.js";
import { nowIso, slugify, writeFile } from "./utils.js";

function renderArtifact(artifact) {
  return [
    `### ${artifact.title}`,
    `*Agent:* ${artifact.agent}`,
    "",
    artifact.content
  ].join("\n");
}

export function renderLangGraphReport(context) {
  const scenario = context.scenario || {};
  const header = [
    `# Agentic AI Works — ${scenario.title || "Demo"}`,
    `Generated: ${nowIso()}`,
    "",
    `**Engine:** LangGraph v2`,
    `**Goal:** ${scenario.goal || scenario.problem || "Show end-to-end agentic workflow."}`,
    scenario.constraints?.length ? `**Constraints:** ${scenario.constraints.join("; ")}` : "",
    scenario.techStack?.length ? `**Tech:** ${scenario.techStack.join(", ")}` : "",
    ""
  ].filter(Boolean);

  const body = (context.artifacts || []).map(renderArtifact).join("\n\n");
  return [...header, body].join("\n");
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderLangGraphHtmlReport(context) {
  const scenario = context.scenario || {};
  const artifacts = (context.artifacts || [])
    .map(
      (a) => `
      <section class="artifact">
        <h2>${escapeHtml(a.title)}</h2>
        <p class="agent">Agent: ${escapeHtml(a.agent)}</p>
        <pre>${escapeHtml(a.content)}</pre>
      </section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Agentic AI Works — ${escapeHtml(scenario.title || "Report")}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .shell { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); }
    h1 { margin: 0 0 8px; }
    .meta { color: #64748b; margin-bottom: 16px; }
    .artifact { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
    .agent { color: #475569; font-size: 14px; }
    pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 10px; overflow-x: auto; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="shell">
    <h1>Agentic AI Works — ${escapeHtml(scenario.title || "Demo")}</h1>
    <div class="meta">
      <div>Generated: ${escapeHtml(nowIso())}</div>
      <div>Engine: LangGraph v2</div>
      <div>Goal: ${escapeHtml(scenario.goal || scenario.problem || "")}</div>
      <div>Constraints: ${escapeHtml((scenario.constraints || []).join("; "))}</div>
      <div>Tech: ${escapeHtml((scenario.techStack || []).join(", "))}</div>
    </div>
    ${artifacts}
  </div>
</body>
</html>`;
}

function formatTestResults(testResults) {
  if (!testResults) return null;
  const summary = testResults.summary || {};
  const lines = [
    `Status: ${testResults.ok ? "passed" : "failed"} (${testResults.message || "no message"})`,
    `Counts: expected=${summary.expected ?? "?"}, skipped=${summary.skipped ?? "?"}, failures=${summary.failures ?? summary.unexpected ?? "?"}`
  ];
  return lines.join("\n");
}

const AgentState = Annotation.Root({
  scenario: Annotation(),
  metrics: Annotation(),
  testResults: Annotation(),
  artifacts: Annotation({
    reducer: (left, right) => left.concat(right),
    default: () => []
  })
});

function createGraph(agents) {
  const graph = new StateGraph(AgentState);

  agents.forEach((agent) => {
    graph.addNode(agent.name, async (state) => {
      const artifact = await agent.run({
        scenario: state.scenario,
        artifacts: state.artifacts,
        metrics: state.metrics,
        testResults: state.testResults
      });

      return { artifacts: [artifact] };
    });
  });

  graph.addEdge(START, agents[0].name);
  for (let i = 0; i < agents.length - 1; i += 1) {
    graph.addEdge(agents[i].name, agents[i + 1].name);
  }
  graph.addEdge(agents[agents.length - 1].name, END);

  return graph.compile();
}

export async function runScenarioLangGraph(scenario, options = {}) {
  const model = options.model || selectModel();
  const agents = buildAgents(model);
  const graph = createGraph(agents);

  const initialArtifacts = [];
  const testArtifact = formatTestResults(options.testResults);
  if (testArtifact) {
    initialArtifacts.push({
      agent: "TestRunner",
      title: "Automated Test Results",
      content: testArtifact,
      createdAt: nowIso()
    });
  }

  const finalState = await graph.invoke({
    scenario,
    metrics: options.metrics || null,
    testResults: options.testResults || null,
    artifacts: initialArtifacts
  });

  const context = {
    scenario,
    artifacts: finalState.artifacts || initialArtifacts
  };

  const report = renderLangGraphReport(context);
  if (options.outputPath) {
    writeFile(options.outputPath, report);
  }

  const htmlReport = renderLangGraphHtmlReport(context);
  if (options.htmlOutputPath) {
    writeFile(options.htmlOutputPath, htmlReport);
  }

  return {
    artifacts: context.artifacts,
    report,
    htmlReport,
    modelKind: model.kind,
    engine: "langgraph"
  };
}

export function outputPathForScenarioLangGraph(scenario, baseDir = "reports") {
  const slug = slugify(scenario.title || scenario.problem || "scenario");
  return `${baseDir}/${slug}-langgraph-report.md`;
}
