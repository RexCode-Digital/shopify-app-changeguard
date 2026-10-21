import { createHash } from 'node:crypto';
import { lstat, open, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import type { Finding } from './core.js';

export type ComparisonKind = 'configuration-pair' | 'git-file' | 'git-all';
export type FindingLifecycle = 'NEW' | 'EXISTING' | 'RESOLVED';
export type BaselineFinding = {
  fingerprint: string;
  ruleId: string;
  path: string;
  field: string;
  riskLevel: 'low' | 'medium' | 'high';
  count: number;
};
export type Baseline = {
  schemaVersion: 1;
  comparisonKind: ComparisonKind;
  findings: BaselineFinding[];
};
export type CurrentFinding = { path: string; finding: Finding };
export type LifecycleFinding = Finding & { lifecycle: FindingLifecycle };
export type ResolvedFinding = BaselineFinding & { lifecycle: 'RESOLVED' };
export type LifecycleCounts = { newCount: number; existingCount: number; resolvedCount: number };
export type LifecycleResult = {
  findings: LifecycleFinding[];
  resolvedFindings: ResolvedFinding[];
  counts: LifecycleCounts;
};

const MAX_BASELINE_BYTES = 1024 * 1024;
const MAX_BASELINE_FINDINGS = 10_000;
const hashPattern = /^[a-f0-9]{64}$/;
const rulePattern = /^[A-Z0-9][A-Z0-9_-]{0,99}$/;

export function normaliseRepositoryPath(value: string): string {
  if (!value || value.includes('\0')) throw new Error('Baseline configuration paths must be repository-relative.');
  const path = value.replaceAll('\\', '/');
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || isAbsolute(value) || win32.isAbsolute(value)) {
    throw new Error('Baseline configuration paths must be repository-relative.');
  }
  const parts = path.split('/');
  if (parts.some((part) => part === '..')) throw new Error('Baseline configuration paths must not traverse directories.');
  const normalised = parts.filter((part) => part && part !== '.').join('/');
  if (!normalised || normalised.length > 2048 || normalised.includes(':')) {
    throw new Error('Baseline configuration paths must be repository-relative.');
  }
  return normalised;
}

export function findingFingerprint(finding: Finding, repositoryPath: string): string {
  const path = normaliseRepositoryPath(repositoryPath);
  const identity = [
    'changeguard-baseline-v1',
    finding.ruleId,
    path,
    finding.field,
    finding.category ?? 'unspecified',
    finding.riskLevel ?? 'medium',
    finding.summary,
  ];
  return createHash('sha256').update(JSON.stringify(identity), 'utf8').digest('hex');
}

export function createBaseline(kind: ComparisonKind, current: CurrentFinding[]): Baseline {
  const grouped = new Map<string, BaselineFinding>();
  for (const item of current) {
    const path = normaliseRepositoryPath(item.path);
    const fingerprint = findingFingerprint(item.finding, path);
    const existing = grouped.get(fingerprint);
    if (existing) {
      existing.count++;
    } else {
      grouped.set(fingerprint, {
        fingerprint,
        ruleId: item.finding.ruleId,
        path,
        field: item.finding.field,
        riskLevel: item.finding.riskLevel ?? 'medium',
        count: 1,
      });
    }
  }
  if (grouped.size > MAX_BASELINE_FINDINGS) throw new Error('Too many findings for a ChangeGuard baseline.');
  return {
    schemaVersion: 1,
    comparisonKind: kind,
    findings: [...grouped.values()].sort(compareBaselineFinding),
  };
}

function compareBaselineFinding(a: BaselineFinding, b: BaselineFinding): number {
  return compareText(a.path, b.path) || compareText(a.ruleId, b.ruleId) || compareText(a.field, b.field) || compareText(a.fingerprint, b.fingerprint);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function validateBaseline(value: unknown): Baseline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Baseline must be a JSON object.');
  const baseline = value as Record<string, unknown>;
  if (baseline.schemaVersion !== 1) throw new Error('Unsupported ChangeGuard baseline schema version.');
  if (!['configuration-pair', 'git-file', 'git-all'].includes(String(baseline.comparisonKind))) {
    throw new Error('Baseline comparisonKind is invalid.');
  }
  if (!Array.isArray(baseline.findings) || baseline.findings.length > MAX_BASELINE_FINDINGS) {
    throw new Error('Baseline findings must be a bounded array.');
  }
  let total = 0;
  const seen = new Set<string>();
  const findings: BaselineFinding[] = baseline.findings.map((raw): BaselineFinding => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('Baseline finding is invalid.');
    const item = raw as Record<string, unknown>;
    if (typeof item.fingerprint !== 'string' || !hashPattern.test(item.fingerprint) || seen.has(item.fingerprint)) {
      throw new Error('Baseline finding fingerprint is invalid or duplicated.');
    }
    if (typeof item.ruleId !== 'string' || !rulePattern.test(item.ruleId)) throw new Error('Baseline finding ruleId is invalid.');
    if (typeof item.path !== 'string' || normaliseRepositoryPath(item.path) !== item.path) throw new Error('Baseline finding path is invalid.');
    if (typeof item.field !== 'string' || !item.field || item.field.length > 256 || /[\r\n\0]/.test(item.field)) {
      throw new Error('Baseline finding field is invalid.');
    }
    if (item.riskLevel !== 'low' && item.riskLevel !== 'medium' && item.riskLevel !== 'high') {
      throw new Error('Baseline finding riskLevel is invalid.');
    }
    if (!Number.isSafeInteger(item.count) || (item.count as number) < 1 || (item.count as number) > MAX_BASELINE_FINDINGS) {
      throw new Error('Baseline finding count is invalid.');
    }
    total += item.count as number;
    if (total > MAX_BASELINE_FINDINGS) throw new Error('Baseline contains too many findings.');
    seen.add(item.fingerprint);
    return {
      fingerprint: item.fingerprint,
      ruleId: item.ruleId,
      path: item.path,
      field: item.field,
      riskLevel: item.riskLevel,
      count: item.count as number,
    };
  });
  findings.sort(compareBaselineFinding);
  return { schemaVersion: 1, comparisonKind: baseline.comparisonKind as ComparisonKind, findings };
}

