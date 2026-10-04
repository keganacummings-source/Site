@echo off
setlocal EnableExtensions DisableDelayedExpansion
rem Visible Windows x64 build. Uses Git, CMake, curl and tar; no PowerShell.
set "DSL_ORIGIN=%~dp0"
set "DSL_CONFIG=Release"
if /I "%~1"=="Debug" set "DSL_CONFIG=Debug"
set "DSL_OUTPUT=%DSL_ORIGIN%dist\DREAMSHARELITE"
if not "%~2"=="" set "DSL_OUTPUT=%~2"
set "DSL_PROGRAMFILES=%ProgramW6432%"
if not defined DSL_PROGRAMFILES set "DSL_PROGRAMFILES=%ProgramFiles%"
set "DSL_CACHE=C:\dsb"
set "DSL_JUCE=%DSL_CACHE%\JUCE-8.0.8"
set "DSL_WVROOT=%DSL_CACHE%\webview2"
set "DSL_WV=%DSL_WVROOT%\Microsoft.Web.WebView2.1.0.2903.40"
set "DSL_RUN=%DSL_CACHE%\DREAMSHARELITE\run-%RANDOM%-%RANDOM%"
set "DSL_SOURCE=%DSL_RUN%\src"
set "DSL_BUILD=%DSL_RUN%\build"
set "DSL_LOG=%TEMP%\DREAMSHARELITE-build.log"
set "DSL_VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
echo DREAMSHARELITE Windows x64 build > "%DSL_LOG%"
echo DREAMSHARELITE: checking the C++ build tools.
if not exist "%DSL_VSWHERE%" goto missing_tools
for /f "usebackq tokens=*" %%V in (`"%DSL_VSWHERE%" -latest -products * -version "[17.0,18.0)" -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "DSL_VS=%%V"
if not defined DSL_VS goto missing_tools
where git.exe >nul 2>nul
if errorlevel 1 set "PATH=%DSL_PROGRAMFILES%\Git\cmd;%PATH%"
where git.exe >nul 2>nul
if errorlevel 1 goto missing_tools
where cmake.exe >nul 2>nul
if errorlevel 1 set "PATH=%DSL_PROGRAMFILES%\CMake\bin;%DSL_VS%\Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin;%PATH%"
where cmake.exe >nul 2>nul
if errorlevel 1 goto missing_tools
where curl.exe >nul 2>nul
if errorlevel 1 goto missing_download_tools
where tar.exe >nul 2>nul
if errorlevel 1 goto missing_download_tools
mkdir "%DSL_SOURCE%" >nul 2>nul
if not exist "%DSL_SOURCE%" goto staging_failed
copy /Y "%DSL_ORIGIN%CMakeLists.txt" "%DSL_SOURCE%\CMakeLists.txt" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
copy /Y "%DSL_ORIGIN%DREAMSHARELITE.html" "%DSL_SOURCE%\DREAMSHARELITE.html" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
robocopy "%DSL_ORIGIN%Source" "%DSL_SOURCE%\Source" /E /NFL /NDL /NJH /NJS /NP >> "%DSL_LOG%" 2>&1
if errorlevel 8 goto build_failed
if exist "%DSL_JUCE%\extras\Build\CMake\JUCEUtils.cmake" goto sdk
if exist "%DSL_JUCE%" goto incomplete_juce
echo Downloading pinned JUCE 8.0.8 from github.com.
git -c core.longpaths=true clone --depth 1 --filter=blob:none --no-checkout --branch 8.0.8 https://github.com/juce-framework/JUCE.git "%DSL_JUCE%" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto download_failed
git -C "%DSL_JUCE%" sparse-checkout init --no-cone >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
git -C "%DSL_JUCE%" sparse-checkout set --no-cone --skip-checks CMakeLists.txt LICENSE.md cmake modules extras/Build >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
git -C "%DSL_JUCE%" checkout --detach 8.0.8 >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto download_failed
:sdk
if not exist "%DSL_JUCE%\CMakeLists.txt" goto incomplete_juce
if not exist "%DSL_JUCE%\modules\juce_core\juce_core.h" goto incomplete_juce
if exist "%DSL_WV%\build\native\include\WebView2.h" goto configure
echo Downloading pinned Microsoft WebView2 SDK 1.0.2903.40 from nuget.org.
mkdir "%DSL_WV%" >nul 2>nul
curl.exe --fail --location --retry 2 --tlsv1.2 --output "%DSL_RUN%\WebView2.zip" "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2903.40" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto download_failed
tar.exe -xf "%DSL_RUN%\WebView2.zip" -C "%DSL_WV%" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto download_failed
:configure
if not exist "%DSL_WV%\build\native\include\WebView2.h" goto download_failed
if not exist "%DSL_WV%\build\native\x64\WebView2LoaderStatic.lib" goto download_failed
echo Configuring Release x64 VST3. This can take several minutes.
cmake.exe -S "%DSL_SOURCE%" -B "%DSL_BUILD%" -G "Visual Studio 17 2022" -A x64 "-DJUCE_DIR=%DSL_JUCE%" "-DJUCE_WEBVIEW2_PACKAGE_LOCATION=%DSL_WVROOT%" >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
echo Compiling %DSL_CONFIG% with two compiler jobs.
cmake.exe --build "%DSL_BUILD%" --config %DSL_CONFIG% --target DREAMSHARELITE_VST3 --parallel 2 >> "%DSL_LOG%" 2>&1
if errorlevel 1 goto build_failed
set "DSL_BINARY=%DSL_BUILD%\DREAMSHARELITE_artefacts\%DSL_CONFIG%\VST3\DREAMSHARELITE.vst3"
if not exist "%DSL_BINARY%\Contents\x86_64-win\DREAMSHARELITE.vst3" goto build_failed
if not exist "%DSL_BINARY%\Contents\Resources\DREAMSHARELITE.html" goto build_failed
mkdir "%DSL_OUTPUT%" >nul 2>nul
robocopy "%DSL_BINARY%" "%DSL_OUTPUT%\DREAMSHARELITE.vst3" /E /NFL /NDL /NJH /NJS /NP >> "%DSL_LOG%" 2>&1
if errorlevel 8 goto build_failed
echo Built: %DSL_OUTPUT%\DREAMSHARELITE.vst3
echo Build log: %DSL_LOG%
exit /b 0
:missing_tools
echo Install Visual Studio 2022 C++ Build Tools, MSVC v143 x64 and Windows SDK, Git for Windows, and CMake 3.22 or newer.
echo Missing build tool. See README.md. >> "%DSL_LOG%"
exit /b 2
:missing_download_tools
echo Windows curl.exe and tar.exe are required. Use an up-to-date Windows 10 or Windows 11.
echo Missing curl or tar. >> "%DSL_LOG%"
exit /b 3
:staging_failed
echo Could not create the build staging folder: %DSL_SOURCE%
echo Stage directory unavailable. >> "%DSL_LOG%"
exit /b 4
:incomplete_juce
echo JUCE cache is incomplete: %DSL_JUCE%
echo Rename that cache folder and retry so Git can download a complete checkout.
echo Incomplete JUCE cache. >> "%DSL_LOG%"
exit /b 5
:download_failed
echo Dependency download failed. Check internet access to GitHub and NuGet.
echo Download failed. See %DSL_LOG%.
exit /b 6
:build_failed
echo DREAMSHARELITE build failed. See %DSL_LOG% for compiler details.
exit /b 1
