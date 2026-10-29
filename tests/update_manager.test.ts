import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isNewerVersion, generateUpdaterBatch, checkGitHubRelease } from '../src/core/updateManager.js';

describe('UpdateManager - Version Comparison & Script Generation', () => {
  it('correctly compares semantic versions with and without "v" prefix', () => {
    assert.strictEqual(isNewerVersion('v1.8.1', '1.8.0'), true);
    assert.strictEqual(isNewerVersion('1.8.1', '1.8.0'), true);
    assert.strictEqual(isNewerVersion('v1.9.0', '1.8.0'), true);
    assert.strictEqual(isNewerVersion('v2.0.0', '1.8.0'), true);
    assert.strictEqual(isNewerVersion('v1.10.0', '1.8.0'), true);
    assert.strictEqual(isNewerVersion('v1.8.0', '1.8.0'), false);
    assert.strictEqual(isNewerVersion('1.8.0', '1.8.0'), false);
    assert.strictEqual(isNewerVersion('v1.7.1', '1.8.0'), false);
    assert.strictEqual(isNewerVersion('v1.0.0', '1.8.0'), false);
  });

  it('generates Windows updater batch script with proper safety guards', () => {
    const script = generateUpdaterBatch(12345, 'C:\\Simulador 8085', 'https://github.com/danDTX/simulador-8085-moderno/releases/download/v1.9.1/Simulador_8085_v1.9.1_Windows_x64.zip');
    assert.ok(script.includes('PID: 12345'));
    assert.ok(script.includes('taskkill /PID 12345 /F'));
    assert.ok(script.includes('Expand-Archive'));
    assert.ok(script.includes('Invoke-WebRequest'));
    assert.ok(script.includes('sim8085_config.json')); // Must preserve configuration!
    assert.ok(script.includes('C:\\Simulador 8085'));
    assert.ok(script.includes('Simulador_8085.exe'));
  });

  it('parses GitHub release payload correctly', async () => {
    const originalFetch = globalThis.fetch;
    try {
      (globalThis as any).fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: 'v1.9.0',
          name: 'Simulador 8085 v1.9.0',
          body: 'Novedades increíbles',
          assets: [
            {
              name: 'Simulador_8085_v1.9.0_Windows_x64.zip',
              browser_download_url: 'https://github.com/danDTX/simulador-8085-moderno/releases/download/v1.9.0/Simulador_8085_v1.9.0_Windows_x64.zip',
              size: 1400000
            }
          ]
        })
      });

      const update = await checkGitHubRelease('1.8.0');
      assert.ok(update !== null);
      assert.strictEqual(update.tagName, 'v1.9.0');
      assert.strictEqual(update.version, '1.9.0');
      assert.strictEqual(update.assetName, 'Simulador_8085_v1.9.0_Windows_x64.zip');
      assert.strictEqual(update.assetSize, 1400000);

      // When local is already 1.9.0 or higher, should return null
      const noUpdate = await checkGitHubRelease('1.9.0');
      assert.strictEqual(noUpdate, null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
