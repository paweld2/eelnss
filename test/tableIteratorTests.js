(function () {

    module("table iterator tests");

    var randomIteratorFactory = function (contextValueSizes, keysPerContext) {
        if (contextValueSizes.length !== keysPerContext.length) {
            throw new Error("bad parameters, context values size and nr of keys per context must match");
        }

        var nrOfRows = _.reduce(keysPerContext, function (total, contextKeys) {
            return total * contextKeys.length;
        }, 1);
        // calculate the number of rows between a context key change
        var nrOfRowsPerContextKeyChange = _.chain(keysPerContext).clone().reduce(function (rowsPerChildrenChange, keysOfContext) {
            if (rowsPerChildrenChange.length === 0) {
                return [1];
            }
            var nrOfValuesInCurrContext = keysOfContext.length;
            var childrensNumber = _.last(rowsPerChildrenChange);
            rowsPerChildrenChange.push(childrensNumber * nrOfValuesInCurrContext);
            return rowsPerChildrenChange;

        }, []).reverse().value();
        var contextSize = contextValueSizes.length;
        var totalNrOfValues = _.reduce(contextValueSizes, function (a, b) {
            return a + b;
        }, 0);
        var generateContextVectorFromIndex = function (rowIndex) {
            var rowMutatedValue = rowIndex;
            return _.chain(nrOfRowsPerContextKeyChange).reduce(function (currContextVector, nrOfKeys) {
                currContextVector.push(Math.floor(rowMutatedValue / nrOfKeys));
                rowMutatedValue = rowMutatedValue % nrOfKeys;
                return currContextVector;
            }, []).map(function (keyNumber, contextIndex) {
                    return keysPerContext[contextIndex][keyNumber];
                }).value();
        };
        // the random iterator must return always the same values, so saving during first generation
        var generatedValues = [];
        var rowExtractorBuilder = function () {
            var indexCounter = 0;
            return {
                next: function () {
                    if (indexCounter === nrOfRows) {
                        return void(0);
                    }
                    if( generatedValues.length <= indexCounter) {
                        generatedValues[indexCounter] = testUtilFunctions.generateUniqueKeySet(totalNrOfValues);
                    }
                    var values = generatedValues[indexCounter];
                    return generateContextVectorFromIndex(indexCounter++).concat(values);
                }
            };
        };
        return eelnss.tableIterators.tableIteratorBuilder(contextValueSizes, rowExtractorBuilder);
    };

    var trimToContextOnly = function (table, contextValuesSizes) {
        var contextSize = contextValuesSizes.length;
        return _.map(table, function (row) {
            return row.slice(0, contextSize);
        });
    };

    test("Random Iterator", function () {
        var contextValuesSizes = [1, 1, 1];
        var iteratorFactory = randomIteratorFactory(contextValuesSizes, [
            ["a", "b"],
            ["x", "y"],
            ["p", "q"]
        ]);
        var recreatedTable = eelnss.tableIterators.buildTableFromIterator(iteratorFactory());
        var expectedContextKeys = [
            ["a", "x", "p"],
            ["a", "x", "q"],
            ["a", "y", "p"],
            ["a", "y", "q"],
            ["b", "x", "p"],
            ["b", "x", "q"],
            ["b", "y", "p"],
            ["b", "y", "q"]
        ];
        var trimed = trimToContextOnly(recreatedTable, contextValuesSizes);
        propEqual(trimed, expectedContextKeys, "random iterator works ok for [1,1,1] [2,2,2] params");
    });

    test("Table <-> TableIterator mapping by hand", function () {
        // table data repeat when the context value is the save.
        // this test data table has 2 context values and repeting values have size 2,1
        //  C0   |  C1  |   C0 values     | C1 values |
        var testData = [
            ["c0", "c1a", "c0_v1", "c0_v2", "c1_a"],
            ["c0", "c1b", "c0_v1", "c0_v2", "c1_b"],
            ["c0", "c1c", "c0_v1", "c0_v2", "c1_c"]
        ];
        // The rule is that when context key match, then context values must be the same.
        // Context key combinations are unique and ordered in each context level and in relation to nested contexts.

        // Parameters are
        // Number of context values  = 2
        // Context values size       = [2,1]
        // table                     = testdata
        var iteratorFactory = eelnss.tableIterators.tableIteratorFromTable([2, 1], testData);

        // The build table function must recreate a table from a iterator
        var recreatedTable = eelnss.tableIterators.buildTableFromIterator(iteratorFactory());
        propEqual(recreatedTable, testData, "Table iterator recreates tables correctly");
    });
    test("Table <-> TableIterator mapping for 1 [5]", function () {

        var testData = testUtilFunctions.contextLensValuesGenerator(2, 1, 5);
        var iteratorFactory = eelnss.tableIterators.tableIteratorFromTable([5], testData);
        var recreatedTable = eelnss.tableIterators.buildTableFromIterator(iteratorFactory());
        propEqual(recreatedTable, testData, "Table iterator recreates tables correctly");
    });
    test("Table <-> TableIterator mapping for 2 [3,2]", function () {
        var contextValuesSize = [3, 2];
        var keysPerContext = _.chain(contextValuesSize).map(function (nrOfValue) {
            return testUtilFunctions.generateUniqueKeySet(nrOfValue);
        }).value();
        var randomIF = randomIteratorFactory(contextValuesSize, keysPerContext);
        var randomTable = eelnss.tableIterators.buildTableFromIterator(randomIF());
        var tableIteratorFactory = eelnss.tableIterators.tableIteratorFromTable(contextValuesSize, randomTable);
        propEqual(randomTable, eelnss.tableIterators.buildTableFromIterator(tableIteratorFactory()), "Random Iterator, Table Iterator and builder match on implementation");
    });

    function buildRandomTableIterator(contextSize) {
        var valueRanges = _.range(contextSize).map(function (ignore) {
            return _.random(1, 4);
        });
        var keysPerContext = _.chain(valueRanges).map(function (index) {
            return testUtilFunctions.generateUniqueKeySet(_.random(1, 4));
        }).value();
        var contextKeysRanges = _.chain(keysPerContext).map(function (keys) {
            return keys.length;
        }).value();

        var randomIF = randomIteratorFactory(valueRanges, keysPerContext);
        return {
            valueRanges: valueRanges,
            contextKeysRanges: contextKeysRanges,
            randomIF: randomIF
        };
    }

    test("RandomTableIterator provide always the same values",function(){
        _.chain(_.range(1, 7)).map(function (contextSize) {
            var randomTableFactory = buildRandomTableIterator(contextSize);
            var randomIF = randomTableFactory.randomIF;
            var firstRun = eelnss.tableIterators.buildTableFromIterator(randomIF());
            var secondRun = eelnss.tableIterators.buildTableFromIterator(randomIF());
            propEqual(firstRun,secondRun,"A given random iterator provide always the same values");
        }).value();

    });

    test("Table <-> TableIterator mapping with generated lenses values", function () {
        _.chain(_.range(1, 7)).map(function (contextSize) {
            var randomTableFactory = buildRandomTableIterator(contextSize);
            var valueRanges = randomTableFactory.valueRanges;
            var contextKeysRanges = randomTableFactory.contextKeysRanges;
            var randomIF = randomTableFactory.randomIF;

            var testData = eelnss.tableIterators.buildTableFromIterator(randomIF());

            var iteratorFactory = eelnss.tableIterators.tableIteratorFromTable(valueRanges, testData);
            var recreatedTable = eelnss.tableIterators.buildTableFromIterator(iteratorFactory());
            propEqual(recreatedTable, testData, "Table iterator recreates tables correctly for contextSize " + contextSize + " and value ranges " + valueRanges + " with context keys ranges " + contextKeysRanges);

        }).value();

    });

    test("Cross join for tables iterators and tables with context - manual test", function () {

        var testTable1 = [
            ["c1", "v1a", "v1b", "v1c"],
            ["c2", "v2a", "v2b", "v2c"]
        ];
        var testTable2 = [
            ["x1", "y1a", "y1b"],
            ["x2", "y2a", "y2b"],
            ["x3", "y3a", "y3b"]
        ];

        var crossTable = eelnss.tableIterators.crossProductTables([testTable1, testTable2], [
            [3],
            [2]
        ]);

        var expected = [
            ["c1", "x1", "v1a", "v1b", "v1c", "y1a", "y1b"],
            ["c1", "x2", "v1a", "v1b", "v1c", "y2a", "y2b"],
            ["c1", "x3", "v1a", "v1b", "v1c", "y3a", "y3b"],
            ["c2", "x1", "v2a", "v2b", "v2c", "y1a", "y1b"],
            ["c2", "x2", "v2a", "v2b", "v2c", "y2a", "y2b"],
            ["c2", "x3", "v2a", "v2b", "v2c", "y3a", "y3b"]
        ];
        deepEqual(crossTable, expected, "Cross product with context OK");

        var crossIterator = eelnss.tableIterators.crossProductTableIterators(
            eelnss.tableIterators.tableIteratorFromTable([3], testTable1),
            eelnss.tableIterators.tableIteratorFromTable([2], testTable2)
        );

        var projectedCross = eelnss.tableIterators.buildTableFromIterator(crossIterator());
        deepEqual(projectedCross, expected, "Cross product of iterators");

    });

    test("Cross join for tables iterators and tables with context - manual test", function () {
        var maxContextSize = 1;
        _.chain(_.range(2, 3)).map(function (nrOfCrossTables) {

            var tableIterators = _.chain(_.range(0, nrOfCrossTables)).map(function () {
                return buildRandomTableIterator(_.random(1, maxContextSize)).randomIF;
            }).value();
            var crossIterator = eelnss.tableIterators.crossProductTableIterators.apply(null,tableIterators);

            var tablesContextValueSizes = _.chain(tableIterators).map(function(tableIterator){
                return tableIterator.spec.contextValueSizes;
            }).value();
            var tablesData = _.chain(tableIterators).map(function(tableIterator){
                return eelnss.tableIterators.buildTableFromIterator(tableIterator());
            }).value();
            var crossTable = eelnss.tableIterators.crossProductTables(tablesData,tablesContextValueSizes);

            var projectedCross = eelnss.tableIterators.buildTableFromIterator(crossIterator());
            deepEqual(projectedCross, crossTable, "Cross product of iterators");

        });
    });
})();
