// The CHANGELOG.md section for one version, for the release jobs in ci.yml:
//
//   node tools/release-notes.mjs 0.5.2              markdown, for the GitHub Release
//   node tools/release-notes.mjs 0.5.2 --amo [base] AMO metadata JSON with the notes as
//                                                   version.release_notes, merged into base
//
// Exits 1 when the version has no section or an empty one, so a release
// cannot go out to the stores without its changelog.
import { readFileSync } from 'node:fs';

const [version, flag, base] = process.argv.slice(2);
if (!version) {
  console.error('usage: release-notes.mjs <version> [--amo [base.json]]');
  process.exit(2);
}

const lines = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no "## [${version}]" section`);
  process.exit(1);
}
let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
if (end === -1) end = lines.length;
const notes = lines.slice(start + 1, end).join('\n').trim();
if (!notes) {
  console.error(`CHANGELOG.md has an empty section for ${version}`);
  process.exit(1);
}

if (flag !== '--amo') {
  console.log(notes);
  process.exit(0);
}

// AMO shows release notes as plain text: drop the markdown, keep the links readable
const plain = notes
  .replace(/^### (.*)$/gm, '$1:')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => (/^https?:/.test(url) ? `${text} (${url})` : text))
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  // Continuation lines of a list item are wrapped at 100 columns in the file
  .replace(/\n {2,}(?=\S)/g, ' ');
const metadata = base ? JSON.parse(readFileSync(base, 'utf8')) : {};
metadata.version = { ...metadata.version, release_notes: { 'en-US': plain } };
console.log(JSON.stringify(metadata, null, 2));
