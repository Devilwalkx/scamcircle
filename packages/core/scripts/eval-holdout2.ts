import { HOLDOUT2 } from "../src/holdout2.js";
import { evaluate, renderReport } from "../src/evaluation.js";
import { assess } from "../src/indicators.js";
console.log("SYNTHETIC set C (holdout-2), written after the rule changes and not tuned on. Not an accuracy figure.\n");
console.log(renderReport("Set C", evaluate(HOLDOUT2)));
for (const s of HOLDOUT2) {
  const a = assess(s.text);
  const bad = (s.label === "scam" && a.outcome === "no_indicators_found") || (s.label === "legit" && a.outcome === "indicators_found");
  if (bad) console.log(`\n${s.id} [${s.label}] -> ${a.outcome}: ${s.text}\n   signs: ${a.indicators.filter((i) => i.strength !== "context").map((i) => `${i.id}(${i.strength})`).join(", ") || "none"}`);
}
