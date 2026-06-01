// One-shot: read the workflow's JSON output and materialize the 15 SDD docs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const OUTPUT =
  process.argv[2] ??
  String.raw`C:\Users\alexm\AppData\Local\Temp\claude\c--Users-alexm-OneDrive-Bureau-Agendrix\dfe76e98-51c1-41d1-9c5a-87e0835a57d4\tasks\wpeyrdrgr.output`;

const SPECS_ROOT = "specs";

const raw = readFileSync(OUTPUT, "utf8");
const data = JSON.parse(raw);

const phases = data.phases ?? data.result?.phases ?? [];
if (!Array.isArray(phases) || phases.length === 0) {
  console.error("No phases found in output file.");
  process.exit(1);
}

let total = 0;
for (const p of phases) {
  const dir = join(SPECS_ROOT, `${p.num}-${p.slug}`);
  mkdirSync(dir, { recursive: true });
  const files = [
    ["spec.md", p.docs.specMd],
    ["plan.md", p.docs.planMd],
    ["tasks.md", p.docs.tasksMd],
  ];
  for (const [name, content] of files) {
    const path = join(dir, name);
    writeFileSync(path, content, "utf8");
    console.log(`wrote ${path} (${content.length} bytes)`);
    total += 1;
  }
}
console.log(`\nDone. ${total} files written across ${phases.length} phases.`);
