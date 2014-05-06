(function () {

    module("test utils functions");

    test("set exponent", function () {
        var values = [0,1];
        deepEqual(setExponent(values),[[],[0],[1],[1,0]]);
        values = [0,1,2,3];
        deepEqual(setExponent(values),[[],[0],[1],[1,0],[2],[2,0],[2,1],[2,1,0],[3],[3,0],[3,1],[3,1,0],[3,2],[3,2,0],[3,2,1],[3,2,1,0]]);
    });
    test("cartesian product",function() {
        var setA = ["a","b"];
        var setB = [1,2];
        deepEqual(cartesianProduct(setA,setB),[["a",1],["a",2],["b",1],["b",2]]);
    })

})();
