const RequestHelper = require("./request-helper");
const pMemoize = require("p-memoize");
const config = require("config");

var USE_RANDOM_OPPORTUNITIES = config.get("tests.useRandomOpportunities");

function isResponse20x(response) {
  if (!response || !response.response) return false;

  let statusCode = response.response.statusCode;

  return statusCode >= 200 && statusCode < 300;
}

class RequestState {
  constructor (logger) {
    this.requestHelper = new RequestHelper(logger);
    this.logger = logger;
  }

  log (msg) {
    if (!this.logger) return;

    this.logger.log(msg);
  }

  get uuid() {
    if (this._uuid) return this._uuid;

    this._uuid = this.requestHelper.uuid();
    return this._uuid;
  }

  /*
    {
      opportunityType: 'ScheduledSession',
      opportunityCriteria: 'TestOpportunityNotBookableViaAvailableChannel',
      control: false
    },
    {
      opportunityType: 'ScheduledSession',
      opportunityCriteria: 'TestOpportunityBookable',
      control: true
    },
    {
      opportunityType: 'ScheduledSession',
      opportunityCriteria: 'TestOpportunityBookable',
      control: true
    }

    TODO rename to createOpportunities
  */
  async createOpportunity(orderItemCriteria) {
    let session;

    // TODO: Make this work for each orderItemCriteria 
    if (USE_RANDOM_OPPORTUNITIES) {
      session = await this.requestHelper.getRandomOpportunity(orderItemCriteria[0].opportunityType, orderItemCriteria[0].opportunityCriteria, {});
    }
    else {
      session = await this.requestHelper.createOpportunity(orderItemCriteria[0].opportunityType, orderItemCriteria[0].opportunityCriteria, {
        sellerId: this.sellerId
      });
    }
    this.eventId = session.body["@id"];
    this.eventType = session.body["@type"];
    // when handling multiple OrderItems, tag resulting activities with "control"

    return session;
  }

  async getOrder () {
    let result = await this.requestHelper.getOrder(this.uuid);

    this.ordersFeedUpdate = result;

    return this;
  }

  async deleteOrder () {
    return await testHelper.deleteOrder(this.uuid, {
      sellerId: this.sellerId,
    });
  }

  get rpdeItem() {
    if (!this.ordersFeedUpdate) return;

    return this.ordersFeedUpdate.body;
  }

  async getDatasetSite () {
    let result = await this.requestHelper.getDatasetSite();

    this.datasetSite = result;

    return this;
  }  

  async getMatch () {
    // Only attempt getMatch if we have an eventId
    if (this.eventId) {
      let result = await this.requestHelper.getMatch(this.eventId);

      this.apiResponse = result;
    }

    return this;
  }

  get getMatchResponseSucceeded() {
    return isResponse20x(this.apiResponse);
  }

  get opportunityType() {
    if (!this.apiResponse) return;

    return this.apiResponse.body.data["@type"];
  }

  get opportunityId() {
    if (!this.apiResponse) return;

    return this.apiResponse.body.data["@id"];
  }

  get offerId() {
    if (!this.apiResponse) return;

    if (this.apiResponse.body.data["@type"] === "Slot") {
      return this.apiResponse.body.data.offers[0]["@id"];
    } else if (typeof this.apiResponse.body.data.superEvent.offers !== "undefined") {
      return this.apiResponse.body.data.superEvent.offers[0]["@id"];
    } else {
      return this.apiResponse.body.data.offers[0]["@id"];
    }
  }

  get sellerId() {
    if (!this.apiResponse) return;

    if (this.apiResponse.body.data["@type"] === "Slot") {
      return this.apiResponse.body.data.facilityUse.provider["@id"];
    } else {
      return this.apiResponse.body.data.superEvent.organizer["@id"];
    }
  }

  async putOrderQuoteTemplate () {
    let result = await this.requestHelper.putOrderQuoteTemplate(this.uuid, this);

    this.c1Response = result;

    return this;
  }

  get C1ResponseSucceeded() {
    return isResponse20x(this.c1Response);
  }

  get totalPaymentDue() {
    let response = this.c2Response || this.c1Response;

    if (!response) return;

    return response.body.totalPaymentDue.price;
  }

  async putOrderQuote () {
    let result = await this.requestHelper.putOrderQuote(this.uuid, this);

    this.c2Response = result;

    return this;
  }

  get C2ResponseSucceeded() {
    return isResponse20x(this.c2Response);
  }

  async putOrder () {
    let result = await this.requestHelper.putOrder(this.uuid, this);

    this.bResponse = result;

    return this;
  }

  get BResponseSucceeded() {
    return isResponse20x(this.bResponse);
  }

  get orderItemId() {
    if (!this.bResponse) return;

    if (this.bResponse.body && this.bResponse.body.orderedItem) {
      return this.bResponse.body.orderedItem[0]["@id"]
    }
    else {
      return "NONE";
    }
  }

  async cancelOrder () {
    let result = await this.requestHelper.cancelOrder(this.uuid, this);

    this.uResponse = result;

    return this;
  }

  get UResponseSucceeded() {
    return isResponse20x(this.uResponse);
  }
}

module.exports = {
  RequestState
};
