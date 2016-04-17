"use strict";
var State;
(function (State) {
    State[State["PENDING"] = 0] = "PENDING";
    State[State["FULFILLED"] = 1] = "FULFILLED";
    State[State["REJECTED"] = 2] = "REJECTED";
})(State || (State = {}));
function isFunction(f) {
    return typeof f === 'function';
}
function isObject(o) {
    return o && typeof o === 'object';
}
function invokeAsynch(handler, arg) {
    setTimeout(function () {
        handler(arg);
    }, 0);
}
var Tomise = (function () {
    function Tomise(callback) {
        this.state = State.PENDING;
        this.value = null;
        this.reason = null;
        this.fulfilledHandlers = [];
        this.rejectedHandlers = [];
        callback(this.Resolve.bind(this), this.reject.bind(this));
    }
    Tomise.prototype.reject = function (reason) {
        if (this.state === State.PENDING) {
            this.state = State.REJECTED;
            this.reason = reason;
            while (this.rejectedHandlers.length) {
                var handler = this.rejectedHandlers.shift();
                invokeAsynch(handler, this.reason);
            }
        }
    };
    Tomise.prototype.Resolve = function (valueOrThenable) {
        var _this = this;
        if (this === valueOrThenable) {
            this.reject(new TypeError());
            return;
        }
        if (isObject(valueOrThenable) || isFunction(valueOrThenable)) {
            var callHappened = false;
            try {
                var then = valueOrThenable.then;
                if (isFunction(then)) {
                    then.call(valueOrThenable, function (y) {
                        if (!callHappened) {
                            _this.Resolve(y);
                            callHappened = true;
                        }
                    }, function (r) {
                        if (!callHappened) {
                            _this.reject(r);
                            callHappened = true;
                        }
                    });
                    return;
                }
            }
            catch (er) {
                if (!callHappened) {
                    this.reject(er);
                }
                return;
            }
        }
        if (this.state === State.PENDING) {
            this.state = State.FULFILLED;
            this.value = valueOrThenable;
            while (this.fulfilledHandlers.length) {
                var handler = this.fulfilledHandlers.shift();
                invokeAsynch(handler, this.value);
            }
        }
    };
    Tomise.prototype.then = function (onFulfilled, onRejected) {
        var _this = this;
        return new Tomise(function (resolve, reject) {
            var newFulfilledHandler = function (value) {
                if (isFunction(onFulfilled)) {
                    try {
                        var x = onFulfilled(value);
                    }
                    catch (er) {
                        reject(er);
                        return;
                    }
                    resolve(x);
                }
                else {
                    resolve(value);
                }
            };
            var newRejectedHandler = function (reason) {
                if (isFunction(onRejected)) {
                    try {
                        var x = onRejected(reason);
                    }
                    catch (er) {
                        reject(er);
                        return;
                    }
                    resolve(x);
                }
                else {
                    reject(reason);
                }
            };
            if (_this.state === State.FULFILLED) {
                invokeAsynch(newFulfilledHandler, _this.value);
            }
            else if (_this.state === State.REJECTED) {
                invokeAsynch(newRejectedHandler, _this.reason);
            }
            else {
                _this.fulfilledHandlers.push(newFulfilledHandler);
                _this.rejectedHandlers.push(newRejectedHandler);
            }
        });
    };
    ;
    return Tomise;
}());
function resolved(value) {
    return new Tomise(function (resolve) {
        resolve(value);
    });
}
exports.resolved = resolved;
function rejected(reason) {
    return new Tomise(function (resolve, reject) {
        reject(reason);
    });
}
exports.rejected = rejected;
function deferred() {
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
    };
}
exports.deferred = deferred;
//# sourceMappingURL=index.js.map