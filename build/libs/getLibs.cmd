@echo off
REM Creates the canonical library files for samples in this repo
REM Such samples acquire these files by copying them from here.
REM This command file makes the canonical files by copying them from 
REM their home locations in related repositories (e.g.
REM breeze.js, breeze.js.labs, and breeze.server.labs) 
REM which must be available on this machine as sibling directories 
REM to the breeze.js.samples repository

if not exist "%1js" MKDIR "%1js"
if not exist "%1js.adapters" MKDIR "%1js.adapters"
if not exist "%1js.labs" MKDIR "%1js.labs"
if not exist "%1server.labs" MKDIR "%1server.labs"

echo Copying breeze client files into the breeze.js.samples repo
@echo on
XCOPY "%1..\..\..\breeze.js\build\*.js" "%1js" /Y 

XCOPY "%1..\..\..\breeze.js\src\breeze.dataService.mongo.js" "%1js.adapters" /Y 

XCOPY "%1..\..\..\breeze.js.labs\*.js" "%1js.labs" /Y 
XCOPY "%1..\..\..\breeze.js.labs\*.css" "%1js.labs" /Y 

XCOPY "%1..\..\..\breeze.server.labs\*.cs" "%1server.labs" /Y 

REM Exclude certain files
DEL "%1js.labs\breeze.to$q.shim.js" 2>nul
DEL "%1js\gulpfile.js" 2>nul

pause  