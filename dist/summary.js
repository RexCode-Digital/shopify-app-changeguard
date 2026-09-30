export function renderSummary(report) {
    if (!Array.isArray(report.files) || !Array.isArray(report.unreviewed)) {
        throw new Error('Invalid ChangeGuard report.');
    }
    const counts = new Map();
    const categories = new Map();
    const docs = new Map();
    const risks = new Map();
    let total = 0;
    for (const file of report.files) {
        if (!Array.isArray(file.findings))
            throw new Error('Invalid findings.');
        for (const finding of file.findings) {
            if (typeof finding.ruleId !== 'string' || !/^[A-Z][A-Z0-9_]{0,79}$/.test(finding.ruleId)) {
                throw new Error('Invalid rule ID.');
            }
            counts.set(finding.ruleId, (counts.get(finding.ruleId) ?? 0) + 1);
            if (finding.category)
                categories.set(finding.category, (categories.get(finding.category) ?? 0) + 1);
            if (finding.documentationUrl)
                docs.set(finding.ruleId, finding.documentationUrl);
            if (finding.riskLevel !== undefined) {
                if (!['low', 'medium', 'high'].includes(finding.riskLevel))
                    throw new Error('Invalid risk level.');
                risks.set(finding.riskLevel, (risks.get(finding.riskLevel) ?? 0) + 1);
            }
            total++;
        }
    }
    const lines = [
        '## ChangeGuard review', '',
        '> Review only; not deployment approval.', '',
        `- Configuration files reviewed: ${report.reviewedFileCount ?? report.files.length}`,
        `- Review findings: ${total}`,
        `- Unreviewable configurations: ${report.unreviewedFileCount ?? report.unreviewed.length}`,
        '', '### Review status', '',
    ];
    if (risks.size) {
        lines.push('', '### Findings by risk', '', '| Risk | Count |', '| --- | ---: |');
        for (const risk of ['high', 'medium', 'low'])
            if (risks.has(risk))
                lines.push(`| ${risk} | ${risks.get(risk)} |`);
        const highest = ['high', 'medium', 'low'].find((risk) => risks.has(risk));
        lines.push('', `Highest risk: **${highest}**.`);
    }
    if (report.unreviewed.length > 0) {
        lines.push('**Review incomplete:** Some configurations could not be analysed. The check fails.');
    }
    else if (total > 0) {
        lines.push('**Manual review recommended:** Supported-field changes were found. Findings are informational and do not fail the check.');
    }
    else {
        lines.push('**No supported-field changes detected.** This is not a deployment or security approval.');
    }
    if (counts.size) {
        lines.push('', '### Findings by rule', '', '| Rule | Count |', '| --- | ---: |');
        for (const [rule, count] of [...counts].sort())
            lines.push(`| ${rule} | ${count} |`);
        if (categories.size) {
            lines.push('', '### Findings by category', '', '| Category | Count |', '| --- | ---: |');
            for (const [category, count] of [...categories].sort())
                lines.push(`| ${category} | ${count} |`);
        }
        if (docs.size) {
            lines.push('', '### Rule documentation', '');
            for (const [rule, url] of [...docs].sort())
                lines.push(`- [${rule}](${url})`);
        }
    }
    if (report.unreviewed.length)
        lines.push('', 'Some configurations could not be reviewed.', 'See the JSON logs for details.');
    return `${lines.join('\n')}\n`;
}
