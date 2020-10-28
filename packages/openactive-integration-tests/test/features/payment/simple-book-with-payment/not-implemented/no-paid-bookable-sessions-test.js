const { FeatureHelper } = require('../../../../helpers/feature-helper');

FeatureHelper.describeUnmatchedCriteriaFeature(module, {
  testCategory: 'payment',
  testFeature: 'simple-book-with-payment',
  testFeatureImplemented: false,
  testIdentifier: 'no-paid-bookable-sessions',
  testName: 'No paid bookable session',
  testDescription: 'Check that the feed does not include any bookable sessions with a non-zero price.',
  unmatchedOpportunityCriteria: [
    'TestOpportunityBookablePaid',
  ],
});
