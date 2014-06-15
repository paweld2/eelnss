(function () {

    module('Context lens tests');

    test('simple', function () {
        var simple = _.buildContextLen("simple");
        checkContextLenApi(simple);
    });


    test('simple.nested', function () {
        var simple = _.buildContextLen("simple.nested");
        checkContextLenApi(simple);
    });

    test('{:mapId}', function () {
        var simple = _.buildContextLen("{:mapId}");
        checkContextLenApi(simple);
    });
    test('simple.{:mapId}', function () {
        var simple = _.buildContextLen("simple.{:mapId}");
        checkContextLenApi(simple);
    });
    test('simple.nested.{:mapId}', function () {
        var simple = _.buildContextLen("simple.nested.{:mapId}");
        checkContextLenApi(simple);
    });
    test('simple.nested.{:mapId}.prop', function () {
        var simple = _.buildContextLen("simple.nested.{:mapId}.prop");
        checkContextLenApi(simple);
    });

    test('simple.nested.{:mapId}.prop.{:submapId}', function () {
        var simple = _.buildContextLen("simple.nested.{:mapId}.prop.{:submapId}");
        checkContextLenApi(simple);
    });
    test('a.{:mapId}.(a,b,c,d)', function () {
        var simple = _.buildContextLen("a.{:mapId}.(a,b,c,d)");
        checkContextLenApi(simple);
    });


    test('a.{:mapId}.(a.b.c, x.y.z, simple)', function () {
        var simple = _.buildContextLen("a.{:mapId}.(a.b.c, x.y.z, simple)");
        checkContextLenApi(simple);
    });

})();
