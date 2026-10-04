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
VIProductVersion "2.2.0.0"
VIAddVersionKey "CompanyName" "DreamDAW"
VIAddVersionKey "LegalCopyright" ""
VIAddVersionKey "ProductVersion" "2.2.0"
VIAddVersionKey "FileVersion" "2.2.0"
VIAddVersionKey "FileDescription" "DreamDAW standard Windows installer"
!define MUI_ABORTWARNING
Name "DreamDAW - SSYYNNTTHH"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW SSYYNNTTHH installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install SSYYNNTTHH"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies SSYYNNTTHH into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TEXT "Installation finished.$\r$\n$\r$\nOpen FL Studio 26 > Options > Manage plugins > Find installed plugins. Enable verification and rescanning of plugins with errors."
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "This package requires 64-bit Windows."
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd
Function un.onInit
  SetRegView 64
FunctionEnd

Section "Install SSYYNNTTHH"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File "${PAYLOAD}/SSYYNNTTHH.dll"

  DetailPrint "Installing VST2: $COMMONFILES64\VST2\SSYYNNTTHH.dll"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST2\SSYYNNTTHH.dll" 0 SSYYNNTTHH_vst2_backup_done
  IfFileExists "$COMMONFILES64\VST2\SSYYNNTTHH.dll.trippah-backup" SSYYNNTTHH_vst2_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST2\SSYYNNTTHH.dll" "$COMMONFILES64\VST2\SSYYNNTTHH.dll.trippah-backup"
  IfErrors SSYYNNTTHH_vst2_locked 0
  StrCpy $HadOld 1
SSYYNNTTHH_vst2_backup_done:
  CreateDirectory "$COMMONFILES64\VST2"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\SSYYNNTTHH.dll" "$COMMONFILES64\VST2"
  IfErrors SSYYNNTTHH_vst2_copy_failed SSYYNNTTHH_vst2_success
SSYYNNTTHH_vst2_copy_failed:
  Delete "$COMMONFILES64\VST2\SSYYNNTTHH.dll"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST2\SSYYNNTTHH.dll.trippah-backup" "$COMMONFILES64\VST2\SSYYNNTTHH.dll"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy SSYYNNTTHH. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
SSYYNNTTHH_vst2_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed SSYYNNTTHH is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
SSYYNNTTHH_vst2_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST2\SSYYNNTTHH.dll.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
SSYYNNTTHH_vst2_success:
  StrCmp $HadOld 1 0 +2
  Delete "$COMMONFILES64\VST2\SSYYNNTTHH.dll.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH\Uninstall SSYYNNTTHH.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "DisplayName" "DreamDAW - SSYYNNTTHH"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "DisplayVersion" "2.2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH\Uninstall SSYYNNTTHH.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH\install.log" w
  FileWrite $0 "Installed SSYYNNTTHH with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  Delete "$COMMONFILES64\VST2\SSYYNNTTHH.dll"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-SSYYNNTTHH"
  Delete "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH\Uninstall SSYYNNTTHH.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\SSYYNNTTHH"
SectionEnd
