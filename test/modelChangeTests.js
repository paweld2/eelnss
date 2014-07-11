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
        var sessionDeleteLen = sessionLen.pointers["app.sessions.{:sessionID}"].bindContext(["s1"]);
        state = sessionDeleteLen.set(undefined, state);
        propEqual(state,
            {
                app: {
                    sessions: {
                    }
                }
            }, "Session deleted - OK");


    });
})();
