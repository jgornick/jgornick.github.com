// Pulls the findings out of a Gemini CLI run (`--output-format json`) and
// checks them against findings.schema.json. Claude's findings are held to the
// schema by the API; Gemini's aren't, so this is where they're checked.
//
//   node .github/post-review/extract-findings.js gemini-output.json > findings.json
//
// Exits 1 with the reason on stderr when there are no usable findings.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, 'findings.schema.json'), 'utf8'));

function extract(cliOutput) {
  let run;
  try {
    run = JSON.parse(cliOutput);
  } catch {
    throw new Error('the Gemini CLI output isn’t JSON');
  }
  if (run.error) throw new Error(`Gemini CLI reported an error: ${run.error.message || JSON.stringify(run.error)}`);

  // The prompt asks for a bare JSON object, but a model may still wrap it in
  // a code fence or add a sentence around it.
  const text = String(run.response || '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end < start) throw new Error('the reply has no JSON object in it');

  let findings;
  try {
    findings = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new Error(`the reply’s JSON doesn’t parse (${e.message})`);
  }
  const problems = validate(findings, SCHEMA, 'findings');
  if (problems.length) throw new Error(`the findings don’t match the schema: ${problems.slice(0, 3).join('; ')}`);
  return findings;
}

// The parts of JSON Schema that findings.schema.json uses: type, enum,
// required, properties and items. Extra fields are ignored rather than
// rejected, since render.js only reads the ones in the schema.
function validate(value, schema, at) {
  const type = Array.isArray(value) ? 'array'
    : value === null ? 'null'
    : Number.isInteger(value) ? 'integer'
    : typeof value;
  if (schema.type && schema.type !== type) return [`${at} should be ${schema.type}, not ${type}`];

  const problems = [];
  if (schema.enum && !schema.enum.includes(value)) problems.push(`${at} should be one of ${schema.enum.join(', ')}`);
  if (type === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) problems.push(`${at}.${key} is missing`);
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) problems.push(...validate(value[key], sub, `${at}.${key}`));
    }
  }
  if (type === 'array' && schema.items) {
    value.forEach((item, i) => problems.push(...validate(item, schema.items, `${at}[${i}]`)));
  }
  return problems;
}

module.exports = { extract, validate };

if (require.main === module) {
  try {
    process.stdout.write(JSON.stringify(extract(fs.readFileSync(process.argv[2], 'utf8'))));
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exit(1);
  }
}
