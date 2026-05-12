/**
 * Capacitor's `cap sync ios` only scans node_modules for @objc/CAP_PLUGIN classes.
 * Local plugins under ios/App (e.g. WidgetSyncPlugin) must be merged into
 * ios/App/App/capacitor.config.json packageClassList or they never register on the bridge.
 */
import fs from "node:fs";
import path from "node:path";

const capJsonPath = path.resolve("ios/App/App/capacitor.config.json");
const extraClasses = ["WidgetSyncPlugin"];

const raw = fs.readFileSync(capJsonPath, "utf8");
const json = JSON.parse(raw);
const list = Array.isArray(json.packageClassList) ? json.packageClassList : [];
const merged = [...new Set([...list, ...extraClasses])];
if (merged.length === list.length && extraClasses.every((c) => list.includes(c))) {
  process.exit(0);
}
json.packageClassList = merged;
fs.writeFileSync(capJsonPath, `${JSON.stringify(json, null, "\t")}\n`, "utf8");
console.log("[ensure-ios-widget-plugin] merged into packageClassList:", extraClasses.join(", "));
