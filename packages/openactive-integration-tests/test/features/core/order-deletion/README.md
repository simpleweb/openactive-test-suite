[< Return to Overview](../../README.md)
# Order Deletion Endpoint (order-deletion)

Check that Order Deletion correctly soft-deletes an Order that has already been emitted in the Orders feed


https://www.openactive.io/open-booking-api/EditorsDraft/#order-deletion

Coverage Status: **complete**

See also: [.NET Tutorial](https://tutorials.openactive.io/open-booking-sdk/quick-start-guide/storebookingengine/day-6-orders-feed)
### Test prerequisites - Opportunities
Opportunities that match the following criteria must exist in the booking system (for each configured `bookableOpportunityTypesInScope`) for the configured primary Seller in order to use `useRandomOpportunities: true`. Alternatively the following `testOpportunityCriteria` values must be supported by the [test interface](https://openactive.io/test-interface/) of the booking system for `useRandomOpportunities: false`.

[TestOpportunityBookable](https://openactive.io/test-interface#TestOpportunityBookable) x12
### Test prerequisites - Test Interface Actions

The following Test Interface Actions must be implemented by the [test interface](https://openactive.io/test-interface/) of the booking system in order to test this feature (see the [Developer Docs guide for implementing Test Interface Actions](https://developer.openactive.io/open-booking-api/test-suite/implementing-the-test-interface/test-interface-actions)):

[SellerRequestedCancellationSimulateAction](https://openactive.io/test-interface#SellerRequestedCancellationSimulateAction)


### Running tests for only this feature

```bash
npm start -- --runInBand test/features/core/order-deletion/
```



## 'Implemented' tests

This feature is **required** by the Open Booking API specification, and so must always be set to `true` by `default.json` within `packages/openactive-integration-tests/config/`:

```json
"implementedFeatures": {
  ...
  "order-deletion": true,
  ...
}
```

| Identifier | Name | Description | Prerequisites per Opportunity Type | Required Test Interface Actions |
|------------|------|-------------|---------------|-------------------|
| [order-delete-idempotent](./implemented/order-delete-idempotent-test.js) | Order successfully deleted, second delete does not change the state of the first delete | Order Delete is idempotent - run C1, C2, and B then Order Delete twice - the Order Delete must return 204 in both cases | [TestOpportunityBookable](https://openactive.io/test-interface#TestOpportunityBookable) x4 |  |
| [order-quote-delete-idempotent](./implemented/order-quote-delete-idempotent-test.js) | Order quote successfully deleted, second delete does not change the state of the first delete | Order Delete is idempotent - run C1, C2 then Order Delete twice - the Order Delete must return 204 in both cases | [TestOpportunityBookable](https://openactive.io/test-interface#TestOpportunityBookable) x4 |  |
| [orders-updated-then-deleted](./implemented/orders-updated-then-deleted-test.js) | Order successfully deleted | Run C1, C2 and B, and then check Orders feed for Order, then cancel it, then run Order Deletion, and check Orders feed that Order has been deleted. NOTE: This test will only run if seller-requested-cancellation is enabled as this feature is utilised in the test | [TestOpportunityBookable](https://openactive.io/test-interface#TestOpportunityBookable) x4 | [SellerRequestedCancellationSimulateAction](https://openactive.io/test-interface#SellerRequestedCancellationSimulateAction) |
| [unknown-order](./implemented/unknown-order-test.js) | Expect a UnknownOrderError for an Order that does not exist | Runs Order Deletion for a non-existent Order (with a fictional UUID), expecting an UnknownOrderError error to be returned |  |  |



## 'Not Implemented' tests


| Identifier | Name | Description | Prerequisites per Opportunity Type | Required Test Interface Actions |
|------------|------|-------------|---------------|-------------------|
| [feature-required-noop](./not-implemented/feature-required-noop-test.js) | Feature required | This feature is required by the specification and must be implemented. |  |  |
