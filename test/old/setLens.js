(function () {

    module('Set lenses on equivalence classes');
    var emptySetBuilder = function () {
        return [];
    };

    test('Id len', function () {
        var fieldLen = _.fieldLen("id");
        var id1EqClass = fieldLen.eqClass(1);
        var setLenId1 = _.setLen(id1EqClass);

        var idSetBuilder = function (idValue, howMany) {
            return function () {
                return _.chain(_.range(howMany)).map(function (i) {
                    return {id: idValue, o: i};
                }).value();
            }
        };
        var testValues = setExponent(idSetBuilder(1, 5)());

        lensesLawTest(setLenId1, emptySetBuilder, testValues);
        lensesLawTest(setLenId1, idSetBuilder(1, 10), testValues);
        lensesPutPutLawTest(setLenId1, emptySetBuilder, testValues);
    });
    test('Id SetLen and then orderId SetLen', function () {

        var objectCounter = 0;
        var idXorderValues = cartesianProduct(_.range(5), _.range(5));
        var values = _.chain(idXorderValues).map(function (idXorder) {
            return {id: idXorder[0], order: idXorder[1], o: objectCounter++};
        }).value();

        var idXorderValuesExtended = cartesianProduct(_.range(7), _.range(7));

        _.chain(idXorderValuesExtended).each(function (idXorder) {

            var idValue = idXorder[0];
            var orderValue = idXorder[1];
            var idLen = _.fieldLen("id");
            var idSetLen = _.setLen(idLen.eqClass(idValue));

            var orderLen = _.fieldLen("order");
            var orderSetLen = _.setLen(orderLen.eqClass(orderValue));

            var idAndOrder = idSetLen.andThen(orderSetLen);
            var orderAndId = idSetLen.compose(orderSetLen);

            deepEqual(idAndOrder.get(values), orderAndId.get(values));
            if (idValue >= 5 || orderValue >= 5) {
                equal(idAndOrder.get(values).length, 0, "value not found for (" + idValue + "," + orderValue + ")");
            } else {
                deepEqual(idAndOrder.get(values).length, 1, "value found for (" + idValue + "," + orderValue + ")");
                deepEqual(idAndOrder.get(values)[0].id, idValue);
                deepEqual(idAndOrder.get(values)[0].order, orderValue);
            }
        });
    });

    test('SetLen andThen FieldLen', function () {
        var fieldLen = _.fieldLen("id");
        var id1EqClass = fieldLen.eqClass(1);
        var setLenId1 = _.setLen(id1EqClass);

        var nameLen = _.fieldLen("name");

        var idThenName = setLenId1.andThen(nameLen);

        deepEqual(idThenName.set([], []), [], "zero === []");
        deepEqual(idThenName.get([{"id":1,"name":"name0"}]), ["name0"], "simple get");
        deepEqual(idThenName.get([{"id":1,"name":"name0"},{"id":1,"name":"name1"}]), ["name0","name1"], "simple get 2");

        deepEqual(idThenName.set(["replace"],[{"id":1,"name":"name0"}]), [{"id":1,"name":"replace"}], "simple set");
        deepEqual(idThenName.set(["a","b"],[{"id":1,"name":"name0"},{"id":1,"name":"name1"}]), [{"id":1,"name":"a"},{"id":1,"name":"b"}], "simple set 2");

        var idSetBuilder = function (idValue, howMany) {
            return function () {
                return _.chain(_.range(howMany)).map(function (i) {
                    return {id: idValue, name: "name" + i};
                }).value();
            }
        };
        var testValues = setExponent(idSetBuilder(1, 5)());

        lensesLawTest(setLenId1, emptySetBuilder, testValues);
        lensesLawTest(setLenId1, idSetBuilder(1, 3), testValues);
        lensesPutPutLawTest(setLenId1, emptySetBuilder, testValues);
    });
})();
