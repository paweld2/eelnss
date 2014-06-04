var checkLensesLaws = function (len, containerBuilder, v1, v2) {
    // set get law
    propEqual(len.get(len.set(v1, containerBuilder())), v1, " get(set(v,c)) == v for value " + JSON.stringify(v1));
    propEqual(len.get(len.set(v2, containerBuilder())), v2, " get(set(v,c)) == v for value " + JSON.stringify(v2));
    // set set law
    propEqual(
        len.set(v2, len.set(v1, containerBuilder())),
        len.set(v2, containerBuilder()),
        " set(v2,set(v1,c)) == set(v2,c) on container c=" + JSON.stringify(containerBuilder()) + " for values: v1=" + JSON.stringify(v1) + ", v2=" + JSON.stringify(v2)
    );
};

// Generate unique keys
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
var generateUniqueKeySet = function (size) {
    return _.chain(_.range(size)).map(keyNameGen).value();
};


var cartesianProduct = function (listOfSets) {
    if (listOfSets.length === 0) {
        return [];
    }
    if (listOfSets.length === 1) {
        return listOfSets[0];
    }
    var deeper = cartesianProduct(_.tail(listOfSets));
    var head = _.first(listOfSets);
    return _.chain(head).map(function (a) {
        return _.chain(deeper).map(function (product) {
            return _.flatten([a, product], true);
        }).value();
    }).flatten(true).value();
};

var lensValuesGenerator = function (keysSize, contextSize) {
    var listOfKeysPerContainer = _.chain(_.range(contextSize)).map(function () {
        return generateUniqueKeySet(keysSize);
    }).value();
    return cartesianProduct(listOfKeysPerContainer);
};


var checkExtractorApi = function (extractor) {
    var checkExtractorElements = function () {
        ok(extractor, "extractor not defined");
        ok(extractor.signature, "missing signature");
        ok(extractor.specification, "missing specification on extractor " + extractor.signature);
        ok(_.isNumber(extractor.specification.contextSize), "missing specification.contextSize on extractor " + extractor.signature);
        ok(_.isNumber(extractor.specification.valueSize), "missing specification.valueSize on extractor " + extractor.signature);
    };


    var emptyContainerBuilder = function () {
        return {};
    };

    checkExtractorElements();
    var contextSize = extractor.specification.contextSize + extractor.specification.valueSize;

}


var testExtractor = function (extractor) {

    var valueCreator = buildValueCreator(specification);


};