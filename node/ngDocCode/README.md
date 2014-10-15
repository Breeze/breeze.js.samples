# ngDocCode - BreezeJS exploratory tests in Angular

Demonstrates through automated tests how BreezeJS works within an Angular application 

## Structure
	/build 	(created on the fly)
	/gulp	
	/public
		/test
			/lib
    server.js
	

## Installing Node.js and Bower Packages
- Open terminal
- Type `npm install`

## Installing Bower Packages
`npm install` will install these too, but you can do it manually.
- Open terminal
- Type `bower install`

## Running
TBD

## Testing
Type `gulp test` to run the tests including both unit and midway tests (spins up a server). This will create a watch on the files, with a 5 second delay, to run the tests.

Testing uses karma, mocha, chai, sinon, ngMidwayTester libraries.

## How It Works

TBD

## Starting the DocCode WebAPI server

The midway tests talk to a local test server which must already be running.
 
The DocCode Web API server is the current default server. 
This Web API server is defined in the "net/DocCode" which parallels this "node/ngDocCode" sample.

>Soon we will default to a different node server and you won't need .NET or IISExpress to run these tests.
Until then we still need .NET and this companion
project. Make sure you build it first so the binaries are in place.


The *start-webapi.ps1* PowerShell script cranks up an IISExpress for the Web API server located at 
*../net/DocCode/DocCode*.  

You can run this script from a command window: `powershell -noexit .\start-webapi`
    
>You might create a shortcut for this purpose.
>
>There is also a gulp task to do it: `gulp serve-webapi`

You should see the PowerShell window open and stay open. It says:

    Successfully registered URL "http://localhost:58066/" for site "Development Web Site" application"/"
    Registration completed

The server is running on `http://localhost:58066`

Confirm that it works by opening a browser and navigating to [`http://localhost:58066/breeze/Northwind/employees`](http://localhost:58066/breeze/Northwind/employees). 
After a pause to start the server, it should display the JSON result of an "all employees" query. The PowerShell window should display each request to that server.

Close the PowerShell window to shut down the server when you're done. 

Can also launch it with gulp in a command window: gulp 


