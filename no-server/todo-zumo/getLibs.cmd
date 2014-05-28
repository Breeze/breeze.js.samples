@echo off

if not exist "%1vendor" MKDIR "%1vendor"

REM Copies the client files needed for this sample
REM from the canonical source files in a designated location 
REM within the parent breeze.js.samples repository.
REM Beware: if you move this sample, it may not be able to find these
REM client files and the build could fail. Adjust accordingly.
echo Copying breeze client files into the project
@echo on
XCOPY "%1..\..\build\libs\js\breeze.min.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js\breeze.debug.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js\breeze.intellisense.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js.labs\breeze.angular.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js.labs\breeze.labs.dataservice.abstractrest.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js.labs\breeze.labs.dataservice.azuremobileservices.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js.labs\breeze.metadata-helper.js" "%1Vendor" /Y 
XCOPY "%1..\..\build\libs\js.labs\breeze.saveErrorExtensions.js" "%1Vendor" /Y  
rem pause  