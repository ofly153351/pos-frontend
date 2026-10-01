import { normalizeWarehouseTimelineActivityType } from "../components/warehouse/warehouse-dashboard-activity";

const checks: Array<[string, boolean]> = [
  ["TRANSFER_IN is shown as transfer", normalizeWarehouseTimelineActivityType("TRANSFER_IN") === "TRANSFER"],
  ["TRANSFER_OUT is shown as transfer", normalizeWarehouseTimelineActivityType("TRANSFER_OUT") === "TRANSFER"],
  ["known activity remains unchanged", normalizeWarehouseTimelineActivityType("SALE") === "SALE"],
  ["unknown activity remains hidden", normalizeWarehouseTimelineActivityType("UNKNOWN") === null],
];

for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
const failed = checks.filter(([, passed]) => !passed).length;
console.log(`RESULT ${checks.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);