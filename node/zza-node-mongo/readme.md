#Zza Node Mongo
The "Zza Node Mongo" sample app is a single page application (SPA) built with Breeze, Angular, Node, and MongoDB. Instructions to install and run follow.

## Prerequisites
* Node.js >=0.10
* <a href="http://blog.mongodb.org/post/82092813806/mongodb-2-6-our-biggest-release-ever"
  target="_blank" title="MongoDb release 2.6 announcement">MongoDb >= v.2.6</a>

##Download samples

Download [ALL of the Breeze JavaScript samples from github](https://github.com/Breeze/breeze.js.samples "breeze.js.samples on github")
as [a zip file](https://github.com/Breeze/breeze.js.samples/archive/master.zip "breeze.js.samples zip file").

In this case we're interested in the "Zza" sample, located in the *node/zza-node-mongo* directory.
These instructions assume this will be your current working directory.

##Install MongoDb database and run MongoDb server

Unzip *~/database/zza-mongo-database.zip* into the *database* directory.

>You should see *zza.0*, *zza.1*, and *zza.ns* side-by-side with *zza-mongo-database.zip*. If you accidentally unzip into a *zza-mongo-database* sub-directory, move these files up a level.

Open a command / terminal window

Start mongodb server while pointing to this database directory. On my windows machine, from the project root directory, I enter:

    c:/mongodb/bin/mongod --dbpath database

Console output should indicate that MongoDb server started successfully and is listening on port 27017 (or adjust the `mongodbUrl` in `~\server\database.js` to the appropriate port).

##Install dependencies and launch app server

Open a second command / terminal window

Navigate to the client folder, *~/node/zza-node-mongo/client*

Install the bower packages: `bower install`

Navigate to the server folder, *~/node/zza-node-mongo/server*

Install the node modules: `npm install`

>You can ignore the sea of red describing rebuild failures  of nested packages. It's OK; you'll be using the pre-build versions of those packages. Do make sure the install finishes completely without error.

Launch the app server: `node server.js`

Console output should indicate that app server started successfully and is **listening on port 3000**.

##Launch Zza in a browser

Start your browser with address [**http://localhost:3000**](http://localhost:3000)

## Release 0.8.0
* Initial release.
* Demonstrates fundamental characteristics of a MongoDB app.
* Maintainable w/o any Microsoft assets at all, neither code nor development tools.
* Demonstrates more sophisticated user interaction paradigms than other Breeze samples. (It actually looks like a SPA.)
