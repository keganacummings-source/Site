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
Name "DreamDAW - FLXYTE"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW FLXYTE installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install FLXYTE"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies FLXYTE into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
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

Section "Install FLXYTE"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File "${PAYLOAD}/FLXYTE.dll"

  DetailPrint "Installing VST2: $COMMONFILES64\VST2\FLXYTE.dll"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST2\FLXYTE.dll" 0 FLXYTE_vst2_backup_done
  IfFileExists "$COMMONFILES64\VST2\FLXYTE.dll.trippah-backup" FLXYTE_vst2_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST2\FLXYTE.dll" "$COMMONFILES64\VST2\FLXYTE.dll.trippah-backup"
  IfErrors FLXYTE_vst2_locked 0
  StrCpy $HadOld 1
FLXYTE_vst2_backup_done:
  CreateDirectory "$COMMONFILES64\VST2"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\FLXYTE.dll" "$COMMONFILES64\VST2"
  IfErrors FLXYTE_vst2_copy_failed FLXYTE_vst2_success
FLXYTE_vst2_copy_failed:
  Delete "$COMMONFILES64\VST2\FLXYTE.dll"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST2\FLXYTE.dll.trippah-backup" "$COMMONFILES64\VST2\FLXYTE.dll"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy FLXYTE. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
FLXYTE_vst2_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed FLXYTE is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
FLXYTE_vst2_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST2\FLXYTE.dll.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
FLXYTE_vst2_success:
  StrCmp $HadOld 1 0 +2
  Delete "$COMMONFILES64\VST2\FLXYTE.dll.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\FLXYTE"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\FLXYTE\Uninstall FLXYTE.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "DisplayName" "DreamDAW - FLXYTE"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "DisplayVersion" "2.2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\FLXYTE\Uninstall FLXYTE.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\FLXYTE\install.log" w
  FileWrite $0 "Installed FLXYTE with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  Delete "$COMMONFILES64\VST2\FLXYTE.dll"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-FLXYTE"
  Delete "$COMMONFILES64\DreamDAWInstallers\FLXYTE\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\FLXYTE\Uninstall FLXYTE.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\FLXYTE"
SectionEnd
