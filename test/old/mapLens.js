(function () {

    module('Map lens');

    var simpleMapLenTest = function (lenDef) {
        var example = {id: "1", ok: true};
        var afterBind = lenDef.bind(example);
        var step1 = afterBind.set(example, {});
        deepEqual(step1, {"1": example});
        deepEqual(afterBind.get(step1), example);
    }

    test('By id', function () {
        simpleMapLenTest(_.mapLen("id"));
    });
    test('By id as expression', function () {
        simpleMapLenTest(_.buildLen("{:id}"));
    });

})();
