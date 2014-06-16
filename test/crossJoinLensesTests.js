(function () {

    module('Cross joins of lenses');

    test('a X b == (a,b)', function () {
        var aLen = eelnss.api.buildContextLen("a");
        var bLen = eelnss.api.buildContextLen("b");
        var abLen = eelnss.api.buildContextLen("(a,b)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);

        var setAB = aXb.cset([], [1, 2], {});
        propEqual(setAB, {a: 1, b: 2}, "cross product set all values");

        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });

    test('(a,b,c) X d == (a,b,c,d)', function () {
        var aLen = eelnss.api.buildContextLen("(a,b,c)");
        var bLen = eelnss.api.buildContextLen("d");
        var abLen = eelnss.api.buildContextLen("(a,b,c,d)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);
        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });
    test('(a,b) X (c,d) == (a,b,c,d)', function () {
        var aLen = eelnss.api.buildContextLen("(a,b)");
        var bLen = eelnss.api.buildContextLen("(c,d)");
        var abLen = eelnss.api.buildContextLen("(a,b,c,d)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);
        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });

    test('a.b X c.d == (a.b,c.d)', function () {
        var aLen = eelnss.api.buildContextLen("a.b");
        var bLen = eelnss.api.buildContextLen("c.d");
        var abLen = eelnss.api.buildContextLen("(a.b,c.d)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);
        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });

    test('a.b X a.d == (a.b,a.d)', function () {
        var aLen = eelnss.api.buildContextLen("a.b");
        var bLen = eelnss.api.buildContextLen("a.d");
        var abLen = eelnss.api.buildContextLen("(a.b,a.d)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);
        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });

    test('a.b X a.d == a.(b,d)', function () {
        var aLen = eelnss.api.buildContextLen("a.b");
        var bLen = eelnss.api.buildContextLen("a.d");
        var abLen = eelnss.api.buildContextLen("a.(b,d)");
        var aXb = eelnss.api.crossProduct(aLen, bLen);
        contextLensesLaws.checkContextLenApi(aXb);
        contextLensesLaws.checkContextLenEquivalence(aXb, abLen);
    });

    test('a X b X c X d == (a,b,c,d)', function () {
        var aLen = eelnss.api.buildContextLen("a");
        var bLen = eelnss.api.buildContextLen("b");
        var cLen = eelnss.api.buildContextLen("c");
        var dLen = eelnss.api.buildContextLen("d");
        var abLen = eelnss.api.buildContextLen("(a,b,c,d)");
        var aXbXcXd = eelnss.api.crossProduct(aLen, bLen, cLen, dLen);
        contextLensesLaws.checkContextLenApi(aXbXcXd);
        contextLensesLaws.checkContextLenEquivalence(aXbXcXd, abLen);
    });


})();
