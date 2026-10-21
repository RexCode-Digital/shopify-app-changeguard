#!/usr/bin/env node
import { readFile, lstat } from 'node:fs/promises';
import { parse } from '@iarna/toml';
import { compareConfigs } from './core.js';
import { readConfigAtRef, resolveCommitRef } from './git-refs.js';
import { reviewGitRange } from './pr-review.js';
import { CHANGEGUARD_VERSION } from './generated-version.js';
import { renderMarkdown } from './markdown.js';
import { matchesRiskThreshold, validateRiskThreshold } from './risk-policy.js';
import { classifyFindings, createBaseline, normaliseRepositoryPath, readBaseline, writeBaseline, } from './baseline.js';
import { isAbsolute, relative, resolve } from 'node:path';
const VERSION = CHANGEGUARD_VERSION;
function usage(exitCode = 2) {
    const output = `ChangeGuard ${VERSION}

  Usage:
  changeguard --before FILE --after FILE [--config-path PATH] [--format human|json|markdown] [--fail-on LEVEL] [--fail-on-risk LEVEL]
  changeguard --base-ref REF --head-ref REF --file PATH [--format human|json|markdown] [--fail-on LEVEL] [--fail-on-risk LEVEL]
  changeguard --base-ref REF --head-ref REF --all-configs [--format human|json|markdown] [--fail-on LEVEL] [--fail-on-risk LEVEL]
  changeguard baseline create --baseline FILE [comparison options]
  changeguard baseline check --baseline FILE [comparison options] [--fail-on-new]

Options:
  --json              Emit a machine-readable report (alias for --format json).
  --format FORMAT     Emit human, json, or markdown output.
  --config-path PATH  Repository-relative identity for an explicit TOML comparison.
  --baseline FILE     Read a baseline, or create one with 'baseline create'.
  --fail-on LEVEL     never (default), review, or unreviewed.
  --fail-on-risk LEVEL Fail when any finding reaches none, low, medium, or high risk.
  --fail-on-new       Fail when a finding is new against the selected baseline.
  --all-configs       Review every changed shopify.app*.toml file in a Git range.
  --help              Show this help.
  --version           Show the version.

Exit codes:
  0  Analysis completed without a configured failure condition.
  1  Findings reached a configured finding or risk threshold.
  2  Input or analysis error, or an incomplete review under the selected policy.
`;
    (exitCode === 0 ? console.log : console.error)(output);
    process.exit(exitCode);
}
async function readConfig(path) {
    const info = await lstat(path);
    if (!info.isFile() || info.size > 1024 * 1024) {
        throw new Error('Input must be a regular TOML file up to 1 MiB: ' + path);
    }
    const source = await readFile(path, 'utf8');
    try {
        return parse(source);
    }
    catch {
        // Parser errors may echo TOML source lines. Do not print their messages.
        throw new Error('Invalid TOML in ' + path + '; file contents were not printed');
    }
}
function itemsForGitReport(report) {
    return report.files.flatMap((file) => file.findings.map((finding) => ({ path: file.path, finding })));
}
function withGitLifecycle(report, result) {
    let index = 0;
    const files = report.files.map((file) => ({
        ...file,
        findings: file.findings.map(() => result.findings[index++]),
    }));
    return { ...report, files, lifecycle: result.counts, resolvedFindings: result.resolvedFindings };
}
function pathForExplicitComparison(after, requested) {
    if (requested)
        return normaliseRepositoryPath(requested);
    const absoluteAfter = resolve(after);
    const relativeAfter = relative(process.cwd(), absoluteAfter);
    if (!relativeAfter || relativeAfter === '..' || relativeAfter.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(relativeAfter)) {
        throw new Error('Use --config-path with a repository-relative path when the compared file is outside the repository.');
    }
    return normaliseRepositoryPath(relativeAfter);
}
function printLifecycleCounts(result) {
    return `Lifecycle: ${result.counts.newCount} new, ${result.counts.existingCount} existing, ${result.counts.resolvedCount} resolved.`;
}
function outputGitReport(report, format) {
    if (format === 'json')
        console.log(JSON.stringify(report, null, 2));
    else if (format === 'markdown')
        console.log(renderMarkdown(report));
    else {
        console.log(`ChangeGuard v${VERSION}`);
        console.log(report.note);
        for (const reviewed of report.files)
            for (const finding of reviewed.findings) {
                console.log(`[${(finding.lifecycle ?? finding.riskLevel ?? 'medium').toString()}] ${finding.ruleId}: ${finding.summary}`);
            }
        for (const finding of report.resolvedFindings ?? [])
            console.log(`[RESOLVED] ${finding.path}: ${finding.ruleId} (${finding.count})`);
        console.log(`${report.files.flatMap((item) => item.findings).length} finding(s) across ${report.reviewedFileCount} reviewed configuration file(s).`);
        if (report.lifecycle)
            console.log(`Lifecycle: ${report.lifecycle.newCount} new, ${report.lifecycle.existingCount} existing, ${report.lifecycle.resolvedCount} resolved.`);
        if (report.unreviewed.length)
            console.log(`${report.unreviewed.length} configuration file(s) could not be reviewed.`);
    }
}
async function main() {
    let args = process.argv.slice(2);
    let baselineCommand;
    if (args[0] === 'baseline') {
        const command = args[1];
        if (command !== 'create' && command !== 'check')
            usage();
        baselineCommand = command;
        args = args.slice(2);
    }
    let before;
    let after;
    let json = false;
    let format;
    let baseRef;
    let headRef;
    let file;
    let allConfigs = false;
    let failOn = 'never';
    let failOnRisk = 'none';
    let failOnNew = false;
    let baselinePath;
    let configPath;
    const valueFor = (name, index) => {
        const value = args[index + 1];
        if (!value || value.startsWith('--'))
            usage(2);
        return value;
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h')
            usage(0);
        else if (arg === '--version' || arg === '-v') {
            console.log(VERSION);
            return;
        }
        else if (arg === '--json')
            json = true;
        else if (arg === '--format') {
            const value = valueFor(arg, i++);
            if (value !== 'human' && value !== 'json' && value !== 'markdown')
                usage(2);
            format = value;
        }
        else if (arg === '--before')
            before = valueFor(arg, i++);
        else if (arg === '--after')
            after = valueFor(arg, i++);
        else if (arg === '--base-ref')
            baseRef = valueFor(arg, i++);
        else if (arg === '--head-ref')
            headRef = valueFor(arg, i++);
        else if (arg === '--file')
            file = valueFor(arg, i++);
        else if (arg === '--baseline')
            baselinePath = valueFor(arg, i++);
        else if (arg === '--config-path')
            configPath = valueFor(arg, i++);
        else if (arg === '--fail-on-new')
            failOnNew = true;
        else if (arg === '--all-configs')
            allConfigs = true;
        else if (arg === '--fail-on') {
            const value = valueFor(arg, i++);
            if (value !== 'never' && value !== 'review' && value !== 'unreviewed')
                usage(2);
            failOn = value;
        }
        else if (arg === '--fail-on-risk') {
            const value = valueFor(arg, i++);
            try {
                validateRiskThreshold(value);
            }
            catch {
                usage(2);
            }
            failOnRisk = value;
        }
        else
            usage();
    }
    if (baselineCommand === 'create' && (!baselinePath || failOnNew))
        usage();
    if (baselineCommand === 'check' && !baselinePath)
        usage();
    if (baselineCommand === undefined && failOnNew && baselinePath === undefined) {
        // An empty baseline is explicit and useful when introducing a new gate.
    }
    const createMode = baselineCommand === 'create';
    const checkMode = baselineCommand === 'check' || (baselineCommand === undefined && baselinePath !== undefined);
    const lifecycleMode = checkMode || failOnNew;
    const fileMode = before !== undefined || after !== undefined;
    const gitMode = baseRef !== undefined || headRef !== undefined || file !== undefined || allConfigs;
    if (fileMode === gitMode)
        usage();
    if (json && format !== undefined && format !== 'json')
        usage(2);
    format = json ? 'json' : format ?? 'human';
    let baseline;
    if (checkMode && baselinePath)
        baseline = await readBaseline(baselinePath);
    if (gitMode) {
        if (!baseRef || !headRef || (file === undefined && !allConfigs) || (file !== undefined && allConfigs) || configPath !== undefined)
            usage();
        if (allConfigs) {
            const originalReport = reviewGitRange(resolveCommitRef(baseRef), resolveCommitRef(headRef));
            if (createMode && originalReport.unreviewed.length > 0) {
                outputGitReport(originalReport, format);
                process.exitCode = 2;
                return;
            }
            const report = lifecycleMode
                ? withGitLifecycle(originalReport, classifyFindings(itemsForGitReport(originalReport), baseline, 'git-all'))
                : originalReport;
            if (createMode && baselinePath) {
                const current = itemsForGitReport(originalReport);
                const created = createBaseline('git-all', current);
                await writeBaseline(baselinePath, created);
                if (format === 'json')
                    console.log(JSON.stringify({ schemaVersion: 1, baselineCreated: true, findingCount: current.length }, null, 2));
                else
                    console.log(`Baseline created with ${current.length} finding(s).`);
                return;
            }
            outputGitReport(report, format);
            if (report.unreviewed.length > 0 && (failOn !== 'never' || failOnNew))
                process.exitCode = 2;
            else if (matchesRiskThreshold(report.files.flatMap((item) => item.findings), failOnRisk))
                process.exitCode = 1;
            else if (failOnNew && (report.lifecycle?.newCount ?? 0) > 0)
                process.exitCode = 1;
            else if (failOn === 'review' && report.files.some((item) => item.findings.length > 0))
                process.exitCode = 1;
            return;
        }
        const selectedPath = normaliseRepositoryPath(file);
        const oldConfig = readConfigAtRef(baseRef, selectedPath);
        const newConfig = readConfigAtRef(headRef, selectedPath);
        const findings = compareConfigs(oldConfig, newConfig);
        const kind = 'git-file';
        const lifecycle = lifecycleMode ? classifyFindings(findings.map((finding) => ({ path: selectedPath, finding })), baseline, kind) : undefined;
        const note = 'Only documented semantic changes in supported Shopify app configuration fields are examined; Shopify CLI remains responsible for schema validation and unsupported fields are not checked.';
        const report = { schemaVersion: 1, note, findings: lifecycle?.findings ?? findings, ...(lifecycle ? { lifecycle: lifecycle.counts, resolvedFindings: lifecycle.resolvedFindings } : {}) };
        if (format === 'json')
            console.log(JSON.stringify(report, null, 2));
        else if (format === 'markdown')
            console.log(renderMarkdown(report));
        else {
            console.log(`ChangeGuard v${VERSION}`);
            console.log(note);
            for (const finding of report.findings)
                console.log(`[${finding.lifecycle ?? 'REVIEW'}] ${finding.ruleId}: ${finding.summary}`);
            for (const finding of report.resolvedFindings ?? [])
                console.log(`[RESOLVED] ${finding.path}: ${finding.ruleId} (${finding.count})`);
            console.log(`${findings.length} finding(s).`);
            if (lifecycle)
                console.log(printLifecycleCounts(lifecycle));
        }
        if (matchesRiskThreshold(findings, failOnRisk) || failOn === 'review' && findings.length > 0 || failOnNew && (lifecycle?.counts.newCount ?? 0) > 0)
            process.exitCode = 1;
        return;
    }
    if (!before || !after)
        usage();
    if (configPath && !lifecycleMode && !createMode)
        usage();
    const [oldConfig, newConfig] = await Promise.all([readConfig(before), readConfig(after)]);
    const findings = compareConfigs(oldConfig, newConfig);
    const selectedPath = lifecycleMode || createMode ? pathForExplicitComparison(after, configPath) : undefined;
    const kind = 'configuration-pair';
    if (createMode && baselinePath) {
        const created = createBaseline(kind, findings.map((finding) => ({ path: selectedPath, finding })));
        await writeBaseline(baselinePath, created);
        if (format === 'json')
            console.log(JSON.stringify({ schemaVersion: 1, baselineCreated: true, findingCount: findings.length }, null, 2));
        else
            console.log(`Baseline created with ${findings.length} finding(s).`);
        return;
    }
    const lifecycle = lifecycleMode
        ? classifyFindings(findings.map((finding) => ({ path: selectedPath, finding })), baseline, kind)
        : undefined;
    const note = 'Only documented semantic changes in supported Shopify app configuration fields are examined; Shopify CLI remains responsible for schema validation and unsupported fields are not checked.';
    const report = { schemaVersion: 1, note, findings: lifecycle?.findings ?? findings, ...(lifecycle ? { lifecycle: lifecycle.counts, resolvedFindings: lifecycle.resolvedFindings } : {}) };
    if (format === 'json')
        console.log(JSON.stringify(report, null, 2));
    else if (format === 'markdown')
        console.log(renderMarkdown(report));
    else {
        console.log(`ChangeGuard v${VERSION}`);
        console.log(note);
        if (!findings.length)
            console.log('No supported-field changes found; this is NOT a deployment approval.');
        for (const finding of report.findings)
            console.log(`[${finding.lifecycle ?? 'REVIEW'}] ${finding.ruleId}: ${finding.summary}`);
        for (const finding of report.resolvedFindings ?? [])
            console.log(`[RESOLVED] ${finding.path}: ${finding.ruleId} (${finding.count})`);
        console.log(`${findings.length} finding(s).`);
        if (lifecycle)
            console.log(printLifecycleCounts(lifecycle));
    }
    if (matchesRiskThreshold(findings, failOnRisk) || failOn === 'review' && findings.length > 0 || failOnNew && (lifecycle?.counts.newCount ?? 0) > 0)
        process.exitCode = 1;
}
main().catch((err) => {
    const message = err instanceof Error ? err.message : 'Unexpected failure';
    console.error('ChangeGuard error: ' + message);
    process.exitCode = 2;
});
