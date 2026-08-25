module.exports = {
  ignoreFiles: [
    'AMO-LISTING.md',
    'CONTRIBUTING.md',
    'CHANGELOG.md',
    'README.md',
    'web-ext-config.cjs',
    'web-ext-artifacts',
    // Repo-only material — must never ship inside the extension package.
    'docs',
    'docs/**',
    'Assets',
    'Assets/**',
    'test',
    'test/**',
    'tools',
    'tools/**',
    'package.json',
    'package-lock.json',
  ],
};
