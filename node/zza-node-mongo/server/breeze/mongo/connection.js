/**
 * Module Imports
 */
var mongodb = require('mongodb'),

    /**
     * Mongo Database options and constructor
     */
    Connection = function ( options )
    {
        var db = new mongodb.Db (
                options.dbName,
                new mongodb.Server( options.host, options.port, { auto_reconnect: true} ),
                {
                    strict:true,
                    w     : 1,
                    safe  : true
                }
            ),
            chainableOpen = (function( origFn )
            {
                return function( handler )
                {
                    origFn.call(db, handler );
                    return db;
                }
            })(db.open);

        // Override `open()` to return `this` reference
        db.open = chainableOpen;

        return db;
    };

// ******************************
// Module Exports
// ******************************

exports.Connection = Connection;
