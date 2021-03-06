(function () {

    module('Context lens tests');

    test('simple', function () {
        var simple = eelnss.api.buildContextLen("simple");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('simple.nested', function () {
        var simple = eelnss.api.buildContextLen("simple.nested");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('(a,b,c,d,e)', function () {
        var simple = eelnss.api.buildContextLen("(a,b,c,d,e)");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('{:mapId}', function () {
        var simple = eelnss.api.buildContextLen("{:mapId}");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('simple.{:mapId}', function () {
        var simple = eelnss.api.buildContextLen("simple.{:mapId}");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('simple.nested.{:mapId}', function () {
        var simple = eelnss.api.buildContextLen("simple.nested.{:mapId}");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('simple.nested.{:mapId}.prop', function () {
        var simple = eelnss.api.buildContextLen("simple.nested.{:mapId}.prop");
        contextLensesLaws.checkContextLenApi(simple);
    });

    test('simple.nested.{:mapId}.prop.{:submapId}', function () {
        var simple = eelnss.api.buildContextLen("simple.nested.{:mapId}.prop.{:submapId}");
        contextLensesLaws.checkContextLenApi(simple);
    });
    test('a.{:mapId}.(a,b,c,d)', function () {
        var simple = eelnss.api.buildContextLen("a.{:mapId}.(a,b,c,d)");
        contextLensesLaws.checkContextLenApi(simple);
    });


    test('a.{:mapId}.(a.b, x.z, complex.nested) mapped to person.{:cid}.(name, contact, c)', function () {
        var simple = eelnss.api.buildContextLen("a.{:mapId}.(a.b, x.z, complex.nested)");

        var initialData = [
            ["key1", 1, 2, 3],
            ["key2", 1, 2, 3]
        ];
        var setInitial = simple.lset(initialData, {});

        propEqual(setInitial, {
            "a": {
                "key1": {
                    "a": {
                        "b": 1
                    },
                    "complex": {
                        "nested": 3
                    },
                    "x": {
                        "z": 2
                    }
                },
                "key2": {
                    "a": {
                        "b": 1
                    },
                    "complex": {
                        "nested": 3
                    },
                    "x": {
                        "z": 2
                    }
                }
            }
        }, "Set initial match");

        var tableData = simple.lget(setInitial);

        var target = eelnss.api.buildContextLen("person.{:cid}.(name, contact, c)");
        var persons = target.lset(tableData, {});

        var extracted = target.lget(persons);

        propEqual(extracted, initialData, "Initial data mapped and extracted match");

    });
})();
