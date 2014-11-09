var bmongo   = require('breeze-mongodb');
var db       = require('./database').db;
var notifier = require('./notifier');
var ObjectID = require('mongodb').ObjectID;

// Zza MongoDb collections
var collectionNames = [
    'Customer',
    'Order',
    'OrderStatus',
    'Product',
    'ProductOption',
    'ProductSize'
];

var queryFns = makeQueryFns();

// specialized queries
queryFns['lookups']  = getLookups;
queryFns['metadata'] = getMetadata;
queryFns['products'] = getProducts;

var service = {
	get:         get,
    ready:       ready,
	saveChanges: saveChanges,
};

module.exports = service;

////////////////////

function get(resourceName){
	return queryFns[resourceName.toLowerCase()];
}

/**
 * lookups query whose result is an object with
 * several sets of reference ('lookup') entities
 *
 * @param cb {function} cb(err, results)
 */
function getLookups(queryString, cb) {

    var lookupCollectionNames = [
        'OrderStatus',
        'Product',
        'ProductOption',
        'ProductSize'
    ];
    var failed = false;
    var lookups = {};
    var queryCountDown = 0;

    lookupCollectionNames.forEach(getAll);

    function getAll(collectionName) {
        queryCountDown += 1;
        var entityType = collectionName;
        db.collection( collectionName, {strict: true}, collectionCallback );

        function collectionCallback(err, collection) {
            if (err) {
                failed = true;
                err = { statusCode: 404, message: "Unable to locate collection: " + collectionName, error: err };
                cb(err);
            } else {
                if (!failed){
                    collection.find().toArray(findCallback);
                }
            }
        }

        function findCallback(err, results) {
            queryCountDown -= 1;
            if (failed) {
              // already failed, forget it
            } else if (err) {
                failed = true;
                cb(err);
            } else {
                results.forEach(function (r) {
                    r.$type = entityType;    //Todo: explain why we add $type
                });
                lookups[collectionName] = results;
                if (queryCountDown === 0) { // last of the queries
                    cb(null, lookups);    // we're done
                }
            }
        }
    }

}

// Metadata is not implemented
function getMetadata (queryString, cb) {
   cb({
        statusCode: 404,
        message: "No metadata from the server; metadata is defined on the client"
    });
}

/**
 * Products query
 * An example of a "special case" query that requires extra manipulation on the server.
 * As implemented, this query _could_ be done as a regular collection query
 * But imagine that it was special, perhaps because you needed to add custom MongoDb filters.
 *
 * @param queryString {string} client's OData query string
 * @param cb {function} cb(err, results)
 */
function getProducts(queryString, cb) {
    var query = new bmongo.MongoQuery(queryString);
    // add your own custom filters to the 'query' here
    // don't have any in this case but shows you where you'd put them
    query.execute(db, "Product", cb);
}

/**
 * Makes hash of breeze-mongo query functions from collection names
 **/
function makeQueryFns(){
	var fns = {};

    collectionNames.forEach(function(name){
    	fns[pluralize(name.toLowerCase())] = function(queryString, cb) {
            var query  = new bmongo.MongoQuery(queryString);
            query.execute(db, name, cb );
        };
    });
    return fns;
}

/**
 * Makes resource name from the collection name
 * resource names are plural (e.g., 'Customers' resource for 'Customer' collection)
 *
 * @param text {string} to pluralize
 * @returns {string}
 */
function pluralize(text){
    // ridiculously weak English pluralization
    return text + (text[text.length-1]==='s'?'es' : 's');
}


function ready(cb){ // ready when MongoDb is initialize
    var database = require('./database').start(function(){
        db = database.db;
        cb();
    });
    return module.exports;
}

/**
 * Breeze change-set save
 * @param saveBundle {object} a json "saveBundle" from a Breeze client
 * @param cb {function} cb(err, results)
 */
function saveChanges( saveBundle, cb ) {
    var saveProcessor = new bmongo.MongoSaveHandler(db, saveBundle, cb);
    setSaveMetadata(saveProcessor.metadata);
    addSaveInterceptors(saveProcessor);
    saveProcessor.save();
}

// TODO: ignore client metadata and set saveProcessor's metadata on the server
// Until then, we assume client does it "right" and just fix the collection names for each type
function setSaveMetadata(saveMetadata) {
    for (var key in saveMetadata){
        var entityType = saveMetadata[key];
        // entityTypes have collection names
        // presence of the defaultResourceName indicates it is an entityType, not a complexType
        if (entityType.defaultResourceName){
            var name = entityType.entityTypeName;
            var len = name.indexOf(':');
            entityType.collectionName = len > -1 ? name.substr(0,len) : name;
        }
    }
}

// If we needed interception, here's how we could wire it up:
function addSaveInterceptors(saveProcessor){

     saveProcessor.beforeSaveEntity = function (entity) {
         // do stuff
         console.log("repository: beforeSaveEntity called for "+JSON.stringify(entity));
         return true; // if we want to keep this one
     };

     saveProcessor.beforeSaveEntities = function (continueSave) {
         // do stuff
         var saveMap = this.saveMap;
         var count = 0;
         for(var t in saveMap){
             count += saveMap[t].length;
         }
         console.log("repository: beforeSaveEntities called for "+count+" entities");
         continueSave();
     };

     saveProcessor.afterSaveEntities = function (done) {
         // do stuff
         console.log('repository: afterSaveEntities called');
         var sr = this.saveResult;
         var msg=["  inserted: "+sr.insertedKeys.length];
         msg.push("  updated: "+sr.updatedKeys.length);
         msg.push("  deleted: "+sr.deletedKeys.length);
         msg.push("  keyMappings: "+sr.keyMappings.length);
         if (sr.errors){ msg.push("  errors: "+sr.errors.length);}
         console.log("repository: afterSaveEntities saveResult counts:\n"+msg.join('\n'));
         done();
     };
}
