// ReSharper disable InconsistentNaming
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var Validator = breeze.Validator;
    var ValidationError = breeze.ValidationError;

    var serviceName = testFns.northwindServiceName;
    var newEm = testFns.newEmFactory(serviceName);

    // Capture clean copy of  metadataStore when module 1st runs
    // Keep clean copy because this module adds & removes 
    // validators from the metadata. Must reset after each test.
    var cleanMetadataStore;
    var metadataSetupFn = function (store) {
        cleanMetadataStore = cloneMetadataStore(store);
    };

    var moduleOptions = {
        setup: function () {
            // get the module metadataStore from service first time
            testFns.populateMetadataStore(newEm, metadataSetupFn);
        },
        teardown: function () {
            // reset metadataStore from clean copy after each test
            newEm.options.metadataStore = cloneMetadataStore(cleanMetadataStore);
        }
    };

    module("validationTests", moduleOptions);

    /*********************************************************
    * validates a mapped property
    *********************************************************/
    test("validates a mapped property", function () {
        expect(3);
        var em = newEm();
        var meta = em.metadataStore;

        // add "maxLength" validator to mapped FirstName property
        var empType = em.metadataStore.getEntityType("Employee");
        var fnProp = empType.getProperty("FirstName");
        fnProp.validators.push(breeze.Validator.maxLength({ maxLength: 5 }));

        var emp = em.createEntity(empType, {FirstName:"Basil"});

        // create a maxLength error for the 'FirstName' property
        emp.FirstName('Jeremiah');

        // get the first (and presumably only) 'FirstName' property error.
        var fnErr = emp.entityAspect.getValidationErrors('FirstName')[0];
        var emsg = fnErr && fnErr.errorMessage;

        ok(!!fnErr, "should have a 'FirstName' error after setting a 'too long' name"
        + (emsg ? " and its message is " + emsg : ""));

        var fnErrValidator = fnErr.validator;
        equal(fnErrValidator.name, 'maxLength', "FirstName error Validator should be 'maxLength'");

        // give it an acceptable value
        emp.FirstName('Sue');
        fnErr = emp.entityAspect.getValidationErrors('FirstName');
        equal(fnErr.length, 0,
            "should have no 'FirstName' errors after setting a name of acceptable length");
    });

    /*********************************************************
    * validates an unmapped property
    *********************************************************/
    test("validates an unmapped property", function () {
        expect(4);
        var em = newEm();
        var meta = em.metadataStore;

        // add unmapped property
        var employeeCtor = function () { this.foo = ko.observable(42); };
        meta.registerEntityTypeCtor("Employee", employeeCtor);

        var empType = em.metadataStore.getEntityType("Employee");
        var fooProp = empType.getProperty("foo");
        ok(fooProp.isUnmapped, "Employee.foo should be an unmapped property");

        // add "number" validator to unmapped Foo
        fooProp.validators.push(breeze.Validator.number());

        var emp = em.createEntity(empType);

        // create a DataType error for the 'foo' property
        emp.foo('this is a string');

        // get the first (and presumably only) 'foo' property error.
        var fooErr = emp.entityAspect.getValidationErrors('foo')[0];
        var emsg = fooErr && fooErr.errorMessage;

        ok(!!fooErr, "should have a 'foo' error after setting foo to a string"
        + (emsg ? " and its message is "+emsg : ""));

        var fooErrValidator = fooErr.validator;
        equal(fooErrValidator.name, 'number', "foo error Validator should be 'number'");

        // give it an acceptable value
        emp.foo(42);
        fooErr = emp.entityAspect.getValidationErrors('foo');
        equal(fooErr.length, 0,
            "should have no 'foo' errors after setting it to a number");

    });

    /*********************************************************
    * validates on attach by default (validateOnAttach == true)
    *********************************************************/
    test("validates on attach by default", function () {
        expect(1);
        var em = newEm();  // new empty EntityManager
        var empType = getEmployeeType(em);

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(1);
        
        // Start monitoring validation error changes
        employee.entityAspect
            .validationErrorsChanged.subscribe(assertTwoErrorsOnAttach);

        // attach entity
        em.attachEntity(employee);

    });

    function assertTwoErrorsOnAttach(errorsChangedArgs) {
        assertGotExpectedValErrorsCount(errorsChangedArgs, 2);
    }

    /*********************************************************
    * does NOT validate on attach when that ValidationOption turned off
    *********************************************************/
    test("does not validate on attach when validateOnAttach option is false", function () {
        expect(1);
        var em = newEm();  // new empty EntityManager

        // copy options, changing only "validateOnAttach"
        var valOpts = em.validationOptions.using({ validateOnAttach: false });

        // reset manager's options
        em.setProperties({ validationOptions: valOpts });

        var empType = getEmployeeType(em);

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(1);
        em.attachEntity(employee);

        var errors = employee.entityAspect.getValidationErrors();
        equal(errors.length, 0,
            "expected no validation errors and got: " +
                errors.map(function (a) {
                    return a.errorMessage;
                }));

    });

    /*********************************************************
    * Attached employee validation errors raised when properties set to bad values
    *********************************************************/
    test("Attached employee validation errors raised when properties set to bad values", function () {

        var em = newEm();  // new empty EntityManager
        var empType = getEmployeeType(em);

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(1);
        employee.FirstName("John");
        employee.LastName("Doe");

        // enter the cache as 'Unchanged'
        em.attachEntity(employee);

        // Start monitoring validation error changes
        employee.entityAspect
            .validationErrorsChanged.subscribe(assertValidationErrorsChangedRaised);

        employee.LastName(null); // 1. LastName is required

        employee.BirthDate(new Date()); // ok date

        employee.BirthDate(null); // ok. no problem; it's nullable

        employee.BirthDate("today"); // 2. Nice try! Wrong data type

        employee.EmployeeID(null); // 3. Id is the pk; automatically required

        employee.LastName( // 4. adds "too long", 5. removes "required", 
            "IamTheGreatestAndDontYouForgetIt");

        employee.entityAspect.rejectChanges(); // (6, 7, 8) remove ID, Date, LastName errs 

        expect(8); // asserts about validation errors

    });

    function assertValidationErrorsChangedRaised(errorsChangedArgs) {

        var addedMessages = errorsChangedArgs.added.map(function (a) {
            return a.errorMessage;
        });
        var addedCount = addedMessages.length;
        if (addedCount > 0) {
            ok(true, "added error: " + addedMessages.join(", "));
        }

        var removedMessages = errorsChangedArgs.removed.map(function (r) {
            return r.errorMessage;
        });
        var removedCount = removedMessages.length;
        if (removedCount > 0) {
            ok(true, "removed error: " + removedMessages.join(", "));
        }
    }
    /*********************************************************
    * Trigger KO computed property with validationErrorsChanged
    *********************************************************/
    test("Trigger KO computed property with validationErrorsChanged", function () {

        var em = newEm();  // new empty EntityManager
        var empType = getEmployeeType(em);
        
        var validationErrors = []; // for testing

        var employee = empType.createEntity(); // created but not attached
        employee.EmployeeID(1);
        employee.FirstName("John");
        employee.LastName("Doe");

        addhasValidationErrorsProperty(employee);

        // enter the cache as 'Unchanged'
        em.attachEntity(employee);

        // Start monitoring hasValidationErrors
        employee.hasValidationErrors.subscribe(hasValidationErrorsChanged);
        
        employee.LastName(null); // 1. LastName is required
        assertLastErrMessageIs("'LastName' is required");
        
        employee.BirthDate(new Date()); // ok date

        employee.BirthDate(null); // ok. no problem; it's nullable

        employee.BirthDate("today"); // 2. Nice try! Wrong data type
        assertLastErrMessageIs("'BirthDate' must be a date");

        employee.EmployeeID(null); // 3. Id is the pk; automatically required

        employee.LastName( // 4. adds "too long"; removes "required", 
            "IamTheGreatestAndDontYouForgetIt");
        assertLastErrMessageIs("'LastName' must be a string with");

        // removes errors one at a time
        // therefore should raise 'hasValidationErrors' 3x
        employee.entityAspect.rejectChanges(); // (5, 6, 7) remove ID, Date, LastName errs 
        
        equal(validationErrors.length, 7,
        "'hasValidationErrors' should have been raised 7 times");

        ok(!employee.hasValidationErrors(),
            "'hasValidationErrors' should be false after rejectChanges");

        expect(5);
        
        function hasValidationErrorsChanged() {
            // Test assumes that Breeze pushes new errors on to the end
            // This is undocumented behavior and should not be assumed
            var errors = employee.entityAspect.getValidationErrors();
            validationErrors.push(
                errors.length ? errors[errors.length - 1] : null);
        }

        function assertLastErrMessageIs(expectedMessage) {
            var lastErrMessage = validationErrors[validationErrors.length - 1].errorMessage;
            ok(lastErrMessage.startsWith(expectedMessage),
                "errorMessage should begin \"" + expectedMessage +
                 "\" and is \""+ lastErrMessage + "\".");
        }
    });

    // You might add to your entities to listen for changes 
    // to validation error state.
    // Best to call in a registered type initializer.
    function addhasValidationErrorsProperty(entity) {
       
        var prop = ko.observable(false);
        
        var onChange = function () {
            var hasError = entity.entityAspect.getValidationErrors().length > 0;        
            if (prop() === hasError) {
                // collection changed even though entity net error state is unchanged
                prop.valueHasMutated(); // force notification
            } else {
                prop(hasError); // change the value and notify
            }
        };
        
        onChange();             // check now ...
        entity.entityAspect // ... and when errors collection changes
            .validationErrorsChanged.subscribe(onChange);
        
        // observable property is wired up; now add it to the entity
        entity.hasValidationErrors = prop;
    }

    /*********************************************************
    * Auto property validation only for attached entity
    *********************************************************/
    test("Auto property validation only for attached entity", function () {
        expect(2);
        var emp = createEmployee();

        emp.EmployeeID(null); // value violates ID required

        // but didn't trigger property validation
        // because 'emp' is detached
        var errmsgs = getErrorMessages(emp);
        ok(errmsgs.length === 0,
            "Shows no errors before forced validation: \"{0}\"".format(errmsgs));

        // force validation
        emp.entityAspect.validateEntity();

        errmsgs = getErrorMessages(emp);
        ok(errmsgs.length > 0,
            "Detects errors after force validation: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Detaching entity clears validation errors
    *********************************************************/
    test("Detaching entity clears validation errors", function () {
        expect(3);
        var em = newEm();  // new empty EntityManager;

        var emp = em.createEntity('Employee');

        emp.EmployeeID(null); // value violates ID required

        var empIdErrors = emp.entityAspect.getValidationErrors('EmployeeID');

        ok(empIdErrors.length > 0,
            "New, attached entity has deliberately created EmployeeID error: \"{0}\"".format(
            empIdErrors[0].errorMessage));

        // detach
        em.detachEntity(emp);

        var errmsgs = getErrorMessages(emp);
        ok(errmsgs.length === 0,
            "Employee has no errors after it is detached: \"{0}\"".format(errmsgs));

        // force validation on detached entity
        emp.entityAspect.validateEntity();

        errmsgs = getErrorMessages(emp);
        ok(errmsgs.length > 0,
            "Detached entities has errors after force validation: \"{0}\"".format(errmsgs));
    });

    /****** CUSTOM VALIDATORS *******/

    // custom validator ensures "Country" is US
    // validator needs no parameters
    var countryIsUSValidator = new Validator(
        "countryIsUS",              // validator name
        countryIsUSValidationFn,    // validation function
        {                           // validator context
            messageTemplate: "'%displayName%' must start with 'US'"
        });

    function countryIsUSValidationFn(value) {
        if (value == null) return true; // '== null' matches null and empty string
        return value.toUpperCase().startsWith("US");
    };

    // validator takes a country parameter so we wrap it in
    // a "validator factory". At runtime, call with the country parameter
    // and it returns a countryValidator with parameters filled
    function countryValidatorFactory(context) {

        return new Validator(
            "countryIsIn",        // validator name
            countryValidationFn,  // validation function
            {                     // validator context
                messageTemplate: "'%displayName%' must start with '%country%'",
                country: context.country
            });
    }

    function countryValidationFn(value, context) {
        if (value == null) return true; // '== null' matches null and empty string
        return value.toUpperCase().startsWith(context.country.toUpperCase());
    };
    
    // The value to assess will be an entity 
    // with Country and PostalCode properties
    function zipCodeValidationFn(entity, context) {
        // This validator only validates US Zip Codes.
        if (entity.getProperty("Country") === "USA") {
            var postalCode = entity.getProperty("PostalCode");
            context.postalCode = postalCode;
            return isValidZipCode(postalCode);
        }
        return true;
    };

    function isValidZipCode(value) {
        var re = /^\d{5}([\-]\d{4})?$/;
        return (re.test(value));
    }

    var zipCodeValidator = new Validator(
        "zipCodeValidator",
         zipCodeValidationFn,
        { messageTemplate: "'%postalCode%' is not a valid US zip code" });

    /*********************************************************
    * Employee can be from Canada (before countryIsInUS validator)
    *********************************************************/
    test("Employee can be from Canada (before countryIsInUS validator)", function () {
        expect(1);
        var emp = createEmployee("Wayne", "Gretzky");
        emp.Country("Canada");

        // force validation of unattached employee
        emp.entityAspect.validateEntity();

        // Ok for employee to be from Canada
        var errmsgs = getErrorMessages(emp);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Employee must be from US (after countryIsInUS validator)
    *********************************************************/
    test("Employee must be from US (after countryIsInUS validator)", function () {
        expect(2);
        var em = newEm();
        var emp = createEmployee("Shania", "Twain");
        emp.EmployeeID(1);
        em.attachEntity(emp);

        // add the US-only validator
        emp.entityType
            .getProperty("Country")
            .validators.push(countryIsUSValidator);

        // non-US employees no longer allowed 
        emp.Country("CA");
        var errmsgs = getErrorMessages(emp);
        ok(errmsgs.length !== 0,
            "should have 1 error: \"{0}\"".format(errmsgs));

        // back in the USA 
        emp.Country("USA");
        errmsgs = getErrorMessages(emp);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Customer must be from US (after countryIsInUS validator)
    * Illustrates reuse of validator on different entity type
    *********************************************************/
    test("Customer must be in US (after countryIsInUS Validator)", function () {
        expect(2);
        var em = newEm();
        var cust = createCustomer("Univ. of Waterloo");
        cust.CustomerID(testFns.newGuidComb());
        em.attachEntity(cust);

        // add the US-only validator
        cust.entityType
            .getProperty("Country")
            .validators.push(countryIsUSValidator);

        cust.Country("Canada");
        var errmsgs = getErrorMessages(cust);
        ok(errmsgs.length !== 0,
            "should have 1 error: \"{0}\"".format(errmsgs));

        cust.Country("USA");
        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Customer must be from Canada (after configured countryValidator)
    * Illustrates reuse of validator on different entity type
    *********************************************************/
    test("Customer must be in Canada (after configured countryValidator)", function () {
        expect(2);
        var em = newEm();

        // create a Canada-only validator
        var canadaOnly = countryValidatorFactory({ country: "Canada" });

        // add the Canada-only validator
        getCustomerType(em)
            .getProperty("Country")
            .validators.push(canadaOnly);

        var cust = createCustomer("Univ. of Waterloo");
        cust.CustomerID(testFns.newGuidComb());
        em.attachEntity(cust);
        cust.Country("USA"); // try to sneak it into the USA

        var errmsgs = getErrorMessages(cust);
        ok(errmsgs.length !== 0,
            "should have 1 error: \"{0}\"".format(errmsgs));

        cust.Country("Canada"); // back where it belongs
        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * US Customer must have valid zip code
    *********************************************************/
    test("US Customer must have valid zip code", function () {
        expect(2);
        var em = newEm();

        // add US zip code validator to the entity (not to a property)
        getCustomerType(em)
            .validators.push(zipCodeValidator);

        var cust = createCustomer("Boogaloo Board Games");
        cust.CustomerID(testFns.newGuidComb());
        em.attachEntity(cust);
        
        cust.Country("USA");
        cust.PostalCode("N2L 3G1"); // a Canadian postal code

        // Validate the entire entity to engage this rule
        cust.entityAspect.validateEntity();

        var errmsgs = getErrorMessages(cust);
        ok(errmsgs.length !== 0,
            "should have 1 error: \"{0}\"".format(errmsgs));

        cust.Country("Canada");

        cust.entityAspect.validateEntity();

        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Remove a rule ... and an error
    *********************************************************/
    test("Remove a rule", function () {
        expect(2);
        var em = newEm();

        var alwaysWrong = new Validator(
            "alwaysWrong",
            function () { return false; },
            { message: "You are always wrong!" }
        );

        var custValidators = getCustomerType(em).validators;

        // add alwaysWrong to the entity (not to a property)
        custValidators.push(alwaysWrong);

        var cust = createCustomer("Presumed Guilty");
        cust.CustomerID(testFns.newGuidComb());
        
        // Attach triggers entity validation by default
        em.attachEntity(cust);

        var errmsgs = getErrorMessages(cust);

        ok(errmsgs.length !== 0,
            "should have 1 error: \"{0}\"".format(errmsgs));

        // remove validation rule
        custValidators.splice(custValidators.indexOf(alwaysWrong), 1);

        // Clear out the "alwaysWrong" error
        // Must do manually because that rule is now gone
        // and, therefore, can't cleanup after itself
        cust.entityAspect.removeValidationError(ValidationError.getKey(alwaysWrong));

        cust.entityAspect.validateEntity(); // re-validate

        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors: \"{0}\"".format(errmsgs));
    });

    /*********************************************************
    * Add and remove a (fake) ValidationError
    *********************************************************/
    test("Add and remove a (fake) ValidationError", function () {
        expect(3);
        var em = newEm();

        // We need a validator to make a ValidationError
        // but it could be anything and we won't bother to register it
        var fakeValidator = new Validator(
            "fakeValidator",
            function () { return false; },
            { message: "You are always wrong!" }
        );
       
        var cust = createCustomer("Presumed Guilty");
        cust.CustomerID(testFns.newGuidComb());
        em.attachEntity(cust);
        
        var errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors at test start: \"{0}\"".format(errmsgs));
        
        // create a fake error
        var fakeError = new breeze.ValidationError(
            fakeValidator,                // the marker validator
            {},                           // validation context
            "You were wrong this time!"   // error message
        );
        
        // add the fake error
        cust.entityAspect.addValidationError(fakeError);

        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length !== 0,
            "should have 1 error after add: \"{0}\"".format(errmsgs));

        // Now remove that error
        cust.entityAspect.removeValidationError(fakeError);

        cust.entityAspect.validateEntity(); // re-validate

        errmsgs = getErrorMessages(cust);
        ok(errmsgs.length === 0,
            "should have no errors after remove: \"{0}\"".format(errmsgs));
    });

  /*********************************************************
   * Validation message tests
   *********************************************************/
    test("int32 validator default message reports 'Value' out of range in English", function () {
      var validator = breeze.Validator.int32();
      var result = validator.validate(21474836470); // 10x larger than int32
      var emsg = result.errorMessage;
      ok(/must be an integer between the values of -2147483648 and 2147483647/.test(emsg),
        'message was: ' + emsg);
    });

    test("int32 validator default message reports out of range w/ specified display name", function () {
      var validator = breeze.Validator.int32();
      var result = validator.validate(21474836470, {displayName: 'Foo'}); // 10x larger than int32
      var emsg = result.errorMessage;
      ok(/'Foo' must be an integer between the values of -2147483648 and 2147483647/.test(emsg),
        'message was: ' + emsg);
    });

    test("int32 validator has min/max value in context object", function () {
      var validator = breeze.Validator.int32();
      var result = validator.validate(21474836470); // 10x larger than int32
      var ctx = result.context;
      equal(ctx.min, -2147483648, "should have context.min of " + -2147483648);
      equal(ctx.max, 2147483647, "should have context.max of " + 2147483647);
    });

    test("int32 validator message is registered in messageTemplates", function () {
      // import metadata triggered registration of message template for 'int32'
      var msgTempl = breeze.Validator.messageTemplates['int32'];
      ok(msgTempl, 'should have message template; is ' + msgTempl);
    });

    test("int32 validator message in messageTemplates can be changed", function () {
      // import metadata triggered registration of message template for 'int32'
      var origTemplate = breeze.Validator.messageTemplates['int32'];
      try {
        // redefine default template (should do BEFORE anything else, especially metadata import
        breeze.Validator.messageTemplates['int32'] =
            "'%displayName%' value, %value%, is not an int32 between %min% and %max%.";

        var validator = breeze.Validator.int32(); // create using new template
        var result = validator.validate(21474836470, { displayName: 'Bar' }); // 10x larger than int32
        var emsg = result.errorMessage;
        ok(/'Bar' value, 21474836470, is not an int32/.test(emsg),
          'message was: ' + emsg);
      } finally {
        // restore original template
        breeze.Validator.messageTemplates['int32'] = origTemplate;
      }
    });

    test("int32 validator instance message can be changed", function () {
      var validator = breeze.Validator.int32();

      // redefine the validator instance's message
      validator.context.messageTemplate =
          "'%displayName%' value, %value%, is not an int32 between %min% and %max%.";

      var result = validator.validate(21474836470, { displayName: 'Baz' }); // 10x larger than int32
      var emsg = result.errorMessage;
      ok(/'Baz' value, 21474836470, is not an int32/.test(emsg),
        'message was: ' + emsg);
    });
    /*********************************************************
    * TEST HELPERS
    *********************************************************/

    function assertGotExpectedValErrorsCount(errorsChangedArgs, expected) {
        var addedMessages = errorsChangedArgs.added.map(function (a) {
            return a.errorMessage;
        });
        var addedCount = addedMessages.length;
        var pass;
        if (typeof expected === "number") {
            pass = addedCount === expected;
        } else {
            pass = addedCount > 0;
            expected = "some";
        }
        ok(pass,
            "Expected {0} validation errors, got {1}: {2}".format(
                expected, addedCount, addedMessages.join(", ")));
    }

    function getErrorMessages(entity) {
        return getErrorMessagesArray(entity).join(", ");
    }

    function getErrorMessagesArray(entity) {
        return entity.entityAspect
            .getValidationErrors()
            .map(function(err) { return err.errorMessage; });
    }

    function createCustomer(name) {
        var entityType = getCustomerType();
        var cust = entityType.createEntity({
             CompanyName: name || "Acme"
        });
        return cust;
    }
    
    function createEmployee(firstName, lastName) {
        var entityType = getEmployeeType();
        var emp = entityType.createEntity({
            FirstName: firstName || "John",
            LastName: lastName || "Doe"
        });
        return emp;
    }
    function getEmployeeType(em) {
        return getMetadataStore(em).getEntityType("Employee");
    }
    function getCustomerType(em) {
        return getMetadataStore(em).getEntityType("Customer");
    }

    function getMetadataStore(em) {
        return (em) ? em.metadataStore : newEm.options.metadataStore;
    }

    function cloneMetadataStore(metadataStore) {
        return new breeze.MetadataStore()
            .importMetadata(metadataStore.exportMetadata());
    };

})(docCode.testFns);