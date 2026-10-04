#!/usr/bin/env python3
"""Rebuild the standard NSIS installers from the supplied, readable .nsi files."""
from pathlib import Path
import io
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

source_root = Path(__file__).resolve().parent
project = source_root.parent.parent
packages = project / 'DownloadVSTFile'
compiler = shutil.which('makensis')
if not compiler and os.name == 'nt':
    for env_name in ('ProgramFiles(x86)', 'ProgramFiles'):
        candidate = Path(os.environ.get(env_name, 'C:/Program Files')) / 'NSIS/makensis.exe'
        if candidate.is_file():
            compiler = str(candidate)
            break
if not compiler:
    raise SystemExit('Install NSIS 3 and add makensis to PATH before rebuilding.')
switch = '/' if os.name == 'nt' else '-'

def run(script, **definitions):
    args = [compiler, switch + 'V3']
    args.extend(switch + 'D' + name + '=' + str(value) for name, value in definitions.items())
    subprocess.run(args + [str(script)], check=True)

def archive_bytes(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as result:
        for name, data in sorted(files.items()):
            result.writestr(name, data)
    return stream.getvalue()

with tempfile.TemporaryDirectory(prefix='trippah-nsis-') as temporary:
    staging = Path(temporary)
    plugin_sources = sorted(p for p in source_root.glob('*.nsi') if p.stem not in ('DREAMVST3', 'DREAMVST3_BUNDLE'))
    for script in plugin_sources:
        name = script.stem
        payload = staging / name
        with zipfile.ZipFile(packages / (name + '.zip')) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                relative = Path(member.filename).relative_to(name)
                if relative.is_absolute() or '..' in relative.parts:
                    raise ValueError('Invalid ZIP member path')
                if relative.suffix.lower() in ('.exe', '.bat', '.ps1'):
                    continue
                target = payload / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(member))
        run(script, PAYLOAD=payload, OUTPUT=packages / ('Install ' + name + '.exe'))
    for name in ('DREAMVST3', 'DREAMVST3_BUNDLE'):
        run(source_root / (name + '.nsi'), INSTALLERS=packages, OUTPUT=packages / (name + '.exe'))

shutil.copy2(packages / 'Install DREAMSHARELITE.exe', project / 'Developer/DREAMSHARELITE_VST3/Install DREAMSHARELITE.exe')
for archive_path in sorted(packages.glob('*.zip')):
    if archive_path.name == 'DREAMVST3_INSTALLER.zip':
        continue
    with zipfile.ZipFile(archive_path) as archive:
        files = {member.filename: archive.read(member) for member in archive.infolist() if not member.is_dir()}
    for name in files:
        if Path(name).name.startswith('Install ') and name.endswith('.exe'):
            files[name] = (packages / Path(name).name).read_bytes()
    archive_path.write_bytes(archive_bytes(files))
collection = {'README.txt': (packages / 'README.txt').read_bytes()}
for path in sorted(packages.glob('Install *.exe')):
    collection['installers/' + path.name] = path.read_bytes()
for path in sorted(packages.glob('*.zip')):
    if path.name != 'DREAMVST3_INSTALLER.zip':
        collection['packages/' + path.name] = path.read_bytes()
(packages / 'DREAMVST3_INSTALLER.zip').write_bytes(archive_bytes(collection))
print('Built and synchronized all individual and collection installers.')
