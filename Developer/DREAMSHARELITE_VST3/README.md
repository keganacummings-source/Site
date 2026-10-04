# DreamShare Lite VST3 source

The current website Share download is
`DownloadVSTFile/Two/DreamShareVst.zip`. Unzip it and copy the included
`DreamShare Lite.vst3` bundle to:

`C:\Program Files\Common Files\VST3`

The source below is an optional Windows rebuild path; it is not required to
install the supplied Share package.

## Manual build

The build requires Windows x64, Visual Studio 2022 Build Tools with Desktop
development with C++, MSVC v143 and a Windows SDK; CMake 3.22+; Git for
Windows; and WebView2 x64 Evergreen Runtime. Windows `curl.exe` and `tar.exe`
download/extract pinned dependencies from GitHub and NuGet on the first build.
Internet access is required.

From an extracted, writable source folder in Command Prompt:

```bat
build_windows.cmd Release
```

The output is `dist\DREAMSHARELITE\DREAMSHARELITE.vst3`. Optional second
argument changes the output directory. Copy the resulting bundle manually to
the system VST3 folder. Source installed under Program Files requires an
elevated build window because the output folder is protected. Dependency
cache and short-path staging are under `C:\dsb`.

## Viewer

The editor displays `Contents/Resources/DREAMSHARELITE.html` through WebView2
and passes audio through. It starts at 520×780. Chat/Thread tabs switch the
full-height view. You can replace the installed HTML after closing FL Studio
to update the interface without recompiling the plugin binary.

## Validation and antivirus

Shared C++ source/API syntax and browser behavior were checked in a prior
revision. Native Windows execution, C++ linking, WebView2 startup and FL Studio
26 validation have not been performed here. The supplied Share archive is a
prebuilt VST3 bundle; this environment has not independently validated its
runtime behavior. It is unsigned and no Defender clearance is claimed.
