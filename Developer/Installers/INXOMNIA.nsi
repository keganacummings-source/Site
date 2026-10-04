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
Name "DreamDAW - INXOMNIA"
OutFile "${OUTPUT}"
InstallDir "$COMMONFILES64"
VIAddVersionKey "ProductName" "DreamDAW INXOMNIA installer"
Var HadOld
!define MUI_WELCOMEPAGE_TITLE "Install INXOMNIA"
!define MUI_WELCOMEPAGE_TEXT "Close FL Studio before continuing.$\r$\n$\r$\nThis installer copies INXOMNIA into the standard Windows VST folders. Existing files of this plugin are backed up while the replacement is copied.$\r$\n$\r$\nThe installation details are shown below."
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

Section "Install INXOMNIA"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\payload"
  File /r "${PAYLOAD}/INXOMNIA.vst3"

  DetailPrint "Installing VST3: $COMMONFILES64\VST3\INXOMNIA.vst3"
  StrCpy $HadOld 0
  IfFileExists "$COMMONFILES64\VST3\INXOMNIA.vst3\*.*" 0 INXOMNIA_vst3_backup_done
  IfFileExists "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup\*.*" INXOMNIA_vst3_backup_exists 0
  ClearErrors
  Rename "$COMMONFILES64\VST3\INXOMNIA.vst3" "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup"
  IfErrors INXOMNIA_vst3_locked 0
  StrCpy $HadOld 1
INXOMNIA_vst3_backup_done:
  CreateDirectory "$COMMONFILES64\VST3"
  ClearErrors
  CopyFiles "$PLUGINSDIR\payload\INXOMNIA.vst3" "$COMMONFILES64\VST3"
  IfErrors INXOMNIA_vst3_copy_failed INXOMNIA_vst3_success
INXOMNIA_vst3_copy_failed:
  RMDir /r "$COMMONFILES64\VST3\INXOMNIA.vst3"
  StrCmp $HadOld 1 0 +2
  Rename "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup" "$COMMONFILES64\VST3\INXOMNIA.vst3"
  MessageBox MB_OK|MB_ICONSTOP "Could not copy INXOMNIA. Close FL Studio and retry. Check the .trippah-backup file or folder if restoration failed."
  SetErrorLevel 1
  Abort
INXOMNIA_vst3_locked:
  MessageBox MB_OK|MB_ICONSTOP "The installed INXOMNIA is in use. Close FL Studio and retry."
  SetErrorLevel 1
  Abort
INXOMNIA_vst3_backup_exists:
  DetailPrint "Replacing previous INXOMNIA backup."
  RMDir /r "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup"
  ClearErrors
  Rename "$COMMONFILES64\VST3\INXOMNIA.vst3" "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup"
  IfErrors INXOMNIA_vst3_locked
  StrCpy $HadOld 1
  Goto INXOMNIA_vst3_backup_done
INXOMNIA_vst3_success:
  StrCmp $HadOld 1 0 +2
  RMDir /r "$COMMONFILES64\VST3\INXOMNIA.vst3.trippah-backup"

  SetOutPath "$COMMONFILES64\DreamDAWInstallers\INXOMNIA"
  WriteUninstaller "$COMMONFILES64\DreamDAWInstallers\INXOMNIA\Uninstall INXOMNIA.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "DisplayName" "DreamDAW - INXOMNIA"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "DisplayVersion" "2.3.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "Publisher" "DreamDAW"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "UninstallString" '$\"$COMMONFILES64\DreamDAWInstallers\INXOMNIA\Uninstall INXOMNIA.exe$\"'
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA" "NoRepair" 1
  FileOpen $0 "$COMMONFILES64\DreamDAWInstallers\INXOMNIA\install.log" w
  FileWrite $0 "Installed INXOMNIA with NSIS 3.08. Standard VST folders only.$\r$\n"
  FileClose $0
SectionEnd

Section "Uninstall"
  RMDir /r "$COMMONFILES64\VST3\INXOMNIA.vst3"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DreamDAW-INXOMNIA"
  Delete "$COMMONFILES64\DreamDAWInstallers\INXOMNIA\install.log"
  Delete "$COMMONFILES64\DreamDAWInstallers\INXOMNIA\Uninstall INXOMNIA.exe"
  RMDir "$COMMONFILES64\DreamDAWInstallers\INXOMNIA"
SectionEnd
