var secrets = require('./secrets');
var couchbase = require('couchbase');

module.exports.connection = new couchbase.Connection({
      host: secrets.dbHost,
      password: secrets.dbPassword,
      bucket: secrets.dbBucket
   }, function(err) {
      if(err) console.error('✗ Couchbase connection error. Please make sure Couchbase is running.');
   }
);
