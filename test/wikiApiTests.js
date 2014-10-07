(function () {

    module('Api examples used in wiki');

    test('simple len', function () {
        var simple = eelnss.api.buildLen("simple");
        propEqual(
            simple.set("anyValue", {}),
            {
                "simple": "anyValue"
            }
        );
        equal(
            simple.get({"simple": "valueToExtract"}),
            "valueToExtract"
        );
    });

    test('Really nested a.b.c.d.e.f.g', function () {
        var nested = eelnss.api.buildLen("a.b.c.d.e.f.g");
        propEqual(
            nested.set("nestedValueToSet", {}),
            {
                "a": {
                    "b": {
                        "c": {
                            "d": {
                                "e": {
                                    "f": {
                                        "g": "nestedValueToSet"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        );
        equal(
            nested.get(
                {
                    "a": {
                        "b": {
                            "c": {
                                "d": {
                                    "e": {
                                        "f": {
                                            "g": "nestedValueToExtract"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ),
            "nestedValueToExtract"
        );
    });
    test('Parallel lenses as telescopes', function () {
        var telescope = eelnss.api.buildLen("(x,y,z)");
        propEqual(
            telescope.set([1, 2, 3], {}),
            {
                "x": 1,
                "y": 2,
                "z": 3
            }
        );
        propEqual(
            telescope.get({
                "x": "xValue",
                "y": "yValue",
                "z": "zValue"
            }),
            ["xValue", "yValue", "zValue"]
        );
    });
    test('Lenses for Maps - simple case', function () {
        var dbObject = {
            nestedMap: {
                "key1": "value1",
                "key2": "value2"
            }
        };
        var key1Len = eelnss.api.buildLen("nestedMap.key1");
        var key2Len = eelnss.api.buildLen("nestedMap.key2");
        propEqual(
            key1Len.get(dbObject), "value1"
        );
        propEqual(
            key2Len.get(dbObject), "value2"
        );
        dbObject = key2Len.set("updatedValue2", dbObject);
        propEqual(
            dbObject, {
                nestedMap: {
                    "key1": "value1",
                    "key2": "updatedValue2"
                }
            }
        );
    });

    test('Lenses for Maps - using clens', function () {
        var dbObject = {
            nestedMap: {
                "key1": "value1",
                "key2": "value2"
            }
        };
        var mapClen = eelnss.api.buildContextLen("nestedMap.{:key}");
        propEqual(
            mapClen.cget(["key1"], dbObject), "value1"
        );
        propEqual(
            mapClen.cget(["key2"], dbObject), "value2"
        );
        dbObject = mapClen.cset(["key2"], "updatedValue2", dbObject);
        propEqual(
            dbObject, {
                nestedMap: {
                    "key1": "value1",
                    "key2": "updatedValue2"
                }
            }
        );
    });
    test('SQL like operations - Insert', function () {
        var usersCLen = eelnss.api.buildContextLen("app.users.{:uID}.(email,data.name,isActive)");
        var users = [
            ["u1", "admin@pmsoft.eu", "administrator", true],
            ["u2", "normal@pmsoft.eu", "user", true],
            ["u3", "testUser@pmsoft.eu", "testUser", false]
        ];
        var state = {};
        state = usersCLen.lset(users, state);
        propEqual(
            state,
            {
                "app": {
                    "users": {
                        "u1": {
                            "data": {
                                "name": "administrator"
                            },
                            "email": "admin@pmsoft.eu",
                            "isActive": true
                        },
                        "u2": {
                            "data": {
                                "name": "user"
                            },
                            "email": "normal@pmsoft.eu",
                            "isActive": true
                        },
                        "u3": {
                            "data": {
                                "name": "testUser"
                            },
                            "email": "testUser@pmsoft.eu",
                            "isActive": false
                        }
                    }
                }
            }
        );

        var selectUsers = usersCLen.lget(state);
        propEqual(
            selectUsers,
            [
                ["u1", "admin@pmsoft.eu", "administrator", true],
                ["u2", "normal@pmsoft.eu", "user", true],
                ["u3", "testUser@pmsoft.eu", "testUser", false]
            ]
        );

        var adminUserSelected = usersCLen.find({
            email: "admin@pmsoft.eu"
        }).on(state);
        propEqual(
            adminUserSelected,
            [
                ["u1", "admin@pmsoft.eu", "administrator", true]
            ]
        );

        state = usersCLen.lset(
            [
                ["u3", "testUser@pmsoft.eu", "testUser", true]
            ],
            state);
        propEqual(
            state,
            {
                "app": {
                    "users": {
                        "u1": {
                            "data": {
                                "name": "administrator"
                            },
                            "email": "admin@pmsoft.eu",
                            "isActive": true
                        },
                        "u2": {
                            "data": {
                                "name": "user"
                            },
                            "email": "normal@pmsoft.eu",
                            "isActive": true
                        },
                        "u3": {
                            "data": {
                                "name": "testUser"
                            },
                            "email": "testUser@pmsoft.eu",
                            "isActive": true
                        }
                    }
                }
            }
        );
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

        var target = eelnss.api.buildContextLen("person.{:cid}.(name, contact, c)");
        var personsSchemat = target.lset(simple.lget(setInitial), {});

        propEqual(personsSchemat, {
            "person": {
                "key1": {
                    "c": 3,
                    "contact": 2,
                    "name": 1
                },
                "key2": {
                    "c": 3,
                    "contact": 2,
                    "name": 1
                }
            }
        }, "Values in persons schemas");

    });
})();
