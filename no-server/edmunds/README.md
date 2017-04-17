<img src="http://breeze.github.io/images/samples/edmunds-app-logo.png" alt="Edmunds" style="float:left; height:70px; margin-right: 8px;"/><h1>The Edmunds "Not My Server" Sample</h1>

This sample application reads the "Make" and "Model" data from the Edmunds.com Vehicle Information service and translates those data into Breeze entities.

* no ASP.NET
* no OData or Web API
* no EntityFramework
* no SQL Server
* no metadata from the server
* no IQueryable

Just some HTML and JavaScript on the client talking to a public 3rd party API that is completely out of our control.

[Learn the full story on our web site](http://breeze.github.io/doc-samples/edmunds.html).

Here's what you need to know to get it going.

## Prep It

The breeze scripts are not included directly in this sample. You must copy them into the sample before you run it.

Windows users can simply execute the ***getLibs.cmd*** command file which copies the files from a source directory in the samples repository into the *scripts*  folder.

Not a Windows user? It's really simple.

* Open the ***getLibs.cmd*** command file in a text editor.
* Notice that it copies a small number of source files, starting from  <em>..\..\build\libs\</em>,  into the  *scripts*  folder.
* Do the same manually.

## Run it

Locate the index.html file. Double-click it. The app loads in your default browser.

