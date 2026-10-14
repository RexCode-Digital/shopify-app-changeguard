import type { Finding } from './core.js';

type ReviewFile = { path: string; status: string; findings: Finding[] };
type MarkdownReport = { note: string; files?: ReviewFile[]; findings?: Finding[]; unreviewed?: Array<{ path: string; reason: string }>; reviewedFileCount?: number; unreviewedFileCount?: number };

const escape = (value: unknown): string => String(value ?? '').replace(/[\\`*_{}\[\]()<>#+.!|]/g, '\\$&').replace(/[\r\n]+/g, ' ');

function appendFinding(lines: string[], finding: Finding): void {
  lines.push(
    '',
    `### ${escape(finding.ruleId)} — ${escape(finding.riskLevel ?? 'medium')} risk`,
    '',
    escape(finding.summary),
    '',
    `Risk rationale: ${escape(finding.riskRationale ?? 'Review the operational impact of this configuration change.')}`,
    '',
    'Suggested action: Review the affected setting and intended behaviour before deployment.',
    '',
    `Category: ${escape(finding.category ?? 'unspecified')}.`,
    `Evidence: ${finding.documentationUrl ? `[official Shopify reference](${finding.documentationUrl})` : 'No rule-specific reference available'}.`,
  );
}

export function renderMarkdown(report: MarkdownReport): string {
  const files = report.files ?? [];
  const findings = report.findings ?? files.flatMap((file) => file.findings);
  const unreviewed = report.unreviewed ?? [];
  const risks = ['high', 'medium', 'low'].map((risk) => [risk, findings.filter((finding) => (finding.riskLevel ?? 'medium') === risk).length] as const).filter(([, count]) => count > 0);
  const lines = [
    '# ChangeGuard configuration review', '',
    '> Review only; this report does not approve deployment.', '',
    escape(report.note), '',
    `- Configuration files reviewed: ${report.reviewedFileCount ?? files.length}`,
    `- Findings: ${findings.length}`,
    `- Configurations requiring review: ${report.unreviewedFileCount ?? unreviewed.length}`,
    '- Findings are grouped by configuration file; environment names are not inferred from filenames.',
  ];
  if (risks.length) lines.push('', '## Findings by risk', '', '| Risk | Count |', '| --- | ---: |', ...risks.map(([risk, count]) => `| ${risk} | ${count} |`));
  if (files.length) for (const file of files) {
    lines.push('', `## Configuration: \`${escape(file.path)}\``, '', `Status: ${file.status}.`);
    if (!file.findings.length) lines.push('', 'No supported semantic changes were detected.');
    for (const finding of file.findings) appendFinding(lines, finding);
  }
  if (!files.length && findings.length) {
    lines.push('', '## Findings');
    for (const finding of findings) appendFinding(lines, finding);
  }
  if (unreviewed.length) {
    lines.push('', '## Incomplete reviews', '');
    for (const item of unreviewed) lines.push(`- \`${escape(item.path)}\`: ${escape(item.reason)}`);
  }
  if (!findings.length && !unreviewed.length) lines.push('', 'No supported-field changes were found. This is not a deployment or security approval.');
  return `${lines.join('\n')}\n`;
}
