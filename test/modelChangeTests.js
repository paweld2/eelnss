(function () {

    module('Model changes tests');

    test('Boolean state change', function () {
        var loggedLen = eelnss.api.buildContextLen("app.logged");
        var state = {};
        state = loggedLen.lset(undefined, state);
        propEqual(state, {app: {}}, "Reset DB - OK");

        state = loggedLen.cset([], true, state);
        propEqual(state, {app: {logged: true}}, "logged - OK");

        state = loggedLen.cset([], false, state);
        propEqual(state, {app: {logged: false}}, "logged - OK");
    });
    test('Session creation', function () {
        var sessionLen = eelnss.api.buildContextLen("app.sessions.{:sessionID}.(user,logged)");
        var state = {};
        state = sessionLen.lset(undefined, state);
        propEqual(state, {app: {sessions: {}}}, "Reset DB - OK");

        state = sessionLen.cset(["s1"], ["user1", false], state);
        propEqual(state,
            {
                app: {
                    sessions: {
                        "s1": {
                            "logged": false,
                            "user": "user1"
                        }
                    }
                }
            }, "Session created - OK");

        state = sessionLen.cset(["s1"], ["user1", true], state);
        propEqual(state,
            {
                app: {
                    sessions: {
                        "s1": {
                            "logged": true,
                            "user": "user1"
                        }
                    }
                }
            }, "Session update - OK");


        state = sessionLen.cset(["s1"], undefined, state);
        propEqual(state,
            {
                app: {
                    sessions: {
                        "s1": {}
                    }
                }
            }, "Session created - OK");
        var sessionDeleteLen = sessionLen.spec.pointers["app.sessions.{:sessionID}"].bindContext(["s1"]);
        state = sessionDeleteLen.set(undefined, state);
        propEqual(state,
            {
                app: {
                    sessions: {
                    }
                }
            }, "Session deleted - OK");


    });

    test('Find specific values', function () {
        var usersLen = eelnss.api.buildContextLen("app.users.cos.nested.more.{:uID}.(email,data.name,isActive)");
        var users = [
            ["u1", "admin@pmsoft.eu", "administrator", true],
            ["u2", "normal@pmsoft.eu", "user", true],
            ["u3", "inactive@pmsoft.eu", "inactive", false]
        ];
        var state = {};
        state = usersLen.lset(users, state);

        propEqual(usersLen.spec.contextMap, ["uID"], "contextMap - OK");
        propEqual(usersLen.spec.valueMap, ["email", "name", "isActive"], "valueMap - OK");

        var user = usersLen.find({
            email: "admin@pmsoft.eu",
            isActive: true
        }).on(state);
        propEqual(user, [
            ["u1", "admin@pmsoft.eu", "administrator", true]
        ], "find positive - OK");

        user = usersLen.find({
            email: "admin@pmsoft.eu",
            isActive: false
        }).on(state);
        propEqual(user, [], "find positive - OK");

        user = usersLen.find({
            isAdmistrator: {
                email: "admin@pmsoft.eu",
                isActive: true
            },
            isActive: false
        }).on(state);
        propEqual(user, [
            ["u1", "admin@pmsoft.eu", "administrator", true],
            ["u3", "inactive@pmsoft.eu", "inactive", false]
        ], "find with or condition positive - OK");
    });
})();
