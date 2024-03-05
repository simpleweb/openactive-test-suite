const { OpenActiveTestAuthKeyManager } = require('@openactive/openactive-openid-client');
const config = require('config');
const { TwoPhaseListeners: Listeners } = require('./twoPhaseListeners/twoPhaseListeners');
const PauseResume = require('./util/pause-resume');
const { OpportunityIdCache } = require('./util/opportunity-id-cache');
const { log } = require('./util/log');
const { MICROSERVICE_BASE_URL } = require('./broker-config');
const { OrderUuidTracking } = require('./order-uuid-tracking/order-uuid-tracking');
const { OnePhaseListeners } = require('./onePhaseListeners');
const { IncompleteFeeds } = require('./incomplete-feeds');

/**
 * @typedef {import('./validator/validator-worker-pool').ValidatorWorkerPoolType} ValidatorWorkerPoolType
 * @typedef {import('@openactive/harvesting-utils').FeedContext} FeedContext
 */
/**
 * @typedef {object} PendingResponse
 * @property {(json: any) => void} send
 * @property {() => void} cancel
 */

/**
 * Broker's internal state.
 */
const state = {
  // MISC
  startTime: new Date(),
  pauseResume: new PauseResume(),
  // AUTH
  globalAuthKeyManager: new OpenActiveTestAuthKeyManager(log, MICROSERVICE_BASE_URL, config.get('sellers'), config.get('broker.bookingPartners')),
  // DATASET
  datasetSiteJson: {},
  // TEST DATASETS
  /**
   * For each Test Dataset, a set of IDs of Opportunities which are now
   * considered "locked" because they have already been used in a test.
   *
   * @type {Map<string, Set<string>>}
   */
  lockedOpportunityIdsByTestDataset: new Map(),
  // HARVESTING
  /**
   * Harvesting state for each RPDE feed.
   *
   * Key = Either:
   *   - `OrdersFeed (auth:${bookingPartnerIdentifier})` - the Orders feed for a given Booking Partner (e.g. `primary`)
   *   - 'OrderProposalsFeed (auth:${bookingPartnerIdentifier})' - the OrderProposalsFeed for a given Booking Partner (e.g. `primary`)
   *   - 'ScheduledSession'|'SessionSeries'|'FacilityUseSlot'|..etc - one of the Opportunity feeds.
   *
   * @type {Map<string, FeedContext>}
   */
  feedContextMap: new Map(),
  incompleteFeeds: new IncompleteFeeds(),
  // API RESPONSES
  /**
   * Maps Listener ID => a "Listener" object, which can be used to return an API response to the client
   * which is listening for this item.
   *
   * These are called 2-phase listeners because the listening and collection happen as two separate API calls (a POST
   * to set up the listener and a GET to retrieve the found item).
   *
   * When Broker gets a request to listen for a particular Opportunity or Order, it creates a "Listener" object,
   * which can later be used to return an API response to the client which is listening for this item.
   *
   * A "Listener ID" takes either of the forms:
   *
   * - `opportunities::{opportunityID}`
   * - `orders::{bookingPartnerIdentifier}::{orderUuid}` e.g. `orders::primary::4324d932-a326-4cc7-bcc0-05fb491744c7`
   * - `order-proposals::{bookingPartnerIdentifier}::{orderUuid}`
   */
  twoPhaseListeners: {
    /**
     * Maps `{type}::{bookingPartnerIdentifier}::{orderUuid}` to a "Listener" where `type` is one of `orders` or
     * `order-proposals`.
     *
     * e.g. `Map { 'orders::primary::4324d932-a326-4cc7-bcc0-05fb491744c7' => { item: ... }, ... }`
     */
    byOrderUuid: Listeners.createListenersMap(),
    /**
     * Maps Opportunity ID to a "Listener"
     */
    byOpportunityId: Listeners.createListenersMap(),
  },
  /**
   * These are called 1-phase listeners because the listening and collection happen as one API call.
   *
   * Otherwise, though, it is very similar to the twoPhaseListeners. A "Listener" is set up to listen for a particular
   * item (e.g. an Opportunity), and an HTTP response is triggered if the item is found.
   */
  onePhaseListeners: {
    /**
     * One-phase Listeners for Opportunities.
     * - Listener ID: Opportunity ID
     * - Item: Opportunity RPDE Item (e.g. `{ data: { '@type': 'Slot', ...} }`)
     */
    opportunity: new OnePhaseListeners(),
  },
  orderUuidTracking: OrderUuidTracking.createState(),
  // VALIDATOR
  /** @type {ValidatorWorkerPoolType} */
  _validatorWorkerPool: null,
  // OPPORTUNITY DATA CACHES
  // We use multiple strategies to cache opportunity data for different use cases.
  /**
   * A criteria-oriented cache for opportunity data. Used to get criteria-matching
   * opportunities for tests.
   */
  opportunityIdCache: OpportunityIdCache.create(),
  // nSQL joins appear to be slow, even with indexes. This is an optimisation pending further investigation
  /**
   * Map { [jsonLdId] => opportunityData }
   *
   * For parent opportunities (e.g. FacilityUse) only.
   *
   * @type {Map<string, Record<string, unknown>>}
   */
  parentOpportunityMap: new Map(),
  /**
   * Map { [feedItemIdentifier] => jsonLdId }
   *
   * This allows us to look up the JSON-LD ID of a deleted item in the feed,
   * as deleted items do not contain the JSON-LD ID.
   *
   * For parent opportunities (e.g. FacilityUse) only.
   *
   * @type {Map<string, string>}
   */
  parentOpportunityRpdeMap: new Map(),
  /**
   * Map { [jsonLdId] => subEventIds }
   *
   * Associates a parent opportunity (jsonLdId) with a list of its child
   * Opportunity IDs.
   *
   * @type {Map<string, string[]>}
   */
  parentOpportunitySubEventMap: new Map(),
  /**
   * Map { [jsonLdId] => opportunityData }
   *
   * For child opportunities (e.g. FacilityUseSlot) only.
   *
   * @type {Map<string, Record<string, unknown>>}
   */
  opportunityMap: new Map(),
  /**
   * Map { [feedItemIdentifier] => jsonLdId }
   *
   * This allows us to look up the JSON-LD ID of a deleted item in the feed,
   * as deleted items do not contain the JSON-LD ID.
   *
   * For child opportunities (e.g. FacilityUseSlot) only.
   *
   * @type {Map<string, string>}
   */
  opportunityRpdeMap: new Map(),
  /**
   * Map { [jsonLdId] => opportunityItemRow }
   *
   * @type {Map<string, import('./models/core').OpportunityItemRow>}
   */
  rowStoreMap: new Map(),
  /**
   * Maps each parent Opportunity ID to a set of the IDs of its children.
   *
   * @type {Map<string, Set<string>>}
   */
  parentIdIndex: new Map(),
  // UI
  // create new progress bar container
  multibar: null,
  // HEALTH CHECKS
  /**
   * Express responses for /health-check requests which have not yet been delivered and will be sent when the feed
   * is fully harvested.
   *
   * @type {import('express').Response[]}
   */
  healthCheckResponsesWaitingForHarvest: [],
};

