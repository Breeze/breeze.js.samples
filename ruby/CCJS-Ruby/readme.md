
#CCJS - Ruby on Rails

This sample illustrates a BreezeJS client working with a Ruby on Rails backend. 

The [Breeze CCJS-Ruby sample documentation](http://breeze.github.io/doc-samples/intro-to-spa-ruby.html) has more information about this sample.

There are two main directories, "client" and "rails".

###client
The client app (CCJS) is derived from the published source code for John Papa's "Code Camper Jumpstart". Learn about CCJS in his justly famous PluralSight course, ["Single Page Apps JumpStart"](http://pluralsight.com/training/Courses/TableOfContents/single-page-apps-jumpstart)

It has been modified in small but important ways to interact with a Rails backend instead of the ASP.NET Web API backend in the original. In all other respects (except the ruby re-coloring), it is the same as the original. John's course is the best guide to it's behavior and implementation.

###rails
This "rails" directory holds the Ruby on Rails code and database data for the CCJS-Ruby sample.

###prerequisites
We assume you are familiar with Ruby and have Rails, MySql, and some kind of web server installed in your environment. 

There are four principle steps to running the application.

1. Setup (first time only)
2. Start rails server
3. Start client app server
4. Launch app in a browser

#Setup 

You only perform this step once.

a. Install all gems the project needs in the *~/ccjs_ruby/rails* directory (correct the directory name as appropriate)

	~/ccjs_ruby/rails>bundle install 

b. Open *./config/database.yml* in a text editor.

>the *database.yml* is for Windows; if using OS X, replace it with *database_sample.yml*.

c. Update *database.yml* with your MySQL user credentials

d. Create the project database (make sure MySQL is running first!)

	~/ccjs_ruby/rails>bundle exec rake db:create

e. Create the project database structure

	~/ccjs_ruby/rails>bundle exec rake db:migrate

f.  Import Data as follows, replacing [user] with your MySQL user (e.g., admin); supply the user's password when asked

	~/ccjs_ruby/rails>mysql -u [user] -p ccjs_ruby_development < db/data.sql

>if mysql is not in your path, specify the full executable path, e.g. *C:/Program Files/MySQL/MySQL Server 5.5/bin/mysql*

#Start the rails server

**Make sure nothing else is running on port 3000!**

Go to the *~/ccjs_ruby/rails* directory if you're not already there. In a terminal or command window, execute the following command:

	~/ccjs_ruby/rails>bundle exec rails s

The rails **server** is running on port **3000**

#Start the client application server

Most of the client application assets - html, css, JavaScript - are in the *~/ccjs_ruby/client* directory.

The breeze scripts are *not included* directly. You must copy them into the sample before you run it.

Windows users can simply execute the ***getLibs.cmd*** command file which copies the files from a source directory in the samples repository into the *client/scripts*  folder.

Not a Windows user? It's really simple.

* Open the ***getLibs.cmd*** command file in a text editor.
* Notice that it copies a small number of source files, starting from  <em>..\..\build\libs\</em>,  into the  *scripts*  folder.
* Do the same manually.

Open a **second** terminal or command window, navigate to that directory, and launch your web server of choice. 
Here is an example running in Python.

    ~/ccjs_ruby/rails>cd ../client
	~/ccjs_ruby/client>python -m http.server

>if python is not in your path, specify the full executable path, e.g. *C:/python33/python*.

The **client** application server is now running on port **8000**

#Launch the app in your browser

Open a browser to **http://localhost:8000/**