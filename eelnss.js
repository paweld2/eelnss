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
        var f = function (a, options) {
            return get(a, options);
        };
        // get: A => B
        f.get = f;
        // set: (B , A) => A
        f.set = set;
        // mod: (B=>B , A) => A
        f.mod = function (f, a) {
            return set(f(get(a)), a);
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


        // For Len[A,B] define a equivalence class on A based on equivalence on B.
        //
        // It is: a1 == a2 <=> len.get(a1) == len.get(a2)
        //
        // Then for a given value of B, the condition is:
        // a in eqClass(value) <=> let.get(a) == value
        //
        // If value == undefined, then the equivalence class is the whole set.
        //
        // Equivalence class is represented as utilities class:
        f.eqClass = function (valueToMatch) {
            return {
                // check if A belongs to the equivalence class
                check: function (a) {
                    if (valueToMatch === undefined) {
                        return true;
                    }
                    return f.get(a) === valueToMatch;
                },
                // select all values that belong to the equivalence class
                select: function (listOfA) {
                    if (valueToMatch === undefined) {
                        return listOfA;
                    }
                    return _.chain(listOfA).filter(function (a) {
                        return f.get(a) === valueToMatch;
                    }).value();
                },
                // remove all values that belong to the equivalence class
                filter: function (listOfA) {
                    if (valueToMatch === undefined) {
                        return [];
                    }
                    return _.chain(listOfA).filter(function (a) {
                        return f.get(a) !== valueToMatch;
                    }).value();
                }
            };
        };

        return f;
    };

    // Nil Len
    // ------------------
    // Nil Len Len[undefined,A], always return undefined, and don't change the container object A.
    var _nilLen = _lenDef(
        function (a) {
            return undefined;
        },
        function (b, a) {
            return a;
        }
    );
    // Identity len
    // ------------------
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
    // ------------------
    // Extract from a object the value over key 'fieldName'.
    //
    var _fieldLenTemplate = function (fieldName, options) {
        function fGet(a) {
            var opt = options || {};
            var fillEmpty = opt.fillEmpty || false;
            // Map undefined containers to undefined values
            if (_.isUndefined(a)) {
                return undefined;
            }
            // Arrays are not valued fieldLen containers.
            // We assume that a list must be mapped deeply.
            if (_.isArray(a)) {
                return _.map(a, fGet);
            }
            var value = a[fieldName];
            // If options.fillEmpty===true, then a empty value is filled with a {} object. This is used for nested lens zeros.
            if (fillEmpty === true && _.isUndefined(value)) {
                return {};
            }
            return value;
        };
        function fSet(b, a) {
            if (_.isUndefined(b)) {
                return _.omit(a, fieldName);
            }
            // Arrays are not valued fieldLen containers.
            // We assume that a list must be mapped deeply.
            if (_.isArray(a)) {
                // We verify that setter values map correctly to array values.
                _assert(_.isArray(b), "Field set mismatch of array levels. Field name:" + fieldName + ". Arguments:" + a + " , " + b);
                _assert(b.length === a.length, "Field set mismatch arrays length.Field name:" + fieldName + ". Arguments:" + a + " , " + b);
                return _.zip(b, a).map(function (b_a) {
                    return fSet(b_a[0], b_a[1]);
                });
            }
            // For objects, the field value is set.
            var extendO = {};
            extendO[fieldName] = b;
            return _.chain(a).clone().extend(extendO).value();
        };
        return _lenDef(fGet, fSet);
    };


    // Map len
    // -------
    // Get/Set objects from a map using the objects id key.
    // the structure on the container is
    // { "id_value" : { "id_key" : "id_value"} }
    var _mapLen = function (mapKeyName) {
        var keyLen = _fieldLenTemplate(mapKeyName);
        var _bindObject = function (mapValue) {
            var key = keyLen.get(mapValue);
            return _lenDef(
                function (a) {
                    return a[key];
                },
                function (b, a) {
                    // Verify that set value has the same keyValue.
                    _assert(keyLen.get(b) === key, "Map len set with a mismatching key value. Bind value:" + mapValue + ". Set value:" + b + ". Container " + a);
                    a[key] = b;
                    return a;
                }
            );
        }
        return {
            bind: _bindObject
        };
    };

    // Set Len
    // =======
    // Javascript don't have a native Set representation, so Arrays are used.
    // Order is not preserved but is stable.
    //
    // A set len extract a subset of a set. The subset is defined by a equivalence class.
    // See eqClass method on lens for equivalence classes definition.
    var _setLen = function (eqClass) {
        return _lenDef(
            // Getter
            function (l) {
                // Select the values that belong to eqClass.
                return eqClass.select(l);
            },
            // Setter
            function (e, l) {
                // Verify that values in e belong to eqClass
                _assert(eqClass.filter(e).length === 0, "Not all values belong to equality class");
                // Remove current values.
                var valuesWithoutEqClass = eqClass.filter(l);
                if (_.isUndefined(e)) {
                    return valuesWithoutEqClass;
                } else {
                    return _.union(valuesWithoutEqClass, e);
                }
            }
        );
    };


    // Build complex lenses from expressions.
    // ======================================
    //
    // Syntax is 'field.field.[:eqField:eqField].{:mapId}
    // Construction:
    // - Split expression on '.'.
    // - /\[(:.*)\]/gi parts map to SetLens, build from equality classes taken from parameters.
    // - /{:(.*)}/gi parts map to MapLens, using a single key parameter.
    // - other values are used to build FieldLens.
    //
    // After creation, it is necessary to bind the parameters to fix the equality classes to use.
    var _compileExpression = function (lenExpression) {

        // Util function, apply composition on andThen.
        var andThenComposition = function (currLen, nextPart) {
            return currLen.andThen(nextPart);
        };
        // FieldLens parts builder
        // --------------------
        // Part is the field name
        var fieldPartBuilder = function (part) {
            return function (params) {
                return _fieldLenTemplate(part, {fillEmpty: true});
            }
        };
        // SetLens part builder
        // --------------------
        // For a part "[:param1:param2]" create a list of setLens [SetLen("param1"),SetLen("param1")]
        // and then build a lazy composition:
        // IdentityLen andThen SetLen("param1")(v1) andThen SetLen("param1")(v2)

        var setPartBuilder = function (part) {
            var setParams = (/\[(.*)\]/gi).exec(part)[1];
            var criteriaList = setParams.length == 0 ? [] : setParams.substr(1).split(":");
            return function (params) {
                return _.chain(criteriaList).map(function (setParam) {
                    var eqClassValue = params[setParam];
                    // If eqClassValue is undefined, then the equivalence class will be the whole set.
                    return _setLen(_fieldLenTemplate(setParam, {fillEmpty: true}).eqClass(eqClassValue, true));
                }).reduce(andThenComposition, _idLen).value();
            }
        };
        // MapLens parts.
        // ------------------------------
        var partMapLenRegexp = /{:(.*)}/gi;
        var mapPartBuilder = function (part) {
            var mapKey = partMapLenRegexp.exec(part)[1];
            return function (params) {
                return _mapLen(mapKey).bind(params);
            };
        };

        // Construction implementation
        // ---------------------------
        // Split len expression in '.' separated parts
        var parts = lenExpression.split(".");
        var lenDefinition = _.chain(parts).map(function (part) {
            var type = part.charAt(0);
            // Switch to the different part builders.
            switch (type) {
                case '[':
                    return setPartBuilder(part);
                case '{':
                    return mapPartBuilder(part);
                default :
                    return fieldPartBuilder(part);
            }
        });
        // Bind function.
        // Parameter values are passed to the part builders to fix the equivalence classes to use.
        var _bind = function (params) {
            var bindedLen = lenDefinition.map(function (partialLen) {
                // Bind parameters on each part.
                return partialLen(params);
            }).reduce(andThenComposition, _idLen).value();
            // Bind operation is nilpotent. On first bind all parameters must be set.
            bindedLen.bind = function () {
                return bindedLen;
            };
            return bindedLen;
        };

        var def = {
            bind: _bind,
            bindset: function (objectRef, model) {
                return _bind(objectRef).set([objectRef], model);
            },
            bindunset: function (objectRef, model) {
                return _bind(objectRef).set([], model);
            }
        };
        return def;
    };


    // Telescope:
    // ------------------
    // Accept a list of lens, and execute folded getters and setters to/from lists of value
    var _telescope = function (listOfLensExpressions) {
        _assert(_.isArray(listOfLensExpressions), "A list of lens is expected");
        // We assume that some lens may be complex lens with parameters.
        var _bindOperation = function (parameters) {
            var listOfLens = _.map(listOfLensExpressions, function (lenExpr) {
                return lenExpr.bind(parameters)
            });
            // For each len, extract the value form the container.
            // The result is a list of extracted values.
            var teleGet = function (a) {
                return _.map(listOfLens, function (singleLen) {
                    return singleLen.get(a);
                });
            };
            // Accept a list of values, and executed setter on each len.
            var teleSet = function (b, a) {
                return _.reduce(_.zip(listOfLens, b), function (res, len_value) {
                    var len = len_value[0];
                    var value = len_value[1];
                    return len.set(value, res);
                }, a);
            };
            return _lenDef(teleGet, teleSet);
        };
        return {
            bind: _bindOperation
        };

    };


    // Public api.
    _.mixin({
        lenDef: _lenDef,
        lenNil: _nilLen,
        lenIdentity: _idLen,
        fieldLen: _fieldLenTemplate,
        mapLen: _mapLen,
        setLen: _setLen,
        buildLen: _compileExpression,
        telescope: _telescope
    });
})(this);
