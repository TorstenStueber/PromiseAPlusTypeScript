

enum State {
    PENDING,
    FULFILLED,
    REJECTED
}

function isFunction(f) {
    return typeof f === 'function';
}

function isObject(o) {
    return o && typeof o === 'object';
}

function invokeAsynch(handler, arg) {
    setTimeout(function() {
        handler(arg);
    }, 0)
}

interface Thenable<T> {
    then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
}

class Tomise<T> implements Thenable<T> {

    state: State;
    value: T;
    reason: any;
    fulfilledHandlers: ((value: T) => void)[];
    rejectedHandlers: ((reason: any) => void)[];

    constructor(callback: (resolve : (value?: T | Thenable<T>) => void, reject: (error?: any) => void) => void) {
        this.state = State.PENDING;
        this.value = null;
        this.reason = null;
        this.fulfilledHandlers = [];
        this.rejectedHandlers = [];

        if (callback) {
            callback(this.Resolve.bind(this), this.reject.bind(this));
        }
    }

    reject(reason) {
        if (this.state === State.PENDING) {
            this.state = State.REJECTED;
            this.reason = reason;
            while (this.rejectedHandlers.length) {
                var handler = this.rejectedHandlers.shift();
                invokeAsynch(handler, this.reason);
            }
        }
    }

    Resolve(valueOrThenable: T | Thenable<T>) {
        if (this === valueOrThenable) {
            this.reject(new TypeError());
            return;
        }

        if (isObject(valueOrThenable) || isFunction(valueOrThenable)) {
            var callHappened = false;
            try {
                var then: <U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>) => Thenable<U> = (<Thenable<T>>valueOrThenable).then;
                if (isFunction(then)) {
                    then.call(valueOrThenable, (y: T) => {
                        if (!callHappened) {
                            this.Resolve(y);
                            callHappened = true;
                        }
                    }, (r: any) => {
                        if (!callHappened) {
                            this.reject(r);
                            callHappened = true;
                        }
                    });
                    return;
                }
            } catch (er) {
                if (!callHappened) {
                    this.reject(er);
                }
                return;
            }
        }

        if (this.state === State.PENDING) {
            this.state = State.FULFILLED;
            this.value = <T>valueOrThenable;
            while (this.fulfilledHandlers.length) {
                var handler = this.fulfilledHandlers.shift();
                invokeAsynch(handler, this.value);
            }
        }
    }

    then<U>(onFulfilled?: (value: T) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Tomise<T | U> {
        var promise2Resolve: (value?: T | U | Thenable<T | U>) => void;
        var promise2Reject: (error?: any) => void;

        var promise2 = new Tomise<T | U>(function(resolve, reject) {
            promise2Resolve = resolve;
            promise2Reject = reject;
        });

        var newFulfilledHandler = function wrapper(value: T) {
            if (isFunction(onFulfilled)) {
                try {
                    var x: U | Thenable<U> = onFulfilled(value);
                } catch (er) {
                    promise2Reject(er);
                    return;
                }

                promise2.Resolve(x);
            } else {
                promise2Resolve(value);
            }
        };

        var newRejectedHandler = function wrapper(reason: any) {
            if (isFunction(onRejected)) {
                try {
                    var x: U | Thenable<U> = onRejected(reason);
                } catch (er) {
                    promise2Reject(er);
                    return;
                }

                promise2.Resolve(x);
            } else {
                promise2Reject(reason);
            }
        };

        if (this.state === State.FULFILLED) {
            invokeAsynch(newFulfilledHandler, this.value);
        } else if (this.state === State.REJECTED) {
            invokeAsynch(newRejectedHandler, this.reason);
        } else {
            this.fulfilledHandlers.push(newFulfilledHandler);
            this.rejectedHandlers.push(newRejectedHandler);
        }

        return promise2;
    };
}


export function resolved(value) {
    return new Tomise(function (resolve) {
        resolve(value);
    });
}

export function rejected(reason) {
    return new Tomise(function (resolve, reject) {
        reject(reason);
    });
}

export function deferred() {
    var _resolve;
    var _reject;
    var promise = new Tomise(function (resolve, reject) {
        _resolve = resolve;
        _reject = reject;
    });

    return {
        promise: promise,
        resolve: _resolve,
        reject: _reject
    }
}
