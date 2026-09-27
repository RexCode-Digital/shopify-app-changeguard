#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { parse } from '@iarna/toml';
import { compareConfigs } from './core.js';
import { readConfigAtRef } from './git-refs.js';

const VERSION = '0.3.0';

function usage(exitCode = 2): never {
  const output = `ChangeGuard ${VERSION}

Usage:
  changeguard --before FILE --after FILE [--json] [--fail-on LEVEL]
  changeguard --base-ref REF --head-ref REF --file PATH [--json] [--fail-on LEVEL]

Options:
  --json              Emit a machine-readable report.
  --fail-on LEVEL     never (default), review, or unreviewed.
  --help              Show this help.
  --version           Show the version.

Exit codes:
  0  Analysis completed without a configured failure condition.
  1  Findings reached --fail-on review.
  2  Input or analysis error, or an unreviewed configuration.
`;
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

async function readConfig(path: string): Promise<Record<string, unknown>> {
  const info = await stat(path);
  if (!info.isFile() || info.size > 1024 * 1024) {
    throw new Error('Input must be a regular TOML file up to 1 MiB: ' + path);
  }
  const source = await readFile(path, 'utf8');
  try {
    return parse(source) as Record<string, unknown>;
  } catch {
    // Parser errors may echo TOML source lines. Do not print their messages.
    throw new Error('Invalid TOML in ' + path + '; file contents were not printed');
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let before: string | undefined;
  let after: string | undefined;
  let json = false;
  let baseRef: string | undefined;
  let headRef: string | undefined;
  let file: string | undefined;
  let failOn: 'never' | 'review' | 'unreviewed' = 'never';
  const valueFor = (name: string, index: number): string => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) usage(2);
    return value;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--version' || arg === '-v') {
      console.log(VERSION);
      return;
    } else if (arg === '--json') json = true;
    else if (arg === '--before') before = valueFor(arg, i++);
    else if (arg === '--after') after = valueFor(arg, i++);
    else if (arg === '--base-ref') baseRef = valueFor(arg, i++);
    else if (arg === '--head-ref') headRef = valueFor(arg, i++);
    else if (arg === '--file') file = valueFor(arg, i++);
    else if (arg === '--fail-on') {
      const value = valueFor(arg, i++);
      if (value !== 'never' && value !== 'review' && value !== 'unreviewed') usage(2);
      failOn = value;
    }
    else usage();
  }
  const fileMode = before !== undefined || after !== undefined;
  const gitMode = baseRef !== undefined || headRef !== undefined || file !== undefined;

  if (fileMode === gitMode) usage();

  let oldConfig: Record<string, unknown>;
  let newConfig: Record<string, unknown>;

  if (gitMode) {
    if (!baseRef || !headRef || !file) usage();
    oldConfig = readConfigAtRef(baseRef, file);
    newConfig = readConfigAtRef(headRef, file);
  } else {
    if (!before || !after) usage();
    [oldConfig, newConfig] = await Promise.all([
      readConfig(before),
      readConfig(after),
    ]);
  }
  const findings = compareConfigs(oldConfig, newConfig);
  const note = 'Only supported access scopes, client_id, application_url, embedded, handle, legacy install flow, auth.redirect_urls and app-specific webhooks are examined; other fields are not checked.';
  if (json) console.log(JSON.stringify({ schemaVersion: 1, note, findings }, null, 2));
  else {
    console.log(`ChangeGuard v${VERSION}`);
    console.log(note);
    if (!findings.length) console.log('No supported-field changes found; this is NOT a deployment approval.');
    for (const finding of findings) console.log(`[REVIEW] ${finding.ruleId}: ${finding.summary}`);
    console.log(`${findings.length} finding(s).`);
  }
  if (failOn === 'review' && findings.length > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unexpected failure';
  console.error('ChangeGuard error: ' + message);
  process.exitCode = 2;
});