/**
 * All Opportunity IDs that are considered "locked" (because they have already
 * been used in a test) for the specified [Test Dataset](https://openactive.io/test-interface/#datasets-endpoints).
 *
 * @param {string} testDatasetIdentifier
 * @returns {Set<string>}
 */
function getLockedOpportunityIdsInTestDataset(testDatasetIdentifier) {
  if (!state.lockedOpportunityIdsByTestDataset.has(testDatasetIdentifier)) {
    state.lockedOpportunityIdsByTestDataset.set(testDatasetIdentifier, new Set());
  }
  return state.lockedOpportunityIdsByTestDataset.get(testDatasetIdentifier);
}

function getAllLockedOpportunityIds() {
  return new Set(Array.from(state.lockedOpportunityIdsByTestDataset.values()).flatMap((x) => Array.from(x.values())));
}

/**
 * @param {ValidatorWorkerPoolType} validatorWorkerPool
 */
function setGlobalValidatorWorkerPool(validatorWorkerPool) {
  state._validatorWorkerPool = validatorWorkerPool;
}

function getGlobalValidatorWorkerPool() {
  return state._validatorWorkerPool;
}

module.exports = {
  state,
  getLockedOpportunityIdsInTestDataset,
  getAllLockedOpportunityIds,
  setGlobalValidatorWorkerPool,
  getGlobalValidatorWorkerPool,
};
