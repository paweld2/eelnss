(function () {

    module('Cross joins of context lenses');

    test('Use case: guest.{:personID}.(name,address.street,address.zipCode) X room.{:roomID}.number ', function () {
        var personClen = eelnss.api.buildContextLen("guest.{:personID}.(name,address.street,address.zipCode)");
        var roomClen = eelnss.api.buildContextLen("room.{:roomID}.number");
        var personXroom = eelnss.api.crossProduct(personClen, roomClen);

        var guestTableData = [
            ["person1", "Pedro", "Str. One", "00-001"],
            ["person2", "Juan", "Str. Two", "00-002"]
        ];
        var roomsTableData = [
            ["room1", "100"],
            ["room2", "101"]
        ];
        var database = {};

        database = personClen.lset(guestTableData, database);
        database = roomClen.lset(roomsTableData, database);

        propEqual(database, {
            "guest": {
                "person1": {
                    "address": {
                        "street": "Str. One",
                        "zipCode": "00-001"
                    },
                    "name": "Pedro"
                },
                "person2": {
                    "address": {
                        "street": "Str. Two",
                        "zipCode": "00-002"
                    },
                    "name": "Juan"
                }
            },
            "room": {
                "room1": {
                    "number": "100"
                },
                "room2": {
                    "number": "101"
                }
            }
        }, "fill database ok");

        var dbCrossLoad = personXroom.lget(database);

        propEqual(dbCrossLoad, [
            ["person1", "room1", "Pedro", "Str. One", "00-001", "100"],
            ["person1", "room2", "Pedro", "Str. One", "00-001", "101"],
            ["person2", "room1", "Juan", "Str. Two", "00-002", "100"],
            ["person2", "room2", "Juan", "Str. Two", "00-002", "101"]
        ], "Load by cross product ok");

        var updateForCrossProduct = [
            ["person1", "room1", "Pawel", "ul. Jeden", "01-000", "100X"]
        ];

        database = personXroom.lset(updateForCrossProduct, database);
        propEqual(database, {
            "guest": {
                "person1": {
                    "address": {
                        "street": "ul. Jeden",
                        "zipCode": "01-000"
                    },
                    "name": "Pawel"
                },
                "person2": {
                    "address": {
                        "street": "Str. Two",
                        "zipCode": "00-002"
                    },
                    "name": "Juan"
                }
            },
            "room": {
                "room1": {
                    "number": "100X"
                },
                "room2": {
                    "number": "101"
                }
            }
        }, "update for cross product OK");

    });

    test('Check Context lenses properties for: guest.{:personID}.(name,address.street,address.zipCode) X room.{:roomID}.number', function () {
        var personClen = eelnss.api.buildContextLen("guest.{:personID}.(name,address.street,address.zipCode)");
        var roomClen = eelnss.api.buildContextLen("room.{:roomID}.number");

        var personXroom = eelnss.api.crossProduct(personClen, roomClen);
        contextLensesLaws.checkContextLensesCrossProducts(personClen, roomClen, personXroom);

        var roomXperson = eelnss.api.crossProduct(roomClen, personClen);
        contextLensesLaws.checkContextLensesCrossProducts(roomClen, personClen, roomXperson);

    });
})();
