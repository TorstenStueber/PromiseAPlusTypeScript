

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
    then<U>(onFulfilled?: (value: T | Thenable<T>) => U | Thenable<U>, onRejected?: (error: any) => U | Thenable<U>): Thenable<T|U>;
}

class Tomise<T> implements Thenable<T> {

    state: State = State.PENDING;
    value: T = null;
    reason: any = null;
    fulfilledHandlers: ((value: T) => void)[] = [];
    rejectedHandlers: ((reason: any) => void)[] = [];

    constructor(callback: (resolve : (value?: T | Thenable<T>) => void, reject: (error?: any) => void) => void) {
        callback(this.Resolve.bind(this), this.reject.bind(this));
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
                var then: <U>(onFulfilled?: (value: T | Thenable<T>) => U | Thenable<U>,
                    onRejected?: (error: any) => U | Thenable<U>)
                    => Thenable<U>
                    = (<Thenable<T>>valueOrThenable).then;
                if (isFunction(then)) {
                    then.call(valueOrThenable, (y: T | Thenable<T>) => {
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
        return new Tomise<T | U>((resolve, reject) => {
            var newFulfilledHandler = (value: T) => {
                if (isFunction(onFulfilled)) {
                    try {
                        var x: U | Thenable<U> = onFulfilled(value);
                    } catch (er) {
                        reject(er);
                        return;
                    }

                    resolve(x);
                } else {
                    resolve(value);
                }
            };

            var newRejectedHandler = (reason: any) => {
                if (isFunction(onRejected)) {
                    try {
                        var x: U | Thenable<U> = onRejected(reason);
                    } catch (er) {
                        reject(er);
                        return;
                    }

                    resolve(x);
                } else {
                    reject(reason);
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
        });
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
