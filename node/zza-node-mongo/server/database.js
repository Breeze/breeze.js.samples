/*
 * database service with an 'open' method that
 * creates a new MongoDb instance for the zza database
 * and opens it with optional post-open handler
 */
module.exports = {
    open: open
};

var mongodb = require('mongodb');

function open(openHandler ) {

    var dbName = 'zza'
      , host = 'localhost'
      , port = 27017;

    var dbServer = new mongodb.Server(host, port, { auto_reconnect: true});

    var db = new mongodb.Db(dbName, dbServer, {
        strict:true,
        w: 1,
        safe: true
    });

    openHandler = openHandler || function() {/* noop handler*/};
    db.open(openHandler);
    return db;
}
