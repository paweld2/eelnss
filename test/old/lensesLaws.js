var lensesLawTest = function (len, containerBuilder, arrayOfValue) {
    var container = containerBuilder();
    propEqual(len.set(len.get(container), container), container, " set(get(c),c) == c for container " + JSON.stringify(container));
    _.each(arrayOfValue, function (value) {
        lensesLawTestSingle(len, containerBuilder(), value);
    });
};
var lensesLawTestSingle = function (len, container, value) {
    propEqual(len.get(len.set(value, container), value), value, " get(set(v,c)) == v for value " + JSON.stringify(value));
};

var lensesPutPutLawTest = function (len, containerBuilder, arrayOfValue) {
    _.each(arrayOfValue, function (v1) {
        _.each(arrayOfValue, function (v2) {
            lensesPutPutLawTestSingle(len, containerBuilder(), v1, v2);
        });
    });
};

var lensesPutPutLawTestSingle = function (len, container, v1, v2) {
    propEqual(len.set(v2, len.set(v1, container)), len.set(v2, container), " set(v2,set(v1,c)) == set(v2,c) for values: v1=" + JSON.stringify(v1) + ", v2=" + JSON.stringify(v2));
};

// provide the set of all subset of values (2^X)
var setExponent = function(values) {
    if( values.length == 0) {
        return [[]];
    }
    var v = _.first(values);
    if( values.length == 1) {
        return [[],[v]];
    }
    var previousSubsets = setExponent(_.rest(values));
    return _.chain(previousSubsets).map(function(subset) {
        return [subset, _.union(subset,[v])];
    }).flatten(true).value();
};

var cartesianProduct = function(setA,setB) {
    return _.chain(setA).map(function(a){
        return _.map(setB,function(b){
            return [a,b];
        });
    }).flatten(true).value();

};