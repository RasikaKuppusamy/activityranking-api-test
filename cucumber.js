module.exports = {
  default: {
    // No `paths` here on purpose: Cucumber already looks in `features/` by
    // default when run with no arguments (used by `npm test`), and leaving
    // `paths` out means a CLI path/line like `features/x.feature:11` is used
    // as-is, instead of being merged with a default and running everything.
    requireModule: ['tsx/cjs'],
    require: ['features/**/*.ts'],
    format: ['progress', 'html:reports/cucumber-report.html'],
  },
};