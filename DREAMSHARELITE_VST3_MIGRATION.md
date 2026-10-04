# DREAMSHARELITE installer update

The existing JUCE/WebView2 HTML viewer and portrait Chat/Thread UI are retained.
Its EXE now uses a normal NSIS wizard. A visible `build_windows.cmd` builds the
source with Git, CMake, curl and tar, then the installer copies the VST3 into
Common Files. The former custom PowerShell launcher is removed from all copies.

The native DreamShareLite binary must still be compiled on Windows using the
listed C++ prerequisites. Failed builds preserve the old installed plugin.
See `README_TRIPPAH.txt` for setup and the unverified Windows/antivirus checks.
