// Renders the post-review pull request comment from the results of the links
// job and the reviewer jobs in .github/workflows/post-review.yml.
//
// Findings are grouped by passage rather than listed per reviewer, so the
// comment shows where reviewers agree. Each reviewer has a marker (an emoji
// set in the workflow's report job) that tags its notes throughout.
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
  const blob = (file, from, to) => {
    const lines = from ? `#L${from}${to && to !== from ? `-L${to}` : ''}` : '';
    return `https://github.com/${repo}/blob/${headSha}/${file}${lines}`;
  };
  const reviews = reviewers.map((r, index) => ({ marker: '•', ...r, index, ...outcome(r) }));

  const body = [
    MARKER,
    '## Post review',
    '',
    `Advisory only: nothing here blocks the merge. Reviewed [\`${short}\`](https://github.com/${repo}/commit/${headSha}) in [this run](${runUrl}).`,
    '',
    posts.map((p) => `- [\`${p.path}\`](${blob(p.path)}) (${p.status})`).join('\n'),
    '',
    ...reviewerTable(reviews, runUrl),
    ...findingSections(reviews, blob, posts.length > 1),
    ...linkSection(links, runUrl, linkReport),
    '---',
    `<sub>Pushed since \`${short}\`? Mark the PR as a draft and then ready for review again, or run \`gh workflow run post-review.yml -f pr=${pr}\`.</sub>`,
    '',
  ].join('\n');

  if (body.length <= MAX_BODY) return body;
  if (linkReport) return render(input, { linkReport: false });
  return `${body.slice(0, MAX_BODY)}\n\n…cut off; the full review is in the [workflow run](${runUrl}).\n`;
}

// How one reviewer's job went: its parsed findings when it returned any, and
// the text for its row in the reviewer table.
function outcome(reviewer) {
  if (reviewer.skipped === 'fork') return { result: '⏭️ skipped: pull requests from forks can’t use the repository’s secrets' };
  if (reviewer.skipped === 'no-credentials') return { result: `⏭️ skipped: no ${reviewer.secret} secret is set` };
  const why = reviewer.error ? `: ${reviewer.error}` : '';
  if (reviewer.result !== 'success') return { result: `⚠️ didn’t finish (${reviewer.result || 'unknown'})${why}`, failed: true };

  let findings;
  try {
    findings = JSON.parse(reviewer.findings);
  } catch {
    return { result: `⚠️ finished without returning findings${why}`, failed: true };
  }
  const parts = [
    `${findings.claims_checked ?? 'an unknown number of'} claims checked`,
    plural((findings.facts || []).length, 'fact'),
    findings.voice_guide_read ? plural((findings.voice || []).length, 'voice note') : 'voice not checked (no guide)',
  ];
  return { findings, result: parts.join(' · ') };
}

function reviewerTable(reviews, runUrl) {
  const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
  const out = ['| | Reviewer | Model | Result |', '|---|---|---|---|'];
  for (const r of reviews) out.push(`| ${r.marker} | ${cell(r.name)} | \`${cell(r.model)}\` | ${cell(r.result)} |`);
  out.push('');
  if (reviews.some((r) => r.failed)) out.push(`The [workflow run](${runUrl}) has the details for a reviewer that didn’t finish.`, '');

  const summaries = reviews.filter((r) => r.findings && r.findings.summary);
  if (summaries.length) {
    out.push('<details><summary>What each reviewer said overall</summary>', '');
    for (const r of summaries) out.push(`${r.marker} **${r.name}:** ${r.findings.summary.trim()}`, '');
    out.push('</details>', '');
  }
  return out;
}

function findingSections(reviews, blob, showFile) {
  const done = reviews.filter((r) => r.findings);
  if (!done.length) return [];

  const out = [];
  for (const [kind, title] of [['facts', 'Facts and links'], ['voice', 'Voice']]) {
    const voters = kind === 'voice' ? done.filter((r) => r.findings.voice_guide_read) : done;
    out.push(`### ${title}`, '');
    if (!voters.length) {
      out.push('Not checked: no reviewer had the voice guide.', '');
      continue;
    }
    const passages = group(voters.flatMap((r) => (r.findings[kind] || []).map((f) => ({ ...f, reviewer: r }))));
    if (!passages.length) out.push('Nothing to flag.', '');
    passages.forEach((p, i) => out.push(...passage(p, i, voters.length, blob, showFile)));
  }
  return out;
}

// Findings about the same passage: the same file, and either quoting the
// same text or at most a line apart. Reviewers sometimes count lines one
// differently, and paragraphs here are a line each with a blank line
// between, so a gap of one never joins two paragraphs.
function group(findings) {
  const passages = [];
  const sorted = [...findings].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const f of sorted) {
    const p = passages.find((g) => g.file === f.file && g.findings.some((other) => samePassage(f, other)));
    if (p) {
      p.findings.push(f);
      p.from = Math.min(p.from, f.line);
      p.to = Math.max(p.to, f.line);
    } else {
      passages.push({ file: f.file, from: f.line, to: f.line, findings: [f] });
    }
  }
  for (const p of passages) p.findings.sort((a, b) => a.reviewer.index - b.reviewer.index || a.line - b.line);
  return passages;
}

function samePassage(a, b) {
  if (Math.abs(a.line - b.line) <= 1) return true;
  const [x, y] = [normalize(a.quote), normalize(b.quote)];
  const shorter = x.length < y.length ? x : y;
  return shorter.length >= 12 && (x.includes(y) || y.includes(x));
}

function passage(p, i, voterCount, blob, showFile) {
  const reviewers = [...new Set(p.findings.map((f) => f.reviewer))];
  const lines = p.from === p.to ? `Line ${p.from}` : `Lines ${p.from}-${p.to}`;
  const where = `${showFile ? `\`${p.file.split('/').pop()}\` ` : ''}${lines}`;
  const agreement = voterCount > 1
    ? ` · ${reviewers.map((r) => r.marker).join(' ')} ${reviewers.length} of ${voterCount} reviewers`
    : '';

  // One suggestion line when there's one finding, or when every finding
  // suggests the same fix; otherwise each note carries its own.
  const suggestions = p.findings.map((f) => (f.suggestion || '').trim());
  const shared = suggestions.every(Boolean) && new Set(suggestions.map(normalize)).size === 1;
  const ownSuggestions = p.findings.length > 1 && !shared;

  const out = [`**${i + 1}. [${where}](${blob(p.file, p.from, p.to)})${agreement}**`, '', quote(p.findings[0].quote), ''];
  for (const [n, f] of p.findings.entries()) {
    const confidence = f.confidence ? `, ${f.confidence} confidence` : '';
    const sources = (f.sources || []).map((url, k) => link(url, k + 1)).join(' ');
    let note = `${f.reviewer.marker} **${f.reviewer.name}**${confidence}: ${f.problem.trim()}${sources ? ` ${sources}` : ''}`;
    if (ownSuggestions && suggestions[n]) note += `\n**Suggestion:** ${suggestions[n]}`;
    out.push(bullet(note));
  }
  out.push('');
  if (!ownSuggestions && suggestions[0]) {
    const label = p.findings.length === 1 ? 'Suggestion' : `Suggestion (${p.findings.length === 2 ? 'both' : `all ${p.findings.length}`})`;
    out.push(`**${label}:** ${suggestions[0]}`, '');
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

function normalize(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function quote(text) {
  return text.trim().split('\n').map((line) => `> ${line}`).join('\n');
}

// A list item; continuation lines need two spaces to stay inside it.
function bullet(text) {
  return `- ${text.trim().split('\n').join('\n  ')}`;
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
