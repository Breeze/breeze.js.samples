
var MongoClient = require('mongodb').MongoClient;

var database = {
    start: start,
    db:    null
};

module.exports = database;

///////////

function start(cb) {

    var mongoOptions = {
        server: {auto_reconnect: true}
    };

    var uri = process.env.NODE_ENV === 'production' ?
        process.env.MONGOLAB_URI :
        "mongodb://localhost:27017/zza";

    console.log('Connecting to MongoDb at ', uri);

    MongoClient.connect(uri, mongoOptions, function(err, db) {
        if(err) {
            console.error('MongoDb connection failed; is your MongoDb server running?\n' + err.message);
            process.exit(1); // We're cooked. Terminate.
        }

        // re-initialize the database
        require('./mongoDbInit').load(db, function(err){
            if(err) {
                console.error('MongoDb initialization failed.\n' + err.message);
                process.exit(1); // We're cooked. Terminate.
            }
            database.db = db;
            database.start = function(cb){ cb();};
            cb();
        });
    });

    database.start = function(){
        throw new Error("MongoDb initialization in progress");
    };
    
    return database;
}
