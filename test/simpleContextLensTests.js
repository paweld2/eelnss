(function () {

    module('Context lens tests');
    function _assert(condition, message) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }

    test('simple', function () {
        function cgetMap(context, a) {
            _assert(_.isArray(context), "context for map must be a single value");
            _assert(context.length === 1, "context for map must be a single value");
            var key = context[0];
            var value = a[key];
            return value;
        }

        function csetMap(context, b, a) {
            _assert(_.isArray(context), "context for map must be a single value");
            _assert(context.length === 1, "context for map must be a single value");
            var key = context[0];
            if (_.isUndefined(b)) {
                return _.omit(a, key);
            }
            var extendO = {};
            extendO[key] = b;
            return _.chain(a).clone().extend(extendO).value();
        }

        function contextExtractorMap(a) {
            var keys = _.keys(a);
            if (keys.length === 0) {
                return [];
            }
            return _.chain(keys).map(function (key) {
                return [key];
            }).value();
        }

        var specification = {
            contextSize: 1,
            valueSize: 1,
            signature: "{:map}",
            pointers: {},
            contextMap: ["map"],
            valueMap: ["_"],
            selfPointer: undefined
        };
        var rawCLen = eelnss.contextLenses.defineContextLen(cgetMap, csetMap, contextExtractorMap, specification);

        var input = {
            "x": "xValue",
            "y": "yValue"
        };
        equal(rawCLen.cget(["y"],input), input.y, "rawCLen.cget([y],input) === input.y");
        equal(rawCLen.cget(["x"],input), input.x, "rawCLen.cget([x],input) === input.x");
    });
})();
