(function () {

    module('Algebra');

    var lensResultsUnion = function (res1, res2) {
        var matching = _.zip(res1, res2);
        return _.map(matching, function (r12) {
            return _.union(r12[0], r12[1]);
        })
    };

    test('Union', function () {
        var data1 = {
            "persons": [
                {
                    "id": 1,
                    "name": "a",
                    "age": 10
                },
                {
                    "id": 2,
                    "name": "b",
                    "age": 20
                }
            ]
        };
        var telescope1 = _.telescope([
            _.buildLen("persons.[:id].id"),
            _.buildLen("persons.[:id].name"),
            _.buildLen("persons.[:id].age")
        ]).bind({});
        deepEqual(telescope1.get(data1), [
            [1, 2],
            ["a", "b"],
            [10, 20]
        ]);

        var data2 = {
            "contractors": [
                {
                    "cid": 3,
                    "data": {
                        "contractorName": "X",
                        "contractorAge": 30
                    }
                },
                {
                    "cid": 4,
                    "data": {
                        "contractorName": "Y",
                        "contractorAge": 40
                    }
                }
            ]
        };

        var telescope2 = _.telescope([
            _.buildLen("contractors.[:cid].cid"),
            _.buildLen("contractors.[:cid].data.contractorName"),
            _.buildLen("contractors.[:cid].data.contractorAge")
        ]).bind({});


        deepEqual(telescope2.get(data2), [
            [3 , 4 ],
            ["X", "Y"],
            [30, 40]
        ]);

        var union = lensResultsUnion(telescope1.get(data1), telescope2.get(data2));
        deepEqual(union, [
            [1, 2, 3, 4],
            ["a", "b", "X", "Y"],
            [10, 20, 30, 40]
        ]);

        deepEqual(telescope1.set(union, {}), {
            "persons": [
                {
                    "id": 1,
                    "name": "a",
                    "age": 10
                },
                {
                    "id": 2,
                    "name": "b",
                    "age": 20
                },
                {
                    "id": 3,
                    "name": "X",
                    "age": 30
                },
                {
                    "id": 4,
                    "name": "Y",
                    "age": 40
                }
            ]
        }, "Projection to structure 1 ok");


    });


})();

