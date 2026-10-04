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
Name "DreamDAW - DREAMSTRYNG"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW DREAMSTRYNG installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install DREAMSTRYNG"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies DREAMSTRYNG into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
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

Section "Install DREAMSTRYNG"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File "${PAYLOAD}/DREAMSTRYNG.dll"

  DetailPrint "Installing VST2: $COMMONFILES64\VST2\DREAMSTRYNG.dll"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST2\DREAMSTRYNG.dll" 0 DREAMSTRYNG_vst2_backup_done
  IfFileExists "$COMMONFILES64\VST2\DREAMSTRYNG.dll.trippah-backup" DREAMSTRYNG_vst2_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST2\DREAMSTRYNG.dll" "$COMMONFILES64\VST2\DREAMSTRYNG.dll.trippah-backup"
  IfErrors DREAMSTRYNG_vst2_locked 0
  StrCpy $HadOld 1
DREAMSTRYNG_vst2_backup_done:
  CreateDirectory "$COMMONFILES64\VST2"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMSTRYNG.dll" "$COMMONFILES64\VST2"
  IfErrors DREAMSTRYNG_vst2_copy_failed DREAMSTRYNG_vst2_success
DREAMSTRYNG_vst2_copy_failed:
  Delete "$COMMONFILES64\VST2\DREAMSTRYNG.dll"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST2\DREAMSTRYNG.dll.trippah-backup" "$COMMONFILES64\VST2\DREAMSTRYNG.dll"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMSTRYNG. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMSTRYNG_vst2_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMSTRYNG is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMSTRYNG_vst2_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST2\DREAMSTRYNG.dll.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMSTRYNG_vst2_success:
  StrCmp $HadOld 1 0 +2
  Delete "$COMMONFILES64\VST2\DREAMSTRYNG.dll.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG\Uninstall DREAMSTRYNG.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "DisplayName" "DreamDAW - DREAMSTRYNG"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "DisplayVersion" "2.2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG\Uninstall DREAMSTRYNG.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG\install.log" w
  FileWrite $0 "Installed DREAMSTRYNG with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  Delete "$COMMONFILES64\VST2\DREAMSTRYNG.dll"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMSTRYNG"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG\Uninstall DREAMSTRYNG.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\DREAMSTRYNG"
SectionEnd
