import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { baseProgram, revisedProgram, rows } from "./program.mjs";
import { createReport } from "./render-report.mjs";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(buffer) {
  assert.deepEqual(buffer.subarray(0, 8), pngSignature);
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

test("writes a deterministic, operation-only immutable-revision report", async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-report-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));

  const baseActionsBefore = baseProgram.trace.children.map(node => node.op);
  const report = await createReport(temporary);
  const files = (await readdir(temporary)).sort();

  assert.deepEqual(files, ["base.png", "report.json", "revised.png"]);
  assert.deepEqual(baseProgram.trace.children.map(node => node.op), [
    "createCanvas",
    "createData",
    "createScatterPlot",
    "createTitle"
  ]);
  assert.deepEqual(
    revisedProgram.trace.children.map(node => node.op),
    [...baseActionsBefore, "editPointMark"]
  );
  assert.equal(Object.isFrozen(baseProgram), true);
  assert.equal(Object.isFrozen(revisedProgram), true);
  assert.equal(Object.isFrozen(rows), true);

  const basePng = await readFile(path.join(temporary, "base.png"));
  const revisedPng = await readFile(path.join(temporary, "revised.png"));
  assert.deepEqual(readPngDimensions(basePng), { width: 720, height: 440 });
  assert.deepEqual(readPngDimensions(revisedPng), {
    width: 720,
    height: 440
  });
  assert.equal(basePng.length > pngSignature.length, true);
  assert.equal(revisedPng.length > pngSignature.length, true);
  assert.notDeepEqual(basePng, revisedPng);
  assert.notEqual(report.charts[0].sha256, report.charts[1].sha256);

  const reportText = await readFile(
    path.join(temporary, "report.json"),
    "utf8"
  );
  const parsed = JSON.parse(reportText);
  assert.deepEqual(parsed, report);
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.renderer, {
    package: "ggaction",
    version: "0.0.6",
    entry: "ggaction/png",
    pixelRatio: 1
  });
  assert.deepEqual(parsed.determinism, {
    scope: "same-run",
    repeatedBaseByteIdentical: true
  });

  for (const forbidden of [
    '"args"',
    "horsepower",
    "Japan",
    "this.is.for.ggaction",
    temporary,
    process.cwd(),
    new Date().toISOString().slice(0, 10)
  ]) {
    assert.equal(reportText.includes(forbidden), false, forbidden);
  }
  for (const chart of parsed.charts) {
    assert.match(chart.sha256, /^[a-f0-9]{64}$/);
    assert.equal(chart.logicalWidth, 720);
    assert.equal(chart.logicalHeight, 440);
    assert.equal(chart.physicalWidth, 720);
    assert.equal(chart.physicalHeight, 440);
    assert.equal(chart.trace.op, "program");
    assert.equal(chart.traceNodeCount > chart.actionCount, true);
  }
});

test("refuses to overwrite any published target", async t => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-report-"));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const existing = path.join(temporary, "report.json");
  await writeFile(existing, "keep me\n", "utf8");

  await assert.rejects(
    createReport(temporary),
    /Refusing to overwrite existing file/
  );
  assert.equal(await readFile(existing, "utf8"), "keep me\n");
  assert.deepEqual(await readdir(temporary), ["report.json"]);
});
