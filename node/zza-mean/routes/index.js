var data   = require('../dataservice' );
var router = require('express').Router();
module.exports = router;

router.get( '/:resource',   getQuery); 

router.post('/SaveChanges', saveChanges  );

///////////////////////////////////////////

// Create a common callback fn for Breeze Mongo query and save
function _callback(res, next) {
    return function(err, results) {
        if (err) {
            next(err);
        } else {
            // Prevent browser from caching results of API data requests
            res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.setHeader("Content-Type:", "application/json");
            res.json(results);
        }
    }
}


// GET '~/:resource'
// Generic approach to processing a Breeze client query
function getQuery(req, res, next) {
    var resourceName  = req.params.resource;
    var query = data.get(resourceName);

    if (!query) {
    	next({ // 404 if the request does not map to a registered query
            statusCode: 404,
            message: "Unable to create a query for " + resourceName
        });
    } else {
        query(req.query, _callback(res, next));
    }
}


function saveChanges( req, res, next ) {
    data.saveChanges(req.body, _callback(res, next));
}

