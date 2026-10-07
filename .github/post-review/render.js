// Renders the post-review pull request comment from the results of the links
// job and the reviewer jobs in .github/workflows/post-review.yml.
//
// No GitHub API calls in here, so it also runs locally on a saved input:
//   node .github/post-review/render.js < input.json

'use strict';

const MARKER = '<!-- post-review -->';

// GitHub rejects comment bodies over 65,536 characters.
const MAX_BODY = 60000;

function render(input, { linkReport = true } = {}) {
  const { repo, pr, headSha, runUrl, posts = [], links = {}, reviewers = [] } = input;
  const short = headSha.slice(0, 7);
  const blob = (file, line) =>
    `https://github.com/${repo}/blob/${headSha}/${file}${line ? `#L${line}` : ''}`;
  const reviews = reviewers.map((r) => ({ ...r, ...outcome(r, runUrl) }));

  const body = [
    MARKER,
    '## Post review',
    '',
    `Advisory only: nothing here blocks the merge. Reviewed [\`${short}\`](https://github.com/${repo}/commit/${headSha}) in [this run](${runUrl}).`,
    '',
    posts.map((p) => `- [\`${p.path}\`](${blob(p.path)}) (${p.status})`).join('\n'),
    '',
    reviews.map((r) => `- **${r.name}** (${r.model}) ${r.status}`).join('\n'),
    '',
    ...findingSections(reviews, blob),
    ...linkSection(links, runUrl, linkReport),
    '---',
    `<sub>Pushed since \`${short}\`? Mark the PR as a draft and then ready for review again, or run \`gh workflow run post-review.yml -f pr=${pr}\`.</sub>`,
    '',
  ].join('\n');

  if (body.length <= MAX_BODY) return body;
  if (linkReport) return render(input, { linkReport: false });
  return `${body.slice(0, MAX_BODY)}\n\n…cut off; the full review is in the [workflow run](${runUrl}).\n`;
}

// How one reviewer's job went: its parsed findings when there are any, and a
// status line for the reviewer list at the top of the comment.
function outcome(reviewer, runUrl) {
  const see = `See the [workflow run](${runUrl}).`;
  const why = reviewer.error ? `: ${reviewer.error}` : '';
  if (reviewer.skipped === 'fork') return { status: 'skipped: pull requests from forks can’t use the repository’s secrets.' };
  if (reviewer.skipped === 'no-credentials') return { status: `skipped: no ${reviewer.secret} secret is set.` };
  if (reviewer.result !== 'success') return { status: `didn’t finish (${reviewer.result || 'unknown'})${why}. ${see}` };

  let findings;
  try {
    findings = JSON.parse(reviewer.findings);
  } catch {
    return { status: `finished without returning findings${why}. ${see}` };
  }
  const parts = [`checked ${findings.claims_checked ?? 'an unknown number of'} claims.`];
  if (!findings.voice_guide_read) parts.push('It didn’t have the voice guide, so it didn’t check voice.');
  if (findings.summary) parts.push(findings.summary.trim());
  return { findings, status: parts.join(' ') };
}

// One list per kind of finding, from every reviewer that returned findings,
// sorted by file and line so that two reviewers flagging the same passage end
// up next to each other.
function findingSections(reviews, blob) {
  const done = reviews.filter((r) => r.findings);
  if (!done.length) return [];

  const out = [];
  for (const [kind, title] of [['facts', 'Facts and links'], ['voice', 'Voice']]) {
    const items = done
      .filter((r) => kind !== 'voice' || r.findings.voice_guide_read)
      .flatMap((r) => (r.findings[kind] || []).map((f) => ({ ...f, by: r.name })))
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

    out.push(`### ${title}`, '');
    if (!items.length) out.push('Nothing to flag.', '');
    items.forEach((f, i) => {
      const extra = [f.by, f.confidence && `${f.confidence} confidence`].filter(Boolean).join(', ');
      out.push(heading(i, f, blob, extra));
      out.push(...details(f));
      const sources = (f.sources || []).map((url, n) => link(url, n + 1));
      if (sources.length) out.push(indent(`Sources: ${sources.join(' · ')}`), '');
    });
  }
  return out;
}

function linkSection(links, runUrl, includeReport) {
  const out = ['### Links', ''];
  if (links.result !== 'success') {
    out.push(`The link check didn’t finish (${links.result || 'unknown'}). See the [workflow run](${runUrl}).`, '');
  } else if (links.exitCode === '0') {
    out.push('No broken links.', '');
  } else if (links.exitCode === '2') {
    out.push('Some links are broken or didn’t respond:', '');
  } else {
    out.push(`The link checker exited with code ${links.exitCode}; see its report.`, '');
  }

  if (links.result === 'success' && links.report) {
    const open = links.exitCode === '0' ? '' : ' open';
    out.push(`<details${open}><summary>lychee report</summary>`, '');
    // The report's own headings start at h1; push them below this section's h3.
    out.push(includeReport ? links.report.trim().replace(/^(#{1,3}) /gm, '###$1 ') : `Too long for a comment; it’s in the [workflow run](${runUrl}).`);
    out.push('', '</details>', '');
  }

  if (links.frontmatter && links.frontmatter.trim()) out.push('**Front matter**', '', links.frontmatter.trim(), '');
  return out;
}

function heading(i, finding, blob, extra) {
  const name = finding.file.split('/').pop();
  const where = `[\`${name}\` line ${finding.line}](${blob(finding.file, finding.line)})`;
  return `${i + 1}. ${where}${extra ? ` · ${extra}` : ''}`;
}

function details(finding) {
  const out = ['', indent(quote(finding.quote)), '', indent(finding.problem.trim()), ''];
  if (finding.suggestion && finding.suggestion.trim()) {
    out.push(indent(`**Suggestion:** ${finding.suggestion.trim()}`), '');
  }
  return out;
}

function quote(text) {
  return text.trim().split('\n').map((line) => `> ${line}`).join('\n');
}

// Continuation lines of a numbered list item ("1. ") need three spaces.
function indent(text) {
  return text.split('\n').map((line) => (line ? `   ${line}` : line)).join('\n');
}

function link(url, n) {
  return /^https?:\/\//.test(url) ? `[${n}](<${url}>)` : `\`${url}\``;
}

module.exports = { MARKER, render };

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => process.stdout.write(render(JSON.parse(raw))));
}
