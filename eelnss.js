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


    // Context lenses definitions
    // ------------------
    //
    // Context Lenses accept not only a value to set/get, but also a context that parametrizes the final len to use.
    //
    // The simplest not trivial example is a map len with key as parameter:
    //     mapLen(key).get( Map )
    //     mapLen(key).set( Value, Map )
    // Context can be binded to get a standard len:
    //     contextMapLen.bind(key).get(Map)
    //     contextMapLen.bind(key).set( Value, Map)
    //
    // The cget/cset functions receive a extra context parameter.
    //
    // Then, for the mapLen example the results are:
    //     contextMapLen.cget(key,Map) => value
    // where Map(key) = value
    //
    // The Operation:
    //     contextMapLen.cset(key,value, Map)
    // updates the map.
    //
    // A context len knows how to extract all possible contexts values from a container. It must be provided during clen definition.

    var _contextLenDef = function (cget, cset, contextSize, contextExtractor) {
        var clen = function (a) {
            return cget(a);
        };
        // The context parameter is a list of parameters with fixed size.
        // The context size information is for validation and composition.
        clen.size = contextSize;
        clen.cget = cget;
        clen.cset = cset;
        clen.extract = contextExtractor;
        // The bind operation just fix the context parameter and return a len.
        clen.bind = function (context) {
            _assert(context.length === contextSize, "context size error");
            var bindedGet = function (a) {
                return cget(context, a);
            };
            var bindedSet = function (b, a) {
                return cset(context, b, a);
            };
            return _lenDef(bindedGet, bindedSet);
        };
        // Modification with a given context
        clen.mod = function (context, f, a) {
            return cset(context, f(cget(context, a)), a);
        };

        // Context Lenses left composition
        // CLen[A,B] ~> CLen[B,C] => CLen[A,C]
        // Context parameters are assumed to be a list of values [l_1,l_2,..,l_n], [r_1,r_2,..,r_m], .
        // The composed context is then [l_1,l_2,..,l_n,r_1,r_2,..,r_m].
        clen.cAndThen = function (clenBC) {
            var compositionContextSize = contextSize + clenBC.size;
            // TODO: optimalization when context size is 0 are possible
            var composedCget = function (context, a) {
                // validation of context size is realized in the deepest level, so ignore errors here.
                //  _assert(context.length === compositionContextSize, "context size error");
                var ABcontext = context.slice(0, contextSize);
                var BCcontext = context.slice(contextSize);
                return clenBC(BCcontext, cget(ABcontext, a));
            };
            var composedCset = function (context, c, a) {
                // validation of context size is realized in the deepest level, so ignore errors here.
                // _assert(context.length === compositionContextSize, "context size error");
                var ABcontext = context.slice(0, contextSize);
                var BCcontext = context.slice(contextSize);
                return clen.mod(ABcontext, function (b) {
                    return clenBD.set(BCcontext, c, b);
                });
            };
            var composedExtactor = function (a) {
                var bContexts = contextExtractor(a);
                return _.chain(bContexts).map(function (singleBContext) {
                    var cContext = clenBC.extract(cget(singleBContext, a));
                    return _.map(cContext, function (singleCContext) {
                        return  _.union(singleBContext, singleCContext);
                    });
                }).flatten(true).value();
            };
            return _contextLenDef(
                composedCget,
                composedCset,
                compositionContextSize,
                composedExtactor
            );
        };
        // Right composition.
        // CLen[A,B] <~ CLen[C,A] == CLen[C,A] ~> CLen[A,B] => CLen[C,B]
        clen.cCompose = function (LenCA) {
            return LenCA.cAndThen(clen);
        };

        return clen;
    };

    // Context Lenses from Lens
    // ------------------------
    // The simplest context lens have empty context, and are created for any len:
    var _contextLenFromLen = function (len) {
        return _contextLenDef(
            // cget ignores context information
            function (context, a) {
                return len.get(a);
            },
            // cset ignores context information
            function (context, b, a) {
                return len.set(b, a);
            },
            // context size is zero
            0,
            // from any container, the context is a empty list of parameters
            function (a) {
                return [];
            }
        );
    };

    // Map context Len
    // ---------------
    // Context is given by the key maps.
    //
    // The Option construction is not used, so undefined is assumed to be None.
    //
    // Only one instance is necessary.
    var _mapContextLen = _contextLenDef(
        function (context, a) {
            return a[context];
        },
        function (context, b, a) {
            a[context] = b;
            return a;
        },
        // One parameter on the context, the key value
        1,
        // Each key is a possible context value
        function (a) {
            return _.keys(a);
        }
    );


    // Build complex context lenses from expressions.
    // ======================================
    //
    // Build a complex context len with parameter on Maps values.
    // The final part definition can be a Telescope with a list of lens to extract values from leaf values.
    //
    // Examples:
    // a.b.c
    // a.b.{:person}
    // a.b.{:person}.name
    // a.b.{:person}.contacts.{:contact}.name
    // a.b.{:person}.(name,lastname,age)
    // a.b.{:person}.(name,lastname,age,contacts)
    // TODO add set lens expressions
    // Syntax:
    //     Expression := ( Part '.' )* TelescopePart?
    //     Part             := FieldLenPart | MapLenPart
    //     FieldLenPart     :=  fieldName::String
    //     MapLenPart       := '{' mapKeyName::String '}'
    //     TelescopePart    := '('  ( FieldLen ',') * ')'
    //     FieldLen         :=  (FieldLenPart '.')*
    //
    var _compileExpression = function (clenExpression) {

        // Util function, apply composition on andThen.
        var andThenComposition = function (currContextLen, nextPart) {
            return currContextLen.cAndThen(nextPart);
        };
        // FieldLens parts builder
        // --------------------
        // Part is the field name
        var fieldPartBuilder = function (part) {
            return _contextLenFromLen(_fieldLenTemplate(part, {fillEmpty: true}));
        };
        // MapLens parts.
        // ------------------------------
        var partMapLenRegexp = /{(.*)}/gi;
        var mapPartBuilder = function (part) {
            // TODO parameter name is not used, maybe for cross product will be necessary.
            return _mapContextLen;
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
