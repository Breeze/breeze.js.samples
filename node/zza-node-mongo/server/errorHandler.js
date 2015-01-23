/*************************
 * Application middleware that returns an error to the client
 * Should be the last middleware in the pipeline
 * Can turn a specially formatted error object into an error response with a status code
 * Ex:
 *    err = {statusCode: 404, message: 'Unable to locate query for foo'}
 *    // sends a 404 response with the given message as the body
 *
 * If no statusCode, statusCode = 500
 * If err.message, the message is the body
 * If no err.message, the err itself is the body.
 * If err.saveResult, send that too (tells client how many were saved before the error)
 * If in development environment
 *    - logs the error to console
 *    - if err.stack, logs the stack trace to console
 *
 * @type {errorHandler}
 ************************/

module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    if (err) {
        var body = err.message ? {message: err.message} : err;
        if (err.saveResult){ body.saveResult = err.saveResult; }
        var status = err.statusCode || 500;
        res.status(status).send(body);
        logError(err, status, body);
    }
}

function logError(err, status, body){
    //todo: get environment variable that says whether to log to console
    setTimeout(log,0); // let response write to console, then error
    function log(){
        var stack = '';
        var msg = '--------------\nStatus: '+status + ' ' +
            (typeof body === 'string' ? body : ('\n'+JSON.stringify(body, null, 2)));
        // log all inner errors too
        while(err) {
            stack = err.stack || stack; // get deepest stack
            err = err.innerError;
            if (err && err.message){
                msg += '\n'+err.message;
            }
        }
        // log deepest stack
        if(stack) {msg += '\n'+stack; }
        console.error(msg+'\n--------------');
    }
}
