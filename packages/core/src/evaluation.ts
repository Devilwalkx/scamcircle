import { assess } from "./indicators.js";
import { DATASET, type Sample } from "./dataset.js";

export interface Row { scenario: string; n: number; scams: number; legit: number; falseReassurance: number; falseAlarm: number; cannotAssess: number }
export interface Report { overall: Row; byScenario: Row[]; byLanguage: Row[]; misses: string[]; alarms: string[] }

function blank(scenario: string): Row { return { scenario, n: 0, scams: 0, legit: 0, falseReassurance: 0, falseAlarm: 0, cannotAssess: 0 }; }

function add(row: Row, sm: Sample, outcome: string) {
  row.n++;
  if (sm.label === "scam") row.scams++; else row.legit++;
  if (outcome === "cannot_assess") row.cannotAssess++;
  else if (sm.label === "scam" && outcome === "no_indicators_found") row.falseReassurance++;
  else if (sm.label === "legit" && outcome === "indicators_found") row.falseAlarm++;
}

/** False reassurance = a scam sample for which the engine found no warning signs. False alarm = a legitimate sample that got warning signs. "Cannot assess" is counted separately. */
export function evaluate(samples: Sample[]): Report {
  const overall = blank("all");
  const sc = new Map<string, Row>();
  const lg = new Map<string, Row>();
  const misses: string[] = [];
  const alarms: string[] = [];
  for (const sm of samples) {
    const o = assess(sm.text).outcome;
    add(overall, sm, o);
    add(sc.get(sm.scenario) ?? sc.set(sm.scenario, blank(sm.scenario)).get(sm.scenario)!, sm, o);
    add(lg.get(sm.language) ?? lg.set(sm.language, blank(sm.language)).get(sm.language)!, sm, o);
    if (sm.label === "scam" && o === "no_indicators_found") misses.push(sm.id);
    if (sm.label === "legit" && o === "indicators_found") alarms.push(sm.id);
  }
  const sort = (m: Map<string, Row>) => [...m.values()].sort((a, b) => a.scenario.localeCompare(b.scenario));
  return { overall, byScenario: sort(sc), byLanguage: sort(lg), misses, alarms };
}

export const tuningSet = () => DATASET.filter((s) => !s.heldOut);
export const heldOutSet = () => DATASET.filter((s) => s.heldOut);

export function renderReport(title: string, r: Report): string {
  const line = (x: Row) => `| ${x.scenario} | ${x.n} | ${x.scams} | ${x.legit} | ${x.falseReassurance} | ${x.falseAlarm} | ${x.cannotAssess} |`;
  const head = "| Group | Samples | Scam | Legit | False reassurance | False alarm | Cannot assess |\n|---|---|---|---|---|---|---|";
  return [`### ${title}`, "", head, line(r.overall), "", "By scenario", "", head, ...r.byScenario.map(line), "", "By language", "", head, ...r.byLanguage.map(line), "", `Scams with no warning signs found: ${r.misses.join(", ") || "none"}`, `Legitimate messages given warning signs: ${r.alarms.join(", ") || "none"}`].join("\n");
}
