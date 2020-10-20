const { expect } = require('chai');
const { FeatureHelper } = require('../../../../helpers/feature-helper');
const { FetchOpportunitiesFlowStage } = require('../../../../helpers/flow-stages/fetch-opportunities');
const { C1FlowStage } = require('../../../../helpers/flow-stages/c1');
const { C2FlowStage } = require('../../../../helpers/flow-stages/c2');
const { FlowStageUtils } = require('../../../../helpers/flow-stages/flow-stage-utils');
const RequestHelper = require('../../../../helpers/request-helper');
const { PFlowStage } = require('../../../../helpers/flow-stages/p');
const { TestInterfaceActionFlowStage } = require('../../../../helpers/flow-stages/test-interface-action');
const { OrderFeedUpdateFlowStage } = require('../../../../helpers/flow-stages/order-feed-update');
const { BFlowStage } = require('../../../../helpers/flow-stages/b');

/**
 * @typedef {import('chakram').ChakramResponse} ChakramResponse
 */

/**
 * @param {() => ChakramResponse} getChakramResponse This is wrapped in a
 *   function because the actual response won't be available until the
 *   asynchronous before() block has completed.
 */
function itShouldReturnOrderRequiresApprovalTrue(getChakramResponse) {
  it('should return orderRequiresApproval: true', () => {
    const chakramResponse = getChakramResponse();
    expect(chakramResponse.body).to.have.property('orderRequiresApproval', true);
  });
}

