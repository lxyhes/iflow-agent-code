@echo off
set JAVA_OPTS=-Djava.io.tmpdir=%CD%\tmp
if not exist tmp mkdir tmp
if not exist tomcat-work mkdir tomcat-work
mvn spring-boot:run
