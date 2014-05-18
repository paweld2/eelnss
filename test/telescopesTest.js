(function () {

    module('Objektywy');
    var definedTypeTestValues = ["any", "", 0, 1, 2, {}, {id: 1}, ["array"]];

    test('tele(a,b)', function () {
        var a = _.buildLen("a").bind();
        var b = _.buildLen("b").bind();

        var tele = _.telescope([a, b]);

        deepEqual(tele.get({a: 1, b: 2}), [1, 2], "tele.get({a: 1, b: 2}), [1,2]");
        deepEqual(tele.set([1, 2], {}), {a: 1, b: 2}, "tele([a,b])([1,2],{}) === {a: 1, b: 2}");
    });
})();

