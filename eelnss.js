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

    var tableIteratorModule = (function (_) {

        // Table Iterator
        // ================
        // Provide a iteration api for tables with repeated values.
        function _tableIterator(pullFunctionBuilder, contextValueSizes) {
            _assert(_.isFunction(pullFunctionBuilder), "pullFunctionBuilder is not a function, bad use od table iterator api");
            var iteratorFactory = function () {
                var iterator = {};
                iterator.spec = {
                    contextSize: contextValueSizes.length,
                    contextValueSizes: contextValueSizes,
                    extractionPoints: _findContextValuesExtractionPoints(contextValueSizes)
                };
                iterator.nestedNext = pullFunctionBuilder();
                _assert(_.isFunction(iterator.nestedNext), "nestedNext is not a function, bad use od table iterator api");
                iterator.loopOver = function (iterationHandler) {
                    var next = iterator.nestedNext();
                    while (next !== void(0)) {
                        var changedContextLevel = next[0];
                        var contextKeys = next[1];
                        var contextValues = next[2];
                        iterationHandler(changedContextLevel, contextKeys, contextValues);
                        next = iterator.nestedNext();
                    }
                };
                return iterator;
            };

            iteratorFactory.spec = {
                contextSize: contextValueSizes.length,
                contextValueSizes: contextValueSizes,
                extractionPoints: _findContextValuesExtractionPoints(contextValueSizes)
            };
            return iteratorFactory;
        }

        // util function
        // show the position on the table where context values start
        // For:
        // [c1,c2,c3,x1,x2,x3,y1,y2,z1,z2]
        //          |        |     |     |
        //  result is [3,6,8,10]
        function _findContextValuesExtractionPoints(contextValueSizes) {
            var contextSize = contextValueSizes.length;
            return _.reduce(contextValueSizes, function (curr, nextContextValueSize) {
                var lastMark = _.last(curr);
                curr.push(lastMark + nextContextValueSize);
                return curr;
            }, [contextSize]);
        }

        // find where the context key has changed in relation to the previousContextKeys
        function _findChangeLevel(previousContextKeys, fullContextKeys) {
            var fullContextKeysLength = fullContextKeys.length;
            var changeLevel = fullContextKeysLength;
            for (var i = 0; i < fullContextKeysLength; i++) {
                if (previousContextKeys[i] !== fullContextKeys[i]) {
                    changeLevel = i;
                    break;
                }
            }
            return changeLevel;
        }

        function _abstractSourceIterator(contextValueSizes, rowExtractorLinearIterator) {
            var contextSize = contextValueSizes.length;
            var whereContextLevelValuesStart = _findContextValuesExtractionPoints(contextValueSizes);

            function pullFromSourceBuilder() {
                var rowExtractor = rowExtractorLinearIterator();
                var previousContextKeys = void(0);
                return function () {
                    var row = rowExtractor.next();
                    if (row === void(0)) {
                        return void(0);
                    }
                    var fullContextKeys = row.slice(0, contextSize);
                    var pullResult;
                    if (previousContextKeys === void(0)) {
                        var fullValues = row.slice(contextSize);
                        pullResult = [0, fullContextKeys, fullValues];
                    } else {
                        var changeLevel = _findChangeLevel(previousContextKeys, fullContextKeys);
                        var changedContextKeys = fullContextKeys.slice(changeLevel);
                        var changedContextValues = row.slice(whereContextLevelValuesStart[changeLevel]);
                        pullResult = [changeLevel, changedContextKeys, changedContextValues];
                    }
                    previousContextKeys = fullContextKeys;
                    return pullResult;
                };
            }

            return _tableIterator(pullFromSourceBuilder, contextValueSizes);
        }

        function _tableIteratorFromTable(contextValueSizes, table) {
            var nrOfRows = table.length;
            var tableRowExtractorBuilder = function () {
                var indexCounter = 0;
                return {
                    next: function () {
                        if (nrOfRows === indexCounter) {
                            return void(0);
                        }
                        return table[indexCounter++];
                    }
                };
            };
            return _abstractSourceIterator(contextValueSizes, tableRowExtractorBuilder);
        }

        function _buildTable(iterator) {
            var table = [];
            var currentContextKeys;
            var currentContextValues;
            // Parameters are:
            // contextLevel: start level where context keys have changed
            // contextKeys: new values of context keys [C_m, C_m+1,...,C_n], where m = contextLevel
            // contextValues: new values on contexts [v_m_1,v_m_2,..,v_(m+1)_1,....], where m = contextLevel
            var valueExtractionPointsWithoutContext = _.map(iterator.spec.extractionPoints, function (point) {
                return point - iterator.spec.contextSize;
            });
            var tableBuilder = function (contextLevel, contextKeys, contextValues) {
                if (contextLevel === 0) {
                    currentContextKeys = contextKeys;
                    currentContextValues = contextValues;
                } else {
                    var valueExtractionPoint = valueExtractionPointsWithoutContext[contextLevel];
                    currentContextKeys = _.first(currentContextKeys, contextLevel).concat(contextKeys);
                    currentContextValues = _.first(currentContextValues, valueExtractionPoint).concat(contextValues);
                }
                table.push(currentContextKeys.concat(currentContextValues));
            };
            iterator.loopOver(tableBuilder);
            return table;
        }

        function _crossProductTableIterators() {
            _assert(arguments.length > 1, "Pass at least 2 table iterators to build a cross product");
            var args = Array.prototype.slice.call(arguments);
            var head = args[0];
            var tail = _.tail(args);
            return _.reduce(tail, crossProductTableIterators, head);

            function crossProductTableIterators(aIterator, bIterator) {
                var aContextValuesSizes = aIterator.spec.contextValueSizes;
                var bContextValuesSizes = bIterator.spec.contextValueSizes;
                var crossIteratorExtractorBuilder = function () {
                    var AIterationInstance = aIterator();
                    var BIterationInstance = bIterator();
                    var AcontextValue = void(0);
                    var BcontextValue = void(0);
                    var iterationFinished = false;
                    var iterationCurrentStep = startIterations;

                    function noOpIteration() {
                    }

                    function startIterations() {
                        AcontextValue = AIterationInstance.nestedNext();
                        BcontextValue = BIterationInstance.nestedNext();
                        if (AcontextValue === void(0) || BcontextValue === void(0)) {
                            // there is a empty iterator in the cross product, so it is empty
                            iterationFinished = true;
                            iterationCurrentStep = noOpIteration;
                            return;
                        }
                        iterationCurrentStep = iterateOverB;
                    }

                    function iterateOverA() {
                        AcontextValue = AIterationInstance.nestedNext();
                        if (AcontextValue === void(0)) {
                            // A iterator finished
                            iterationFinished = true;
                            iterationCurrentStep = noOpIteration;
                            return;
                        }
                        BIterationInstance = bIterator();
                        BcontextValue = BIterationInstance.nestedNext();
                    }

                    function iterateOverB() {
                        BcontextValue = BIterationInstance.nestedNext();
                        if (BcontextValue === void(0)) {
                            // iteration over B finished, jump to A iteration
                            iterateOverA();
                        }
                    }

                    return {
                        next: function () {
                            iterationCurrentStep();
                            if (iterationFinished) {
                                return void(0);
                            }
                            return AcontextValue[1].concat(BcontextValue[1], AcontextValue[2], BcontextValue[2]);
                        }
                    };
                };
                return _abstractSourceIterator(aContextValuesSizes.concat(bContextValuesSizes), crossIteratorExtractorBuilder);
            }
        }

        // because context is explicit and ordered, it is necessary to change the order of the columns
        function _crossProductTables(tables, contextValuesSizes) {
            _assert(tables.length > 1, "Pass at least 2 table iterators to build a cross product");
            _assert(contextValuesSizes.length === tables.length, "Provide context sizes for each table");
            var tableAndSize = _.zip(tables, contextValuesSizes);
            var head = tableAndSize[0];
            var tail = _.tail(tableAndSize);

            return _.reduce(tail, _crossProductTableIterators, head);
            function _crossProductTableIterators(a, b) {
                var aTable = a[0];
                var aContextValueSizes = a[1];
                var aContextSize = aContextValueSizes.length;
                var bTable = b[0];
                var bContextValueSizes = b[1];
                var bContextSize = bContextValueSizes.length;
                return _.chain(aTable).map(function (aRow) {
                    return _.chain(bTable).map(function (bRow) {
                        var contextKeys = _.first(aRow, aContextSize).concat(_.first(bRow, bContextSize));
                        var values = aRow.slice(aContextSize).concat(bRow.slice(bContextSize));
                        return contextKeys.concat(values);
                    }).value();
                }).flatten(true).value();
            }
        }

        return {
            tableIterator: _tableIterator,
            tableIteratorFromTable: _tableIteratorFromTable,
            tableIteratorBuilder: _abstractSourceIterator,
            buildTableFromIterator: _buildTable,
            crossProductTableIterators: _crossProductTableIterators,
            crossProductTables: _crossProductTables
        };
    })(underscoreRef);

    var lensesModule = (function (_) {

        function _defineLen(getter, setter, specification) {
            _assert(_.has(specification, "signature"), "No signature in specification");
            _assert(_.has(specification, "valueSize"), "No valueSize in specification");
            var len = {};
            len.spec = {
                signature: specification.signature,
                valueSize: specification.valueSize
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
                valueSize: 0
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
                valueSize: 1
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
                valueSize: valueSize
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
                valueSize: 1
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
                if( index === listOfLens.length -1 ) {
                    return accum + len.spec.signature;
                }
                return accum + len.spec.signature + ",";
            }, "(") + ")";

            return _defineLen(telescopeGetter, telescopeSetter, {
                signature: telescopeSignature,
                valueSize: listOfLens.length
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

    // Context is a single value
    var contextLensesModule = (function (_, lenses) {
        function _defineContextLen(contextGetter, contextSetter, contextExtractor, specification, pointersMap, selfPointer) {
            _assert(_.has(specification, "contextSize"), "No contextSize in specification");
            _assert(_.has(specification, "valueSize"), "No valueSize in specification");
            _assert(_.has(specification, "signature"), "No signature in specification");
            var opt = specification || {};
            var clen = {};
            clen.spec = {
                contextSize: opt.contextSize,
                valueSize: opt.valueSize,
                signature: opt.signature,
                selfPointer: selfPointer
            };
            clen.pointers = pointersMap;
            if (selfPointer) {
                clen.pointers[selfPointer] = clen;
            }
            clen.spec.size = clen.spec.contextSize + clen.spec.valueSize;
            clen.cget = contextGetter;
            clen.cset = contextSetter;
            clen.extract = contextExtractor;
            clen.cmod = function (context, f, a) {
                return clen.cset(context, f(clen.cget(context, a)), a);
            };
            if (clen.spec.contextSize == 0) {
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
                    valueSize: clen.spec.valueSize
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
                    signature: len.spec.signature
                }, {}, len.spec.signature
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
                    signature: "{:map}"
                }, {}
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
            var cAndThenOptions = {
                contextSize: cAndThenContextSize,
                valueSize: cAndThenValueSize,
                signature: cAndThenSignature
            };
            var cAndThenPartialPoints = _.extend(cLenAB.pointers, cLenBC.pointers);
            var selfPointer;
            if (cLenAB.spec.selfPointer && cLenBC.spec.selfPointer) {
                selfPointer = cLenAB.spec.selfPointer + '.' + cLenBC.spec.selfPointer;
            }

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
                return _defineContextLen(simpleCget, simpleCset, simpleExtract, cAndThenOptions, cAndThenPartialPoints, selfPointer);
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
                return _defineContextLen(simpleCget, simpleCset, cLenAB.extract, cAndThenOptions, cAndThenPartialPoints, selfPointer);
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
                            return  single_b_context.concat(single_c_context);
                        });
                    }).flatten(true).value();
                };
                return _defineContextLen(composedCget, composedCset, composedExtactor, cAndThenOptions, cAndThenPartialPoints, selfPointer);
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
    })(underscoreRef, lensesModule);

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
            var crossProductOptions = {
                contextSize: crossContextSize,
                valueSize: crossValueSize,
                signature: crossProductSignature
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

            var finalCross = contextLenses.defineContextLen(crossCget, crossCset, crossExtactor, crossProductOptions);
            finalCross.signature = crossProductSignature;
            return finalCross;
        }


        return {
            buildContextLen: _buildNestedContextLen,
            crossProduct: _crossProduct
        };

    })(underscoreRef, lensesModule, contextLensesModule);

    root.eelnss = {
        lenses: lensesModule,
        contextLenses: contextLensesModule,
        tableIterators: tableIteratorModule,
        api: publicApiModule
    };

})(this);
