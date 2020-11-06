const { dissocPath } = require('ramda');
const { createPaymentPart } = require('./common');

/**
 * @typedef {{
 *   sellerId: string,
 *   orderItems: {
 *     position: number,
 *     acceptedOffer: {
 *       '@id': string,
 *     },
 *     orderedItem: {
 *       '@type': string,
 *       '@id': string,
 *     },
 *   }[],
 * }} C1ReqTemplateData
 */

/**
 * @param {C1ReqTemplateData} data
 */
function createStandardC1Req(data) {
  return {
    '@context': 'https://openactive.io/',
    '@type': 'OrderQuote',
    brokerRole: 'https://openactive.io/AgentBroker',
    broker: {
      '@type': 'Organization',
      name: 'MyFitnessApp',
      url: 'https://myfitnessapp.example.com',
      description: 'A fitness app for all the community',
      logo: {
        '@type': 'ImageObject',
        url: 'http://data.myfitnessapp.org.uk/images/logo.png',
      },
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Alan Peacock Way',
        addressLocality: 'Village East',
        addressRegion: 'Middlesbrough',
        postalCode: 'TS4 3AE',
        addressCountry: 'GB',
      },
    },
    seller: {
      '@type': 'Organization',
      '@id': data.sellerId,
    },
    orderedItem: data.orderItems.map(orderItem => ({
      '@type': 'OrderItem',
      position: orderItem.position,
      acceptedOffer: {
        '@type': 'Offer',
        '@id': `${orderItem.acceptedOffer['@id']}`,
      },
      orderedItem: {
        '@type': `${orderItem.orderedItem['@type']}`,
        '@id': `${orderItem.orderedItem['@id']}`,
      },
    })),
    payment: createPaymentPart(false),
  };
}

/**
 * C1 request with missing customer.email
 *
 * @param {C1ReqTemplateData} data
 */
function createNoBrokerNameC1Req(data) {
  const req = createStandardC1Req(data);
  return dissocPath(['broker', 'name'], req);
}

/**
 * C1 request with missing OrderItem.OrderedItem
 *
 * @param {C1ReqTemplateData} data
 */
function createStandardC1WithoutOrderedItem(data) {
  const req = createStandardC1Req(data);
  req.orderedItem.forEach((orderedItem) => {
    const ret = orderedItem;
    ret.orderedItem = null;
  });
  return req;
}

/**
 * C1 request with missing OrderItem.AcceptedOffer
 *
 * @param {C1ReqTemplateData} data
 */
function createStandardC1WithoutAcceptedOffer(data) {
  const req = createStandardC1Req(data);
  req.orderedItem.forEach((orderedItem) => {
    const ret = orderedItem;
    ret.orderedItem = null;
  });
  return req;
}

const c1ReqTemplates = {
  standard: createStandardC1Req,
  noBrokerName: createNoBrokerNameC1Req,
  noOrderedItem: createStandardC1WithoutOrderedItem,
  noAcceptedOffer: createStandardC1WithoutAcceptedOffer,
};

/**
 * @typedef {keyof typeof c1ReqTemplates} C1ReqTemplateRef Reference to a particular C1 Request template
 */

module.exports = {
  c1ReqTemplates,
};
