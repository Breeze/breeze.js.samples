/**
 * Adds Breeze operation routes to the express() application via 'configureRoutes'
 */
(function(routes){

    var repository = require('./repository' );

    routes.configure = configureRoutes;

    /**
     * Configure Express app with get()/post() Breeze route handlers
     * that perform Breeze persistence operations against the Mongo `zza` database
     *
     * @param app Instance of express() application;
     */
    function configureRoutes(app) {
        // Create instance of BreezeOperations that is
        // initialized with open database connection
        // Configure get()/post() request handlers with Breeze operations
        app.get( '/breeze/zza/Lookups',     getLookups   ); // demo specialized route
        app.get( '/breeze/zza/Metadata',    getMetadata  );
        app.post('/breeze/zza/SaveChanges', saveChanges  );

        // '/breeze/zza/:slug' must be the last breeze API route
        app.get( '/breeze/zza/:slug',       getNamedQuery);
    }

    function getLookups(req, res, next) {
        repository.getLookups(makeBreezeResponseHandler(res, next));
    }

    function getMetadata (req, res, next) {
        next({
            statusCode: 404,
            message: "No metadata from the server; metadata is defined on the client"
        });
    }

    // Generic approach to processing a Breeze client query
    function getNamedQuery(req, res, next) {
        var resourceName  = req.params.slug;
        var namedQuery = repository['get'+resourceName.toLowerCase()];

        if ( namedQuery ) {
            namedQuery(req.query, makeBreezeResponseHandler(res, next));
        } else {
            next({ // 404 if the request does not map to a named query
                statusCode: 404,
                message: "Unable to locate query for " + resourceName
            });
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
        repository.saveChanges(req.body, makeBreezeResponseHandler(res, next));
    }

})(module.exports);
