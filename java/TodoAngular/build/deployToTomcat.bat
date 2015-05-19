:: Copy the WAR to tomcat's webapps dir, and start tomcat
call setenv.bat
rmdir %CATALINA_HOME%\webapps\TodoAngular /S /Q 
copy  ..\target\TodoAngular.war %CATALINA_HOME%\webapps
pushd %CATALINA_HOME%\bin
call %CATALINA_HOME%\bin\catalina jpda start
popd