call setenv.bat

::initialize error flag to undefined
set "mvnErr="

::clean any prior builds
call mvn clean

::build project and define the error flag if there was an error
call mvn package || set mvnErr=1

if defined mvnErr (
	echo Maven error - not deploying to tomcat
) else (
	call deployToTomcat.bat
)

:done