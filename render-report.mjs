import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToPNG } from "ggaction/png";

import { baseProgram, revisedProgram } from "./program.mjs";

const publishedFiles = Object.freeze([
  "base.png",
  "revised.png",
  "report.json"
]);
const repeatFile = ".base-repeat.png";

function parseOutput(arguments_) {
  if (
    arguments_.length !== 2 ||
    arguments_[0] !== "--output" ||
    arguments_[1].length === 0
  ) {
    throw new TypeError(
      "Usage: node render-report.mjs --output <directory>"
    );
  }
  return path.resolve(arguments_[1]);
}

async function assertAbsent(file) {
  try {
    await access(file);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Refusing to overwrite existing file: ${file}`);
}

function sanitizeTrace(node) {
  return Object.freeze({
    op: node.op,
    children: Object.freeze(node.children.map(sanitizeTrace))
  });
}

function countTraceNodes(node) {
  return 1 + node.children.reduce(
    (total, child) => total + countTraceNodes(child),
    0
  );
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function logicalDimensions(program) {
  const canvas = program.graphicSpec.objects.canvas;
  return {
    width: canvas.properties.width,
    height: canvas.properties.height
  };
}

async function renderChart({ id, program, output }) {
  const result = await renderToPNG(program, {
    output,
    pixelRatio: 1
  });
  const buffer = await readFile(output);
  const logical = logicalDimensions(program);
  return Object.freeze({
    id,
    png: path.basename(output),
    sha256: sha256(buffer),
    bytes: buffer.length,
    logicalWidth: logical.width,
    logicalHeight: logical.height,
    physicalWidth: result.width,
    physicalHeight: result.height,
    actionCount: program.trace.children.length,
    traceNodeCount: countTraceNodes(program.trace) - 1,
    trace: sanitizeTrace(program.trace)
  });
}

export async function createReport(outputDirectory) {
  const output = path.resolve(outputDirectory);
  const paths = Object.fromEntries(
    [...publishedFiles, repeatFile].map(name => [name, path.join(output, name)])
  );

  await Promise.all(Object.values(paths).map(assertAbsent));
  await mkdir(output, { recursive: true });

  const base = await renderChart({
    id: "base",
    program: baseProgram,
    output: paths["base.png"]
  });
  const revised = await renderChart({
    id: "revised",
    program: revisedProgram,
    output: paths["revised.png"]
  });
  const repeat = await renderChart({
    id: "base-repeat",
    program: baseProgram,
    output: paths[repeatFile]
  });

  if (base.sha256 !== repeat.sha256) {
    throw new Error("Repeated base render was not byte-identical.");
  }
  if (base.sha256 === revised.sha256) {
    throw new Error("Revision render did not differ from the base render.");
  }

  await unlink(paths[repeatFile]);

  const report = Object.freeze({
    schemaVersion: 1,
    renderer: Object.freeze({
      package: "ggaction",
      version: "0.0.6",
      entry: "ggaction/png",
      pixelRatio: 1
    }),
    determinism: Object.freeze({
      scope: "same-run",
      repeatedBaseByteIdentical: true
    }),
    relationship: Object.freeze({
      type: "immutable-revision",
      base: "base",
      revision: "revised"
    }),
    charts: Object.freeze([base, revised])
  });

  await writeFile(
    paths["report.json"],
    `${JSON.stringify(report, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" }
  );

  const finalFiles = (await readdir(output)).sort();
  if (JSON.stringify(finalFiles) !== JSON.stringify([...publishedFiles].sort())) {
    throw new Error(
      `Unexpected output files: ${finalFiles.join(", ")}`
    );
  }

  return report;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  createReport(parseOutput(process.argv.slice(2)))
    .then(report => {
      process.stdout.write(`${JSON.stringify({
        output: path.resolve(process.argv[3]),
        files: publishedFiles,
        baseSha256: report.charts[0].sha256,
        revisedSha256: report.charts[1].sha256
      })}\n`);
    })
    .catch(error => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
