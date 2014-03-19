    /**
     * Module Imports
     */
var Q          = require( 'q'                  )
    , bmongo   = require( 'breeze-mongodb')
    , database = require( './connection' )

    BreezeServices = function( db )
    {
        var makeResultHandler = function (res, next)
            {
                return function(err, results)
                {
                    if (err) {

                        next(err);

                    } else {

                        // Prevent browser from caching results of API data requests
                        res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
                        res.setHeader("Content-Type:", "application/json");
                        res.send( JSON.stringify(results) );
                    }
                }
            },

            makeCollectionQueryFor = function (collectionName)
            {
                return function(req, res, next)
                       {
                           var callback = makeResultHandler(res, next);
                           var query    = new bmongo.MongoQuery(req.query);

                            //  -------------------------------------------
                            //  Version #1 - Callback used with MongoQuery Promise API
                            //
                            //  Note: here MongoQuery has been enhanced to support BOTH
                            //        callbacks and promises.
                            //  -------------------------------------------

                            query
                               .execute( db, collectionName, callback )
                               .then(function( results )
                               {
                                  console.log( "We already did res.send() in the callback." );
                               });

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
            },

            onLoadLookups = function (req, res, next)
            {
                var lookups = {};
                var queryCountDown = 0;
                var done = makeResultHandler(res, next);

                getAll('OrderStatus',   'OrderStatus');
                getAll('Product',       'Product');
                getAll('ProductOption', 'ProductOption');
                getAll('ProductSize',   'ProductSize');

                function getAll(collectionName, entityType)
                {
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
            },

            onRequest_getMetadata = function (req, res, next)
            {
                next({
                    statusCode: 404,
                    message: "No metadata from the server; metadata is defined on the client"
                });
            },

            onRequest_saveChanges = function( req, res, next )
            {
                var saveHandler = new bmongo.MongoSaveHandler( db, req.body, makeResultHandler(res, next));

                saveHandler.beforeSaveEntity   = function (entity)   { return true; };
                saveHandler.beforeSaveEntities = function (callback) { callback();  };
                saveHandler.save();
            },

            onRequest_getSlug = function  (req, res, next)
            {
                var slug        = req.params.slug;
                var slugHandler = namedQuery[slug.toLowerCase()]; // we only use lower case for named queries

                if ( slugHandler )
                {
                    slugHandler(req, res, next);

                } else {

                    next({
                        statusCode: 404,
                        message: "Unable to locate query for " + slug
                    });

                    return;
                }
            },

            metadata    = undefined,
            /**
             * Internal cache of `named` queries for getSlug()
             * NOTE: all fields are LOWERCASE.
             */
            namedQuery = {
                customers       : makeCollectionQueryFor('Customer'),
                orders          : makeCollectionQueryFor('Order'),
                orderstatuses   : makeCollectionQueryFor('OrderStatus'),
                products        : makeCollectionQueryFor('Product'),
                productoptions  : makeCollectionQueryFor('ProductOption'),
                productsizes    : makeCollectionQueryFor('ProductSize'),
                lookups         : onLoadLookups
            };

        // Publish API for get() and post() handlers

        return {
            getMetadata : onRequest_getMetadata,
            saveChanges : onRequest_saveChanges,
            getProducts : namedQuery.products,
            getSlug     : onRequest_getSlug
        };
    },

    /**
     * Configure Express app with get()/post() route handlers
     * These are custom handlers to connect to Mongo `zza` database
     * and uses Breeze-Mongo Queries
     *
     * @param app Instance of express();
     */
    configureRoutes = function ( app )
    {
        // Create instance of BreezeRoutes that is
        // initialized with open database connection

        var routes = new BreezeServices(
                new database.Connection({
                    dbName      : 'zza',
                    host        : 'localhost',
                    port        : 27017
                }).open( function() { } )
            );

        // Below are the defined RESTful APIs for the Zza client
        // Configure get()/post() request handlers

        app.get( '/breeze/zza/Metadata',     routes.getMetadata);
        app.get( '/breeze/zza/Products',     routes.getProducts);    // demo specialized route
        app.post('/breeze/zza/SaveChanges',  routes.saveChanges);
        app.get( '/breeze/zza/:slug',        routes.getSlug    );        // must be last API route
    };


// ************************************
// Module Exports
// ************************************

module.exports.configure = configureRoutes;









