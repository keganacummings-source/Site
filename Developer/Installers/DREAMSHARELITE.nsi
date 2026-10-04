# -*- coding: utf-8 -*-
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
RequestExecutionLevel admin
CRCCheck on
SetCompressor zlib
SetOverwrite on
ShowInstDetails show
ShowUninstDetails show
VIProductVersion "2.3.0.0"
VIAddVersionKey "CompanyName" "DreamDAW"
VIAddVersionKey "LegalCopyright" ""
VIAddVersionKey "ProductVersion" "2.3.0"
VIAddVersionKey "FileVersion" "2.3.0"
VIAddVersionKey "FileDescription" "DreamDAW standard Windows installer"
!define MUI_ABORTWARNING
Name "DreamDAW - DREAMSHARELITE"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW DREAMSHARELITE installer"
Var Result
Var HadOld
Var Missing
!define MUI_WELCOMEPAGE_TITLE "Install DREAMSHARELITE"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis package builds the DREAMSHARELITE HTML-viewer VST3 on your PC. It requires Visual Studio 2022 C++ Build Tools, Git, CMake, WebView2 Runtime, and internet access to GitHub and NuGet. A compiler window will be visible. No precompiled replacement is included.$\r$\n$\r$\nThe installation details are shown below."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TEXT "Installation finished.$\r$\n$\r$\nOpen FL Studio 26 > Options > Manage plugins > Find installed plugins. Enable verification and rescanning of plugins with errors."
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function OpenMissing
  Pop $0
  Pop $1
  MessageBox MB_YESNO|MB_ICONEXCLAMATION "$1$\r$\n$\r$\nDownload it now?" IDYES do_open
  Return
do_open:
  ExecShell "open" "$0"
FunctionEnd
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "This package requires 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
  StrCpy $Missing ""
  IfFileExists "$PROGRAMFILES64\Git\cmd\git.exe" git_ok 0
  nsExec::ExecToStack 'cmd /c where git'
  Pop $0
  StrCmp $0 0 git_ok
  StrCpy $Missing "$MissingGit$\r$\n"
  Push "Git is not installed. DreamShareLite VST needs it to fetch the build dependencies."
  Push "https://git-scm.com/download/win"
  Call OpenMissing
git_ok:
  IfFileExists "$PROGRAMFILES\CMake\bin\cmake.exe" cmake_ok 0
  IfFileExists "$PROGRAMFILES64\CMake\bin\cmake.exe" cmake_ok 0
  nsExec::ExecToStack 'cmd /c where cmake'
  Pop $0
  StrCmp $0 0 cmake_ok
  StrCpy $Missing "$MissingCMake$\r$\n"
  Push "CMake is not installed. DreamShareLite VST needs it to generate the plugin project."
  Push "https://github.com/Kitware/CMake/releases/latest"
  Call OpenMissing
cmake_ok:
  IfFileExists "$PROGRAMFILES64\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" vs_ok 0
  IfFileExists "$PROGRAMFILES64\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" vs_ok 0
  IfFileExists "$PROGRAMFILES (x86)\Microsoft Visual Studio\Installer\vswhere.exe" vs_where 0
  StrCpy $Missing "$MissingVisual Studio 2022 C++ Build Tools$\r$\n"
  Push "Visual Studio 2022 C++ Build Tools are not installed. DreamShareLite VST cannot compile without them."
  Push "https://aka.ms/vs/17/release/vs_buildtools.exe"
  Call OpenMissing
  Goto vs_ok
vs_where:
  nsExec::ExecToStack '"$PROGRAMFILES (x86)\Microsoft Visual Studio\Installer\vswhere.exe" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath'
  Pop $0
  StrCmp $0 0 vs_ok
  StrCpy $Missing "$MissingVisual Studio 2022 C++ Build Tools$\r$\n"
  Push "Visual Studio 2022 C++ Build Tools are not installed. DreamShareLite VST cannot compile without them."
  Push "https://aka.ms/vs/17/release/vs_buildtools.exe"
  Call OpenMissing
