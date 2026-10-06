// Renders the post-review pull request comment from the results of the links
// and review jobs in .github/workflows/post-review.yml.
//
// No GitHub API calls in here, so it also runs locally on a saved input:
//   node .github/post-review/render.js < input.json

'use strict';

const MARKER = '<!-- post-review -->';

// GitHub rejects comment bodies over 65,536 characters.
const MAX_BODY = 60000;

const SKIP_REASONS = {
  fork: 'Pull requests from forks can’t use the repository’s secrets, so facts and voice weren’t reviewed.',
  'no-credentials': 'Neither `CLAUDE_CODE_OAUTH_TOKEN` nor `ANTHROPIC_API_KEY` is set, so facts and voice weren’t reviewed.',
};

function render(input, { linkReport = true } = {}) {
  const { repo, pr, headSha, runUrl, posts = [], links = {}, review = {} } = input;
  const short = headSha.slice(0, 7);
  const blob = (file, line) =>
    `https://github.com/${repo}/blob/${headSha}/${file}${line ? `#L${line}` : ''}`;

  const body = [
    MARKER,
    '## Post review',
    '',
    `Advisory only: nothing here blocks the merge. Reviewed [\`${short}\`](https://github.com/${repo}/commit/${headSha}) in [this run](${runUrl}).`,
    '',
    posts.map((p) => `- [\`${p.path}\`](${blob(p.path)}) (${p.status})`).join('\n'),
    '',
    ...reviewSections(review, runUrl, blob),
    ...linkSection(links, runUrl, linkReport),
    '---',
    `<sub>Pushed since \`${short}\`? Mark the PR as a draft and then ready for review again, or run \`gh workflow run post-review.yml -f pr=${pr}\`.</sub>`,
    '',
  ].join('\n');

  if (body.length <= MAX_BODY) return body;
  if (linkReport) return render(input, { linkReport: false });
  return `${body.slice(0, MAX_BODY)}\n\n…cut off; the full review is in the [workflow run](${runUrl}).\n`;
}

function reviewSections(review, runUrl, blob) {
  if (SKIP_REASONS[review.skipped]) return [`**Facts and voice:** ${SKIP_REASONS[review.skipped]}`, ''];
  if (review.result !== 'success') {
    return [`**Facts and voice:** the Claude review didn’t finish (${review.result || 'unknown'}). See the [workflow run](${runUrl}).`, ''];
  }

  let findings;
  try {
    findings = JSON.parse(review.findings);
  } catch {
    return [`**Facts and voice:** the Claude review finished without returning findings. See the [workflow run](${runUrl}).`, ''];
  }

  const facts = findings.facts || [];
  const voice = findings.voice || [];
  const out = [];

  if (findings.summary) out.push(findings.summary.trim(), '');

  out.push('### Facts and links', '');
  out.push(`Checked ${findings.claims_checked ?? 'an unknown number of'} claims; ${facts.length ? `${facts.length} to look at.` : 'nothing to flag.'}`, '');
  facts.forEach((f, i) => {
    out.push(heading(i, f, blob, `${f.confidence} confidence`));
    out.push(...details(f));
    const sources = (f.sources || []).map((url, n) => link(url, n + 1));
    if (sources.length) out.push(indent(`Sources: ${sources.join(' · ')}`), '');
  });

  out.push('### Voice', '');
  if (!findings.voice_guide_read) {
    out.push('Not checked: the voice guide wasn’t available to the reviewer.', '');
  } else if (!voice.length) {
    out.push('Nothing to flag.', '');
  } else {
    voice.forEach((v, i) => {
      out.push(heading(i, v, blob));
      out.push(...details(v));
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
