// Util functions
// --------------

// Generate unique string values
var keyCounter = 0;
var keyNameGen = function () {
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    function letters(end, counter) {
        if (counter < possible.length) {
            return possible.charAt(counter) + end;
        }
        return letters(possible.charAt(counter % possible.length) + end, counter / possible.length);
    }

    return letters("_key", keyCounter++);
};
// Generate a set of [size] unique string values
var generateUniqueKeySet = function (size) {
    return _.chain(_.range(size)).map(keyNameGen).value();
};


// from a list of sets S_i, create a list of all [v1,v2,...,vn] values where v_i in set S_i
var cartesianProduct = function (listOfSets) {
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
};

// Generate a list unique values [v_1,...,v_n] where v_i have keysSize different values, and n = contextSize
var lensUniqueContextGenerator = function (nrOfPossibleKeyValues, contextSize) {
    var listOfKeysPerContainer = _.chain(_.range(contextSize)).map(function () {
        return generateUniqueKeySet(nrOfPossibleKeyValues);
    }).value();
    return cartesianProduct(listOfKeysPerContainer);
};

var lensValuesGenerator = function (nrOfPossibleKeyValues, contextSize, valueSize) {
    var uniqueContextValues = lensUniqueContextGenerator(nrOfPossibleKeyValues, contextSize);
    return _.chain(uniqueContextValues).map(function (context) {
        return _.union(context, generateUniqueKeySet(valueSize));
    }).value();
}


// For a list of values [v_1,v_2,...,v_n] change the values v_i where i > contextSize
var mutateValuesOnContext = function (listOfValues, contextSize, valueSize) {
    return _.chain(listOfValues).map(function (values) {
        return _.first(values, contextSize);
    }).map(function (contextOnly) {
            return _.union(contextOnly, generateUniqueKeySet(valueSize));
        }).value();
};

// Laws checkers
// --------------


var checkLensesLaws = function (len, containerBuilder, v1, v2) {
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
};


var checkContextLensesLaws = function (clen, containerBuilder, listOfValues) {
    var zeroContainer = function () {
        return clen.lset([], containerBuilder());
    };
    // lset lget law
    propEqual(clen.lget(clen.lset(listOfValues, zeroContainer())), listOfValues, " lget(lset(v,c)) == v ");
    // get set law
    propEqual(clen.lset(clen.lget(zeroContainer()), zeroContainer()), zeroContainer(), " set(get(c),c) == c for zero container ");
    var noEmptyContainer = clen.lset(listOfValues, containerBuilder());
    propEqual(clen.lset(clen.lget(noEmptyContainer), noEmptyContainer), clen.lset(listOfValues, containerBuilder()), " set(get(c),c) == c for noempty container ");

    // lset lset law
    // The context part must by identical
    var mutatedListOfValues = mutateValuesOnContext(listOfValues, clen.specification.contextSize, clen.specification.valueSize);
    propEqual(
        clen.lset(mutatedListOfValues, clen.lset(listOfValues, containerBuilder())),
        clen.lset(mutatedListOfValues, containerBuilder()),
        " lset(v2,lset(v1,c)) == lset(v2,c) on "
    );
};

var checkContextLenses = function (cLen, listOfValues) {

    var emptyContainerBuilder = function () {
        return {};
    };
    // check lens laws after on single binding
    _.chain(listOfValues).map(function (singleValueSet) {
        var binding = cLen.bindContextValue(singleValueSet);
        var secondValue = generateUniqueKeySet(cLen.specification.valueSize);
        checkLensesLaws(binding.len, emptyContainerBuilder, binding.value, secondValue);
    });
    checkContextLensesLaws(cLen, emptyContainerBuilder, listOfValues);
};

var checkContextLenApi = function (cLen) {
    var checkExtractorElements = function () {
        ok(cLen, "cLen defined");
        ok(cLen.signature, "missing signature");
        ok(cLen.specification, "missing specification on cLen " + cLen.signature);
        ok(_.isNumber(cLen.specification.contextSize), "missing specification.contextSize on cLen " + cLen.signature);
        ok(_.isNumber(cLen.specification.valueSize), "missing specification.valueSize on cLen " + cLen.signature);
        ok(_.isNumber(cLen.specification.size), "missing specification.size on cLen " + cLen.signature);
        ok(_.isFunction(cLen.bindContext), "missing bindContext on cLen " + cLen.signature);
        ok(_.isFunction(cLen.bindContextValue), "missing bindContextValue on cLen " + cLen.signature);
        strictEqual(cLen.specification.size, cLen.specification.valueSize + cLen.specification.contextSize, "sizes don't match " + cLen.signature);
    };

    checkExtractorElements();

    if (cLen.specification.contextSize === 0) {
        // single len without context
        var values = lensValuesGenerator(1, cLen.specification.contextSize, cLen.specification.valueSize);
        checkContextLenses(cLen, values);
    } else {
        // context len
        _.each([1, 2, 10], function (nrOkKeys) {
            var values = lensValuesGenerator(nrOkKeys, cLen.specification.contextSize, cLen.specification.valueSize);
            checkContextLenses(cLen, values);
        });
    }


};
