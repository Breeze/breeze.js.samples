(function(exports){
    'use strict';

    var fs = require('fs');
    var breezeSequelize = require('breeze-sequelize');
    var uuid = require('node-uuid');
    var Promise = require('bluebird');

    var SequelizeManager = breezeSequelize.SequelizeManager;
    var SequelizeQuery = breezeSequelize.SequelizeQuery;
    var SequelizeSaveHandler = breezeSequelize.SequelizeSaveHandler;

    var breeze = breezeSequelize.breeze;
    var EntityQuery = breeze.EntityQuery;

    //don't forget to run db-script/create-temphire-user.sql script
    var dbConfig = {
        host: 'localhost',
        user: 'temphire',
        password: 'password',
        dbName: 'temphire'
    };

    var _sequelizeManager = createSequelizeManager();

    _sequelizeManager.sync(true)
       .then(seed)
       .then(function() {
           console.log('db init successful');
       });

    exports.init = init;

    function init(app) {
        app.get('/breeze/Metadata', ensureAuthenticated, function (req, res, next) {
            try {
                var metadata = readMetadata();
                res.send(metadata);
            } catch(e){
                next(e);
            }
        });

        app.get('/breeze/resourcemgt/Lookups', ensureAuthenticated, function(req, res, next){
            var entityQueries = ['AddressTypes', 'PhoneNumberTypes', 'RateTypes', 'States'].map(function(resourceName){
                return EntityQuery.fromUrl(req.url, resourceName);
            });

            var flattenLookupsArrayFn = function(results, res) {
                var flattened = results.reduce(function(a, b) { return a.concat(b); });
                returnResults(flattened, res);
            };

            executeEntityQueries(entityQueries, flattenLookupsArrayFn, res, next);
        });

        app.get('/breeze/resourcemgt/StaffingResourceListItems', ensureAuthenticated, function(req, res, next) {
            var entityQuery = EntityQuery.fromUrl(req.url, 'StaffingResources').expand('Addresses.State, PhoneNumbers');
            var projectResultsFn = function(staffingResources, res) {
                var projections = staffingResources.map(function(staffingResource) {
                    var primaryAddress = staffingResource.Addresses.filter(function(o) { return o.Primary; })[0];
                    var primaryPhoneNumber = staffingResource.PhoneNumbers.filter(function(o) { return o.Primary; })[0];
                    return {
                        Id: staffingResource.Id,
                        FullName: !(staffingResource.MiddleName == null || staffingResource.MiddleName.trim() === '')
                                ? staffingResource.FirstName.trim() + " " + staffingResource.MiddleName.trim() + " " + staffingResource.LastName.trim()
                                : staffingResource.FirstName.trim() + " " + staffingResource.LastName.trim(),
                        Address1: primaryAddress.Address1,
                        Address2: primaryAddress.Address2,
                        City: primaryAddress.City,
                        State: primaryAddress.State.ShortName || findState(primaryAddress.State),
                        Zipcode: primaryAddress.Zipcode,
                        PhoneNumber: "(" + primaryPhoneNumber.AreaCode + ") " + primaryPhoneNumber.Number
                    };

                    //this is a hack/workaround for a breeze bug
                    function findState(state) {
                        return staffingResources
                            .map(function(sr) { return sr.Addresses; })
                            .reduce(function(a, b) { return a.concat(b); })
                            .filter(function(addr) { return state.$ref === addr.State.$id && addr.State.ShortName; })[0]
                            .State.ShortName;
                    }
                });
                returnResults(projections, res);
            };
            executeEntityQuery(entityQuery, projectResultsFn, res, next);
        });

        app.get('/breeze/resourcemgt/:entity', ensureAuthenticated, function (req, res, next) {
            var resourceName = req.params.entity;
            var entityQuery = EntityQuery.fromUrl(req.url, resourceName);
            executeEntityQuery(entityQuery, null, res, next);
        });

        app.post('/breeze/resourcemgt/SaveChanges', ensureAuthenticated, function (req, res, next) {
            var saveHandler = new SequelizeSaveHandler(_sequelizeManager, req);
            saveHandler.save().then(function(r) {
                returnResults(r, res);
            }).catch(function(e) {
                next(e);
            });
        });

        function ensureAuthenticated(req, res, next) {
            if(req.isAuthenticated()) { return next(); }
            res.status(401).end();
        }
    }

    function seed() {
        // Seed data
        var addressTypes = [
            {Id: uuid.v1(), Name: "Mailing", DisplayName: "Mailing Address", Default: true},
            {Id: uuid.v1(), Name: "Home", DisplayName: "Home Address"},
            {Id: uuid.v1(), Name: "Work", DisplayName: "Work Address"}
        ];

        var phoneTypes = [
            {Id: uuid.v1(), Name: "Home", Default: true},
            {Id: uuid.v1(), Name: "Work"},
            {Id: uuid.v1(), Name: "Mobile"}
        ];

        var rateTypes = [
            {Id: uuid.v1(), Name: "hourly", DisplayName: "Per Hour", Sequence: 0},
            {Id: uuid.v1(), Name: "daily", DisplayName: "Per Day", Sequence: 1},
            {Id: uuid.v1(), Name: "weekly", DisplayName: "Per Week", Sequence: 2},
            {Id: uuid.v1(), Name: "monthly", DisplayName: "Per Month", Sequence: 3}
        ];

        var states = [
            {Id: uuid.v1(), ShortName: "AL", Name: "Alabama"},
            {Id: uuid.v1(), ShortName: "AK", Name: "Alaska"},
            {Id: uuid.v1(), ShortName: "AZ", Name: "Arizona"},
            {Id: uuid.v1(), ShortName: "AR", Name: "Arkansas"},
            {Id: uuid.v1(), ShortName: "CA", Name: "California"},
            {Id: uuid.v1(), ShortName: "CO", Name: "Colorado"},
            {Id: uuid.v1(), ShortName: "CT", Name: "Connecticut"},
            {Id: uuid.v1(), ShortName: "DE", Name: "Delaware"},
            {Id: uuid.v1(), ShortName: "DC", Name: "District of Columbia"},
            {Id: uuid.v1(), ShortName: "FL", Name: "Florida"},
            {Id: uuid.v1(), ShortName: "GA", Name: "Georgia"},
            {Id: uuid.v1(), ShortName: "HI", Name: "Hawaii"},
            {Id: uuid.v1(), ShortName: "ID", Name: "Idaho"},
            {Id: uuid.v1(), ShortName: "IL", Name: "Illinois"},
            {Id: uuid.v1(), ShortName: "IN", Name: "Indiana"},
            {Id: uuid.v1(), ShortName: "IA", Name: "Iowa"},
            {Id: uuid.v1(), ShortName: "KS", Name: "Kansas"},
            {Id: uuid.v1(), ShortName: "KY", Name: "Kentucky"},
            {Id: uuid.v1(), ShortName: "LA", Name: "Louisiana"},
            {Id: uuid.v1(), ShortName: "ME", Name: "Maine"},
            {Id: uuid.v1(), ShortName: "MD", Name: "Maryland"},
            {Id: uuid.v1(), ShortName: "MA", Name: "Massachusetts"},
            {Id: uuid.v1(), ShortName: "MI", Name: "Michigan"},
            {Id: uuid.v1(), ShortName: "MN", Name: "Minnesota"},
            {Id: uuid.v1(), ShortName: "MS", Name: "Mississippi"},
            {Id: uuid.v1(), ShortName: "MO", Name: "Missouri"},
            {Id: uuid.v1(), ShortName: "MT", Name: "Montana"},
            {Id: uuid.v1(), ShortName: "NE", Name: "Nebraska"},
            {Id: uuid.v1(), ShortName: "NV", Name: "Nevada"},
            {Id: uuid.v1(), ShortName: "NH", Name: "New Hampshire"},
            {Id: uuid.v1(), ShortName: "NJ", Name: "New Jersey"},
            {Id: uuid.v1(), ShortName: "NM", Name: "New Mexico"},
            {Id: uuid.v1(), ShortName: "NY", Name: "New York"},
            {Id: uuid.v1(), ShortName: "NC", Name: "North Carolina"},
            {Id: uuid.v1(), ShortName: "ND", Name: "North Dakota"},
            {Id: uuid.v1(), ShortName: "OH", Name: "Ohio"},
            {Id: uuid.v1(), ShortName: "OK", Name: "Oklahoma"},
            {Id: uuid.v1(), ShortName: "OR", Name: "Oregon"},
            {Id: uuid.v1(), ShortName: "PA", Name: "Pennsylvania"},
            {Id: uuid.v1(), ShortName: "RI", Name: "Rhode Island"},
            {Id: uuid.v1(), ShortName: "SC", Name: "South Carolina"},
            {Id: uuid.v1(), ShortName: "SD", Name: "South Dakota"},
            {Id: uuid.v1(), ShortName: "TN", Name: "Tennessee"},
            {Id: uuid.v1(), ShortName: "TX", Name: "Texas"},
            {Id: uuid.v1(), ShortName: "UT", Name: "Utah"},
            {Id: uuid.v1(), ShortName: "VT", Name: "Vermont"},
            {Id: uuid.v1(), ShortName: "VA", Name: "Virginia"},
            {Id: uuid.v1(), ShortName: "WA", Name: "Washington"},
            {Id: uuid.v1(), ShortName: "WV", Name: "West Virginia"},
            {Id: uuid.v1(), ShortName: "WI", Name: "Wisconsin"},
            {Id: uuid.v1(), ShortName: "WY", Name: "Wyoming"},
            {Id: uuid.v1(), ShortName: "--", Name: "International"}
        ];

        var promises = Promise.all([
                seedAddressTypes(),
                seedPhoneTypes(),
                seedRateTypes(),
                seedStates(),
                seedStaffingResources()
            ]);

        return promises;

        function seedAddressTypes() {
            var AddressTypes = _sequelizeManager.models.AddressTypes;
            return AddressTypes.bulkCreate(addressTypes);
        }

        function seedPhoneTypes() {
            var PhoneNumberTypes = _sequelizeManager.models.PhoneNumberTypes;
            return PhoneNumberTypes.bulkCreate(phoneTypes);
        }

        function seedRateTypes() {
            var RateTypes = _sequelizeManager.models.RateTypes;
            return RateTypes.bulkCreate(rateTypes);
        }

        function seedStates() {
            var States = _sequelizeManager.models.States;
            return States.bulkCreate(states);
        }

        function seedStaffingResources() {
            var context = {
                StaffingResources: [],
                Addresses: [],
                PhoneNumbers: [],
                Rates: [],
                WorkExperienceItems: [],
                Skills: []
            };
            // Sample data
            var r = newStaffingResource("Nancy", "Lynn", "Davolio",
                "Education includes a BA in psychology from Colorado State University in 1970.  She also completed \"The Art of the Cold Call.\"  Nancy is a member of Toastmasters International.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "507 - 20th Ave. E.", "Apt. 2A", "Seattle",
                states[47],
                "98122", true));
            context.Addresses.push(newAddress(r, addressTypes[1], "449 11th Ave W", "Suite 101", "Seattle", states[47],
                "98123",
                false));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "206", "555-9857", true));
            context.Rates.push(newRate(r, rateTypes[0], 100));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4),
                "Concord Catalogs",
                "Concord MA", "Sales Representative",
                "Tripled sales every three years.  Exceeded sales target every quarter."));
            context.WorkExperienceItems.push(newWork(r, new Date(1995, 8, 5), new Date(2000, 2, 14),
                "Cyberbiz",
                "San Francisco CA", "Business Development Executive",
                "Targeted clients and found new business through all the sales avenues, including cold calling, email marketing, direct face to face meetings etc."));
            context.WorkExperienceItems.push(newWork(r, new Date(2000, 2, 14), new Date(2011, 3, 18),
                "IIBSIS Global",
                "New York NY", "Business Development Sales Executive",
                "Sold business intelligence to a wide variety of industry verticals including finance, consulting, accounting, manufacturing."));
            context.Skills.push(newSkill(r, "Sales"));

            r = newStaffingResource("Andrew", "I", "Fuller",
                "Andrew received his BTS commercial in 1974 and a Ph.D. in international marketing from the University of Dallas in 1981.  He is fluent in French and Italian and reads German.  He joined the company as a sales representative, was promoted to sales manager in January 1992 and to vice president of sales in March 1993.  Andrew is a member of the Sales Management Roundtable, the Seattle Chamber of Commerce, and the Pacific Rim Importers Association.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "908 W. Capital Way", "", "Tacoma", states[47],
                "98401", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "206", "555-9482", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "206", "555-0123", false));
            context.Rates.push(newRate(r, rateTypes[0], 180));
            context.Rates.push(newRate(r, rateTypes[1], 1000));
            context.WorkExperienceItems.push(newWork(r, new Date(1992, 8, 22), new Date(1999, 8, 4),
                "Famous Footware",
                "Lightfoot PA", "Marketing Manager",
                "Launched 3 effective campaigns for new products."));
            context.WorkExperienceItems.push(newWork(r, new Date(1999, 8, 5), new Date(2002, 6, 1),
                "Logorific",
                "Grand Rapids, MI", "Sales & Marketing Account Executive",
                "Worked with local chambers of commerce and town halls to set up a distribution point for marketing materials."));
            context.WorkExperienceItems.push(newWork(r, new Date(2002, 6, 2), new Date(2011, 9, 5),
                "Start This",
                "Palo Alto CA", "Head of Marketing",
                "Built and executed marketing and PR strategy from scratch, including positioning, brand identity, pricing and product definition."));
            context.Skills.push(newSkill(r, "Sales"));
            context.Skills.push(newSkill(r, "Marketing"));

            r = newStaffingResource("Janet", "N", "Leverling",
                "Janet has a BS degree in chemistry from Boston College (1984).  She has also completed a certificate program in food retailing management.  Janet was hired as a sales associate in 1991 and promoted to sales representative in February 1992.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "722 Moss Bay Blvd.", "", "Kirkland", states[47],
                "98033",
                true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "206", "555-3412", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "206", "555-3355", false));
            context.Rates.push(newRate(r, rateTypes[0], 50));
            context.Rates.push(newRate(r, rateTypes[1], 300));
            context.WorkExperienceItems.push(newWork(r, new Date(1992, 4, 1), new Date(1998, 3, 1),
                "Hobson Foods",
                "Tacoma WA", "Junior Chemist",
                "Developed new food additives.  Was banned from employeed cafeteria."));
            context.WorkExperienceItems.push(newWork(r, new Date(1998, 3, 2), new Date(1995, 8, 4),
                "Pharmabiz",
                "Wilmington NC", "Chemist",
                "Responsible for validation of analytical methods and testing in support of pharmaceutical product development."));
            context.WorkExperienceItems.push(newWork(r, new Date(1995, 8, 4), new Date(2009, 12, 21), "Colaca",
                "Point Comfort TX", "Senior Chemist",
                "Provided technical analytical support to the laboratory for day-to-day operations and long term technical advancement of the department."));
            context.Skills.push(newSkill(r, "Sales"));
            context.Skills.push(newSkill(r, "Chemistry"));

            r = newStaffingResource("Margaret", "G", "Peacock",
                "Margaret holds a BA in English literature from Concordia College (1958) and an MA from the American Institute of Culinary Arts (1966).  She was assigned to the London office temporarily from July through November 1992.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "4110 Old Redmond Rd.", "", "Redmond", states[47],
                "98052",
                true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "206", "555-8122", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "206", "555-5176", false));
            context.Rates.push(newRate(r, rateTypes[0], 50));
            context.Rates.push(newRate(r, rateTypes[1], 300));
            context.WorkExperienceItems.push(newWork(r, new Date(1993, 5, 3), new Date(1998, 3, 1),
                "Sylvan Software",
                "Tacoma WA", "Developer",
                "Co-developed internal database system.  Put all data in a single table to conserve space."));
            context.WorkExperienceItems.push(newWork(r, new Date(1998, 3, 2), new Date(2008, 5, 5),
                "Big Man Industries",
                "Champaign IL", "Developer", "Silverlight and web applications."));
            context.Skills.push(newSkill(r, "C++"));


            context.Skills.push(newSkill(r, "SQL"));

            r = newStaffingResource("Steven", "T", "Buchanan",
                "Steven Buchanan graduated from St. Andrews University, Scotland, with a BSC degree in 1976.  Upon joining the company as a sales representative in 1992, he spent 6 months in an orientation program at the Seattle office and then returned to his permanent post in London.  He was promoted to sales manager in March 1993.  Mr. Buchanan has completed the courses \"Successful Telemarketing\" and \"International Sales Management.\"  He is fluent in French.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "14 Garrett Hill", "", "London", states[51],
                "SW1 8JR", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "071", "555-4848", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "071", "555-3453", false));
            context.Rates.push(newRate(r, rateTypes[0], 50));
            context.Rates.push(newRate(r, rateTypes[1], 300));
            context.Rates.push(newRate(r, rateTypes[2], 1500));
            context.Rates.push(newRate(r, rateTypes[2], 6000));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4),
                "AeroDef Sales",
                "Virginia Beach VA", "Vertical Sales Manager, Army East",
                "Developed business relationships with key decision makers at the Command, Division, Brigade, etc. levels."));
            context.WorkExperienceItems.push(newWork(r, new Date(1995, 8, 4), new Date(2002, 2, 6),
                "FireControl",
                "Tampa FL", "Residential Sales Manager",
                "Implemented new sales techniques to increase business in new territory"));

            r = newStaffingResource("Michael", "", "Suyama",
                "Michael is a graduate of Sussex University (MA, economics, 1983) and the University of California at Los Angeles (MBA, marketing, 1986).  He has also taken the courses \"Multi-Cultural Selling\" and \"Time Management for the Sales Professional.\"  He is fluent in Japanese and can read and write French, Portuguese, and Spanish.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "Coventry House  Miner Rd.", "", "London",
                states[51],
                "EC2 7JR", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "071", "555-7773", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "071", "555-0428", false));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1994, 1, 1), "Rainout",
                "Oakland CA", "CRM Analyst",
                "Responsible for all aspects of CRM business management and marketing development."));
            context.WorkExperienceItems.push(newWork(r, new Date(1995, 1, 2), new Date(2005, 10, 30),
                "Planatele",
                "Chicago IL", "Field Sales Account Manager",
                "Expanded account penetration by increasing share of total year over year spend."));

            r = newStaffingResource("Laura", "A", "Callahan",
                "Laura received a BA in psychology from the University of Washington.  She has also completed a course in business French.  She reads and writes French.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "4726 - 11th Ave. N.E.", "", "Seattle", states[47],
                "98105",
                true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "206", "555-1189", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "206", "555-2344", false));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4), "Careste",
                "Fort Lauderdale FL", "Sales Development Associate",
                "Soliciting accounts and contacting existing customers to promote sales."));
            context.WorkExperienceItems.push(newWork(r, new Date(2002, 2, 18), new Date(2009, 12, 24),
                "Silent Hill",
                "Atlanta GA", "Legal eagle",
                "Passion for innovation, creativity and continuous improvement."));

            r = newStaffingResource("Anne", "F", "Dodsworth",
                "Anne has a BA degree in English from St. Lawrence College.  She is fluent in French and German.");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "7 Houndstooth Rd.", "", "London", states[51],
                "WG2 7LT",
                true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "071", "555-4444", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "071", "555-0452", false));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4),
                "TigerGate",
                "Bellvue WA", "Editorial Program Manager",
                "Defined guidelines and policies for the landing page content selection and promotion."));
            context.WorkExperienceItems.push(newWork(r, new Date(1999, 3, 21), new Date(2011, 6, 1),
                "ProTrans",
                "Coral Gables FL", "Linguistic Coder",
                "Liaison between the developers and the client. Helps communicate thoughts and ideas into values which are structured and analyzed."));

            r = newStaffingResource("Pearl", "P", "Pindlegrass",
                "Holds the MA degree in Education from UC Berkeley");
            context.StaffingResources.push(r);
            context.Addresses.push(newAddress(r, addressTypes[0], "18233 N.Wunderkindt", "", "Munich", states[35],
                "32382",
                true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[0], "382", "293-2938", true));
            context.PhoneNumbers.push(newPhone(r, phoneTypes[1], "382", "555-2938", false));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4),
                "Reynolds School District", "Grenville PA", "German Teacher",
                "Pennsylvania Foreign Language (German) Teacher Certification"));
            context.WorkExperienceItems.push(newWork(r, new Date(1996, 9, 1), new Date(1997, 6, 16),
                "Phillips Academy",
                "Andover MA", "Visiting Scholar", "One-year teaching fellowship."));
            context.WorkExperienceItems.push(newWork(r, new Date(1989, 6, 22), new Date(1995, 8, 4), "TeachCo",
                "New Rochelle NY", "Special Educator", "NYS Certified"));

            var promises = [];
            Object.keys(context).forEach(function(k){
                var model = _sequelizeManager.models[k];
                promises.push(model.bulkCreate(context[k]));
            });

            return Promise.all(promises);

            function newStaffingResource(first, middle, last, summary) {
                return {
                    Id: uuid.v1(),
                    FirstName: first,
                    MiddleName: middle,
                    LastName: last,
                    Summary: summary,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }

            function newAddress(staffingResource, type, address1, address2, city, state, zip, primary) {
                return {
                    Id: uuid.v1(),
                    AddressTypeId: type.Id,
                    Address1: address1,
                    Address2: address2,
                    City: city,
                    StateId: state.Id,
                    Zipcode: zip,
                    StaffingResourceId: staffingResource.Id,
                    Primary: primary,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }

            function newPhone(staffingResource, type, areaCode, phone, primary) {
                return {
                    Id: uuid.v1(),
                    PhoneNumberTypeId: type.Id,
                    AreaCode: areaCode,
                    Number: phone,
                    StaffingResourceId: staffingResource.Id,
                    Primary: primary,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }

            function newRate(staffingResource, type, amount) {
                return {
                    Id: uuid.v1(),
                    RateTypeId: type.Id,
                    Amount: amount,
                    StaffingResourceId: staffingResource.Id,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }

            function newWork(staffingResource, from, to, company, location, title, description) {
                return {
                    Id: uuid.v1(),
                    StaffingResourceId: staffingResource.Id,
                    From: from,
                    To: to,
                    Company: company,
                    Location: location,
                    PositionTitle: title,
                    Description: description,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }

            function newSkill(staffingResource, desc) {
                return {
                    Id: uuid.v1(),
                    Description: desc,
                    StaffingResourceId: staffingResource.Id,
                    Created: new Date(),
                    CreatedUser: "SampleData",
                    Modified: new Date(),
                    ModifyUser: "SampleData"
                };
            }
        }
    }

    function createSequelizeManager() {
        var metadata = readMetadata();
        var sm = new SequelizeManager(dbConfig);
        sm.importMetadata(metadata);

        return sm;
    }

    function readMetadata() {
        var filename = "TempHireMetadata.json";
        if (!fs.existsSync(filename)) {
            throw new Error("Unable to locate file: " + filename);
        }
        var metadata = fs.readFileSync(filename, 'utf8');
        return JSON.parse(metadata);
    }

    function executeEntityQuery(entityQuery, returnResultsFn, res, next) {
        var returnResultsFn = returnResultsFn || returnResults;
        var query = new SequelizeQuery(_sequelizeManager, entityQuery);
        query.execute().then(function (r) {
            returnResultsFn(r, res);
        }).catch(next)
    }

    function executeEntityQueries(entityQueries, returnResultsFn, res, next) {
        var returnResultsFn = returnResultsFn || returnResults;
        var promises = entityQueries.map(function(entityQuery){
            var query = new SequelizeQuery(_sequelizeManager, entityQuery);
            return query.execute();
        });
        Promise.all(promises).then(function(results) {
            returnResultsFn(results, res);
        }).catch(next);
    }

    function returnResults(results, res) {
        res.setHeader("Content-Type:", "application/json");
        res.send(results);
    }

})(module.exports);
