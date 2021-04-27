const { FeatureHelper } = require('../../../../helpers/feature-helper');
const { FlowStageRecipes, FlowStageUtils } = require('../../../../helpers/flow-stages');
const { itShouldReturnAnOpenBookingError } = require('../../../../shared-behaviours/errors');

FeatureHelper.describeFeature(module, {
  testCategory: 'core',
  testFeature: 'agent-broker',
  testFeatureImplemented: true,
  testIdentifier: 'customer-not-included',
  testName: 'Customer not included in Order in AgentBroker mode',
  testDescription: 'If customer is not included in Order in AgentBroker mode for B request, request shoud fail, returning 400 status code and IncompleteCustomerDetailsError.',
  // The primary opportunity criteria to use for the primary OrderItem under test
  testOpportunityCriteria: 'TestOpportunityBookable',
  // The secondary opportunity criteria to use for multiple OrderItem tests
  controlOpportunityCriteria: 'TestOpportunityBookable',
  supportsApproval: true,
},
function (configuration, orderItemCriteriaList, featureIsImplemented, logger) {
  const { fetchOpportunities, c1, c2, bookRecipe } = FlowStageRecipes.initialiseSimpleC1C2BookFlow(orderItemCriteriaList, logger, { bookReqTemplateRef: 'noCustomer' });

  describe('Booking should fail as Customer is not included in Order', () => {
    FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(fetchOpportunities);
    FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(c1);
    FlowStageUtils.describeRunAndCheckIsSuccessfulAndValid(c2);
    FlowStageUtils.describeRunAndCheckIsValid(bookRecipe.firstStage, () => {
      itShouldReturnAnOpenBookingError('IncompleteCustomerDetailsError', 400, () => bookRecipe.firstStage.getOutput().httpResponse);
    });
  });
});