vs_ok:
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  StrCmp $0 "" 0 wv_ok
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  StrCmp $0 "" 0 wv_ok
  StrCpy $Missing "$MissingWebView2 Runtime$\r$\n"
  Push "Microsoft WebView2 Runtime is not installed. DreamShareLite VST needs it to show the share window."
  Push "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
  Call OpenMissing
wv_ok:
  StrCmp $Missing "" req_done
  MessageBox MB_YESNO|MB_ICONEXCLAMATION "Still missing:$\r$\n$Missing$\r$\nInstall those, then run this installer again. Continue anyway?" IDYES req_done
  Abort
req_done:
FunctionEnd
Function un.onInit
  SetRegView 64
FunctionEnd

Section "Build and install DREAMSHARELITE"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\source"
  File /r "${PAYLOAD}/*"
  DetailPrint "Building the x64 HTML viewer. See %TEMP%\DREAMSHARELITE-build.log."
  ClearErrors
  ExecWait '$\"$WINDIR\SysNative\cmd.exe$\" /D /S /C $\"$\"$PLUGINSDIR\source\build_windows.cmd$\" Release $\"$PLUGINSDIR\dist$\"$\"' $Result
  IfErrors build_failed
  StrCmp $Result 0 0 build_failed
  IfFileExists "$PLUGINSDIR\dist\DREAMSHARELITE.vst3\Contents\x86_64-win\DREAMSHARELITE.vst3" 0 build_failed
  CreateDirectory "$PLUGINSDIR\payload"
  CopyFiles "$PLUGINSDIR\dist\DREAMSHARELITE.vst3" "$PLUGINSDIR\payload"
  IfErrors build_failed

  DetailPrint "Installing VST3: $COMMONFILES64\VST3\DREAMSHARELITE.vst3"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST3\DREAMSHARELITE.vst3\*.*" 0 DREAMSHARELITE_vst3_backup_done
  IfFileExists "$COMMONFILES64\VST3\DREAMSHARELITE.vst3.trippah-backup\*.*" DREAMSHARELITE_vst3_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST3\DREAMSHARELITE.vst3" "$COMMONFILES64\VST3\DREAMSHARELITE.vst3.trippah-backup"
  IfErrors DREAMSHARELITE_vst3_locked 0
  StrCpy $HadOld 1
DREAMSHARELITE_vst3_backup_done:
  CreateDirectory "$COMMONFILES64\VST3"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMSHARELITE.vst3" "$COMMONFILES64\VST3"
  IfErrors DREAMSHARELITE_vst3_copy_failed DREAMSHARELITE_vst3_success
DREAMSHARELITE_vst3_copy_failed:
  RMDir /r "$COMMONFILES64\VST3\DREAMSHARELITE.vst3"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST3\DREAMSHARELITE.vst3.trippah-backup" "$COMMONFILES64\VST3\DREAMSHARELITE.vst3"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMSHARELITE. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMSHARELITE_vst3_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMSHARELITE is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMSHARELITE_vst3_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST3\DREAMSHARELITE.vst3.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMSHARELITE_vst3_success:
  StrCmp $HadOld 1 0 +2
  RMDir /r "$COMMONFILES64\VST3\DREAMSHARELITE.vst3.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE\Uninstall DREAMSHARELITE.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "DisplayName" "DreamDAW - DREAMSHARELITE"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "DisplayVersion" "2.3.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE\Uninstall DREAMSHARELITE.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE\install.log" w
  FileWrite $0 "Installed DREAMSHARELITE with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
  SetOutPath "$PROGRAMFILES64\DreamDAW\Source\DREAMSHARELITE"
  File /r "${PAYLOAD}/*"
  Goto build_complete
build_failed:
  MessageBox MB_OK|MB_ICONSTOP "DREAMSHARELITE compilation failed or the C++ tools are missing. Check %TEMP%\DREAMSHARELITE-build.log. Any installed plugin is unchanged. See README.md for prerequisites."
  SetErrorLevel 1
  Abort
build_complete:
SectionEnd

Section "Uninstall"
  RMDir /r "$COMMONFILES64\VST3\DREAMSHARELITE.vst3"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSHARELITE"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE\Uninstall DREAMSHARELITE.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\DREAMSHARELITE"
SectionEnd
