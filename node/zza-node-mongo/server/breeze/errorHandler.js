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
 * If in development environment
 *    - logs the error to console
 *    - if err.stack, logs the stack trace to console
 *
 * @type {errorHandler}
 ************************/
module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    if (err) {
        var status = err.statusCode || 500;
        var body =  err.message || err;

        if (process.env.NODE_ENV === 'development'){
            console.error(status + ' ' + body);
            if(err.stack) { console.error(err.stack); }
        }
        res.send(status, body);
    }
}

