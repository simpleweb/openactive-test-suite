module.exports = {
    criteria: [
      require('./TestOpportunityBookable'),
      require('./TestOpportunityBookableFree'),
      require('./TestOpportunityBookablePaid'),
      require('./TestOpportunityBookableNoSpaces'),
      require('./TestOpportunityNotBookableViaAvailableChannel'),
    ],
  };