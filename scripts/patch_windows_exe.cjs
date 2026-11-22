const fs = require('fs');
const path = require('path');
const ResEdit = require('resedit');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '1.11.0';
const [major, minor, patch] = version.split('.').map(n => parseInt(n, 10) || 0);

const iconPath = path.join(rootDir, 'public', 'favicon.ico');
if (!fs.existsSync(iconPath)) {
    console.error('Error: favicon.ico not found at', iconPath);
    process.exit(1);
}

const icoBuf = fs.readFileSync(iconPath);
const iconFile = ResEdit.Data.IconFile.from(icoBuf);

function patchExe(exePath) {
    if (!fs.existsSync(exePath)) {
        console.warn('Skipping non-existent exe:', exePath);
        return false;
    }
    console.log(`Patching Windows executable: ${exePath}...`);
    const exeBuf = fs.readFileSync(exePath);
    const exe = ResEdit.NtExecutable.from(exeBuf);
    const res = ResEdit.NtExecutableResource.from(exe);

    // Inject icon into standard Windows resource IDs:
    // 1 (IDI_APPLICATION), 101 (standard Win32/C++ app icon), and 0 (fallback)
    const iconIds = [1, 101, 0];
    for (const id of iconIds) {
        ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
            res.entries,
            id,
            1033, // en-US
            iconFile.icons.map(i => i.data)
        );
    }

    // Windows VersionInfo metadata
    const vi = ResEdit.Resource.VersionInfo.createEmpty();
    vi.setFileVersion(major, minor, patch, 0, 1033);
    vi.setProductVersion(major, minor, patch, 0, 1033);
    vi.setStringValues(
        { lang: 1033, codepage: 1200 },
        {
            FileDescription: 'Simulador Moderno Intel 8085',
            ProductName: 'Simulador Moderno Intel 8085',
            CompanyName: 'danDTX',
            LegalCopyright: `Copyright © ${new Date().getFullYear()} danDTX`,
            OriginalFilename: 'Simulador_8085.exe',
            InternalName: 'Simulador_8085',
            ProductVersion: version,
            FileVersion: `${major}.${minor}.${patch}.0`
        }
    );
    vi.outputToResourceEntries(res.entries);

    res.outputResource(exe);
    const outBuf = Buffer.from(exe.generate());
    fs.writeFileSync(exePath, outBuf);
    console.log(`Successfully patched: ${exePath} (${outBuf.length} bytes)`);
    return true;
}

// 1. Patch the raw output of neu build
const neuWinExe = path.join(rootDir, 'dist', 'simulador-8085', 'simulador-8085-win_x64.exe');
patchExe(neuWinExe);

// 2. Setup distribution folder: dist/Simulador_8085_v${version}_Windows_x64
const distReleaseDir = path.join(rootDir, 'dist', `Simulador_8085_v${version}_Windows_x64`);
if (!fs.existsSync(distReleaseDir)) {
    fs.mkdirSync(distReleaseDir, { recursive: true });
}

// Copy patched exe as Simulador_8085.exe and resources.neu
const targetExe = path.join(distReleaseDir, 'Simulador_8085.exe');
const neuResources = path.join(rootDir, 'dist', 'simulador-8085', 'resources.neu');
const targetResources = path.join(distReleaseDir, 'resources.neu');

if (fs.existsSync(neuWinExe)) {
    fs.copyFileSync(neuWinExe, targetExe);
    patchExe(targetExe);
}
if (fs.existsSync(neuResources)) {
    fs.copyFileSync(neuResources, targetResources);
}

console.log(`Release folder ready at: ${distReleaseDir}`);
