const { expect } = require('chai');
const { FeatureHelper } = require('../../../helpers/feature-helper');
const { GetMatch, C1, C2, B } = require('../../../shared-behaviours');

/**
 * @typedef {import('chakram').ChakramResponse} ChakramResponse
 */

/**
 * @param {B} stage
 * @param {() => ChakramResponse} responseAccessor This is wrapped in a
 *   function because the actual response won't be available until the
 *   asynchronous before() block has completed.
 */
function itShouldReturnPrepayment(stage, responseAccessor) {
  it('should return prepayment', () => {
    stage.expectResponseReceived();
    const response = responseAccessor();
    expect(response.body.totalPaymentDue.prepayment).to.equal('https://openactive.io/Optional');
  });
}

FeatureHelper.describeFeature(module, {
  testCategory: 'advanced-payment',
  testFeature: 'prepayment-optional',
  testFeatureImplemented: true,
  testIdentifier: 'opportunity-paid',
  testName: 'Opportunity paid',
  testDescription: 'Opportunity paid, prepayment optional',
  testOpportunityCriteria: 'TestOpportunityBookablePaidPrepaymentOptional',
  controlOpportunityCriteria: 'TestOpportunityBookable',
},
(configuration, orderItemCriteria, featureIsImplemented, logger, state, flow) => {
  beforeAll(async () => {
    await state.fetchOpportunities(orderItemCriteria);
  });

  describe('Get Opportunity Feed Items', () => {
    (new GetMatch({
      state, flow, logger, orderItemCriteria,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();
  });

  describe('C1', () => {
    (new C1({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();
  });

  describe('C2', () => {
    (new C2({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();
  });

  describe('B', () => {
    const b = (new B({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();

    itShouldReturnPrepayment(b, () => state.bResponse);
  });
});
