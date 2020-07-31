const chai = require('chai');
const chakram = require('chakram');
const { FeatureHelper } = require('../../../../helpers/feature-helper');
const { B, C1, Common, GetMatch } = require('../../../../shared-behaviours');
const { FlowHelper } = require('../../../../helpers/flow-helper');
const { RequestState } = require('../../../../helpers/request-state');
const { generateUuid } = require('../../../../helpers/generate-uuid');

FeatureHelper.describeFeature(module, {
  testCategory: 'core',
  testFeature: 'amending-order-quote',
  testFeatureImplemented: true,
  testIdentifier: 'amend-c1',
  testName: 'Amend an already-made C1 request',
  testDescription: 'Run C1 with opportunity A, then - with the same Order UUID - run C1 with opportunity B. Then, run B. Opportunity B should be booked',
  // The primary opportunity criteria to use for the primary OrderItem under test
  testOpportunityCriteria: 'TestOpportunityBookable',
  // The secondary opportunity criteria to use for multiple OrderItem tests
  controlOpportunityCriteria: 'TestOpportunityBookable',
  // This test uses 2 opportunities, A & B
  numOpportunitiesUsedPerCriteria: 2,
},
(configuration, orderItemCriteria, featureIsImplemented, logger) => {
  // Both runs share the same UUID, so that the 2nd run is an amendment to the same Order
  const uuid = generateUuid();
  /**
   * Note: This generates an it() block. Therefore, this must be run within a describe() block.
   *
   * @param {RequestState} state
   * @param {C1 | B} stage
   * @param {() => any} responseAccessorFn function that gets the stage's response (e.g. `() => state.c1Response`)
   */
  const itFeedItemAndResponseItemShouldMatchIds = (state, stage, responseAccessorFn) => {
    Common.itForOrderItem(orderItemCriteria, state, stage, () => responseAccessorFn().body,
      'ID should match the one specified in the open data feed',
      (feedOrderItem, responseOrderItem) => {
        chai.expect(responseOrderItem).to.nested.include({
          'orderedItem.@id': feedOrderItem.orderedItem['@id'],
        });
      });
  };
  // N.B.: The following two tests must be performed sequentially - with
  // Second Attempt occurring after First Attempt.
  describe('First Attempt - C1', () => {
    // Each of these scenarios uses a separate state and flowHelper because they fetch separate opportunities
    const state = new RequestState(logger, uuid);
    const flow = new FlowHelper(state);

    beforeAll(async () => {
      await state.fetchOpportunities(orderItemCriteria);
      await chakram.wait();
    });

    (new GetMatch({
      state, flow, logger, orderItemCriteria,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();
    const c1 = (new C1({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();

    itFeedItemAndResponseItemShouldMatchIds(state, c1, () => state.c1Response);
  });
  /** Fetch some new opportunities and amend the existing order at C1, and then complete it */
  describe('Second Attempt - C1 -> B', () => {
    // Each of these scenarios uses a separate state and flowHelper because they fetch separate opportunities
    const state = new RequestState(logger, uuid);
    const flow = new FlowHelper(state);

    beforeAll(async () => {
      await state.fetchOpportunities(orderItemCriteria);
      await chakram.wait();
    });

    (new GetMatch({
      state, flow, logger, orderItemCriteria,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();
    const c1 = (new C1({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();

    // This should verify that the order has now been amended
    itFeedItemAndResponseItemShouldMatchIds(state, c1, () => state.c1Response);

    const b = (new B({
      state, flow, logger,
    }))
      .beforeSetup()
      .successChecks()
      .validationTests();

    // Again, the completed order should be using our 2nd batch of order items
    itFeedItemAndResponseItemShouldMatchIds(state, b, () => state.bResponse);
  });
});
