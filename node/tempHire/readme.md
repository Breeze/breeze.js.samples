# TempHire Sequelize
The "TempHire Sequelize" sample app is a single page application (SPA) built with Breeze, Angular, Node, Express, Sequelize and MySql. Instructions to install and run follow.

## Prerequisites
* Node.js >=0.10
* [MySql](http://www.mysql.com)

## Download samples

Download [ALL of the Breeze JavaScript samples from github](https://github.com/Breeze/breeze.js.samples "breeze.js.samples on github")
as [a zip file](https://github.com/Breeze/breeze.js.samples/archive/master.zip "breeze.js.samples zip file").

In this case we're interested in the "tempHire" sample, located in the *node/tempHire* directory.
These instructions assume this will be your current working directory.

## Install MySql and run sql script to create demo user

Run the *~/node/tempHire/db-script/create-temphire-user.sql* script

## Install dependencies and launch app server

Navigate to the server folder, *~/node/tempHire/server*

Install dependencies and launch the app server: `npm start`

>This command will install server dependencies. You can ignore the sea of red describing rebuild failures  of nested packages. It's OK; you'll be using the pre-build versions of those packages. Do make sure the install finishes completely without error.

Console output should indicate that app server started successfully and is **listening on port 3000**.

## Launch TempHire in a browser

Start your browser with address [**http://localhost:3000**](http://localhost:3000)