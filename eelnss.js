//     eelnss.js
//     (c) 20014-2019 Pawel Cesar Sanjuan Szklarz
//     eelnss may be freely distributed under the MIT license.

(function (root) {
    // Baseline setup, inspired in underscore.js
    // --------------
    // Establish the root object, `window` in the browser, or `exports` on the server.
    var _ = root._ || require('underscore');

    // Util functions
    // ---------------
    // Assertion util function.
    function _assert(condition, message) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }



    // Lenses definitions
    // ------------------
    // Main definition function. It take the setter and getter to build a len.
    // Types are not respected, but for documentation we assume that len has type Len[A,B]
    var _lenDef = function (get, set) {
        var f = function (a) {
            return get(a);
        };
        // get: A => B
        f.get = f;
        // set: (B , A) => A
        f.set = set;
        // mod: (B=>B , A) => A
        f.mod = function (f, a) {
            return set(f(get(a)), a);
        };

        // For Len[A,B] define a equivalence class on A based on equivalence on B.
        //
        // 'eqClass' create a function A => Boolean, that will be true iff:
        // len.eqClass(value)( A ) === true  <=> len.get(A) === value
        f.eqClass = function (valueToMatch) {
            return function (a) {
                return f.get(a) === valueToMatch;
            };
        };

        // Lenses left composition
        // Len[A,B] ~> Len[B,C] => Len[A,C]
        f.andThen = function (lenBC) {
            return _lenDef(
                _.compose(lenBC, f),
                function (c, a) {
                    return f.mod(function (b) {
                        return lenBC.set(c, b);
                    }, a);
                }
            );
        };
        // Right composition.
        // Len[A,B] <~ Len[C,A] == Len[C,A] ~> Len[A,B] => Len[C,B]
        f.compose = function (LenCA) {
            return LenCA.andThen(f);
        };
        return f;
    };

    // Nil Len Len[undefined,A], always return undefined, and don't change the container object A.
    var _nilLen = _lenDef(
        function (a) {
            return undefined;
        },
        function (b, a) {
            return a;
        }
    );

    // The identity len Len[A,A].
    var _idLen = _lenDef(
        function (a) {
            return a;
        },
        function (newa, a) {
            return newa;
        }
    );

    // Field Len template:
    // Extract from a object the value over key 'fieldName'.
    //
    // TODO expline fillEmpty
    var _fieldLenTemplate = function (fillEmpty) {
        return function (fieldName) {
            function fGet(a) {
                if (_.isUndefined(a)) {
                    return undefined;
                }
                if (_.isArray(a)) {
                    return _.map(a, fGet);
                }
                var value = a[fieldName];
                if (fillEmpty && _.isUndefined(value)) {
                    return {};
                }
                return value;
            };
            function fSet(b, a) {
                if (_.isUndefined(b)) {
                    return _.omit(a, fieldName);
                }
                if (_.isArray(a)) {
                    _assert(_.isArray(b), "Field set mismatch of array levels. Field name:" + fieldName + ". Arguments:" + a + " , " + b);
                    _assert(b.length === a.length, "Field set mismatch arrays length.Field name:" + fieldName + ". Arguments:" + a + " , " + b);
                    return _.zip(b, a).map(function (b_a) {
                        return fSet(b_a[0], b_a[1]);
                    });
                }
                var extendO = {};
                extendO[fieldName] = b;
                return _.chain(a).clone().extend(extendO).value();
            };
            return _lenDef(fGet, fSet);
        }
    };

    var _setLen = function (eqClassValue) {
        return _lenDef(
            function (l) {
                return _.filter(l, eqClassValue);
            },
            function (e, l) {
                // validate that values in e belong to eqClass
                _assert(_.chain(e).reject(eqClassValue).value().length === 0, "Not all values belong to equality class");
                var filtered = _.chain(l).reject(eqClassValue);
                if (_.isUndefined(e)) {
                    return filtered.value();
                } else {
                    return filtered.union(e).value();
                }
            }
        );
    };

    var partSetLenRegexp = /\[(:.*)\]/gi;
    var andThenComposition = function (currLen, nextPart) {
        return currLen.andThen(nextPart);
    };
    // from a string ":param1:param2"
    // create a list of setLens  [SetLen("param1"),SetLen("param1")]
    // and then build a lazy composition ID andThen SetLen("param1")(v1) andThen SetLen("param1")(v2)
    var setPartBuilder = function (listOfSetParameters) {
        var criteriaList = listOfSetParameters.substr(1).split(":");
        return function (params) {
            return _.chain(criteriaList).map(function (setParam) {
                return _setLen(_fieldLenTemplate(true)(setParam).eqClass(params[setParam]));
            }).reduce(andThenComposition, _idLen).value();
        }
    };
    var fieldPartBuilder = function (fieldName) {
        return function (params) {
            return _fieldLenTemplate(true)(fieldName);
        }
    };

    _.mixin({
        // Raw definition of a len
        // Len[A,B]
        lenDef: _lenDef,
        // Len[A,Nil]
        lenNil: _nilLen,
        // Len[A,A]
        lenId: _idLen,
        fieldLen: _fieldLenTemplate(false),
        // Len[Set[E], ~eqClass[E]]
        // set is stored in an array, but order in not guaranteed (and it changes!!)
        setLen: _setLen,
        buildLen: function (lenExpression) {
            var parts = lenExpression.split(".");
            // a list of partial lens definitions with binding to parameters
            // each element is has type
            // Map<String,Object> -> Len
            //
            var lenDefinition = _.chain(parts).map(function (part) {
                var setParams = partSetLenRegexp.exec(part);
                if (setParams !== null) {
                    return setPartBuilder(setParams[1]);
                } else {
                    return fieldPartBuilder(part);
                }
            });

            var def = {
                bind: function (params) {
                    return lenDefinition.map(function (partialLen) {
                        return partialLen(params);
                    }).reduce(andThenComposition, _idLen).value();
                }
            };
            return def;
        }
    });
})(this);
