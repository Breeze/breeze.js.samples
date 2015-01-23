#Breeze Angular Northwind Demo

## Structure


	/src
		/client
			/app
			/content

       / server
          app.js

       gulpfile.js
       package.json
       bower.json

The server exists to serve the app using node. Feel free to use any server you wish.
	
## Pre-Requisites
Install [Node.js](http://nodejs.org)

Install these NPM packages globally:

	npm install -g bower gulp nodemon


## Installing Packages
- Open a terminal or command window
- Type `npm install`

`npm install` will install bower packages too, but you can install them separately if you wish.

- Open terminal
- Type `bower install`

## Northwind API Server

The demo reaches out to a .NET Web API server that delivers Northwind data.  You have to make sure that server is running before you can run the client.

You have two choices of Web API server: remote and local.

Toggle between them by changing one line of configuration:

* open *~src/client/app/core/config.js*
* find these lines

        // Pick ONE.
        apiHost: //'http://sampleservice.breezejs.com/api/', // remote
                'http://localhost:58066/breeze/', // local
* comment and uncomment per your choice
  * if you picked the "remote" server, make sure that it is accessible (see "**Remote server**" below).
 
  * if you picked the "local" server, run that server first (see "**Local server**" instructions below).

<a name="remoteserver"></a>
### Remote server

The demo can talk to a remote IdeaBlade server at `http://sampleservice.breezejs.com/api/northwind/employees`. The serviceName is `/api/northwind/`.

Here's an example query you can run in a browser.

	http://sampleservice.breezejs.com/api/northwind/employees

<a name="localserver"></a>
### Local server

To run locally, you'll need a pre-built Breeze DocCode Sample in the sibling *DocCode* sample directory.

>You must build the DocCode sample before you can run it from this demo.


Try launching this server in its own command window with the following gulp command 

	gulp serve-webapi

If all is well, you'll see something like this:

	~\Documents\GitHub\breeze\breeze.js.samples\ngNorthwind>gulp serve-webapi
	[18:05:35] Using gulpfile ~\Documents\GitHub\breeze\breeze.js.samples\ngNorthwind\gulpfile.js
	[18:05:35] Starting 'serve-webapi'...
	[18:05:35] Running DocCode Web API server. Browse to http://localhost:58066/breeze/Northwind/employees
	[18:05:35] Finished 'serve-webapi' after 8.5 ms

... and the cursor is just blinking. You'll shut this server down when you're done simply by closing this command window.

>If the gulp command fails, look at the  `$wwwRoot` definition in *start-webapi.ps1* to ensure it is pointing to the right place. Remember ... you also have to build the DocCode project first!

If all is well, smoke test the Web API in a browser with `http://localhost:58066/breeze/Northwind/employees`.
After a long pause (server start-up), you should see employee data.

## Running

Open a second command window and type `gulp serve-dev` or `npm start`. This launches the node server whose sole purpose is to deliver the static assets (HTML, JavaScript, CSS, images) of the client app.

The console output tells you that the server is running in **nodemon** and watching the application files; it shuts down and restarts the node server automatically when changes are saved.

It also tells you that this server is **listening on port 7300**.

Now browse to `http://localhost:7300`

## Linting
Type `gulp jshint` to run code analysis on the code.

Type `gulp spy` to run code analysis using a watch.

## How It Works
The app has 2 main routes:
- customers
- products

### The Modules
This app is based on John Papa's ["hottowel-ng" starter on github](https://github.com/johnpapa/hottowel-ng).

>More details about the styles and patterns used in this app can be found in my [AngularJS Style Guide](https://github.com/johnpapa/angularjs-styleguide) and John's [AngularJS Patterns: Clean Code](http://jpapa.me/ngclean) course at [Pluralsight](http://pluralsight.com/training/Authors/Details/john-papa) and working in teams.

The app has 4 feature modules and depends on a series of external modules and custom, cross-app modules

	app --> [
	        app.customers,
	        app.products,
	        app.layout,
	        app.widgets,
			app.core --> [
				ngAnimate,
				ngRoute,
				ngSanitize,
				blocks.exception,
				blocks.logger,
				blocks.router
			]
	    ]

## core Module
Core modules are ones that are shared throughout the entire application and may be customized for the specific application. The dataservice components are here because the support both feature modules..

The `core` module takes the blocks, common, and Angular sub-modules as dependencies. 

## blocks Modules
Block modules are reusable blocks of code that can be used across projects simply by including them as dependencies.

### blocks.logger Module
The `blocks.logger` module handles logging across the Angular app.

### blocks.exception Module
The `blocks.exception` module handles exceptions across the Angular app.

It depends on the `blocks.logger` module, because the implementation logs the exceptions.

### blocks.router Module
The `blocks.router` module contains a routing helper module that assists in adding routes to the $routeProvider.
