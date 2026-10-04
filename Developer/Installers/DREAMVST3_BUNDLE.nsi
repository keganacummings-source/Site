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
Name "DreamDAW - DREAMVST3_BUNDLE"
OutFile "${OUTPUT}"
VIAddVersionKey "ProductName" "DreamDAW installer collection"
Var Result
!define MUI_WELCOMEPAGE_TEXT "This collection runs the visible installer for each included plugin.$\r$\n$\r$\nClose FL Studio first. DREAMSHARELITE requires the C++ build prerequisites and internet access; see README_TRIPPAH.txt."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"
Section "Install collection"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "${INSTALLERS}/Install SSYYNNTTHH.exe"
  DetailPrint "Opening SSYYNNTTHH installer."
  ExecWait '$\"$PLUGINSDIR\Install SSYYNNTTHH.exe$\"' $Result
  IfErrors collection_failed
  StrCmp $Result 0 0 collection_failed
  File "${INSTALLERS}/Install DREAMSHARELITE.exe"
  DetailPrint "Opening DREAMSHARELITE installer."
  ExecWait '$\"$PLUGINSDIR\Install DREAMSHARELITE.exe$\"' $Result
  IfErrors collection_failed
  StrCmp $Result 0 0 collection_failed
  File "${INSTALLERS}/Install INXOMNIA.exe"
  DetailPrint "Opening INXOMNIA installer."
  ExecWait '$\"$PLUGINSDIR\Install INXOMNIA.exe$\"' $Result
  IfErrors collection_failed
  StrCmp $Result 0 0 collection_failed
  Goto collection_complete
collection_failed:
  MessageBox MB_OK|MB_ICONSTOP "A plugin installer did not finish. The collection has stopped. Read that installer's message before retrying."
  SetErrorLevel 1
  Abort
collection_complete:
SectionEnd
