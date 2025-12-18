## Agentic Engineering Playbook — Banking Demo (Node.js)

Small, runnable demo that shows an agentic AI workflow for engineering/QA/platform around a simple banking web app. It runs locally with a mocked model or can call OpenAI if you drop a key into `config/model.json`.

### How the agentic flow works (no ML background needed)
- A **scenario** is JSON describing a problem, signals, tech, and constraints.
- Agents run in order: Metrics → Discovery → Engineering → Quality → Platform → TestDesigner → Summary.
- Each agent gets the scenario plus prior outputs/signals, then calls a model (mock by default; OpenAI if you set a key) to generate its slice.
- The orchestrator stitches outputs into Markdown/HTML; optional auto-generated Playwright tests run first when `--run-tests`.
- You can extend this by adding real tools (read logs, call CI/APIs, run tests) so agents act on live data.

### What it does
- Loads a scenario (problem + repo signals) plus optional metrics and external links (GitHub/Sonar/Fortify/CI).
- Runs the agent loop and optionally auto-generates/runs UI+API Playwright tests.
- Generates Markdown (and optional HTML) reports with metrics status, plans, test scenarios, and test results.

### How it works (step by step)
1) You describe the problem/constraints in `scenarios/banking-app.json`.
2) Optionally attach engineering/CI/post-release metrics from `data/metrics.json` via `--metrics`, and external signals (GitHub/Sonar/Fortify/CI links) via `--signals config/signals.json`.
3) The orchestrator chains agents (Metrics → Discovery → Engineering → Quality → Platform → TestDesigner → Summary), passing context between them.
4) Each agent builds a prompt and calls a model (mock by default, OpenAI if key provided).
5) The orchestrator renders Markdown (and optional HTML with `--html`) in `reports/`. Automated test results (if `--run-tests`) are included as an artifact and signals.

### Quick start (agent flow)
```bash
# /agentic-engineering-playbook
node src/run.js scenarios/banking-app.json --metrics data/metrics.json                # mock model
node src/run.js scenarios/banking-app.json --metrics data/metrics.json --html         # also writes HTML report
node src/run.js scenarios/banking-app.json --metrics data/metrics.json --signals config/signals.json --html --run-tests  # add external signals + run tests
npm run demo:tests   # shortcut for metrics + html + run-tests
```

Use OpenAI instead of mock (optional):
```bash
cp config/model.example.json config/model.json   # put your key in config/model.json
node src/run.js scenarios/banking-app.json --metrics data/metrics.json
```
Environment vars still work (`OPENAI_API_KEY`), but config file keeps keys out of commands.

### Demo web app (login + dashboard)
- Static app lives in `web/`. Run `npm run web` and open http://localhost:3000.
- Use the UI as the product context; credentials are shown on the login card (user@example.com / demo123).
1. Open http://localhost:3000 and show the banking app (login + dashboard).
2. Run `node src/run.js scenarios/banking-app.json --metrics data/metrics.json --html`  shows the generated report in `reports/`.
3. (Optional) Add `--run-tests` or use `npm run demo:tests` to  auto-generated Playwright UI/API runs reflected in the report.
4. Agent chain (Metrics → Discovery → Engineering → Quality → Platform → TestDesigner → Summary) shows how metrics/tests feed prompts.

### UI/API automation (Playwright, auto-generated)
- With `--run-tests`, we auto-generate Playwright specs to `tests/generated/` and run them (UI login/dashboard + API /api/account). Results appear in the report under “Automated Test Results” and as signals.
- Requirements: `npm install` and `npx playwright install chromium`. Run the app (`npm run web`) in another terminal when using `--run-tests` or `npm run demo:tests`.

### Files
- `src/run.js` — CLI to run scenarios and print/write reports (Markdown + optional HTML). Flags: `--metrics`, `--html`, `--run-tests`.
- `src/orchestrator.js` — chains agents and renders reports.
- `src/agents.js` — agents for metrics, discovery, engineering, quality, platform, test design, and summary.
- `src/models.js` — mock model (offline) and optional OpenAI client (reads `config/model.json` or env).
- `src/tools.js` — loads metrics, compares to targets, converts to signals; optional external signals loader.
- `src/test-runner.js` — generates Playwright specs and runs them.
- `scenarios/banking-app.json` — the scenario for this demo.
- `data/metrics.json` — example pre-merge/CI/CD/post-release signals + targets.
- `reports/` — generated reports land here.
- `web/` — static demo app; served by `npm run web`.
- `tests/generated/` — auto-generated Playwright UI/API specs when `--run-tests` is used.
- `config/model.example.json` — copy to `config/model.json` and add your OpenAI key (otherwise mock runs).
- `config/signals.example.json` — copy to `config/signals.json` to attach GitHub/Sonar/Fortify/CI links or custom signals.

### Extending
- Add more scenarios to `scenarios/*.json` with `title`, `goal`, `constraints`, `techStack`, and `inputs.repoSignals`.
- Plug in a live LLM by setting `OPENAI_API_KEY` (no extra deps required; Node 18+ `fetch` is used).
- Add tools: teach agents to read real repo files, scrape CI logs, or trigger smoke tests.

### Notes
- Requires Node 18+. Playwright is only needed if you use `--run-tests` (install via `npm install && npx playwright install chromium`).
- Reports are Markdown/HTML so they’re easy to share.
