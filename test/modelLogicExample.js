(function () {

    module('Model logic implementation');

    var buildPerson = function (name, pid) {
        return {name: name, pid: pid};
    };
    var buildDepartment = function (name, did) {
        return {depName: name, did: did};
    };
    var alice = buildPerson('alice', 1);
    var bob = buildPerson('bob', 2);
    var carlos = buildPerson('carlos', 3);

    var managersDep = buildDepartment('managment', 1);
    var developmentDep = buildDepartment('development', 2);

    var personLen = _.buildLen("persons.[:pid]");
    var departmentLen = _.buildLen("departments.[:did]");
    var personAndDepartmentLen = _.buildLen("relations.depToPerson.[:pid:did]");


    test('Build simple CRUD on one object type', function () {
        var modelData = {};

        // Add persons
        modelData = personLen.bindset(alice, modelData);
        deepEqual(modelData, {persons: [alice]});

        modelData = personLen.bindset(bob, modelData);
        deepEqual(modelData, {persons: [alice, bob]});

        modelData = personLen.bindset(carlos, modelData);
        deepEqual(modelData, {persons: [alice, bob, carlos]});

        // Delete person
        modelData = personLen.bindunset(bob, modelData);
        deepEqual(modelData, {persons: [alice, carlos]});

        // Get person by ID
        deepEqual(personLen.bind(alice).get(modelData), [alice]);
        deepEqual(personLen.bind({pid: 1}).get(modelData), [alice]);

    });

    test('Build simple CRUD on two object type and a single relation', function () {
        var modelData = {};

        modelData = personLen.bindset(alice, modelData);
        modelData = personLen.bindset(bob, modelData);
        modelData = departmentLen.bindset(managersDep, modelData);
        deepEqual(modelData, {persons: [alice, bob], departments: [managersDep]});


        var aliceTimesDepartment = {pid: alice.pid, did: managersDep.did};
        modelData = personAndDepartmentLen.bindset(aliceTimesDepartment, modelData);
        var bobTimesDepartment = {pid: bob.pid, did: managersDep.did};
        modelData = personAndDepartmentLen.bindset(bobTimesDepartment, modelData);

        deepEqual(modelData, {persons: [alice, bob], departments: [managersDep], relations: { depToPerson: [aliceTimesDepartment, bobTimesDepartment]}});

        deepEqual(personAndDepartmentLen.bind({did: managersDep.did}).get(modelData), [
            {"did": 1, "pid": 1},
            {"did": 1, "pid": 2}
        ]);

        deepEqual(personAndDepartmentLen.bind({pid: alice.pid}).get(modelData), [
            {"did": 1, "pid": 1}
        ]);

    });


})();

