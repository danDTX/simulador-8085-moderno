import { ConfigManager, DEFAULT_CONFIG } from '../src/core/configManager.js';

console.log('===============================================================');
console.log('TEST SUITE: Desktop Session & File History Persistence');
console.log('===============================================================');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

async function runTests() {
  // Mock localStorage for Node test runner
  const storageMap = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, value: string) => storageMap.set(key, value),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear()
  };

  // 1. Initial Load Defaults
  const initial = await ConfigManager.load();
  assert(initial.theme === 'dark', 'Default theme is dark');
  assert(initial.wordWrap === false, 'Default wordWrap is false');
  assert(initial.zoomLevel === 1.0, 'Default zoomLevel is 1.0');
  assert(initial.splitRatio === 0.5, 'Default splitRatio is 0.5');
  assert(Array.isArray(initial.openTabs) && initial.openTabs.length === 0, 'Initial openTabs is empty');
  assert(Array.isArray(initial.recentFiles) && initial.recentFiles.length === 0, 'Initial recentFiles is empty');

  // 2. Save Theme, Zoom & SplitRatio
  await ConfigManager.save({ theme: 'light', zoomLevel: 1.25, splitRatio: 0.62 });
  const updated1 = ConfigManager.get();
  assert(updated1.theme === 'light', 'Theme updated to light in cache');
  assert(updated1.zoomLevel === 1.25, 'Zoom level updated to 1.25');
  assert(updated1.splitRatio === 0.62, 'Split ratio updated to 0.62');

  // Verify persistence in localStorage fallback
  const reloaded = await ConfigManager.load();
  assert(reloaded.theme === 'light', 'Persisted theme survives reload');
  assert(reloaded.zoomLevel === 1.25, 'Persisted zoom survives reload');
  assert(reloaded.splitRatio === 0.62, 'Persisted splitRatio survives reload');

  // 3. Recent Files management
  await ConfigManager.addRecentFile('C:\\Users\\LENOVO\\Documents\\cajero.asm');
  let recents = ConfigManager.get().recentFiles;
  assert(recents.length === 1, '1 recent file registered');
  assert(recents[0] === 'C:/Users/LENOVO/Documents/cajero.asm', 'Backslashes normalized to forward slashes');

  // Deduplication & moving to front
  await ConfigManager.addRecentFile('D:\\Proyectos\\snake.asm');
  await ConfigManager.addRecentFile('C:\\Users\\LENOVO\\Documents\\cajero.asm');
  recents = ConfigManager.get().recentFiles;
  assert(recents.length === 2, 'Recent files deduped properly');
  assert(recents[0] === 'C:/Users/LENOVO/Documents/cajero.asm', 'Re-opened file moved to front of history');

  // Capped at 8 items
  for (let i = 1; i <= 10; i++) {
    await ConfigManager.addRecentFile(`E:\\test\\prog_${i}.asm`);
  }
  recents = ConfigManager.get().recentFiles;
  assert(recents.length === 8, 'Recent files capped strictly at 8 entries');
  assert(recents[0] === 'E:/test/prog_10.asm', 'Most recently added is first');

  // Clear history
  await ConfigManager.clearRecentFiles();
  assert(ConfigManager.get().recentFiles.length === 0, 'clearRecentFiles() resets history cleanly');

  // 4. Multi-tab Session State
  const sampleTabs = [
    { name: 'cajero.asm', filePath: 'C:/tests/cajero.asm' },
    { name: 'sin_titulo_2.asm', code: 'MVI A, 55H\nHLT\n' }
  ];
  await ConfigManager.save({
    openTabs: sampleTabs,
    activeTabName: 'sin_titulo_2.asm'
  });

  const stateReload = await ConfigManager.load();
  assert(stateReload.openTabs.length === 2, 'Saved 2 open tabs properly');
  assert(stateReload.openTabs[0].name === 'cajero.asm', 'First tab name preserved');
  assert(stateReload.openTabs[0].filePath === 'C:/tests/cajero.asm', 'First tab filePath preserved');
  assert(stateReload.openTabs[1].code?.includes('55H') === true, 'Draft tab code preserved');
  assert(stateReload.activeTabName === 'sin_titulo_2.asm', 'Active tab name preserved');

  console.log('===============================================================');
  console.log('ALL PERSISTENCE & HISTORY TESTS PASSED (100% CLEAN)!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
