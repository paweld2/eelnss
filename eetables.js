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
            return _.reduce(tail, _crossProductTableIteratorsReduction, head);

            function _crossProductTableIteratorsReduction(aIterator, bIterator) {
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

            return _.reduce(tail, _crossProductTablesReduction, head);
            function _crossProductTablesReduction(a, b) {
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

    root.eetables = {
        tableIterators: tableIteratorModule
    };
    if (typeof define === 'function' && define.amd) {
        define('eetables', ['underscore'], function (_) {
            return eetables;
        });
    }

})(this);
