'use strict';

var Analytics = require('@segment/analytics.js-core').constructor;
var integration = require('@segment/analytics.js-integration');
var sandbox = require('@segment/clear-env');
var tester = require('@segment/analytics.js-integration-tester');
var Twitter = require('../lib/');

describe('Twitter Ads', function() {
  var analytics;
  var twitter;
  var options = {
    events: {
      signup: 'c36462a3',
      login: '6137ab24',
      play: 'e3196de1',
      'Order Completed': 'adsf7as8'
    }
  };

  beforeEach(function() {
    analytics = new Analytics();
    twitter = new Twitter(options);
    analytics.use(Twitter);
    analytics.use(tester);
    analytics.add(twitter);
  });

  afterEach(function() {
    analytics.restore();
    analytics.reset();
    twitter.reset();
    sandbox();
  });

  it('should have the correct settings', function() {
    analytics.compare(Twitter, integration('Twitter Ads')
      .option('page', '')
      .option('universalTagPixelId', '')
      .mapping('events'));
  });

  describe('before loading', function() {
    beforeEach(function() {
      analytics.stub(twitter, 'load');
    });

    describe('initialize', function() {
      it('should create window.twq if universal tag pixel id is provided', function() {
        twitter.options.universalTagPixelId = 'teemo';
        analytics.assert(!window.twq);
        analytics.initialize();
        analytics.assert(typeof window.twq === 'function');
      });

      it('should not load universal tag script if universal tag pixel id is not provided', function() {
        analytics.initialize();
        analytics.didNotCall(twitter.load);
      });

      it('should load universal tag script if universal tag pixel id is provided', function() {
        twitter.options.universalTagPixelId = 'teemo';
        analytics.initialize();
        analytics.called(twitter.load, 'universalTag');
      });
    });
  });

  describe('during loading', function() {
    describe('initialize', function() {
      beforeEach(function(done) {
        twitter.options.universalTagPixelId = 'teemo';
        analytics.initialize();
        analytics.stub(window, 'twq');
        analytics.once('ready', done);
      });

      it('should initialize twq with the universal tag pixel id if provided', function() {
        analytics.called(window.twq, 'init', 'teemo');
      }); 
    }); 
  });

  describe('after loading', function() {
    beforeEach(function(done) {
      analytics.once('ready', done);
      analytics.initialize();
      analytics.page();
    });

    describe('#page', function() {
      beforeEach(function() {
        analytics.spy(twitter, 'load');
        analytics.spy(window, 'twq');
      });

      describe('single tag', function() {
        it('should not send if `page` option is not defined', function() {
          analytics.page();
          analytics.didNotCall(twitter.load);
        });

        it('should send if `page` option is defined', function() {
          twitter.options.page = 'e3196de1';
          analytics.page();
          analytics.loaded('<img src="http://analytics.twitter.com/i/adsct?txn_id=e3196de1&p_id=Twitter&tw_sale_amount=0&tw_order_quantity=0">');
        });
      });

      describe('universal tag', function() {
        it('should track standard pageview', function() {
          twitter.options.universalTagPixelId = 'teemo';
          analytics.page();
          analytics.called(window.twq, 'track', 'PageView');
        });

        it('should not call default single tag for pageviews', function() {
          twitter.options.universalTagPixelId = 'teemo';
          analytics.page();
          analytics.didNotCall(twitter.load);
        });
      });
    });

    describe('#track', function() {
      beforeEach(function() {
        analytics.spy(twitter, 'load');
      });

      it('should not send if event is not defined', function() {
        analytics.track('toString');
        analytics.didNotCall(twitter.load);
      });

      it('should send correctly', function() {
        analytics.track('play');
        analytics.loaded('<img src="http://analytics.twitter.com/i/adsct?txn_id=e3196de1&p_id=Twitter&tw_sale_amount=0&tw_order_quantity=0">');
      });

      it('should support array events', function() {
        twitter.options.events = [{ key: 'event', value: 12 }];
        analytics.track('event');
        analytics.loaded('<img src="http://analytics.twitter.com/i/adsct?txn_id=12&p_id=Twitter&tw_sale_amount=0&tw_order_quantity=0">');
      });

      it('should send revenue', function() {
        analytics.track('signup', { revenue: 10 });
        analytics.loaded('<img src="http://analytics.twitter.com/i/adsct?txn_id=c36462a3&p_id=Twitter&tw_sale_amount=10&tw_order_quantity=0">');
      });

      it('should send total as revenue and quantity of all products with Order Completed', function() {
        analytics.track('Order Completed', {
          orderId: '50314b8e9bcf000000000000',
          total: 30,
          revenue: 25,
          shipping: 3,
          tax: 2,
          discount: 2.5,
          coupon: 'hasbros',
          currency: 'USD',
          repeat: true,
          products: [
            {
              id: '507f1f77bcf86cd799439011',
              sku: '45790-32',
              name: 'Monopoly: 3rd Edition',
              price: 19,
              quantity: 1,
              category: 'Games'
            },
            {
              id: '505bd76785ebb509fc183733',
              sku: '46493-32',
              name: 'Uno Card Game',
              price: 3,
              quantity: 2,
              category: 'Games'
            }
          ]
        });
        analytics.loaded('<img src="http://analytics.twitter.com/i/adsct?txn_id=adsf7as8&p_id=Twitter&tw_sale_amount=25&tw_order_quantity=3">');
      });
    });
  });
});
