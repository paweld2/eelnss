var testUtilFunctions = (function () {
    // Generate unique string values
    var keyCounter = 0;

    function keyNameGen() {
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        function letters(end, counter) {
            if (counter < possible.length) {
                return possible.charAt(counter) + end;
            }
            return letters(possible.charAt(counter % possible.length) + end, counter / possible.length);
        }

        return letters("_key", keyCounter++);
    }

    // Generate a set of [size] unique string values
    function generateUniqueKeySet(size) {
        return _.chain(_.range(size)).map(keyNameGen).value();
    }

    // from a list of sets S_i, create a list of all [v1,v2,...,vn] values where v_i in set S_i
    function cartesianProduct(listOfSets) {
        if (listOfSets.length === 0) {
            return [
                []
            ];
        }
        var head = _.first(listOfSets);
        if (head.length === 0) {
            return [
                []
            ];
        }
        var deeper = cartesianProduct(_.tail(listOfSets));
        return _.chain(head).map(function (a) {
            return _.chain(deeper).map(function (product) {
                return _.flatten([a, product], true);
            }).value();
        }).flatten(true).value();
    }

    // Generate a list unique values [v_1,...,v_n] where v_i have keysSize different values, and n = contextSize
    function _lensUniqueContextGenerator(nrOfPossibleKeyValues, contextSize) {
        var listOfKeysPerContainer = _.chain(_.range(contextSize)).map(function () {
            return generateUniqueKeySet(nrOfPossibleKeyValues);
        }).value();
        return cartesianProduct(listOfKeysPerContainer);
    }


    function contextLensValuesGenerator(nrOfPossibleKeyValues, contextSize, valueSize) {
        var uniqueContextValues = _lensUniqueContextGenerator(nrOfPossibleKeyValues, contextSize);
        return _.chain(uniqueContextValues).map(function (context) {
            return _.union(context, generateUniqueKeySet(valueSize));
        }).value();
    }


    // For a list of values [v_1,v_2,...,v_n] change the values v_i where i > contextSize
    function mutateValuesOnContext(listOfValues, contextSize, valueSize) {
        return _.chain(listOfValues).map(function (values) {
            return _.first(values, contextSize);
        }).map(function (contextOnly) {
                return _.union(contextOnly, generateUniqueKeySet(valueSize));
            }).value();
    }

    return {
        mutateValuesOnContext: mutateValuesOnContext,
        contextLensValuesGenerator: contextLensValuesGenerator,
        cartesianProduct: cartesianProduct,
        generateUniqueKeySet: generateUniqueKeySet,
        keyNameGen: keyNameGen
    };

})();


