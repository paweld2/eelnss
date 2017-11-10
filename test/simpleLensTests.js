(function () {

    module('Context lens tests');

    test('lenses by manual api', function () {
        var input = {
            "x": "xValue",
            "y": "yValue"
        };
        var inputAfterChange = {
            "x": "change",
            "y": "yValue"
        };
        //TODO implement a getterX that extract the field "x" from an object
        var getterX = function (a) {
            return {};
        };
        equal(getterX(input), input.x, "getterX(input) == input.x");
        //TODO implement a setterX that extract the field "x" from an object
        var setterX = function (b, a) {
            return {};
        };
        propEqual(setterX("change", input), inputAfterChange, "setterX(change,input) == inputAfterChange");

        var specification = {
            signature: "name",
            valueSize: 1,
            valueMap: 1
        };
        var simple = eelnss.lenses.defineLen(getterX, setterX, specification);
        contextLensesLaws.verifyLensesLaws(simple);
    });
    test('len on X', function () {
        var input = {
            "x": "xValue",
            "y": "yValue"
        };
        var inputAfterChange = {
            "x": "change",
            "y": "yValue"
        };
        var l_x = eelnss.lenses.fieldLenLeaf("x");
        equal(l_x.get(input), input.x, "getterX(input) == input.x");
        propEqual(l_x.set("change", input), inputAfterChange, "setterX(change,input) == inputAfterChange");
        contextLensesLaws.verifyLensesLaws(l_x);
    });
    test('l_x . l_y', function () {
        var l_x = eelnss.lenses.fieldLen("x");
        var l_y = eelnss.lenses.fieldLenLeaf("y");

        var XY = l_x.andThen(l_y);
        equal(XY.get({x: {y: "test"}}), "test", "getter _.x.y");
        propEqual(XY.set("change", {}), {x: {y: "change"}}, "setter _.x.y");
        contextLensesLaws.verifyLensesLaws(XY);
    });
    test('simple', function () {
        var simple = eelnss.api.buildLen("x");
        contextLensesLaws.verifyLensesLaws(simple);
    });
    test('simple.nested', function () {
        var simple = eelnss.api.buildLen("simple.nested");
        contextLensesLaws.verifyLensesLaws(simple);
    });
    test('a.b.c.d.e', function () {
        var simple = eelnss.api.buildLen("a.b.c.d.e");
        contextLensesLaws.verifyLensesLaws(simple);
    });
    test('nilLen', function () {
        //TODO Not a real len, just a zero like value. Comment the test after checking why it do not pass.
        contextLensesLaws.verifyLensesLaws(eelnss.lenses.nilLen);
    });
    test('idLen', function () {
        contextLensesLaws.verifyLensesLaws(eelnss.lenses.idLen);
    });
})();
