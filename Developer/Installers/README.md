# Standard DreamDAW Windows installers

All eleven individual EXEs and both collection EXEs use NSIS 3.09's normal
Unicode installer engine. The full human-readable `.nsi` scripts are here.
They request normal administrator elevation, show a wizard and installation
details, and copy the known VST files into Common Files. They register an
uninstaller for each plugin. Collection EXEs open the individual wizards visibly.

The native VST DLLs and bundles come from the provided project packages,
without binary edits. DreamShareLite's EXE instead stages its readable C++
source and opens `build_windows.cmd` in a visible Windows command window.
The previously supplied custom launcher and PowerShell-based runner are removed.

## Rebuild

Install NSIS 3 and Python 3. From this folder:

```text
python build_installers.py
```

The helper extracts payloads from the project's plugin ZIPs into a temporary
build folder, compiles each `.nsi`, then synchronizes the ZIPs and nested EXEs.
It preserves the native plugin bytes. The collection installers are compiled
after the individual installers so they contain the current EXEs.

For one installer, prepare that plugin's native payload folder and use:

```text
makensis -DPAYLOAD=/absolute/payload -DOUTPUT=/absolute/Install.exe AXXE.nsi
```

On Windows, makensis uses `/D` switches instead of `-D`. The payload directory
must contain the native files at its root, such as `AXXE.dll` or a VST3 bundle.
DreamShareLite's payload contains its source, HTML and build_windows.cmd.

## Release verification

Build and test on Windows; inspect Defender's exact detection if one occurs.
Code signing requires the publisher's genuine Authenticode certificate.
No certificate or signing key is supplied, and the current EXEs are unsigned.
Microsoft's submission page can review a specific file/detection:
https://www.microsoft.com/en-us/wdsi/filesubmission

The stock installer format and visible behavior are improvements; they do
not establish an antivirus-clean result. See the project validation report.
