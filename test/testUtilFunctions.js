(function () {

    module("test utils functions");

    test("keys generator generate unique keys", function () {
        strictEqual(_.chain(_.range(1000)).map(keyNameGen).uniq().value().length, 1000);
        strictEqual(generateUniqueKeySet(30).length, 30);

    });
    test("cartesian product", function () {
        var keys1 = generateUniqueKeySet(3);
        var keys2 = generateUniqueKeySet(2);
        var keys3 = generateUniqueKeySet(1);

        propEqual(cartesianProduct([]), [
            []
        ]);
        propEqual(cartesianProduct([keys1]), _.map(keys1, function (k) {
            return [k]
        }));
        strictEqual(cartesianProduct([keys1, keys2]).length, keys1.length * keys2.length);
        strictEqual(cartesianProduct([keys1, keys2, keys3]).length, keys1.length * keys2.length * keys3.length);

        propEqual(cartesianProduct([
            ["a", "b"],
            ["x", "y"]
        ]), [
            ["a", "x"],
            ["a", "y"],
            ["b", "x"],
            ["b", "y"]
        ]);
        propEqual(cartesianProduct([
            ["a", "b"],
            ["x", "y"],
            ["p"]
        ]), [
            ["a", "x", "p"],
            ["a", "y", "p"],
            ["b", "x", "p"],
            ["b", "y", "p"]
        ]);
    });
    test("lensValuesGenerator", function () {

        var keySizeXcontextSize = cartesianProduct([_.range(5), _.range(1, 5)]);
        _.chain(keySizeXcontextSize).map(function (a_b) {
            var keySetSize = a_b[0];
            var listSize = a_b[1];
            var lenValues = lensValuesGenerator(keySetSize, listSize);
            ok(_.isArray(lenValues), "list of values is array for (" + keySetSize + "," + listSize);
            strictEqual(lenValues.length, Math.pow(keySetSize, listSize), "len of the values is keySetSize^contextSize");
            _.each(lenValues, function (valueList) {
                ok(_.isArray(valueList), "each value is an array : " + valueList);
                strictEqual(valueList.length, listSize);
                _.each(valueList, function (singleValue) {
                    ok(_.isString(singleValue), " an array of strings");
                });
            });
        }).value();

    });

    test("mutateValuesOnContext", function () {
        var values = [
            ["a", "b", 1]
        ];
        var mutated = mutateValuesOnContext(values, 2, 1);
        strictEqual(mutated[0][0], values[0][0]);
        strictEqual(mutated[0][1], values[0][1]);
        notEqual(mutated[0][2], values[0][2]);

//        var v2 = lensValuesGenerator(5,5);
//        var m2 = mutateValuesOnContext(v2,2,3);
        // TODO zip and test combinations
    })


})();
