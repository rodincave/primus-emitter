var Primus = require('primus');
var emitter = require('../');
var http = require('http').Server;
var expect = require('expect.js');
var opts = { transformer: 'websockets' };


// creates the client
function client(srv, primus, port){
  var addr = srv.address();
  var url = 'http://' + addr.address + ':' + (port || addr.port);
  return new primus.Socket(url);
}

// creates the server
function server(srv, opts) {
  // use rooms plugin
  return Primus(srv, opts).use('emitter', emitter);
}

describe('primus-emitter', function () {

  it('should have required methods', function(done){
    var srv = http();
    var primus = server(srv, opts);
    //primus.save('test.js');
    srv.listen(function(){
      primus.on('connection', function (spark) {
        expect(spark.send).to.be.a('function');
        expect(spark.on).to.be.a('function');
        done();
      });
      client(srv, primus);
    });
  });

  it('should emit event from server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    srv.listen(function(){
      primus.on('connection', function(spark){
        spark.send('news', 'data');
      });
      var cl = client(srv, primus);
      cl.on('news', function (data) {
        expect(data).to.be('data');
        done();
      });
    });
  });

  it('should emit object from server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function(){
      primus.on('connection', function(spark){
        spark.send('news', msg);
      });
      var cl = client(srv, primus);
      cl.on('news', function (data) {
        expect(data).to.be.eql(msg);
        done();
      });
    });
  });

  it('should support ack from server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function(){
      primus.on('connection', function(spark){
        spark.send('news', msg, function (err, res) {
          expect(res).to.be('received');
          expect(err).to.be.eql(null);
          done();
        });
      });
      var cl = client(srv, primus);
      cl.on('news', function (data, fn) {
        fn(null, 'received');
      });
    });
  });

  it('should emit event from client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    srv.listen(function(){
      primus.on('connection', function(spark){
        spark.on('news', function (data) {
          expect(data).to.be('data');
          done();
        });
      });
      var cl = client(srv, primus);
      cl.send('news', 'data');
    });
  });

  it('should emit object from client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function(){
      primus.on('connection', function(spark){
        spark.on('news', function (data) {
          expect(data).to.be.eql(msg);
          done();
        });
      });
      var cl = client(srv, primus);
      cl.send('news', msg);
    });
  });

  it('should support ack from client', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var msg = { hi: 'hello', num: 123456 };
    srv.listen(function(){ 
      primus.on('connection', function(spark){
        spark.on('news', function (data, fn) {
          fn(null, 'received');
        });
      });
      var cl = client(srv, primus);
      cl.send('news', msg, function (err, res) {
        expect(res).to.be('received');
        expect(err).to.be.eql(null);
        done();
      });
    });
  });

  it('should support broadcasting from server', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var total = 0;
    srv.listen(function(){
      primus.on('connection', function(spark){
        if (3 === ++total) primus.send('news', 'hi');
      });
      var cl1 = client(srv, primus);
      var cl2 = client(srv, primus);
      var cl3 = client(srv, primus);

      cl1.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl2.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      cl3.on('news', function (msg) {
        expect(msg).to.be('hi');
        finish();
      });

      function finish() {
        if (1 < --total) done();
      }
    });
  });

  it('should ignore reserved primus events', function(done){
    var srv = http();
    var primus = server(srv, opts);
    var events = require('../lib/').Emitter.reservedEvents;
    var len = events.length;
    srv.listen(function(){
      primus.on('connection', function(spark){
        events.forEach(function(ev){
          spark.on(ev, function(){
            done('Should not');
          });
        });
      });
      var cl = client(srv, primus);
      events.forEach(function(ev, i){
        cl.send(ev, 'hi');
        if (i === (len-1)) done();
      });
    });
  });

});