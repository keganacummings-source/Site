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
Name "DreamDAW - DREAMGLITCHER"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW DREAMGLITCHER installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install DREAMGLITCHER"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies DREAMGLITCHER into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
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

Section "Install DREAMGLITCHER"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File /r "${PAYLOAD}/DREAMGLITCHER.vst3"
  File "${PAYLOAD}/DREAMGLITCHER.dll"

  DetailPrint "Installing VST3: $COMMONFILES64\VST3\DREAMGLITCHER.vst3"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST3\DREAMGLITCHER.vst3\*.*" 0 DREAMGLITCHER_vst3_backup_done
  IfFileExists "$COMMONFILES64\VST3\DREAMGLITCHER.vst3.trippah-backup\*.*" DREAMGLITCHER_vst3_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST3\DREAMGLITCHER.vst3" "$COMMONFILES64\VST3\DREAMGLITCHER.vst3.trippah-backup"
  IfErrors DREAMGLITCHER_vst3_locked 0
  StrCpy $HadOld 1
DREAMGLITCHER_vst3_backup_done:
  CreateDirectory "$COMMONFILES64\VST3"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMGLITCHER.vst3" "$COMMONFILES64\VST3"
  IfErrors DREAMGLITCHER_vst3_copy_failed DREAMGLITCHER_vst3_success
DREAMGLITCHER_vst3_copy_failed:
  RMDir /r "$COMMONFILES64\VST3\DREAMGLITCHER.vst3"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST3\DREAMGLITCHER.vst3.trippah-backup" "$COMMONFILES64\VST3\DREAMGLITCHER.vst3"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMGLITCHER. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst3_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMGLITCHER is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst3_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST3\DREAMGLITCHER.vst3.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst3_success:
  StrCmp $HadOld 1 0 +2
  RMDir /r "$COMMONFILES64\VST3\DREAMGLITCHER.vst3.trippah-backup"

  DetailPrint "Installing VST2: $COMMONFILES64\VST2\DREAMGLITCHER.dll"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST2\DREAMGLITCHER.dll" 0 DREAMGLITCHER_vst2_backup_done
  IfFileExists "$COMMONFILES64\VST2\DREAMGLITCHER.dll.trippah-backup" DREAMGLITCHER_vst2_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST2\DREAMGLITCHER.dll" "$COMMONFILES64\VST2\DREAMGLITCHER.dll.trippah-backup"
  IfErrors DREAMGLITCHER_vst2_locked 0
  StrCpy $HadOld 1
DREAMGLITCHER_vst2_backup_done:
  CreateDirectory "$COMMONFILES64\VST2"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMGLITCHER.dll" "$COMMONFILES64\VST2"
  IfErrors DREAMGLITCHER_vst2_copy_failed DREAMGLITCHER_vst2_success
DREAMGLITCHER_vst2_copy_failed:
  Delete "$COMMONFILES64\VST2\DREAMGLITCHER.dll"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST2\DREAMGLITCHER.dll.trippah-backup" "$COMMONFILES64\VST2\DREAMGLITCHER.dll"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMGLITCHER. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst2_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMGLITCHER is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst2_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST2\DREAMGLITCHER.dll.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMGLITCHER_vst2_success:
  StrCmp $HadOld 1 0 +2
  Delete "$COMMONFILES64\VST2\DREAMGLITCHER.dll.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER\Uninstall DREAMGLITCHER.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "DisplayName" "DreamDAW - DREAMGLITCHER"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "DisplayVersion" "2.2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER\Uninstall DREAMGLITCHER.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER\install.log" w
  FileWrite $0 "Installed DREAMGLITCHER with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  RMDir /r "$COMMONFILES64\VST3\DREAMGLITCHER.vst3"
  Delete "$COMMONFILES64\VST2\DREAMGLITCHER.dll"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMGLITCHER"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER\Uninstall DREAMGLITCHER.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\DREAMGLITCHER"
SectionEnd
