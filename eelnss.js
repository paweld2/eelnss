//     eelnss.js
//     (c) 20014-2019 Pawel Cesar Sanjuan Szklarz
//     eelnss may be freely distributed under the MIT license.

(function (root) {
    // Baseline setup, inspired in underscore.js
    // --------------
    // Establish the root object, `window` in the browser, or `exports` on the server.
    var underscoreRef = root._ || require('underscore');

    // Util functions
    // ---------------
    // Assertion util function.
    function _assert(condition, message) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }

    var lensesModule = (function (_) {

        function _defineLen(getter, setter, specification) {
            _assert(_.has(specification, "signature"), "No signature in specification");
            _assert(_.has(specification, "valueSize"), "No valueSize in specification");
            _assert(_.has(specification, "valueMap"), "No valueMap in specification");
            var len = {};
            len.spec = {
                signature: specification.signature,
                valueSize: specification.valueSize,
                valueMap: specification.valueMap
            };
            len.get = getter;
            len.set = setter;
            len.mod = function (f, a) {
                return len.set(f(len.get(a)), a);
            };
            len.andThen = function (lenBC) {
                return _andThenCompose(len, lenBC);
            };
            return len;
        }


        var _nilLen = (function () {
            function nilGetter(a) {
                return void(0);
            }

            function nilSetter(b, a) {
                return a;
            }

            return _defineLen(nilGetter, nilSetter, {
                signature: "nil",
                valueSize: 0,
                valueMap: []
            });
        })();

        var _idLen = (function () {
            function idGetter(a) {
                return a;
            }

            function idSetter(newa, a) {
                return newa;
            }

            return _defineLen(idGetter, idSetter, {
                signature: "ID",
                valueSize: 1,
                valueMap: ["ID"]
            });
        })();

        // Lenses left composition
        // Len[A,B] ~> Len[B,C] => Len[A,C]
        function _andThenCompose(lenAB, lenBC) {
            if (lenAB === _idLen) {
                return lenBC;
            }
            function andThenGetter(a) {
                return lenBC.get(lenAB.get(a));
            }

            function andThenSetter(c, a) {
                return lenAB.mod(function (b) {
                    return lenBC.set(c, b);
                }, a);
            }

            var signature = lenAB.spec.signature + "." + lenBC.spec.signature;
            var valueSize = lenAB.spec.valueSize * lenBC.spec.valueSize;
            return _defineLen(andThenGetter, andThenSetter, {
                signature: signature,
                valueSize: valueSize,
                valueMap: lenBC.spec.valueMap
            });
        }

        function _fieldLenTemplate(fieldName, fillEmpty) {
            function fieldGetter(a) {
                if (_.isUndefined(a)) {
                    return void(0);
                }
                // Arrays are not valid fieldLen containers.
                _assert(!_.isArray(a), "Arrays are not valid fieldLen containers. Field name:" + fieldName + ". Argument:" + a);
                var value = a[fieldName];
                // If options.fillEmpty===true, then a empty value is filled with a {} object. This is used for nested lens zeros.
                if (fillEmpty === true && _.isUndefined(value)) {
                    return {};
                }
                return value;
            }

            function fieldSetter(b, a) {
                // Arrays are not valid fieldLen containers.
                _assert(!_.isArray(a), "Arrays are not valid fieldLen containers. Field name:" + fieldName + ". Argument:" + a);
                if (_.isUndefined(b)) {
                    return _.omit(a, fieldName);
                }
                var extendO = {};
                extendO[fieldName] = b;
                return _.chain(a).clone().extend(extendO).value();
            }

            return _defineLen(fieldGetter, fieldSetter, {
                signature: fieldName,
                valueSize: 1,
                valueMap: [fieldName]
            });
        }

        function _fieldLenLeaf(fieldName) {
            return _fieldLenTemplate(fieldName, false);
        }

        function _fieldLen(fieldName) {
            return _fieldLenTemplate(fieldName, true);
        }


        function _telescopeCompose() {
            _assert(arguments.length > 1, "Pass at least 2 lenses a telescope composition");
            var listOfLens = Array.prototype.slice.call(arguments);
            var emptyValues = _.range(listOfLens.length).map(function () {
                return void(0);
            });

            function telescopeGetter(a) {
                return _.map(listOfLens, function (singleCLen) {
                    return singleCLen.get(a);
                });
            }

            function telescopeSetter(b, a) {
                var values = b;
                if (_.isUndefined(values)) {
                    values = emptyValues;
                }
                return _.reduce(_.zip(listOfLens, values), function (finalA, len_value) {
                    var len = len_value[0];
                    var value = len_value[1];
                    return len.set(value, finalA);
                }, a);
            }

            var telescopeSignature = _.reduce(listOfLens, function (accum, len, index) {
                    if (index === listOfLens.length - 1) {
                        return accum + len.spec.signature;
                    }
                    return accum + len.spec.signature + ",";
                }, "(") + ")";
            var telescopeValueMap = _.chain(listOfLens).map(function (len) {
                return len.spec.valueMap;
            }).flatten(true).value();

            return _defineLen(telescopeGetter, telescopeSetter, {
                signature: telescopeSignature,
                valueSize: listOfLens.length,
                valueMap: telescopeValueMap
            });
        }

        function _buildLenFromNestedFieldsExpression(nestedFieldsExpression) {
            var listOfFields = nestedFieldsExpression.split(".");
            return _.chain(listOfFields)
                .map(function (fieldName, index) {
                    var isLast = ((listOfFields.length - index - 1) === 0 );
                    if (isLast) {
                        return _fieldLenLeaf(fieldName);
                    } else {
                        return _fieldLen(fieldName);
                    }
                })
                .reduce(_andThenCompose, _idLen)
                .value();
        }


        return {
            defineLen: _defineLen,
            nilLen: _nilLen,
            idLen: _idLen,
            fieldLenLeaf: _fieldLenLeaf,
            fieldLen: _fieldLen,
            telescopeCompose: _telescopeCompose,
            andThenCompose: _andThenCompose,
            nestedFieldBuilder: _buildLenFromNestedFieldsExpression
        };
    })(underscoreRef);

    var booleanFunctionsModule = (function () {
        function _andComposition(elements) {
            return function (state) {
                return _.every(elements, function (testSubFunction) {
                    return testSubFunction(state);
                });
            };
        }

        function _orComposition(elements) {
            return function (state) {
                return _.some(elements, function (testSubFunction) {
                    return testSubFunction(state);
                });
            };
        }

        function _buildBooleanCheckerForArrayValue(expectedValue, indexInArray) {
            return function (stateAsArray) {
                return stateAsArray[indexInArray] === expectedValue;
            };
        }


        // Build a Array => bool function.
        // arrayNamesSpecification is a map {columnName -> indexInArray }
        // queryObject encode a list of boolean criteria.
        // AND case: each key is a columnName and value is not an object
        // OR case: there is a key that contains a object.
        function _arrayBooleanFromQueryObject(arrayNamesSpecification, queryObject) {
            function _buildSingleCriteria(value, indexNumber) {
                if (_.isObject(value)) {
                    return _arrayBooleanFromQueryObject(arrayNamesSpecification, value);
                } else {
                    return _buildBooleanCheckerForArrayValue(value, indexNumber);
                }
            }

            var isOr = _.chain(queryObject).values().some(function (value) {
                return _.isObject(value);
            }).value();
            var singleCriteria = _.chain(queryObject).keys().map(function (key) {
                var value = queryObject[key];
                var indexValue = arrayNamesSpecification[key];
                return _buildSingleCriteria(value, indexValue);
            }).value();
            if (isOr) {
                return _orComposition(singleCriteria);
            } else {
                return _andComposition(singleCriteria);
            }
        }

        return {
            buildCriteria: _arrayBooleanFromQueryObject
        };

    })(underscoreRef);

    // Context is a single value
    var contextLensesModule = (function (_, lenses, booleanFunctions) {
        function _defineContextLen(contextGetter, contextSetter, contextExtractor, specification) {
            _assert(_.has(specification, "contextSize"), "No contextSize in specification");
            _assert(_.has(specification, "valueSize"), "No valueSize in specification");
            _assert(_.has(specification, "signature"), "No signature in specification");
            _assert(_.has(specification, "pointers"), "No pointers in specification");
            _assert(_.has(specification, "contextMap"), "No contextMap in specification");
            _assert(_.has(specification, "valueMap"), "No valueMap in specification");
            var opt = specification || {};
            var clen = {};
            clen.spec = {
                contextSize: opt.contextSize,
                valueSize: opt.valueSize,
                signature: opt.signature,
                pointers: opt.pointers,
                contextMap: opt.contextMap,
                valueMap: opt.valueMap,
                selfPointer: opt.selfPointer
            };
            if (clen.spec.selfPointer) {
                clen.spec.pointers[clen.spec.selfPointer] = clen;
            }
            clen.spec.size = clen.spec.contextSize + clen.spec.valueSize;
            clen.cget = contextGetter;
            clen.cset = contextSetter;
            clen.extract = contextExtractor;
            clen.cmod = function (context, f, a) {
                return clen.cset(context, f(clen.cget(context, a)), a);
            };
            if (clen.spec.contextSize === 0) {
                clen.lget = function (container) {
                    var contextWithValue;
                    if (clen.spec.valueSize === 1) {
                        contextWithValue = [clen.cget([], container)];
                    } else {
                        contextWithValue = clen.cget([], container);
                    }
                    return [contextWithValue];
                };

            } else {
                clen.lget = function (container) {
                    return _listContextGetter(clen, container);
                };
            }
            clen.lset = function (listContextValue, container) {
                if (_.isUndefined(listContextValue) || listContextValue.length === 0) {
                    return clen.cset([], void(0), container);
                }
                return _listContextSetter(clen, listContextValue, container);
            };
            // The bind operation just fix the context parameter and return a len.
            clen.bindContext = function (context) {
                _assert(context.length === clen.spec.contextSize, "context size error");
                var bindedGet = function (a) {
                    return clen.cget(context, a);
                };
                var bindedSet = function (b, a) {
                    return clen.cset(context, b, a);
                };
                return lenses.defineLen(bindedGet, bindedSet, {
                    signature: clen.spec.signature,
                    valueSize: clen.spec.valueSize,
                    valueMap: clen.spec.valueMap
                });
            };
            clen.bindContextValue = function (contextAndValue) {
                _assert(contextAndValue.length === clen.spec.size, "context size error");
                var _context = contextAndValue.slice(0, clen.spec.contextSize);
                var _value = contextAndValue.slice(clen.spec.contextSize);
                var _len = clen.bindContext(_context);
                return {
                    len: _len,
                    value: _value,
                    context: _context
                };
            };
            clen.find = function (queryCriteria) {
                var arrayColumns = clen.spec.contextMap.concat(clen.spec.valueMap);
                var arraySpec = _.chain(arrayColumns).reduce(function (spec, colName, index) {
                    spec[colName] = index;
                    return spec;
                }, {}).value();
                var criteria = booleanFunctions.buildCriteria(arraySpec, queryCriteria);
                return {
                    on: function (state) {
                        //TODO use internal iterators and make a fast filter for nested lenses
                        return _.chain(clen.lget(state)).filter(function (arrayValues) {
                            return criteria(arrayValues);
                        }).value();
                    }
                };
            };
            return clen;
        }


        function _listContextGetter(cLen, container) {
            return _.chain(cLen.extract(container)).map(function (context) {
                return context.concat(cLen.cget(context, container));
            }).value();
        }

        function _listContextSetter(cLen, listContextValue, container) {
            return _.chain(listContextValue)
                .reduce(function (currContainer, contextAndValue) {
                    var context = contextAndValue.slice(0, cLen.spec.contextSize);
                    var value = contextAndValue.slice(cLen.spec.contextSize);
                    if (cLen.spec.valueSize === 1) {
                        return cLen.cset(context, value[0], currContainer);
                    }
                    return cLen.cset(context, value, currContainer);
                }, container).value();
        }

        function _emptyExtractor(a) {
            return [
                []
            ];
        }

        function _contextLenFromLen(len) {
            function cgetFromLen(context, a) {
                return len.get(a);
            }

            function csetFromLen(context, b, a) {
                return len.set(b, a);
            }

            return _defineContextLen(cgetFromLen, csetFromLen, _emptyExtractor, {
                    contextSize: 0,
                    valueSize: len.spec.valueSize,
                    signature: len.spec.signature,
                    pointers: {},
                    contextMap: [],
                    valueMap: len.spec.valueMap,
                    selfPointer: len.spec.signature
                }
            );
        }

        var _idContextLen = _contextLenFromLen(lenses.idLen);

        function _mapContextLenTemplate(fillEmpty) {

            function cgetMap(context, a) {
                _assert(_.isArray(context), "context for map must be a single value");
                if (fillEmpty && context.length === 0) {
                    return {};
                }
                _assert(context.length === 1, "context for map must be a single value");
                var key = context[0];
                var value = a[key];
                if (fillEmpty && _.isUndefined(value)) {
                    return {};
                }
                return value;
            }

            function csetMap(context, b, a) {
                _assert(_.isArray(context), "context for map must be a single value");
                if (context.length === 0) {
                    return a;
                }
                _assert(context.length === 1, "context for map must be a single value");
                var key = context[0];
                if (_.isUndefined(b)) {
                    return _.omit(a, key);
                }
                var extendO = {};
                extendO[key] = b;
                return _.chain(a).clone().extend(extendO).value();
            }

            function contextExtractorMap(a) {
                var keys = _.keys(a);
                if (keys.length === 0) {
                    return [];
                }
                return _.chain(keys).map(function (key) {
                    return [key];
                }).value();
            }

            return _defineContextLen(cgetMap, csetMap, contextExtractorMap, {
                    contextSize: 1,
                    valueSize: 1,
                    signature: "{:map}",
                    pointers: {},
                    contextMap: ["map"],
                    valueMap: ["_"],
                    selfPointer: undefined
                }
            );
        }

        var _mapContextLenLeaf = _mapContextLenTemplate(false);
        var _mapContextLen = _mapContextLenTemplate(true);

        function _contextAndThenComposition(cLenAB, cLenBC) {
            if (cLenAB === _idContextLen) {
                return cLenBC;
            }
            if (cLenBC === _idContextLen) {
                return cLenAB;
            }
            var cAndThenSignature = cLenAB.spec.signature + "." + cLenBC.spec.signature;
            var cAndThenContextSize = cLenAB.spec.contextSize + cLenBC.spec.contextSize;
            var cAndThenValueSize = cLenAB.spec.valueSize * cLenBC.spec.valueSize;
            var cAndThenPartialPoints = _.extend(cLenAB.spec.pointers, cLenBC.spec.pointers);
            var selfPointer;
            if (cLenAB.spec.selfPointer && cLenBC.spec.selfPointer) {
                selfPointer = cLenAB.spec.selfPointer + '.' + cLenBC.spec.selfPointer;
            }
            var cAndThenSpecification = {
                contextSize: cAndThenContextSize,
                valueSize: cAndThenValueSize,
                signature: cAndThenSignature,
                pointers: cAndThenPartialPoints,
                contextMap: cLenAB.spec.contextMap.concat(cLenBC.spec.contextMap),
                valueMap: cLenBC.spec.valueMap,
                selfPointer: selfPointer
            };

            if (cLenAB.spec.contextSize === 0) {
                return simpleAndThen();
            }
            if (cLenBC.spec.contextSize === 0) {
                return simpleInverseAndThen();
            }
            return realCAndThen();

            function simpleAndThen() {
                var simpleCget = function (context, a) {
                    return cLenBC.cget(context, cLenAB.cget([], a));
                };
                var simpleCset = function (context, c, a) {
                    return cLenAB.cmod([], function (b) {
                        return cLenBC.cset(context, c, b);
                    }, a);
                };
                var simpleExtract = function (a) {
                    return cLenBC.extract(cLenAB.cget([], a));
                };
                return _defineContextLen(simpleCget, simpleCset, simpleExtract, cAndThenSpecification);
            }

            function simpleInverseAndThen() {
                var simpleCget = function (context, a) {
                    return cLenBC.cget([], cLenAB.cget(context, a));
                };
                var simpleCset = function (context, c, a) {
                    return cLenAB.cmod(context, function (b) {
                        return cLenBC.cset([], c, b);
                    }, a);
                };
                return _defineContextLen(simpleCget, simpleCset, cLenAB.extract, cAndThenSpecification);
            }

            function realCAndThen() {
                var composedCget = function (context, a) {
                    var ABcontext = context.slice(0, cLenAB.spec.contextSize);
                    var BCcontext = context.slice(cLenAB.spec.contextSize);
                    return cLenBC.cget(BCcontext, cLenAB.cget(ABcontext, a));
                };
                var composedCset = function (context, c, a) {
                    var ABcontext = context.slice(0, cLenAB.spec.contextSize);
                    var BCcontext = context.slice(cLenAB.spec.contextSize);
                    return cLenAB.cmod(ABcontext, function (b) {
                        return cLenBC.cset(BCcontext, c, b);
                    }, a);
                };
                var composedExtactor = function (a) {
                    return _.chain(cLenAB.extract(a)).map(function (single_b_context) {
                        var b = cLenAB.cget(single_b_context, a);
                        return _.map(cLenBC.extract(b), function (single_c_context) {
                            return single_b_context.concat(single_c_context);
                        });
                    }).flatten(true).value();
                };
                return _defineContextLen(composedCget, composedCset, composedExtactor, cAndThenSpecification);
            }
        }


        return {
            defineContextLen: _defineContextLen,
            idContextLen: _idContextLen,
            mapContextLenLeaf: _mapContextLenLeaf,
            mapContextLen: _mapContextLen,
            contextLenFromLen: _contextLenFromLen,
            contextLenComposition: _contextAndThenComposition
        };
    })(underscoreRef, lensesModule, booleanFunctionsModule);

    var publicApiModule = (function (_, lenses, contextLenses) {

        function _buildNestedContextLen(contextLenExpressionRaw) {

            function telescopePartBuilder(part, last) {
                _assert(last === true, " telescope parts must be at the end of the context len expression");
                var setParams = (/\((.*)\)/gi).exec(part)[1];
                var telescopeLensDefinitions = setParams.length === 0 ? [] : setParams.split(",");

                var listOfLens = _.map(telescopeLensDefinitions, lenses.nestedFieldBuilder);
                return contextLenses.contextLenFromLen(lenses.telescopeCompose.apply({}, listOfLens));
            }

            function fieldPartBuilder(part, last) {
                if (last) {
                    return contextLenses.contextLenFromLen(lenses.fieldLenLeaf(part));
                } else {
                    return contextLenses.contextLenFromLen(lenses.fieldLen(part));
                }
            }

            function mapPartBuilder(part, last) {
                var mapcLen;
                if (last) {
                    mapcLen = contextLenses.mapContextLenLeaf;
                } else {
                    mapcLen = _.clone(contextLenses.mapContextLen);
                }
                mapcLen.pointers = {};
                mapcLen.pointers[part] = mapcLen;
                mapcLen.spec = _.clone(mapcLen.spec);
                mapcLen.spec.selfPointer = part;
                // "{:anyName}" -> "anyName"
                mapcLen.spec.contextMap = [part.substr(2, part.length - 3)];
                mapcLen.spec.signature = part;
                return mapcLen;
            }

            // clear white spaces
            var contextLenExpression = contextLenExpressionRaw.replace(/ /g, '');
            // Extract final telescope expression
            var telescopeSeparator = contextLenExpression.indexOf("(");
            var parts;
            switch (telescopeSeparator) {
                case -1:
                    parts = contextLenExpression.split(".");
                    break;
                case 0:
                    parts = [contextLenExpression];
                    break;
                default:
                    // expression is a.b.c.(telescope) -> split to a.b.c (telescope)
                    var contextParts = contextLenExpression.substring(0, telescopeSeparator - 1);
                    var telescopePart = contextLenExpression.substring(telescopeSeparator);
                    parts = contextParts.split(".");
                    parts.push(telescopePart);
            }
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
            }).reduce(contextLenses.contextLenComposition, contextLenses.idContextLen).value();
            cLenInstance.signature = contextLenExpression;
            return cLenInstance;
        }


        function _crossProduct() {
            _assert(arguments.length > 1, "Pass at least 2 clens to build a cross product");
            var args = Array.prototype.slice.call(arguments);
            var head = args[0];
            var tail = _.tail(args);
            return _.reduce(tail, crossProductComposition, head);
        }

        function crossProductComposition(Aclen, Bclen) {
            var crossContextSize = Aclen.spec.contextSize + Bclen.spec.contextSize;
            var crossValueSize = Aclen.spec.valueSize + Bclen.spec.valueSize;
            var crossProductSignature = Aclen.spec.signature + " X " + Bclen.spec.signature;
            var crossProductSpecification = {
                contextSize: crossContextSize,
                valueSize: crossValueSize,
                signature: crossProductSignature,
                pointers: {},
                contextMap: Aclen.spec.contextMap.concat(Bclen.spec.contextMap),
                valueMap: Aclen.spec.valueMap.concat(Bclen.spec.valueMap),
                selfPointer: void(0)
            };

            function crossCget(context, a) {
                var Acontext = context.slice(0, Aclen.spec.contextSize);
                var Bcontext = context.slice(Aclen.spec.contextSize);
                var AValues = Aclen.cget(Acontext, a);
                var BValues = Bclen.cget(Bcontext, a);
                if (Aclen.spec.valueSize === 1) {
                    AValues = [AValues];
                }
                if (Bclen.spec.valueSize === 1) {
                    BValues = [BValues];
                }
                return AValues.concat(BValues);
            }

            function crossCset(context, c, a) {
                if (_.isUndefined(c)) {
                    c = _.range(crossValueSize).map(function () {
                        return void(0);
                    });
                }
                var Acontext = context.slice(0, Aclen.spec.contextSize);
                var Bcontext = context.slice(Aclen.spec.contextSize);
                var Avalue = c.slice(0, Aclen.spec.valueSize);
                var Bvalue = c.slice(Aclen.spec.valueSize);
                if (Aclen.spec.valueSize === 1) {
                    Avalue = Avalue[0];
                }
                if (Bclen.spec.valueSize === 1) {
                    Bvalue = Bvalue[0];
                }
                var afterA = Aclen.cset(Acontext, Avalue, a);
                var afterB = Bclen.cset(Bcontext, Bvalue, afterA);
                return afterB;
            }

            function crossExtactor(a) {
                var Acontexts = Aclen.extract(a);
                var Bcontexts = Bclen.extract(a);
                return _.chain(Acontexts).map(function (aContextSingle) {
                    return _.chain(Bcontexts).map(function (bContextSingle) {
                        return _.flatten([aContextSingle, bContextSingle], true);
                    }).value();
                }).flatten(true).value();
            }

            var finalCross = contextLenses.defineContextLen(crossCget, crossCset, crossExtactor, crossProductSpecification);
            finalCross.signature = crossProductSignature;
            return finalCross;
        }

        function _buildLen(lenExpression) {
            var contextLen = _buildNestedContextLen(lenExpression);
            if (contextLen.spec.contextSize > 0) {
                throw "Len expression contains a context parameter: " + lenExpression;
            }
            return contextLen.bindContext([]);
        }


        return {
            buildLen: _buildLen,
            buildContextLen: _buildNestedContextLen,
            crossProduct: _crossProduct
        };

    })(underscoreRef, lensesModule, contextLensesModule);

    root.eelnss = {
        lenses: lensesModule,
        contextLenses: contextLensesModule,
        api: publicApiModule
    };
    if (typeof define === 'function' && define.amd) {
        define('eelnss', ['underscore'], function (_) {
            return eelnss;
        });
    }

})(this);