// Laws checkers
// --------------
var contextLensesLaws = (function (utils) {

    var emptyContainerBuilder = function () {
        return {};
    };

    function verifyLensesLaws(len) {
        var values = utils.contextLensValuesGenerator(0, 0, 2);
        __checkLensesLaws(len,emptyContainerBuilder,values[0][0],values[0][1])
    }

    function __checkLensesLaws(len, containerBuilder, v1, v2) {
        var zeroContainer = function () {
            return len.set(undefined, containerBuilder());
        };

        // set get law
        equal(len.get(len.set(v1, containerBuilder())), v1, " get(set(v,c)) == v for value " + JSON.stringify(v1));
        equal(len.get(len.set(v2, containerBuilder())), v2, " get(set(v,c)) == v for value " + JSON.stringify(v2));
        // get set law
        propEqual(len.set(len.get(zeroContainer()), zeroContainer()), zeroContainer(), " set(get(c),c) == c for zero container for values" + JSON.stringify(v1) + " , " + JSON.stringify(v2));
        var noEmptyContainer = len.set(v1, containerBuilder());
        propEqual(len.set(len.get(noEmptyContainer), noEmptyContainer), len.set(v1, containerBuilder()), " set(get(c),c) == c for noempty container ");

        // set set law
        propEqual(
            len.set(v2, len.set(v1, containerBuilder())),
            len.set(v2, containerBuilder()),
            " set(v2,set(v1,c)) == set(v2,c) on container c=" + JSON.stringify(containerBuilder()) + " for values: v1=" + JSON.stringify(v1) + ", v2=" + JSON.stringify(v2)
        );
    }

    function _checkContextLensesLaws(clen, containerBuilder, listOfValues) {
        var zeroContainer = function () {
            return clen.lset(undefined, containerBuilder());
        };
        // lset lget law
        propEqual(clen.lget(clen.lset(listOfValues, zeroContainer())), listOfValues, " lget(lset(v,c)) == v ");
        // get set law
        propEqual(clen.lset(clen.lget(zeroContainer()), zeroContainer()), zeroContainer(), " set(get(c),c) == c for zero container ");
        var noEmptyContainer = clen.lset(listOfValues, containerBuilder());
        propEqual(clen.lset(clen.lget(noEmptyContainer), noEmptyContainer), clen.lset(listOfValues, containerBuilder()), " set(get(c),c) == c for noempty container ");

        // lset lset law
        // The context part must by identical
        var mutatedListOfValues = utils.mutateValuesOnContext(listOfValues, clen.spec.contextSize, clen.spec.valueSize);
        propEqual(
            clen.lset(mutatedListOfValues, clen.lset(listOfValues, containerBuilder())),
            clen.lset(mutatedListOfValues, containerBuilder()),
            " lset(v2,lset(v1,c)) == lset(v2,c) on "
        );
    }
    function checkLensesLawsForContextApi(len, containerBuilder, v1, v2) {
        var zeroContainer = function () {
            return len.set(undefined, containerBuilder());
        };
        // set get law
        propEqual(len.get(len.set(v1, containerBuilder())), v1, " get(set(v,c)) == v for value " + JSON.stringify(v1));
        propEqual(len.get(len.set(v2, containerBuilder())), v2, " get(set(v,c)) == v for value " + JSON.stringify(v2));
        // get set law
        propEqual(len.set(len.get(zeroContainer()), zeroContainer()), zeroContainer(), " set(get(c),c) == c for zero container for values" + JSON.stringify(v1) + " , " + JSON.stringify(v2));
        var noEmptyContainer = len.set(v1, containerBuilder());
        propEqual(len.set(len.get(noEmptyContainer), noEmptyContainer), len.set(v1, containerBuilder()), " set(get(c),c) == c for noempty container ");

        // set set law
        propEqual(
            len.set(v2, len.set(v1, containerBuilder())),
            len.set(v2, containerBuilder()),
            " set(v2,set(v1,c)) == set(v2,c) on container c=" + JSON.stringify(containerBuilder()) + " for values: v1=" + JSON.stringify(v1) + ", v2=" + JSON.stringify(v2)
        );
    }

    function _checkContextLenses(cLen, listOfValues) {

        var emptyContainerBuilder = function () {
            return {};
        };
        // check lens laws after on single binding
        _.chain(listOfValues).map(function (singleValueSet) {
            var binding = cLen.bindContextValue(singleValueSet);
            var secondValue = utils.generateUniqueKeySet(cLen.spec.valueSize);
            checkLensesLawsForContextApi(binding.len, emptyContainerBuilder, binding.value, secondValue);
        });
        _checkContextLensesLaws(cLen, emptyContainerBuilder, listOfValues);
    }


    function _testRange(cLen) {
        if (cLen.spec.contextSize === 0) {
            return [1];
        } else {
            return [1, 2, 10];
        }
    }

    function checkContextLenApi(cLen) {
        function checkExtractorElements() {
            ok(cLen, "cLen defined");
            ok(cLen.signature, "missing signature");
            ok(cLen.spec, "missing specification on cLen " + cLen.signature);
            ok(_.isString(cLen.spec.signature), "missing specification.signature on cLen " + cLen.signature);
            ok(_.isNumber(cLen.spec.contextSize), "missing specification.contextSize on cLen " + cLen.signature);
            ok(_.isNumber(cLen.spec.valueSize), "missing specification.valueSize on cLen " + cLen.signature);
            ok(_.isNumber(cLen.spec.size), "missing specification.size on cLen " + cLen.signature);
            ok(_.isFunction(cLen.bindContext), "missing bindContext on cLen " + cLen.signature);
            ok(_.isFunction(cLen.bindContextValue), "missing bindContextValue on cLen " + cLen.signature);
            strictEqual(cLen.spec.size, cLen.spec.valueSize + cLen.spec.contextSize, "sizes don't match " + cLen.signature);
        }

        checkExtractorElements();

        _.each(_testRange(cLen), function (nrOkKeys) {
            var values = utils.contextLensValuesGenerator(nrOkKeys, cLen.spec.contextSize, cLen.spec.valueSize);
            _checkContextLenses(cLen, values);
        });
    }


    function checkContextLenEquivalenceOnValues(cLenA, cLenB, values) {
        // setting a value give the same result

        //    For fast debugging use this expressions
        //    var a = cLenA.lset(values, emptyContainerBuilder());
        //    var b = cLenB.lget(cLenA.lset(values, emptyContainerBuilder()));
        //
        //    var c = cLenB.lset(values, emptyContainerBuilder());
        //    var d = cLenA.lget(cLenB.lset(values, emptyContainerBuilder()));

        propEqual(cLenA.lset(values, emptyContainerBuilder()), cLenB.lset(values, emptyContainerBuilder()), " A.lset(values,{}) == B.lset(values,{}) ");
        propEqual(cLenB.lget(cLenA.lset(values, emptyContainerBuilder())), cLenA.lget(cLenB.lset(values, emptyContainerBuilder())), " B.lget(A.lset(values,{})) == A.lget(B.lset(values,{})) ");

    }

    function checkContextLenEquivalence(cLenA, cLenB) {
        var checkSpecificationMatch = function () {
            strictEqual(cLenA.spec.contextSize, cLenB.spec.contextSize, "Context size match");
            strictEqual(cLenA.spec.valueSize, cLenB.spec.valueSize, "Value size match");
        };
        checkSpecificationMatch();
        _.each(_testRange(cLenA), function (nrOkKeys) {
            var values = utils.contextLensValuesGenerator(nrOkKeys, cLenA.spec.contextSize, cLenA.spec.valueSize);
            checkContextLenEquivalenceOnValues(cLenA, cLenB, values);
        });
    }


    function checkContextLensesCrossProducts(clenA, clenB, crossProduct) {
        // test ranges
        var testRanges = _.zip(_testRange(clenA), _testRange(clenB));
        var valuesForLen = function (howManyValues, len) {
            return utils.contextLensValuesGenerator(howManyValues, len.spec.contextSize, len.spec.valueSize);
        };
        var AxB = crossProduct;
        // create values for each len
        _.each(testRanges, function (ranges) {
            var Arange = ranges[0];
            var Brange = ranges[1];
            var Arows = valuesForLen(Arange, clenA);
            var Brows = valuesForLen(Brange, clenB);
            var emptyDb = {};
            var filledDatabase = clenB.lset(Brows, clenA.lset(Arows, emptyDb));
            // cLenses must be orthogonal in the graph representation
            propEqual(filledDatabase, clenA.lset(Arows, clenB.lset(Brows, emptyDb)));


            propEqual(Arows, clenA.lget(filledDatabase), "A.lget( AxB.lset ) === A.lget( A.lset ) for orthogonal context lenses");
            propEqual(Brows, clenB.lget(filledDatabase), "B.lget( AxB.lset ) === B.lget( B.lset ) for orthogonal context lenses");
            var extractedCrossProductValue = AxB.lget(filledDatabase);

            var expectedCrossProduct = _.chain(Arows).map(function( aRow) {
                return _.map(Brows, function(bRow){
                    var aContext = aRow.slice(0,clenA.spec.contextSize);
                    var aValue = aRow.slice(clenA.spec.contextSize);
                    var bContext = bRow.slice(0,clenB.spec.contextSize);
                    var bValue = bRow.slice(clenB.spec.contextSize);
                    return [].concat(aContext,bContext,aValue,bValue);
                });
            }).flatten(true).value();
            propEqual(extractedCrossProductValue, expectedCrossProduct, "AxB.lget( A.lset(Avalues, B.lset(Bvalues, empty))) is OK");
        });

    }

    return {
        verifyLensesLaws: verifyLensesLaws,
        checkContextLenEquivalence: checkContextLenEquivalence,
        checkContextLenApi: checkContextLenApi,
        checkContextLensesCrossProducts: checkContextLensesCrossProducts
    };
})(testUtilFunctions);

//
//// Table iterator api tests
//var tableIteratorTestTableGenerator = function (nrOfPossibleKeyValues, contextValuesSize) {
//
//    var contextKeysValues = _.chain(contextValuesSize).map(function (singleContextSize) {
//        return generateUniqueKeySet(nrOfPossibleKeyValues);
//    });
//
//    var uniqueContextValues = lensUniqueContextGenerator(nrOfPossibleKeyValues, contextSize);
//    return _.chain(uniqueContextValues).map(function (context) {
//        return _.union(context, generateUniqueKeySet(valueSize));
//    }).value();
//};
