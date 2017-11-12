(function () {

    module('Context lens tests');

    function _assert(condition, message) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }

    test('sessions.{:userId}.name', function () {
        var extractUserName = eelnss.api.buildContextLen("sessions.{:userId}.name");

        var db = {
            sessions: {
                user1: {
                    name: "Antonio"
                },
                user2: {
                    name: "Pablo"
                }
            }
        };
        equal(extractUserName.cget(["user1"], db), "Antonio", "extract \"Antonio\" name");
        equal(extractUserName.cget(["user2"], db), "Pablo", "extract \"Pablo\" name");
        // console.log(extractUserName.cget(["user1"],db));
        // console.log(extractUserName.cget(["user2"],db));
    });
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
        equal(rawCLen.cget(["y"], input), input.y, "rawCLen.cget([y],input) === input.y");
        equal(rawCLen.cget(["x"], input), input.x, "rawCLen.cget([x],input) === input.x");
    });

    test('info.{:appID}.users.{:userId}.roles', function () {
        var roleByUserOnApp = eelnss.api.buildContextLen("info.{:appID}.users.{:userId}.roles");

        var db = {
            info: {
                chat: {
                    users: {
                        user1: {
                            roles: "admin,user"
                        },
                        user2: {
                            roles: "admin"
                        }
                    }
                },
                adminPanel: {
                    users: {
                        user1: {
                            roles: "admin,user,root"
                        },
                        user2: {
                            roles: "admin,user"
                        }
                    }
                }
            }
        };
        equal(roleByUserOnApp.cget(["chat", "user1"], db), "admin,user", "extract roles on chat for user1");
        equal(roleByUserOnApp.cget(["adminPanel", "user1"], db), "admin,user,root", "extract roles on adminPanel for user1");
        // console.log(roleByUserOnApp.cget(["chat","user1"],db));
        // console.log(roleByUserOnApp.cget(["adminPanel","user1"],db));
    });

    test('info.(name,version)', function () {
        var twoValues = eelnss.api.buildContextLen("info.(name,version)");
        var db = {
            info: {
                name: "MyApp",
                version: "1.1.1",
                commit : "adfadfasdf"
            }
        };

        propEqual(twoValues.cget([],db), ["MyApp","1.1.1"], "twoValues.cget([],db) is...");
        var dbExpected = {
            "info": {
                "name": "NewName",
                "version": "1.1.2",
                "commit" : "adfadfasdf"
            }
        };
        propEqual(twoValues.cset([],["NewName","1.1.2"],db), dbExpected, "twoValues.cget([],db) is...");
    });
})();
