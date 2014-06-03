#About the Breeze JS Samples

The *Breeze JavaScript client samples* demonstrate BreezeJS in action in different technology environments. They are (almost) all maintained by the Breeze core team.

These are end-to-end samples which means that most of them have both client and server code. The server code could be written in .NET, Node, Ruby, etc.

What they all have in common is an HTML/JavaScript front-end, written with Breeze.js

Learn more about these [samples on the Breeze website](http://www.breezejs.com/samples/ "About the BreezeJS Samples").

## Download

The sample code is maintained in the [breeze.js.samples repository on github](https://github.com/Breeze/breeze.js.samples "breeze.js.samples on GitHub") where it is maintained continuously between releases of BreezeJS itself.

Perhaps the easiest way to try it is to [**download the latest version from github as a zip**](https://github.com/Breeze/breeze.js.samples/archive/master.zip).

>For older versions you can pick a a commit (e.g., a tagged commit) and then click the "Download Zip" button.

Once you have the zip on your machine

- Unblock it (a Windows security button on the zip properties sheet).

- Extract it

## Finding the sample in the repo

Now locate the sample of interest.

The *breeze.js.samples* library is divided by server stack into different sub-directories:

+ **net** - Microsoft.NET server samples with Visual Studio solution and project files

+ **node** - Node server samples for pure JavaScript client apps.

+ **no-server** - No server at all. The sample reaches out to a public web service. In most cases these are pure JavaScript clients.

+ **ruby** - Ruby-on-Rails server samples for pure JavaScript client apps

## Build and run

Many of the .NET samples have Visual Studio solution files and you can often just launch-build-and-run in Visual Studio.

Some require a little preparation first, e.g., downloading supporting libraries and installing sample databases.

Look for a sample-specific "readme" that describes how to install and run.

- if there is one, follow its instructions
- if there isn't one, check the [website documentation for that sample](http://www.breezejs.com/samples/)

>Your OS may interrupt the build flow with security questions, especially if you neglected to "unblock" the zip. Just play along, saying "*yes ... go ahead and do that*", every time it presents a scary message and asks if you really want to proceed.
