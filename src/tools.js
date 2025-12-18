import fs from "fs";

export function loadMetrics(filePath = "data/metrics.json") {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Metrics file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function evaluateMetrics(metrics) {
  if (!metrics) return { summary: [], details: [] };
  const t = metrics.targets || {};
  const detail = [];

  function check(name, actual, target, comparator, good, bad) {
    if (actual === undefined || target === undefined) return;
    const pass =
      comparator === "gte" ? actual >= target :
      comparator === "lte" ? actual <= target :
      comparator === "lte-count" ? actual <= target :
      comparator === "gte-count" ? actual >= target :
      false;
    detail.push(`${name}: ${actual} (target ${target}) — ${pass ? good : bad}`);
  }

  check("Unit coverage %", metrics.preMerge?.unitCoveragePct, t.unitCoverageMinPct, "gte", "pass", "needs attention");
  check("Component coverage %", metrics.preMerge?.componentCoveragePct, t.componentCoverageMinPct, "gte", "pass", "needs attention");
  check("Static analysis findings", metrics.preMerge?.staticAnalysisFindings, t.staticAnalysisMax, "lte", "pass", "needs attention");
  check("Security findings", metrics.preMerge?.securityFindings, t.securityFindingsMax, "lte", "pass", "needs attention");

  check("Regression pass rate %", metrics.ciCd?.regressionPassRatePct, t.regressionPassRateMinPct, "gte", "pass", "needs attention");
  check("p95 latency ms", metrics.ciCd?.p95LatencyMs, t.p95LatencyMaxMs, "lte", "pass", "needs attention");
  check("p99 latency ms", metrics.ciCd?.p99LatencyMs, t.p99LatencyMaxMs, "lte", "pass", "needs attention");
  check("Error budget % remaining", metrics.ciCd?.errorBudgetRemainingPct, t.errorBudgetMinPct, "gte", "pass", "needs attention");

  check("Defect leakage", metrics.postRelease?.defectLeakageCount, t.defectLeakageMax, "lte", "pass", "needs attention");
  check("MTTR minutes", metrics.postRelease?.mttrMinutes, t.mttrMaxMinutes, "lte", "pass", "needs attention");
  check("MTTD minutes", metrics.postRelease?.mttdMinutes, t.mttdMaxMinutes, "lte", "pass", "needs attention");
  check("Customer error rate %", metrics.postRelease?.customerErrorRatePct, t.customerErrorRateMaxPct, "lte", "pass", "needs attention");
  check("Rollbacks", metrics.postRelease?.rollbackCount, t.rollbackMax, "lte", "pass", "needs attention");
  check("SLO compliance %", metrics.postRelease?.sloCompliancePct, t.sloComplianceMinPct, "gte", "pass", "needs attention");
  check("Runbook completeness %", metrics.postRelease?.runbookCompletenessPct, t.runbookCompletenessMinPct, "gte", "pass", "needs attention");

  const summary = detail.filter((d) => d.includes("needs attention"));
  return { summary, details: detail };
}

export function metricsToSignals(metrics) {
  if (!metrics) return [];
  const pre = metrics.preMerge || {};
  const ci = metrics.ciCd || {};
  const post = metrics.postRelease || {};

  const preMergeSignals = [
    `Unit coverage ${pre.unitCoveragePct || "n/a"}% (target ${pre.coverageTargetPct || "n/a"}%), component coverage ${pre.componentCoveragePct || "n/a"}%.`,
    `Static analysis findings: ${pre.staticAnalysisFindings ?? "n/a"}, security findings: ${pre.securityFindings ?? "n/a"}.`
  ];

  const ciCdSignals = [
    `Regression pass rate ${ci.regressionPassRatePct || "n/a"}%, quality gate ${ci.qualityGateStatus || "n/a"}.`,
    `Perf: p95 ${ci.p95LatencyMs || "n/a"}ms, p99 ${ci.p99LatencyMs || "n/a"}ms, throughput ${ci.throughputRps || "n/a"} rps, error budget remaining ${ci.errorBudgetRemainingPct || "n/a"}%.`
  ];

  const postReleaseSignals = [
    `Defect leakage ${post.defectLeakageCount ?? "n/a"}, MTTR ${post.mttrMinutes ?? "n/a"}m, MTTD ${post.mttdMinutes ?? "n/a"}m.`,
    `Customer error rate ${post.customerErrorRatePct ?? "n/a"}%, rollback count ${post.rollbackCount ?? "n/a"}, SLO compliance ${post.sloCompliancePct ?? "n/a"}%, runbook completeness ${post.runbookCompletenessPct ?? "n/a"}%, onboarding score ${post.onboardingScore ?? "n/a"}.`
  ];

  return [...preMergeSignals, ...ciCdSignals, ...postReleaseSignals];
}

export function loadSignals(filePath = "config/signals.json") {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Signals file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  const collected = [];
  if (Array.isArray(data.customSignals)) {
    collected.push(...data.customSignals);
  }
  if (data.github?.repo) {
    collected.push(`GitHub repo: ${data.github.repo}${data.github.pr ? ` PR #${data.github.pr}` : ""}`);
  }
  if (data.sonar?.projectKey) {
    collected.push(`Sonar project: ${data.sonar.projectKey} (url: ${data.sonar.url || "n/a"})`);
  }
  if (data.fortify?.project) {
    collected.push(`Fortify project: ${data.fortify.project}`);
  }
  if (data.cicd?.jobUrl) {
    collected.push(`CI/CD job: ${data.cicd.jobUrl}`);
  }

  return collected;
}
