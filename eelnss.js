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
    var _lenDef = function (get, set, valueSize) {
        var f = function (a, options) {
            return get(a, options);
        };
        // The size of the extracted value:
        //  0  - null object always
        //  1  - single reference
        // n>2 - a list of n values.
        // TODO: size for composition of telescopes
        f.specification = {
            valueSize: valueSize || 1
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
                },
                // TODO: size for composition of telescopes is not correct.
                f.specification.valueSize * lenBC.specification.valueSize
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
        },
        0
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
        },
        1
    );
    // Optimization for id len
    _idLen.andThen = function (lenBC) {
        return lenBC;
    };


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
            // Arrays are not valid fieldLen containers.
            _assert(!_.isArray(a), "Arrays are not valid fieldLen containers. Field name:" + fieldName + ". Argument:" + a);
            var value = a[fieldName];
            // If options.fillEmpty===true, then a empty value is filled with a {} object. This is used for nested lens zeros.
            if (fillEmpty === true && _.isUndefined(value)) {
                return {};
            }
            return value;
        };
        function fSet(b, a) {
            // Arrays are not valid fieldLen containers.
            _assert(!_.isArray(a), "Arrays are not valid fieldLen containers. Field name:" + fieldName + ". Argument:" + a);
            if (_.isUndefined(b)) {
                return _.omit(a, fieldName);
            }
            var extendO = {};
            extendO[fieldName] = b;
            return _.chain(a).clone().extend(extendO).value();
        };
        return _lenDef(fGet, fSet, 1);
    };


    // Telescope: List of lens
    // ------------------
    // Accept a list of lens, and execute folded getters and setters to/from lists of value
    var _telescope = function (listOfLens) {
        _assert(_.isArray(listOfLens), "A list of lens is expected");

        // For each len, extract the value form the container.
        // The result is a list of extracted values.
        var getTelescope = function (a) {
            return _.map(listOfLens, function (singleCLen) {
                return singleCLen.get(a);
            });
        };
        var setTelescope = function (b, a) {
            // setting undefined will empty values for the nested lenses.
            var values = b || _.range(listOfLens.length).map(function () {
                return undefined;
            });
            return _.reduce(_.zip(listOfLens, values), function (res, len_value) {
                var len = len_value[0];
                var value = len_value[1];
                return len.set(value, res);
            }, a);
        };
        return _lenDef(getTelescope, setTelescope, listOfLens.length);
    };


    // Context lenses definitions
    // ==========================
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
    // A context len knows how to extract all possible contexts values from a container. It must be provided during clen definition in contextExtractor.
    // contextExtractor provide a list of all possible context values: [[c1,c2,x],[c1,c2,y],....]

    var _contextLenDef = function (cget, cset, contextExtractor, contextSize, valueSize) {
        var clen = function (context, a) {
            return cget(context, a);
        };
        // The context parameter is a list of parameters with fixed size.
        // The context size information is for validation and composition.

        clen.specification = {
            contextSize: contextSize,
            valueSize: valueSize,
            size: (valueSize + contextSize)
        };
        clen.cget = cget;
        clen.cset = cset;
        clen.extract = contextExtractor;

        // Operation on list of [Context, Value]
        // lget extract all possible context using the extractor
        clen.lget = function (container) {
            if (clen.specification.contextSize === 0) {
                // single len, extract [[value]];
                return [
                    [clen.cget([], container)]
                ];
            }
            var listOfContext = clen.extract(container);
            var listOfContextAndValue = _.chain(listOfContext).map(function (context) {
                return _.chain(context).union([clen.cget(context, container)]).flatten(true).value();
            }).value();
            return listOfContextAndValue;
        };
        // lset sets the values on all provided contexts
        clen.lset = function (listOfContextAndValue, container) {
            if (clen.specification.contextSize === 0 && listOfContextAndValue.length === 0) {
                // single len, set of [] must be mapped to set of [[undefined]]
                return clen.cset([], undefined, container);
            }
            return _.chain(listOfContextAndValue)
                .reduce(function (currContainer, contextAndValue) {
                    var context = contextAndValue.slice(0, contextSize);
                    var value = contextAndValue.slice(contextSize, clen.specification.size);
                    if (clen.specification.valueSize === 1) {
                        return clen.cset(context, value[0], currContainer);
                    }
                    return clen.cset(context, value, currContainer);

                }, container).value();
        };
        // The bind operation just fix the context parameter and return a len.
        clen.bindContext = function (context) {
            _assert(context.length === contextSize, "context size error");
            var bindedGet = function (a) {
                return cget(context, a);
            };
            var bindedSet = function (b, a) {
                return cset(context, b, a);
            };
            return _lenDef(bindedGet, bindedSet, clen.specification.valueSize);
        };
        clen.bindContextValue = function (contextAndValue) {
            _assert(contextAndValue.length === clen.specification.size, "context size error");
            var _context = contextAndValue.slice(0, contextSize);
            var _value = contextAndValue.slice(contextSize);
            var _len = clen.bindContext(_context);
            return {
                len: _len,
                value: _value,
                context: _context
            };
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
            if (contextSize === 0) {
                // single len, compose without context
                return simpleAndThen();
            }
            if (clenBC.specification.contextSize === 0) {
                return simpleInverseAndThen();
            }
            return realAndThen();

            function simpleAndThen() {
                var simpleCget = function (context, a) {
                    return clenBC.cget(context, clen.cget([], a));
                };
                var simpleCset = function (context, c, a) {
                    return clen.mod([], function (b) {
                        return clenBC.cset(context, c, b);
                    }, a);
                };
                var simpleExtract = function (a) {
                    return clenBC.extract(clen.cget([], a));
                };
                return _contextLenDef(
                    simpleCget,
                    simpleCset,
                    simpleExtract,
                    clenBC.specification.contextSize,
                    clenBC.specification.valueSize
                );
            };
            function simpleInverseAndThen() {
                var simpleCget = function (context, a) {
                    return clenBC.cget([], clen.cget(context, a));
                };
                var simpleCset = function (context, c, a) {
                    return clen.mod(context, function (b) {
                        return clenBC.cset([], c, b);
                    }, a);
                };
                return _contextLenDef(
                    simpleCget,
                    simpleCset,
                    clen.extract,
                    clen.specification.contextSize,
                    clenBC.specification.valueSize
                );
            };
            function realAndThen() {
                var compositionContextSize = contextSize + clenBC.specification.contextSize;
                var compositionValueSize = valueSize * clenBC.specification.valueSize;

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
                        return clenBC.cset(BCcontext, c, b);
                    }, a);
                };
                var composedExtactor = function (a) {
                    var bContexts = contextExtractor(a);
                    var contextFinal = _.chain(bContexts).map(function (singleBContext) {
                        var cContext = clenBC.extract(cget(singleBContext, a));
                        return _.map(cContext, function (singleCContext) {
                            return  _.union(singleBContext, singleCContext);
                        });
                    }).flatten(true).value();
                    return contextFinal;
                };
                return _contextLenDef(
                    composedCget,
                    composedCset,
                    composedExtactor,
                    compositionContextSize,
                    compositionValueSize
                );
            };
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
            // from any container, the context is a empty list of parameters
            function (a) {
                return [
                    []
                ];
            },
            // context size is zero
            0,
            len.specification.valueSize
        );
    };

    // Map context Len
    // ---------------
    // Context is given by the key maps.
    //
    // The Option construction is not used, so undefined is assumed to be None.
    //
    var _mapContextLenTemplate = function (options) {
        var fillEmpty = options.fillEmpty || false;
        return _contextLenDef(
            function (context, a) {
                _assert(_.isArray(context), "context for map must be a single value");
                _assert(context.length === 1, "context for map must be a single value");
                var key = context[0];
                var value = a[key];
                if (fillEmpty && _.isUndefined(value)) {
                    return {};
                }
                return value;
            },
            function (context, b, a) {
                _assert(_.isArray(context), "context for map must be a single value");
                _assert(context.length === 1, "context for map must be a single value");
                var key = context[0];
                a[key] = b;
                return a;
            },
            // Each key is a possible context value
            function (a) {
                var keys = _.keys(a);
                if (keys.length === 0) {
                    return [];
                }
                return _.chain(keys).map(function (key) {
                    return [key];
                }).value();
            },
            // One parameter on the context, the key value
            1,
            1
        );
    };
    var _mapContextLenLeaf = _mapContextLenTemplate({fillEmpty: false});
    var _mapContextLen = _mapContextLenTemplate({fillEmpty: true});

    var _idCLen = _contextLenFromLen(_idLen);
    _idCLen.cAndThen = function (cLenBC) {
        return cLenBC;
    };

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
    // Expression := ( Part '.' )* TelescopePart?
    // Part             := FieldLenPart | MapLenPart
    // FieldLenPart     :=  fieldName::String
    // MapLenPart       := '{' mapKeyName::String '}'
    // TelescopePart    := '('  ( FieldLen ',') * ')'
    // FieldLen         :=  (FieldLenPart '.')*
    //
    var _compileExpression = function (cLenExpressionRaw) {

        // clear white spaces
        var cLenExpression = cLenExpressionRaw.replace(/ /g, '');
        // Util function, apply composition on cAndThen.
        var cAndThenComposition = function (currContextLen, nextPart) {
            return currContextLen.cAndThen(nextPart);
        };
        // Util function, apply composition on andThen.
        var andThenComposition = function (currLen, nextPart) {
            return currLen.andThen(nextPart);
        };
        // FieldLens parts builder
        // --------------------
        // Part is the field name
        var fieldPartBuilder = function (part, last) {
            return _contextLenFromLen(_fieldLenTemplate(part, {fillEmpty: !last}));
        };
        // MapLens parts.
        // ------------------------------
        var mapPartBuilder = function (part, last) {
            // TODO parameter name is not used, maybe for cross product will be necessary.
            if (last) {
                return _mapContextLenLeaf;
            } else {
                return _mapContextLen;
            }
        };
        var telescopePartBuilder = function (part, last) {
            _assert(last === true, " telescope parts must be at the end of the context len extression");
            // Telescope is a list of nested field lens
            // Example:
            // ( internal.att1, internal.att2, other.refValue ).
            var setParams = (/\((.*)\)/gi).exec(part)[1];
            var telescopeLensDefinitions = setParams.length == 0 ? [] : setParams.split(",");

            var buildLenFromListOfFields = function (listOfFields) {
                return _.chain(listOfFields)
                    .map(function (fieldName, index) {
                        var isLast = ((listOfFields.length - index - 1) === 0 );
                        return _fieldLenTemplate(fieldName, {fillEmpty: !isLast})
                    })
                    .reduce(andThenComposition, _idLen)
                    .value();
            };

            var listOfLens = _.chain(telescopeLensDefinitions)
                .map(function (lenDefinition) {
                    return lenDefinition.split(".");
                })
                .map(buildLenFromListOfFields)
                .value();
            return _contextLenFromLen(_telescope(listOfLens));
        };

        // Construction implementation
        // ---------------------------

        // Extract final telescope expression
        var telescopeSeparator = cLenExpression.indexOf("(");
        var parts;
        if (telescopeSeparator == -1) {

            parts = cLenExpression.split(".");
        } else {
            // expression is a.b.c.(telescope) -> split to a.b.c (telescope)
            var contextParts = cLenExpression.substring(0, telescopeSeparator - 1);
            var telescopePart = cLenExpression.substring(telescopeSeparator);
            parts = contextParts.split(".");
            parts.push(telescopePart)
        }
        // Split len expression in '.' separated parts
        var cLenInstance = _.chain(parts).map(function (part, index) {
            var type = part.charAt(0);
            var isLast = ((parts.length - index - 1) === 0 );
            // Switch to the different part builders.
            switch (type) {
                case '(':
                    return telescopePartBuilder(part, isLast);
                case '{':
                    return mapPartBuilder(part, isLast);
                default :
                    return fieldPartBuilder(part, isLast);
            }
        }).reduce(cAndThenComposition, _idCLen).value();
        cLenInstance.signature = cLenExpression;
        return cLenInstance;
    };


    // Public api.
    _.mixin({
        lenDef: _lenDef,
        lenNil: _nilLen,
        lenIdentity: _idLen,
        fieldLen: _fieldLenTemplate,
        buildContextLen: _compileExpression,
        telescope: _telescope
    });
})(this);
