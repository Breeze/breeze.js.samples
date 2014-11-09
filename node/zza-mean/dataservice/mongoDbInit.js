module.exports.load = load;
//////////////////////
function load(db, callback){

    if (process.env.NODE_ENV === 'production') {
        // DO NOT RE-INITIALIZE PRODUCTION DB
        callback();
        return;
    }
    /// not ready to initialize
    callback();
}