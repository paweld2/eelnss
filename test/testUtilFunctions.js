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
        strictEqual(cartesianProduct([keys1]), keys1);
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
        var keySizeXcontextSize = cartesianProduct([_.range(5), _.range(1,5)]);
        _.chain(keySizeXcontextSize).map(function (a_b) {
            strictEqual(lensValuesGenerator(a_b[0], a_b[1]).length, Math.pow(a_b[0], a_b[1]));
        }).value();

    });


})();
