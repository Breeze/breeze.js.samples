    /**
     * Adds Breeze operation routes to the express() application via 'configureRoutes'
     */
    module.exports.configure = configureRoutes;

     var Q     = require( 'q'             )
    , bmongo   = require( 'breeze-mongodb')
    , database = require( './connection' )

    /**
     * Configure Express app with get()/post() Breeze route handlers
     * that perform Breeze persistence operations against the Mongo `zza` database
     *
     * @param app Instance of express() application;
     */
    function configureRoutes(app) {
        // Create instance of BreezeOperations that is
        // initialized with open database connection

        var ops = new BreezeOperations(
            new database.Connection({
                dbName      : 'zza',
                host        : 'localhost',
                port        : 27017
            }).open( function() { } )
        );

        // Configure get()/post() request handlers with Breeze operations
        app.get( '/breeze/zza/Lookups',     ops.getLookups   ); // demo specialized route
        app.get( '/breeze/zza/Metadata',    ops.getMetadata  );
        app.post('/breeze/zza/SaveChanges', ops.saveChanges  );

        // '/breeze/zza/:slug' must be the last breeze API route
        app.get( '/breeze/zza/:slug',       ops.getNamedQuery);
    }

    function BreezeOperations( db ) {
        var  namedQueries = {};
        initializeNamedQueries();
        return {
            getLookups : getLookups,
            getMetadata : getMetadata,
            getNamedQuery : getNamedQuery,
            saveChanges : saveChanges
        };

        function getLookups(req, res, next) {
            var lookups = {};
            var queryCountDown = 0;
            var done = makeBreezeResponseHandler(res, next);

            getAll('OrderStatus',   'OrderStatus');
            getAll('Product',       'Product');
            getAll('ProductOption', 'ProductOption');
            getAll('ProductSize',   'ProductSize');

            function getAll(collectionName, entityType) {
                db.collection(
                    collectionName,
                    {strict: true},
                    function (err, collection)
                    {
                        if (err) {
                            err = { statusCode: 404, message: "Unable to locate: " + collectionName, error: err };
                            done(err, null);
                            return;
                        }
                        queryCountDown += 1;

                        collection.find()
                                  .toArray(function (err, results)
                                  {
                                      queryCountDown -= 1;
                                      if (err) {
                                          done(err,null);
                                          return;
                                      }
                                      //Todo: explain why we add $type
                                      results.forEach(function(r) {r.$type = entityType});
                                      lookups[collectionName]=results;

                                      if (queryCountDown === 0) {
                                          done(null, lookups);
                                      }
                                  });
                    }
                );
            }
        }

        function getMetadata (req, res, next) {
            next({
                statusCode: 404,
                message: "No metadata from the server; metadata is defined on the client"
            });
        }

        // Generic approach to processing a Breeze client query
        function getNamedQuery(req, res, next) {
            var collectionName  = req.params.slug;
            var namedQuery = namedQueries[collectionName.toLowerCase()]; // we only use lower case for named queries

            if ( namedQuery )
            {
                namedQuery(req, res, next);
            } else {
                next({ // 404 if the request does not map to a named query
                    statusCode: 404,
                    message: "Unable to locate query for " + collectionName
                });

                return;
            }
        }

        // An example of a "special case" query that can't be done as a "named query"
        // "getProducts" is registered as a "named query"
        // Of course this query _could_ be done as a named query
        // But imagine that it was special, perhaps because you needed to add custom Mongo filters
        // as described inside the implementation.
        function getProducts(req, res, next) {
            var query = new bmongo.MongoQuery(req.query);
            // add your own filters to the 'query' here
            // Case of collection name matters, e.g. "Product", not "product"
            query.execute(db, "Product", makeBreezeResponseHandler(res, next));
        }

        function initializeNamedQueries(){
            /**
             * Known `named` queries
             * NOTE: all fields are LOWERCASE.
             */
            namedQueries = {
                products: getProducts // a specialized query
            };

            makeCollectionQueryFor('Customer');
            makeCollectionQueryFor('Order');
            makeCollectionQueryFor('OrderStatus');
            makeCollectionQueryFor('ProductOption');
            makeCollectionQueryFor('ProductSize');

            function makeCollectionQueryFor (collectionName) {
                namedQueries[collectionName.toLowerCase()] = function(req, res, next) {
                    var callback = makeBreezeResponseHandler(res, next);
                    var query    = new bmongo.MongoQuery(req.query);

                    //  -------------------------------------------
                    //  Version #1 - Callback used with Thomas' MongoQuery Promise API
                    //
                    //  Note: here MongoQuery has been enhanced to support BOTH
                    //        callbacks and promises.
                    //  -------------------------------------------

                    query.execute( db, collectionName, callback );
                    // to prove that callback is invoked first, then the "then" callback
                    //.then(function( results )
                    //{
                    //   console.log( "We already did res.send() in the callback." );
                    //});

                    //  -------------------------------------------
                    //  Version #2 - if MongoQuery did not support Promises
                    //
                    //  Note: could have used Q.denodeify( query.execute.bind( query ) )
                    //        but Q.nbind() is easier
                    //  -------------------------------------------

                    //  var execute   = Q.nbind( query.execute, query ),
                    //      onResults = function( results ) { callback( null,  results ); },
                    //      onError   = function( fault   ) { callback( fault, null );    };
                    //
                    //  execute( db, collectionName )
                    //      .then( onResults, onError );

                };
            }
        }

        function makeBreezeResponseHandler(res, next) {
            // returns a function that handles response from a Breeze Mongo query or save
            return function(err, results) {
                if (err) {
                    next(err);
                } else {
                    // Prevent browser from caching results of API data requests
                    res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                    res.setHeader("Content-Type:", "application/json");
                    res.send( JSON.stringify(results) );
                }
            }
        }

        function saveChanges( req, res, next ) {
            var saveProcessor = new bmongo.MongoSaveHandler( db, req.body, makeBreezeResponseHandler(res, next));

            saveProcessor.beforeSaveEntity   = function (entity)   { return true; };
            saveProcessor.beforeSaveEntities = function (callback) { callback();  };
            saveProcessor.save();
        }
    }








