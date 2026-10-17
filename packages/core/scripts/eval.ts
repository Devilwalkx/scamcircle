import { evaluate, heldOutSet, renderReport, tuningSet } from "../src/evaluation.js";
console.log("SYNTHETIC samples written by the developers. Not an accuracy figure.\n");
console.log(renderReport("Tuning set", evaluate(tuningSet())));
console.log("\n" + renderReport("Held-out set", evaluate(heldOutSet())));
