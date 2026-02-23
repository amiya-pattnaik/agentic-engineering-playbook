## Agentic Engineering Playbook — Banking Demo (Node.js)

Small, runnable demo that shows an agentic AI workflow for engineering/QA/platform around a simple banking web app. It runs locally with a mocked model or can call OpenAI if you drop a key into `config/model.json`.

## Concept Primer: What Is Agentic AI?
Agentic AI is a multi-step system where specialized agents plan, reason, and act in sequence using shared context and tools. Instead of one prompt producing one answer, the workflow decomposes a goal into coordinated steps.

In this repo, agents simulate an engineering operating loop from metrics to implementation guidance and testing.

## Broader Agentic Use Cases
- Incident triage and coordinated remediation planning.
- SDLC orchestration across engineering, QA, security, and platform.
- Change-risk assessment with policy/compliance checks.
- Release readiness and rollback decision support.
- Cross-system root-cause analysis with tool integrations.

Demo scope in this repository:
- For demo simplicity, this repo focuses on a **banking scenario workflow** (metrics -> discovery -> engineering -> quality -> platform -> tests -> summary).

## Concept Comparison (GenAI vs Agentic vs RAG)
```text
User Need
   |
   +--> Fast content draft from prompt/context
   |      -> Choose GENERATIVE AI
   |
   +--> Multi-step planning + tool orchestration
   |      -> Choose AGENTIC AI
   |
   +--> Answers grounded in source documents with citations
          -> Choose RAG

Rule of thumb:
- Generative: quickest single-shot assistant
- Agentic: coordinated multi-role workflow
- RAG: factual Q&A over your knowledge base
```

## Why Multi-Agent Here
- Different concerns are isolated per role (metrics, engineering, quality, platform).
- Each step receives prior outputs, which improves continuity and traceability.
- Output artifacts are structured for practical use (reports + optional generated tests).

### How the agentic flow works (no ML background needed)
- A **scenario** is JSON describing a problem, signals, tech, and constraints.
- Agents run in order: Metrics -> Discovery -> Engineering -> Quality -> Platform -> TestDesigner -> Summary.
- Each agent gets the scenario plus prior outputs/signals, then calls a model (mock by default; OpenAI if you set a key) to generate its slice.
- The orchestrator stitches outputs into Markdown/HTML; optional auto-generated Playwright tests run first when `--run-tests`.
- You can extend this by adding real tools (read logs, call CI/APIs, run tests) so agents act on live data.

## ASCII Diagram
```text
Scenario + Metrics + Signals
            |
            v
      Orchestrator (run.js)
            |
            v
 [Metrics] -> [Discovery] -> [Engineering] -> [Quality]
      -> [Platform] -> [TestDesigner] -> [Summary]
            |
            v
   Reports (MD/HTML) + Optional Playwright Tests
```

## Control and Safety Model
- Mock-first default keeps behavior deterministic for demos.
- Scenario + metrics + signals create explicit context boundaries.
- Outputs are captured as auditable reports.
- Optional test execution validates parts of the generated plan.

### What it does
- Loads a scenario (problem + repo signals) plus optional metrics and external links (GitHub/Sonar/Fortify/CI).
- Runs the agent loop and optionally auto-generates/runs UI+API Playwright tests.
- Generates Markdown (and optional HTML) reports with metrics status, plans, test scenarios, and test results.

### How it works (step by step)
1. You describe the problem/constraints in `scenarios/banking-app.json`.
2. Optionally attach engineering/CI/post-release metrics from `data/metrics.json` via `--metrics`, and external signals via `--signals config/signals.json`.
3. The orchestrator chains agents and passes context between them.
4. Each agent builds a prompt and calls a model (mock by default, OpenAI if key provided).
5. The orchestrator renders Markdown (and optional HTML with `--html`) in `reports/`.

## Quick start (agent flow)
```bash
# /agentic-engineering-playbook
node src/run.js scenarios/banking-app.json --metrics data/metrics.json
node src/run.js scenarios/banking-app.json --metrics data/metrics.json --html
node src/run.js scenarios/banking-app.json --metrics data/metrics.json --signals config/signals.json --html --run-tests
npm run demo:tests
```

Use OpenAI instead of mock (optional):
```bash
cp config/model.example.json config/model.json
node src/run.js scenarios/banking-app.json --metrics data/metrics.json
```

Other LLM providers:
- OpenAI is integrated out-of-the-box.
- You can connect Gemini, Claude, or other providers by adding provider clients in `src/models.js` and extending the model selection logic.

## Demo web app (login + dashboard)
- Static app lives in `web/`. Run `npm run web` and open `http://localhost:3000`.
- Use the UI as product context; credentials are shown on the login card.

## UI/API automation (Playwright, auto-generated)
- With `--run-tests`, Playwright specs are generated to `tests/generated/` and run against UI + API.
- Results appear in the final report under automated test results.
- Requirements: `npm install` and `npx playwright install chromium`.

## Files
- `src/run.js` — CLI entrypoint (`--metrics`, `--html`, `--run-tests`).
- `src/orchestrator.js` — chains agents and renders reports.
- `src/agents.js` — agent definitions and prompts.
- `src/models.js` — mock and optional OpenAI model clients.
- `src/tools.js` — metrics/signal loaders.
- `src/test-runner.js` — test generation + execution.
- `scenarios/banking-app.json` — base scenario.
- `data/metrics.json` — demo metrics/targets.
- `reports/` — generated report artifacts.
- `web/` — demo UI.
- `tests/generated/` — generated Playwright specs.

## Extending
- Add scenarios to `scenarios/*.json` with `goal`, `constraints`, `techStack`, and `inputs.repoSignals`.
- Add tools so agents can read repo files, CI logs, or quality/security APIs.
- Add additional agents for release governance, cost, or reliability.
- Swap model providers in `src/models.js` while keeping orchestrator logic intact.

## Failure Modes and Mitigations
- Prompt drift: keep scenario-based regression runs.
- Stale signals: timestamp and validate external inputs.
- Over-automation risk: keep human approval points before critical actions.
- Tool brittleness: isolate tool adapters and retry policies.

## Limitations
- This demo uses constrained tools/signals, not full production integrations.
- Generated plans still require human review.
- Multi-agent pipelines add complexity and operational overhead.

## Notes
- Node 18+ required.
- Playwright setup is needed only when `--run-tests` is used.
- Reports are Markdown/HTML for easy sharing and review.
