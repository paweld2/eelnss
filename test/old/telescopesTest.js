(function () {

    module('Telescopes');
    var definedTypeTestValues = ["any", "", 0, 1, 2, {}, {id: 1}, ["array"]];

    test('tele(a,b)', function () {
        var a = _.buildLen("a");
        var b = _.buildLen("b");

        var tele = _.telescope([a, b]).bind();

        deepEqual(tele.get({a: 1, b: 2}), [1, 2], "tele.get({a: 1, b: 2}), [1,2]");
        deepEqual(tele.set([1, 2], {}), {a: 1, b: 2}, "tele([a,b])([1,2],{}) === {a: 1, b: 2}");

        deepEqual(tele.mod(function (value) {
            deepEqual(value, [1, 2]);
            return ['a', 'b'];
        }, {a: 1, b: 2}), {a: 'a', b: 'b'}, "tele.get({a: 1, b: 2}), [1,2]");

    });


    test('tele(a,b) on iterable containers', function () {
        var a = _.buildLen("a");
        var b = _.buildLen("b");

        var tele = _.telescope([a, b]).bind();

        deepEqual(tele.get([
            {a: 1, b: 2},
            {a: 'x', b: 'y'}
        ]), [
            [1, 'x'],
            [2, 'y']
        ]);
        deepEqual(tele.set([
            [1, 'x'],
            [2, 'y']
        ], [
            {},
            {}
        ]), [
            {a: 1, b: 2},
            {a: 'x', b: 'y'}
        ]);

    });

    test('tele([a.b.c,x.y])', function () {
        var a = _.buildLen("a.b.c");
        var b = _.buildLen("x.y");

        var tele = _.telescope([a, b]).bind();

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

    test('tele([a.x,a.y])', function () {
        var x = _.buildLen("a.x");
        var y = _.buildLen("a.y");

        var tele = _.telescope([x, y]).bind();

        var filled = tele.set([1, 2], {});
        deepEqual(filled, {
            "a": {
                "x": 1,
                "y": 2
            }
        }, "tele([a.x,a.y])([1,2],{}) SET OK ");
        deepEqual(tele.get(filled), [1, 2], "tele([a.x,a.y]) GET OK ");
    });


    test('tele([[].x,[].y])', function () {

        var container = [
            {},
            {}
        ];

        var tele = _.buildLen("[]").bind({}).andThen( _.telescope([_.buildLen("x"), _.buildLen("y")]).bind({}));

        var tableView = [
            ["x1", "y1"],
            ["x2", "y2"]
        ];
        var filled = tele.set(tableView, container);
        deepEqual(filled, [
            { "x": "x1", "y": "y1"},
            { "x": "x2", "y": "y2"}
        ], "tele([[].x,[].y]) SET OK ");
        deepEqual(tele.get(filled), tableView, "tele([[].x,[].y]) GET OK ");
    });


})();

