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
Name "DreamDAW - DREAMPARASITE"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW DREAMPARASITE installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install DREAMPARASITE"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies DREAMPARASITE into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
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

Section "Install DREAMPARASITE"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File /r "${PAYLOAD}/DREAMPARASITE.vst3"
  File "${PAYLOAD}/DREAMPARASITE.dll"

  DetailPrint "Installing VST3: $COMMONFILES64\VST3\DREAMPARASITE.vst3"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST3\DREAMPARASITE.vst3\*.*" 0 DREAMPARASITE_vst3_backup_done
  IfFileExists "$COMMONFILES64\VST3\DREAMPARASITE.vst3.trippah-backup\*.*" DREAMPARASITE_vst3_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST3\DREAMPARASITE.vst3" "$COMMONFILES64\VST3\DREAMPARASITE.vst3.trippah-backup"
  IfErrors DREAMPARASITE_vst3_locked 0
  StrCpy $HadOld 1
DREAMPARASITE_vst3_backup_done:
  CreateDirectory "$COMMONFILES64\VST3"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMPARASITE.vst3" "$COMMONFILES64\VST3"
  IfErrors DREAMPARASITE_vst3_copy_failed DREAMPARASITE_vst3_success
DREAMPARASITE_vst3_copy_failed:
  RMDir /r "$COMMONFILES64\VST3\DREAMPARASITE.vst3"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST3\DREAMPARASITE.vst3.trippah-backup" "$COMMONFILES64\VST3\DREAMPARASITE.vst3"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMPARASITE. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst3_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMPARASITE is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst3_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST3\DREAMPARASITE.vst3.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst3_success:
  StrCmp $HadOld 1 0 +2
  RMDir /r "$COMMONFILES64\VST3\DREAMPARASITE.vst3.trippah-backup"

  DetailPrint "Installing VST2: $COMMONFILES64\VST2\DREAMPARASITE.dll"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST2\DREAMPARASITE.dll" 0 DREAMPARASITE_vst2_backup_done
  IfFileExists "$COMMONFILES64\VST2\DREAMPARASITE.dll.trippah-backup" DREAMPARASITE_vst2_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST2\DREAMPARASITE.dll" "$COMMONFILES64\VST2\DREAMPARASITE.dll.trippah-backup"
  IfErrors DREAMPARASITE_vst2_locked 0
  StrCpy $HadOld 1
DREAMPARASITE_vst2_backup_done:
  CreateDirectory "$COMMONFILES64\VST2"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\DREAMPARASITE.dll" "$COMMONFILES64\VST2"
  IfErrors DREAMPARASITE_vst2_copy_failed DREAMPARASITE_vst2_success
DREAMPARASITE_vst2_copy_failed:
  Delete "$COMMONFILES64\VST2\DREAMPARASITE.dll"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST2\DREAMPARASITE.dll.trippah-backup" "$COMMONFILES64\VST2\DREAMPARASITE.dll"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy DREAMPARASITE. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst2_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed DREAMPARASITE is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst2_backup_exists:
  MessageBox MB_OK|MB_ICONSTOP "A previous backup exists at $COMMONFILES64\VST2\DREAMPARASITE.dll.trippah-backup. Preserve or restore that backup before retrying."
  SetErrorLevel 1
  Abort
DREAMPARASITE_vst2_success:
  StrCmp $HadOld 1 0 +2
  Delete "$COMMONFILES64\VST2\DREAMPARASITE.dll.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE\Uninstall DREAMPARASITE.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "DisplayName" "DreamDAW - DREAMPARASITE"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "DisplayVersion" "2.2.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE\Uninstall DREAMPARASITE.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE\install.log" w
  FileWrite $0 "Installed DREAMPARASITE with NSIS 3.09. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  RMDir /r "$COMMONFILES64\VST3\DREAMPARASITE.vst3"
  Delete "$COMMONFILES64\VST2\DREAMPARASITE.dll"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-DREAMPARASITE"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE\Uninstall DREAMPARASITE.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\DREAMPARASITE"
SectionEnd