export function classifyFindings(
  current: CurrentFinding[],
  baseline: Baseline | undefined,
  kind: ComparisonKind,
): LifecycleResult {
  if (baseline && baseline.comparisonKind !== kind) throw new Error('Baseline comparison type does not match the selected review.');
  const known = new Map((baseline?.findings ?? []).map((item) => [item.fingerprint, item.count]));
  const used = new Map<string, number>();
  const counts: LifecycleCounts = { newCount: 0, existingCount: 0, resolvedCount: 0 };
  const findings = current.map(({ path, finding }): LifecycleFinding => {
    const fingerprint = findingFingerprint(finding, path);
    const occurrence = (used.get(fingerprint) ?? 0) + 1;
    used.set(fingerprint, occurrence);
    const lifecycle: FindingLifecycle = occurrence <= (known.get(fingerprint) ?? 0) ? 'EXISTING' : 'NEW';
    if (lifecycle === 'EXISTING') counts.existingCount++;
    else counts.newCount++;
    return { ...finding, lifecycle };
  });
  const resolvedFindings: ResolvedFinding[] = [];
  if (baseline) {
    for (const item of baseline.findings) {
      const resolvedCount = item.count - (used.get(item.fingerprint) ?? 0);
      if (resolvedCount > 0) {
        counts.resolvedCount += resolvedCount;
        resolvedFindings.push({ ...item, count: resolvedCount, lifecycle: 'RESOLVED' });
      }
    }
  }
  return { findings, resolvedFindings, counts };
}

async function checkedBaselinePath(userPath: string, cwd: string): Promise<{ absolute: string; relative: string }> {
  if (!userPath || userPath.includes('\0') || isAbsolute(userPath) || win32.isAbsolute(userPath)) {
    throw new Error('Baseline paths must be relative to the repository root.');
  }
  const path = userPath.replaceAll('\\', '/');
  const parts = path.split('/');
  if (parts.some((part) => part === '..')) throw new Error('Baseline paths must not traverse directories.');
  const clean = parts.filter((part) => part && part !== '.').join('/');
  if (!clean) throw new Error('Baseline path is invalid.');
  const root = await realpath(cwd);
  const absolute = resolve(root, clean);
  const rel = relative(root, absolute);
  if (!rel || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error('Baseline paths must stay within the repository root.');
  const relativeParts = rel.split(sep);
  let cursor = root;
  for (const part of relativeParts.slice(0, -1)) {
    cursor = resolve(cursor, part);
    const info = await lstat(cursor).catch(() => undefined);
    if (!info?.isDirectory() || info.isSymbolicLink()) throw new Error('Baseline parent path must be an existing regular directory.');
  }
  return { absolute, relative: rel.split(sep).join('/') };
}

export async function readBaseline(userPath: string, cwd = process.cwd()): Promise<Baseline> {
  const checked = await checkedBaselinePath(userPath, cwd);
  const info = await lstat(checked.absolute).catch(() => undefined);
  if (!info?.isFile() || info.isSymbolicLink()) throw new Error('Baseline must be an existing regular file.');
  if (info.size > MAX_BASELINE_BYTES) throw new Error('Baseline exceeds the supported size limit.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(checked.absolute, 'utf8')) as unknown;
  } catch {
    throw new Error('Baseline is not valid JSON.');
  }
  return validateBaseline(parsed);
}

export async function writeBaseline(userPath: string, baseline: Baseline, cwd = process.cwd()): Promise<string> {
  const checked = await checkedBaselinePath(userPath, cwd);
  const body = `${JSON.stringify(validateBaseline(baseline), null, 2)}\n`;
  if (Buffer.byteLength(body, 'utf8') > MAX_BASELINE_BYTES) throw new Error('Baseline exceeds the supported size limit.');
  let handle;
  try {
    handle = await open(checked.absolute, 'wx', 0o600);
    await handle.writeFile(body, 'utf8');
    await handle.close();
  } catch {
    await handle?.close().catch(() => undefined);
    throw new Error('Unable to create baseline; the destination may already exist or be unavailable.');
  }
  return checked.relative;
}
