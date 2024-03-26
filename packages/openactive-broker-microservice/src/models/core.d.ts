export type OrderFeedType = 'orders' | 'order-proposals';
export type OrderFeedIdentifier = 'OrdersFeed' | 'OrderProposalsFeed';
export type BookingPartnerIdentifier = string;

/*
TODO in future we should put more thorough typing on this object (especially
given that it has been validated [Could we couple TS with validator I wonder 🤔])
and that would then immediately improve type-checking on all functions that
act on opportunity data
 */
export type Opportunity = Record<string, any>;
export type RpdeItem = {
  state: string;
  kind: string;
  id: string | number;
  /** modified handled as a string as it could be a number bigger than JS's number limit.
   * This causes issues with fidelity and ordering. It is not stored as a BigInt in memory as lots of libraries have
   * problems with BigInts. It is stored as a string and converted to a BigInt when comparisons are needed, and then
   * converted back.
   */
  modified: string;
  data?: Opportunity;
};

/**
 * A type internal to Broker which contains data about a child-
 * (e.g. ScheduledSession) opportunity.
 */
export type OpportunityItemRow = {
  id: RpdeItem['id'];
  modified: RpdeItem['modified'];
  deleted: boolean;
  /** Timestamp (Date.now()) when item was ingested. Handled as a string as all modifieds are strings for consistency. For more information see above. */
  feedModified: string;
  jsonLdId: string;
  jsonLd: Opportunity;
  /** e.g 'Slot' */
  jsonLdType: string;
  jsonLdParentId: string | null;
  waitingForParentToBeIngested: boolean;
};
