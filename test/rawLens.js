(function () {

    module('Simple lenses');

    var anyTypeTestValues = [undefined, "any", "", 0, 1, 2, {}, {id: 1}, ["array"]];

    var get = function (obj) {
        return obj.raw;
    };
    var set = function (val, obj) {
        obj.raw = val;
        return obj;
    };
    var rawLen = _.lenDef(get, set);
    test('raw len lenses laws', function () {
        var containerBuilder = function () {
            return {};
        };
        lensesLawTest(rawLen, containerBuilder, anyTypeTestValues);
        lensesPutPutLawTest(rawLen, containerBuilder, anyTypeTestValues);

    });
    test('raw len direct tests', function () {
        var testObj = {};

        var expectedValue = 1;
        testObj = rawLen.set(expectedValue, testObj);
        equal(testObj.raw, expectedValue, 'setter in raw len working');
        equal(rawLen.get(testObj), expectedValue, 'getter in raw len working');

        var expectedChangeValue = 2;
        var modRaw = function (prev) {
            return expectedChangeValue;
        };
        testObj = rawLen.mod(modRaw, testObj);
        equal(testObj.raw, expectedChangeValue, 'setter after mod in raw len working');
        equal(rawLen.get(testObj), expectedChangeValue, 'getter after mod in raw len working');

        testObj = rawLen.set(undefined, testObj);
        equal(testObj.raw, undefined, 'setter after undefined in raw len working');
        equal(rawLen.get(testObj), undefined, 'getter after undefined in raw len working');

    });
    test('Nil len', function () {
        var containerBuilder = function () {
            return {};
        };
        lensesLawTest(_.lenNil, containerBuilder, [undefined]);
        lensesPutPutLawTest(_.lenNil, containerBuilder, anyTypeTestValues);
    });
    test('Identity len', function () {
        var i = 0;
        var containerBuilder = function () {
            return { original: i++};
        };
        var testValues = _.map(_.range(1, 10), function (i) {
            return { expected: 100 + i};
        });
        lensesLawTest(_.lenIdentity, containerBuilder, testValues);
        lensesPutPutLawTest(_.lenIdentity, containerBuilder, [{ expected: 1}, { expected: 2}]);
    });

    test('Field len', function () {
        var i = 0;
        var containerBuilder = function () {
            return { original: i++};
        };
        lensesLawTest(_.fieldLen("anyName"), containerBuilder, anyTypeTestValues);
        lensesPutPutLawTest(_.fieldLen("anyName"), containerBuilder, anyTypeTestValues);
    });

})();