FeatureHelper.describeFeature(module, {
  testCategory: 'approval',
  testFeature: 'minimal-proposal',
  testFeatureImplemented: true,
  testIdentifier: 'accept-proposal-book',
  testName: 'Successful booking using the Booking Flow with Approval',
  testDescription: 'A successful end to end booking, via Booking Flow with Approval, of an opportunity.',
  // The primary opportunity criteria to use for the primary OrderItem under test
  testOpportunityCriteria: 'TestOpportunityBookableFlowRequirementOnlyApproval',
  // even if some OrderItems don't require approval, the whole Order should
  controlOpportunityCriteria: 'TestOpportunityBookable',
},
(configuration, orderItemCriteriaList, featureIsImplemented, logger) => {
  const requestHelper = new RequestHelper(logger);

  // ## Initiate Flow Stages
  // const { fetchOpportunities, c1, c2 } = FlowStageUtils.createFlow([
  //   // { name: 'fetchOpportunities', factory: FetchOpportunitiesFlowStage.create, args: { orderItemCriteriaList }},
  //   ['fetchOpportunities', FetchOpportunitiesFlowStage.create, { orderItemCriteriaList }],
  //   ['c1', C1FlowStage.create],
  //   ['c2', C2FlowStage.create],
  //   ['p', PFlowStage.create],
  //   ['simulateSellerApproval', TestInterfaceActionFlowStage.create, ({ p }) => ({
  //     testName: 'Simulate Seller Approval (Test Interface Action)',
  //     createActionFn: () => ({
  //       type: 'test:SellerAcceptOrderProposalSimulateAction',
  //       objectType: 'OrderProposal',
  //       objectId: p.getResponse().body['@id'],
  //     }),
  //   })],
  //   ['orderFeedUpdate', 'OrderFeedUpdate', {
  //     testName: 'Order Feed Update (after Simulate Seller Approval)',
  //   }],
  //   ['b', BFlowStage.create],
  // ], { logger, requestHelper });

  // # Examples
  //
  // ## 1. Simple
  {
    // The SimpleFlowBuilder constructor creates default values for uuid & sellerId (although they can be overridden)
    const { fetchOpportunities, c1, c2, p, simulateSellerApproval, orderFeedUpdate, b } = (new SimpleFlowBuilder({ requestHelper, logger }))
      .addFetchOpportunities(orderItemCriteriaList)
      // The above (^) is just a bit of sugar so that we don't have to write the below (v) for each flow
      // .add('fetchOpportunities', FetchOpportunitiesFlowStage.create, () => ({
      //   additionalParams: {
      //     orderItemCriteriaList
      //   },
      // })
      .add('c1', C1FlowStage.create) // SimpleFlowBuilder injects requestHelper, logger into the stage creation params
      .add('c2', C2FlowStage.create) // and it also uses the previous stage's output state (each is merged) as the input state for the next
      .add('p', PFlowStage.create)
      .add('simulateSellerApproval', TestInterfaceActionFlowStage.create, ({ p }) => ({
        additionalParams: { // additionalParams is used to add/overwrite params that are used to create the flow stage
          testName: 'Simulate Seller Approval (Test Interface Action)',
          createActionFn: () => ({
            type: 'test:SellerAcceptOrderProposalSimulateAction',
            objectType: 'OrderProposal',
            objectId: p.getResponse().body['@id'],
          }),
        },
      }))
      // special build step which sets up listen and collect stages and links them with the previous stage
      .addOrderFeedUpdate('orderFeedUpdate', {
        testName: 'Order Feed Update (after Simulate Seller Approval)',
      })
      .add('b', BFlowStage.create);
  }
  // ## 2. Edge Case - Standalone / Override args
  {
    const { p } = (new SimpleFlowBuilder({ requestHelper, logger, uuid: 'abc' })) // we'll still use SimpleFlowBuilder, as it initializes uuid & sellerId and threads them into each stage's input state
      .add('p', PFlowStage, () => ({
        // `getAdditionalInputState` is a function that adds to the input state that SimpleFlowBuilder extracts from prerequisite stages
        getAdditionalInputState: () => ({
          orderItems: [/* ... */],
          totalPaymentDue: 3.4,
        }),
        additionalParams: {
          templateRef: 'non-standard',
        },
      }));
  }
  // ## 3. Edge Case - Repetitions / out of order input state
  {
    const { fetchOpportunities, c1A, c1B, c2 } = (new SimpleFlowBuilder({ requestHelper, logger }))
      .addFetchOpportunities(orderItemCriteriaList)
      .add('c1A', C1FlowStage.create)
      .add('c1B', C1FlowStage.create)
      .add('c2', C2FlowStage.create)
      .add('b', BFlowStage.create, ({ c1A }) => ({ // it uses the result from c1A (for some reason)
        getAdditionalInputState: () => ({
          totalPaymentDue: c1A.getOutput().totalPaymentDue,
        }),
      }));
  }
  // ## 4. Edge Case - Stages in the wrong order
  {
    const { fetchOpportunities, c1A, c1B, c2 } = (new SimpleFlowBuilder({ requestHelper, logger }))
      .addFetchOpportunities(orderItemCriteriaList)
      .add('c1', C1FlowStage.create)
      .add('p', PFlowStage.create) // this will use totalPaymentDue from c1
      .add('c2', C2FlowStage.create)
      .add('b', BFlowStage.create, () => ({
        getInputStateFrom: 'c1', // will use the merged state from fetchOpportunities & c1 - and no further
      }));
  }
  // const fetchOpportunities = FetchOpportunitiesFlowStage.create({
  //   // orderItemCriteriaList,
  //   logger,
  //   requestHelper,
  //   getInputState: () => ({ orderItemCriteriaList, uuid, sellerId })
  // });
  // const c1 = C1FlowStage.create({
  //   prerequisite: fetchOpportunities,
  //   logger,
  //   requestHelper,
  // });
  // const c2 = C2FlowStage.create({
  //   prerequisite: c1,
  //   logger,
  //   requestHelper,
  // });
  // const p = PFlowStage.create({
  //   prerequisite: c2,
  //   logger,
  //   requestHelper,
  // });
  // const initiateOrderFeedUpdate = OrderFeedUpdateFlowStage.createInitiator({
  //   prerequisite: p,
  //   requestHelper,
  // });
  // const simulateSellerApproval = TestInterfaceActionFlowStage.create({
  //   testName: 'Simulate Seller Approval (Test Interface Action)',
  //   prerequisite: initiateOrderFeedUpdate,
  //   createActionFn: () => ({
  //     type: 'test:SellerAcceptOrderProposalSimulateAction',
  //     objectType: 'OrderProposal',
  //     objectId: p.getResponse().body['@id'],
  //   }),
  //   requestHelper,
  // });
  // const collectOrderFeedUpdate = OrderFeedUpdateFlowStage.createCollector({
  //   testName: 'Order Feed Update (after Simulate Seller Approval)',
  //   prerequisite: simulateSellerApproval,
  //   logger,
  // });
  // const b = BFlowStage.create({
  //   prerequisite: collectOrderFeedUpdate,
  //   logger,
  //   requestHelper,
  // });

  // ## Set up tests
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(fetchOpportunities);

  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(c1, {
    itExtraTests() {
      itShouldReturnOrderRequiresApprovalTrue(() => c1.getResponse());
    },
  });
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(c2, {
    itExtraTests() {
      itShouldReturnOrderRequiresApprovalTrue(() => c2.getResponse());
    },
  });
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(p, {
    itExtraTests() {
      // TODO does validator already check that orderProposalVersion is of form {orderId}/versions/{versionUuid}?
      it('should include an orderProposalVersion, of the form {orderId}/versions/{versionUuid}', () => {
        const { uuid } = p.getCombinedStateAfterRun();
        expect(p.getResponse().body).to.have.property('orderProposalVersion')
          .which.matches(RegExp(`${uuid}/versions/.+`));
      });
      // TODO does validator check that orderItemStatus is https://openactive.io/OrderItemProposed?
      // TODO does validator check that full Seller details are included in the seller response?
    },
  });
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(simulateSellerApproval);
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(collectOrderFeedUpdate, {
    itExtraTests() {
      it('should have orderProposalStatus: SellerAccepted', () => {
        expect(collectOrderFeedUpdate.getResponse().body).to.have.nested.property('data.orderProposalStatus', 'https://openactive.io/SellerAccepted');
      });
      it('should have orderProposalVersion same as that returned by P (i.e. an amendment hasn\'t occurred)', () => {
        expect(collectOrderFeedUpdate.getResponse().body).to.have.nested.property('data.orderProposalVersion', p.getResponse().body.orderProposalVersion);
      });
    },
  });
  FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(b);
});
