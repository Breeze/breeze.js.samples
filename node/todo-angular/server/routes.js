(function(exports){
    'use strict';

    var fs = require('fs');
    var breezeSequelize = require('breeze-sequelize');

    var SequelizeManager = breezeSequelize.SequelizeManager;
    var SequelizeQuery = breezeSequelize.SequelizeQuery;
    var SequelizeSaveHandler = breezeSequelize.SequelizeSaveHandler;

    var breeze = breezeSequelize.breeze;
    var EntityQuery = breeze.EntityQuery;

    //this assumes user 'demo' exists and has db privileges
    var dbConfig = {
        host: "localhost",
        user: "demo",
        password: "password",
        dbName: 'todos'
    };

    //if this flag is set to false, we're using 'mysql' which is the default
    var usePostgres = false;
    var _sequelizeManager = createSequelizeManager(usePostgres);

    if(!usePostgres) {
        _sequelizeManager.sync(true).then(seed).then(function () {
            console.log('db init successful');
        });
    }

    exports.init = init;

    function init(app) {
        app.get('/breeze/todos/Metadata', function (req, res, next) {
            try {
                var metadata = readMetadata();
                res.send(metadata);
            } catch(e){
                next(e);
            }
        });

        app.get('/breeze/todos/:entity', function (req, res, next) {
            var resourceName = req.params.entity;
            var entityQuery = EntityQuery.fromUrl(req.url, resourceName);
            executeEntityQuery(entityQuery, null, res, next);
        });

        app.post('/breeze/todos/SaveChanges', function (req, res, next) {
            var saveHandler = new SequelizeSaveHandler(_sequelizeManager, req);
            saveHandler.save().then(function(r) {
                returnResults(r, res);
            }).catch(function(e) {
                next(e);
            });
        });

        app.post('/breeze/todos/purge', function(req, res, next){
            purge().then(function(){
               res.send('purged');
            });
        });

        app.post('/breeze/todos/reset', function(req, res, next){
            purge().then(seed).then(function(){
                res.send('reset');
            });
        });
    }

    function seedIfNoRows() {
        var Todos = _sequelizeManager.models.Todos;
        return Todos.count().then(function(c){
            if (c === 0) {
                return seed();
            }
            return _sequelizeManager.Sequelize.Promise.when(c);
        });
    }

    function seed(){
        var Todos = _sequelizeManager.models.Todos;
        var todos = [
            // Description, IsDone, IsArchived
            createTodo("Food", true, true),
            createTodo("Water", true, true),
            createTodo("Shelter", true, true),
            createTodo("Bread", false, false),
            createTodo("Cheese", true, false),
            createTodo("Wine", false, false)
        ];
        return Todos.bulkCreate(todos);
    }

    function createTodo(description, isDone, isArchived) {
        return {
            CreatedAt: new Date(),
            Description: description,
            IsDone: isDone,
            IsArchived: isArchived
        };
    }

    function purge() {
        var Todos =_sequelizeManager.models.Todos;
        //must pass options.where to destroy (when using Sequelize v2.0.4)
        var options = {
            where: true
        };
        return Todos.destroy(options);
    }

    function createSequelizeManager(usePostgres) {
        var metadata = readMetadata();
        var sequelizeOptions = usePostgres ? {dialect: 'postgres', port: 5432} : null;
        var sm = new SequelizeManager(dbConfig, sequelizeOptions);
        sm.importMetadata(metadata);

        return sm;
    }

    function readMetadata() {
        var filename = "TodoMetadata.json";
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

    function returnResults(results, res) {
        res.setHeader("Content-Type:", "application/json");
        res.send(results);
    }

})(module.exports);