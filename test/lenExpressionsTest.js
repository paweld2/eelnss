(function () {

    module('Lens expressions');
    var definedTypeTestValues = ["any", "", 0, 1, 2, {}, {id: 1}, ["array"]];

    test('Nested fields expression a.b.c', function () {
        var abcLen = _.buildLen("a.b.c").bind();
        deepEqual(abcLen.get({a:{b:{c:1}}}), 1, "a.b.c get");
        deepEqual(abcLen.set({},{}), {a:{b:{c:{}}}}, "a.b.c zero");
        deepEqual(abcLen.set(1,{}), {a:{b:{c:1}}}, "a.b.c set");

        // the zero of the len
        var containerBuilder = function () {
            return abcLen.set({},{});
        };
        lensesLawTest(abcLen, containerBuilder, definedTypeTestValues);
        lensesPutPutLawTest(abcLen, containerBuilder, definedTypeTestValues);
    });


    test('Nested fields with SetLen on tail a.b.c.[:id]', function () {
        var tailSetLen = _.buildLen("a.b.c.[:id]");

        var id1Len = tailSetLen.bind({id:1});
        deepEqual(id1Len.get({a:{b:{c:[{id:1,ok:true},{id:2,ok:false}]}}}), [{id:1,ok:true}], "a.b.c.[:id] get");
        deepEqual(id1Len.set({},{}), {a:{b:{c:[]}}}, "a.b.c.[:id] zero === {a:{b:{c:[]}}}");
        deepEqual(id1Len.set([{id:1,ok:true}],{}), {a:{b:{c:[{id:1,ok:true}]}}}, "a.b.c.[:id] set");

        // the zero of the len
        var containerBuilder = function () {
            return id1Len.set({},{});
        };
        lensesLawTest(id1Len, containerBuilder, [[{id:1,ok:true}]]);
        lensesPutPutLawTest(id1Len, containerBuilder, [[{id:1,ok:true}],[{id:1,o:1},{id:1,o:2}]]);
    });

    test('a.b.[:id].c', function () {
        var abIdc = _.buildLen("a.b.[:id].c");

        var id1Len = abIdc.bind({id:1});
        deepEqual(id1Len.get({a:{b:[{id:1,c:1},{id:2,c:2}]}}), [1], "a.b.[:id].c get");
        deepEqual(id1Len.set([],{}), {a:{b:[]}}, "a.b.[:id].c zero === {a:{b:[]}}");
        // TODO: here the order is related to _.union function, but a check without order should be done
        deepEqual(id1Len.set(["a"],{a:{b:[{id:1,c:1},{id:2,c:2}]}}), {a:{b:[{id:2,c:2},{id:1,c:"a"}]}}, "a.b.[:id].c set");
    });


    test('a.[:id:order].b', function () {
        var pre = _.buildLen("a.[:id:order].b");

        var len = pre.bind({id:1,order:1});
        var testContainer = {a:[{id:1,order:1,b:1},{id:1,order:2,b:2},{id:2,order:1,b:3}]};
        deepEqual(len.get(testContainer), [1], "a.[:id:order].b");
        deepEqual(len.set([],{}), {a:[]}, "a.[:id:order].b zero === {a:[]}");
        // TODO: here the order is related to _.union function, but a check without order should be done
        deepEqual(len.set(["x"],testContainer), {a:[{id:2,order:1,b:3},{id:1,order:2,b:2},{id:1,order:1,b:"x"}]}, "a.[:id:order].b set");
    });
})();

