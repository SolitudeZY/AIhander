@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem Usage: build.bat [all|agent] [output-directory]
set "BUILD_TARGET=%~1"
if not defined BUILD_TARGET set "BUILD_TARGET=all"
if /i "%BUILD_TARGET%"=="all" goto :target_valid
if /i "%BUILD_TARGET%"=="agent" goto :target_valid
echo Usage: "%~nx0" [all^|agent] [output-directory]
exit /b 2

:target_valid
pushd "%~dp0.."
if errorlevel 1 exit /b 1
set "BUILD_OUTPUT=%~2"
if not defined BUILD_OUTPUT set "BUILD_OUTPUT=bin\test"
if not exist "%BUILD_OUTPUT%" mkdir "%BUILD_OUTPUT%"
if not exist "%BUILD_OUTPUT%\" goto :output_failed

rem Explicit targets avoid inheriting GOOS/GOARCH from a previous cross-build.
set "CGO_ENABLED=0"
:agent
call :build agent
if errorlevel 1 goto :build_failed

:success
echo Build succeeded. Output: "%BUILD_OUTPUT%"
popd
exit /b 0

:build
set "GOOS=windows"
set "GOARCH=amd64"
echo Building %~1 for Windows AMD64...
go build -buildvcs=false -trimpath -o "%BUILD_OUTPUT%\%~1.exe" ./cmd/%~1
if errorlevel 1 exit /b %errorlevel%
set "GOOS=linux"
set "GOARCH=arm64"
echo Building %~1 for Linux ARM64...
go build -buildvcs=false -trimpath -o "%BUILD_OUTPUT%\%~1-linux-arm64" ./cmd/%~1
if errorlevel 1 exit /b %errorlevel%
exit /b 0

:output_failed
echo Cannot create output directory: "%BUILD_OUTPUT%"
popd
exit /b 1

:build_failed
set "BUILD_EXIT_CODE=%errorlevel%"
echo Build failed with exit code %BUILD_EXIT_CODE%.
popd
exit /b %BUILD_EXIT_CODE%
