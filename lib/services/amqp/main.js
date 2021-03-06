(function() {
  var amqp, amqpPublisher, amqpSubscriber, sys, util;
  sys = require('sys');
  util = require('util');
  amqp = require('amqp');
  amqpPublisher = function() {
    var config, connection, exchange, exchange_opened, self;
    self = this;
    connection = null;
    exchange = null;
    config = {
      host: 'localhost',
      port: 5672,
      login: 'guest',
      password: 'guest',
      vhost: '/',
      exchange_name: 'qurl-exchange',
      routing_key: 'qurl.publish.routing',
      message: "Hello World."
    };
    exchange_opened = false;
    self.configure = function(form_data) {
      var colon_ndx, server;
      server = form_data.server;
      colon_ndx = server.indexOf(':');
      if (colon_ndx !== -1) {
        config.host = server.substring(0, colon_ndx);
        config.port = parseInt(server.substring(colon_ndx), 10);
      } else {
        config.host = server;
      }
      config.login = form_data.login;
      config.password = form_data.password;
      config.vhost = form_data.vhost;
      config.exchange_name = form_data.exchange;
      config.routing_key = form_data.routing_key;
      return config.message = form_data.message;
    };
    self.connect = function(client) {
      connection = amqp.createConnection(config);
      return connection.addListener('ready', function() {
        var exchange_name;
        exchange_name = config.exchange_name;
        console.log("Connecting to exchange " + exchange_name);
        exchange = connection.exchange(exchange_name, {
          type: 'topic',
          passive: false,
          durable: true,
          autoDelete: false
        });
        return exchange.addListener('open', function() {
          return exchange_opened = true;
        });
      });
    };
    self.disconnect = function() {
      return connection.end();
    };
    self.publish = function(data) {
      var routing_key;
      if (!exchange_opened) {
        console.log("exchange not opened yet!");
        return;
      }
      routing_key = config.routing_key;
      return exchange.publish(routing_key, data.message, {
        mandatory: false,
        immediate: false,
        contentType: 'application/octet-stream'
      });
    };
    return self;
  };
  amqpSubscriber = function() {
    var config, connection, exchange, queue, self;
    self = this;
    connection = null;
    exchange = null;
    queue = null;
    config = {
      host: 'localhost',
      port: 5672,
      login: 'guest',
      password: 'guest',
      vhost: '/',
      exchange_name: 'qurl-exchange',
      queue_name: 'qurl-queue',
      binding_key: '#'
    };
    self.configure = function(form_data) {
      var colon_ndx, server;
      server = form_data.server;
      colon_ndx = server.indexOf(':');
      if (colon_ndx !== -1) {
        config.host = server.substring(0, colon_ndx);
        config.port = parseInt(server.substring(colon_ndx), 10);
      } else {
        config.host = server;
      }
      config.login = form_data.login;
      config.password = form_data.password;
      config.vhost = form_data.vhost;
      config.exchange_name = form_data.exchange;
      return config.queue_name = form_data.queue;
    };
    self.connect = function(client) {
      connection = amqp.createConnection(config);
      return connection.on('ready', function() {
        console.log("connecting to queue: [" + config.queue_name + "]");
        return queue = connection.queue(config.queue_name, {
          passive: false,
          durable: true,
          exclusive: false,
          autoDelete: false
        }, function(q) {
          console.log("binding to exchange [" + config.exchange_name + "] with binding key [" + config.binding_key + "]");
          q.bind(config.exchange_name, config.binding_key);
          console.log("subscribing to queue...");
          return q.subscribe(function(message, headers, deliveryInfo) {
            return client.send({
              type: "message",
              payload: message.data.toString()
            });
          });
        });
      });
    };
    self.disconnect = function() {
      return connection.end();
    };
    return self;
  };
  module.exports = {
    publisher: amqpPublisher,
    subscriber: amqpSubscriber
  };
}).call(this);
