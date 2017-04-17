# Todo Angular Hibernate
The "Todo Angular Hibernate" sample app is a single page application (SPA) built with Breeze, Angular, and Hibernate. Instructions to install and run follow.

## Prerequisites
* [Java SE Development Kit 7](http://www.oracle.com/technetwork/java/javase/downloads/jdk7-downloads-1880260.html)
* [Maven](https://maven.apache.org/)
* [Apache Tomcat](http://tomcat.apache.org/)
* [MySql](http://www.mysql.com)

## Download samples

Download [ALL of the Breeze JavaScript samples from github](https://github.com/Breeze/breeze.js.samples "breeze.js.samples on github")
as [a zip file](https://github.com/Breeze/breeze.js.samples/archive/master.zip "breeze.js.samples zip file").

In this case we're interested in the "TodoAngular" sample, located in the *java/TodoAngular* directory.
These instructions assume this will be your current working directory.

## Install MySql and run database scripts

Run the *~/java/TodoAngular/db\_script/init\_todos.sql* script to create the 'todos' database.

Run the *~/java/TodoAngular/db\_script/create\_demo\_user.sql* script to create the 'demo' user and grant it permission to the 'todos' database.

## Build and deploy

We'll be building the project with Maven and deploying it with Apache Tomcat. We have provided build scripts to make the build and deployment process easier.

1. Go to *~/java/TodoAngular/build* folder
2. Open *setenv.bat* in an editor
3. Modify the two path variables, MAVEN\_REPO and CATALINA\_HOME accordingly
4. Run the *build.bat* script

## Launch Todo-Angular in a browser

Start your browser with address [**http://localhost:8080/TodoAngular**](http://localhost:8080/TodoAngular)