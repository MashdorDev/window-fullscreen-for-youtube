// node --test
//
// The version arithmetic behind the popup's update notice. It is the only part
// of the extension that is pure and consequential enough to be worth pinning
// down: get it wrong and users either see a stale notice forever or never see
// one at all, and neither shows up in a manual click-through.

const test = require('node:test');
const assert = require('node:assert');

const { compareVersions, highlightsSince, releasedUpTo, ENTRIES } = require('../whatsnew.js');

const FIXTURES = [
  { version: '2.0.0', highlights: ['two'] },
  { version: '1.2.0', highlights: ['one-two-a', 'one-two-b'] },
  { version: '1.1.0', highlights: ['one-one'] },
];

test('compareVersions orders by numeric segment, not string', () => {
  assert.equal(compareVersions('0.10.0', '0.9.0'), 1);
  assert.equal(compareVersions('0.9.0', '0.10.0'), -1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.2.10', '1.2.9'), 1);
});

test('compareVersions treats missing and unparseable segments as zero', () => {
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.equal(compareVersions('1.2.1', '1.2'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0beta'), 0);
});

test('a fresh install is shown nothing', () => {
  assert.deepEqual(highlightsSince(null, '2.0.0', FIXTURES), []);
  assert.deepEqual(highlightsSince(undefined, '2.0.0', FIXTURES), []);
  assert.deepEqual(highlightsSince('', '2.0.0', FIXTURES), []);
});

test('nothing is shown when the running version has already been seen', () => {
  assert.deepEqual(highlightsSince('2.0.0', '2.0.0', FIXTURES), []);
});

test('a single-version jump shows only that version', () => {
  const got = highlightsSince('1.1.0', '1.2.0', FIXTURES);
  assert.deepEqual(got.map((e) => e.version), ['1.2.0']);
});

test('a skipped release is not lost', () => {
  // The popup was never opened between 1.1.0 and 2.0.0, so both land at once.
  const got = highlightsSince('1.0.0', '2.0.0', FIXTURES);
  assert.deepEqual(got.map((e) => e.version), ['2.0.0', '1.2.0', '1.1.0']);
});

test('entries newer than the running build are withheld', () => {
  // whatsnew.js carries the entry for a release before its manifest bump ships.
  const got = highlightsSince('1.0.0', '1.2.0', FIXTURES);
  assert.deepEqual(got.map((e) => e.version), ['1.2.0', '1.1.0']);
});

test('a downgrade shows nothing rather than replaying history', () => {
  assert.deepEqual(highlightsSince('2.0.0', '1.1.0', FIXTURES), []);
});

test('releases with no user-visible change are simply absent', () => {
  const sparse = [{ version: '1.2.0', highlights: ['one-two'] }];
  assert.deepEqual(highlightsSince('1.2.0', '1.3.0', sparse), []);
});

test('the release-notes list stops at the running version', () => {
  // An entry is written when the release is prepared, which can be before the
  // manifest bump lands. Showing it would announce something nobody has.
  const got = releasedUpTo('1.2.0', FIXTURES);
  assert.deepEqual(got.map((e) => e.version), ['1.2.0', '1.1.0']);
});

test('the release-notes list is newest first and includes the running version', () => {
  const got = releasedUpTo('2.0.0', FIXTURES);
  assert.deepEqual(got.map((e) => e.version), ['2.0.0', '1.2.0', '1.1.0']);
});

test('the release-notes list is empty without a version', () => {
  assert.deepEqual(releasedUpTo(null, FIXTURES), []);
  assert.deepEqual(releasedUpTo('', FIXTURES), []);
});

test('a version older than every entry has no release notes yet', () => {
  assert.deepEqual(releasedUpTo('1.0.0', FIXTURES), []);
});

test('shipped entries are ordered newest first and non-empty', () => {
  assert.ok(ENTRIES.length > 0, 'no release highlights defined');
  for (const entry of ENTRIES) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/, entry.version + ' is not a release version');
    assert.ok(entry.highlights.length > 0, entry.version + ' has no highlights');
    for (const line of entry.highlights) {
      assert.equal(typeof line, 'string');
      assert.ok(line.trim().length > 0, entry.version + ' has an empty highlight');
    }
  }
  const versions = ENTRIES.map((e) => e.version);
  const sorted = [...versions].sort((a, b) => compareVersions(b, a));
  assert.deepEqual(versions, sorted, 'entries must be listed newest first');
  assert.equal(new Set(versions).size, versions.length, 'duplicate version entry');
});
