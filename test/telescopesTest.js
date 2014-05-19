(function () {

    module('Objektywy');
    var definedTypeTestValues = ["any", "", 0, 1, 2, {}, {id: 1}, ["array"]];

    test('tele(a,b)', function () {
        var a = _.buildLen("a").bind();
        var b = _.buildLen("b").bind();

        var tele = _.telescope([a, b]);

        deepEqual(tele.get({a: 1, b: 2}), [1, 2], "tele.get({a: 1, b: 2}), [1,2]");
        deepEqual(tele.set([1, 2], {}), {a: 1, b: 2}, "tele([a,b])([1,2],{}) === {a: 1, b: 2}");

        deepEqual(tele.mod(function (value) {
            deepEqual(value, [1, 2]);
            return ['a', 'b'];
        }, {a: 1, b: 2}), {a: 'a', b: 'b'}, "tele.get({a: 1, b: 2}), [1,2]");

    });

    test('tele([a.b.c,x.y])', function () {
        var a = _.buildLen("a.b.c").bind();
        var b = _.buildLen("x.y").bind();

        var tele = _.telescope([a, b]);

        var filled = tele.set([1, 2], {});
        deepEqual(filled, {
            "a": {
                "b": {
                    "c": 1
                }
            },
            "x": {
                "y": 2
            }
        }, "tele([a.b.c,x.y])([1,2],{}) SET OK ");
        deepEqual(tele.get(filled), [1, 2], "tele([a.b.c,x.y])([1,2],{}) GET OK ");

    });
})();

