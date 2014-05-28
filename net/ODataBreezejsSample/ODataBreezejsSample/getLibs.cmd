@echo off
REM *** ODataBreezejsSample ***
REM Copies the client and server files needed for this sample
REM from the canonical source files in a designated location 
REM within the parent breeze.js.samples repository.
REM Beware: if you move this sample, it may not be able to find these
REM client files and the build could fail. Adjust accordingly.

if exist "%1..\..\..\build\libs" GOTO :libsExists

echo Skipping file copy because can't find source libs folder, '%1..\..\..\build\libs'
GOTO :done

:libsExists
echo Copying breeze client files into the project
@echo on
XCOPY "%1..\..\..\build\libs\js\breeze.min.js" "%1Scripts" /Y 
XCOPY "%1..\..\..\build\libs\js\breeze.debug.js" "%1Scripts" /Y 
XCOPY "%1..\..\..\build\libs\js\breeze.intellisense.js" "%1Scripts" /Y 
XCOPY "%1..\..\..\build\libs\js.labs\breeze.angular.js" "%1Scripts" /Y 
XCOPY "%1..\..\..\build\libs\js.labs\breeze.directives.js" "%1Scripts" /Y 
XCOPY "%1..\..\..\build\libs\js.labs\breeze.directives.css" "%1Scripts" /Y
XCOPY "%1..\..\..\build\libs\server.labs\EdmBuilder.cs" "%1App_Start" /Y 

@echo off
@echo.
@echo CONFIRM that all files copied successfully 

:done
@echo.
pause   