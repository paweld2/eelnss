(function () {

    module('Express crud logic using the clen api');

    test('Single table CRUD', function () {
        var tableClen = eelnss.api.buildContextLen("mytable.{:id}.(firstName,secondName)");
        //Initial state
        var state = {};
        // Create operation
        var dataToInsert = [
            ["id1", "Pedro", "Lopez"],
            ["id2", "Speedy", "Gonzalez"],
            ["id3", "Pedro", "Gonzalez"],
            ["id4", "Jan", "Kowalski"]
        ];
        state = tableClen.lset(dataToInsert, state);
        //state after create
        propEqual(
            state,
            {
                "mytable": {
                    "id1": {
                        "firstName": "Pedro",
                        "secondName": "Lopez"
                    },
                    "id2": {
                        "firstName": "Speedy",
                        "secondName": "Gonzalez"
                    },
                    "id3": {
                        "firstName": "Pedro",
                        "secondName": "Gonzalez"
                    },
                    "id4": {
                        "firstName": "Jan",
                        "secondName": "Kowalski"
                    }
                }
            }
        );

        //Read by id
        var pedroUser = tableClen.find({
            id: "id1"
        }).on(state);

        propEqual(
            pedroUser,
            [["id1", "Pedro", "Lopez"]]
        );
        //Read by property
        var gonzalezPersons = tableClen.find({
            secondName: "Gonzalez"
        }).on(state);
        propEqual(
            gonzalezPersons,
            [
                ["id2", "Speedy", "Gonzalez"],
                ["id3", "Pedro", "Gonzalez"]
            ]
        );

        //Update existing values
        var updateFullInfo = [
            ["id1", "Pedro", "UpdatedSecondName"]
        ];
        state = tableClen.lset(updateFullInfo, state);
        //state after update
        propEqual(
            state,
            {
                "mytable": {
                    "id1": {
                        "firstName": "Pedro",
                        "secondName": "UpdatedSecondName"
                    },
                    "id2": {
                        "firstName": "Speedy",
                        "secondName": "Gonzalez"
                    },
                    "id3": {
                        "firstName": "Pedro",
                        "secondName": "Gonzalez"
                    },
                    "id4": {
                        "firstName": "Jan",
                        "secondName": "Kowalski"
                    }
                }
            }
        );

        //Delete a existing value by ID
        var idToDelete = [
            ["id1"]
        ];
        state = tableClen.lset(idToDelete, state);
        //state after update
        propEqual(
            state,
            {
                "mytable": {
                    "id1": {},
                    "id2": {
                        "firstName": "Speedy",
                        "secondName": "Gonzalez"
                    },
                    "id3": {
                        "firstName": "Pedro",
                        "secondName": "Gonzalez"
                    },
                    "id4": {
                        "firstName": "Jan",
                        "secondName": "Kowalski"
                    }
                }
            }
        );

    });
})();
