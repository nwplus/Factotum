
/**
 * The time out error to be used when a prompt times out.
 */
class TimeOutError extends Error {
    constructor() {
        super('Prompt timed out.');

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, TimeOutError);
        }

        this.name = 'TimeOutError';
    }
}
module.exports.TimeOutError = TimeOutError;

/**
 * The cancel error to be used when a user cancels a prompt.
 */
class CancelError extends Error {
    constructor() {
        super('Prompt was canceled by user.');

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CancelError);
        }

        this.name = 'CancelError';
    }
}
module.exports.CancelError = CancelError;