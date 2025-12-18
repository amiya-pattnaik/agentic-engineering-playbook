import fs from "fs";
import path from "path";
import { readJson } from "./utils.js";
import { outputPathForScenario, runScenario } from "./orchestrator.js";
import { loadMetrics, metricsToSignals, loadSignals } from "./tools.js";
import { generateSpecs, runPlaywright } from "./test-runner.js";

function listScenarios(dir = "scenarios") {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file));
}

function printHelp() {
  console.log("Usage: node src/run.js [scenario.json] [--no-write] [--metrics data/metrics.json] [--signals config/signals.json] [--html] [--run-tests]");
  console.log("Examples:");
  console.log("  node src/run.js scenarios/banking-app.json --metrics data/metrics.json --signals config/signals.json --run-tests --html");
  console.log("  node src/run.js --list");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--list")) {
    const files = listScenarios();
    if (!files.length) {
      console.log("No scenarios found in scenarios/.");
    } else {
      console.log("Available scenarios:");
      files.forEach((f) => console.log(`- ${f}`));
    }
    process.exit(0);
  }

  const scenarioPath = args.find((a) => !a.startsWith("--")) || "scenarios/banking-app.json";
  const metricsFlagIndex = args.indexOf("--metrics");
  const metricsPath = metricsFlagIndex !== -1 ? args[metricsFlagIndex + 1] : null;
  const signalsFlagIndex = args.indexOf("--signals");
  const signalsPath = signalsFlagIndex !== -1 ? args[signalsFlagIndex + 1] : null;
  const htmlOutput = args.includes("--html");
  const runTests = args.includes("--run-tests");
  if (!fs.existsSync(scenarioPath)) {
    console.error(`Scenario not found: ${scenarioPath}`);
    process.exit(1);
  }

  const scenario = readJson(scenarioPath);
  let metrics = null;
  let testResults = null;
  let extraSignals = [];

  if (metricsPath) {
    try {
      metrics = loadMetrics(metricsPath);
      const metricSignals = metricsToSignals(metrics);
      scenario.inputs = scenario.inputs || {};
      scenario.inputs.repoSignals = [...(scenario.inputs.repoSignals || []), ...metricSignals];
      console.log(`Loaded metrics from ${metricsPath} and attached ${metricSignals.length} signals.`);
    } catch (err) {
      console.error(`Failed to load metrics from ${metricsPath}: ${err.message}`);
      process.exit(1);
    }
  }

  if (signalsPath) {
    try {
      extraSignals = loadSignals(signalsPath);
      scenario.inputs = scenario.inputs || {};
      scenario.inputs.repoSignals = [...(scenario.inputs.repoSignals || []), ...extraSignals];
      console.log(`Loaded external signals from ${signalsPath} (${extraSignals.length}).`);
    } catch (err) {
      console.error(`Failed to load signals from ${signalsPath}: ${err.message}`);
      process.exit(1);
    }
  }

  if (runTests) {
    try {
      const specs = generateSpecs();
      console.log(`Generated Playwright specs: ${specs.join(", ")}`);
      testResults = runPlaywright(specs);
      const testSignals = [];
      if (testResults.summary) {
        const s = testResults.summary;
        testSignals.push(
          `Playwright tests: ${s.expected ?? "?"} expected, ${s.skipped ?? 0} skipped, failures ${s.failures ?? s.unexpected ?? 0}`
        );
      }
      testSignals.push(`Playwright status: ${testResults.ok ? "passed" : "failed"} (${testResults.message})`);
      scenario.inputs = scenario.inputs || {};
      scenario.inputs.repoSignals = [...(scenario.inputs.repoSignals || []), ...testSignals];
    } catch (err) {
      console.error(`Test run failed: ${err.message}`);
    }
  }
  const shouldWrite = !args.includes("--no-write");
  const reportPath = shouldWrite ? outputPathForScenario(scenario) : undefined;
  const htmlPath = shouldWrite && htmlOutput ? reportPath.replace(/\.md$/, ".html") : undefined;

  console.log(`Running scenario: ${scenario.title || scenarioPath}`);
  const hasKey = process.env.OPENAI_API_KEY || (() => {
    try {
      const cfg = JSON.parse(fs.readFileSync("config/model.json", "utf8"));
      return cfg.OPENAI_API_KEY;
    } catch {
      return null;
    }
  })();
  console.log(`Model: ${hasKey ? "openai" : "mock"}`);

  const { report, modelKind, htmlReport } = await runScenario(scenario, {
    outputPath: reportPath,
    htmlOutputPath: htmlPath,
    metrics,
    testResults
  });

  console.log(`\n--- Agentic AI Works Report (${modelKind}) ---\n`);
  console.log(report);

  if (shouldWrite && reportPath) {
    console.log(`\nSaved report to ${reportPath}`);
    if (htmlPath) {
      console.log(`Saved HTML report to ${htmlPath}`);
    }
  } else {
    console.log("\nReport not saved (use default without --no-write to persist).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
