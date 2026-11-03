import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Logger } from '../src/core/logger.js';

describe('Logger Flight Recorder Subsystem', () => {
  it('initializes and records messages with formatted timestamp, level and tag', () => {
    Logger.clear();
    Logger.init('1.10.0');

    Logger.info('TEST_TAG', 'Operación de prueba iniciada');
    Logger.warn('TEST_WARN', 'Advertencia simulada');
    Logger.error('TEST_ERR', 'Error simulado', { code: 404 });

    const entries = Logger.getEntries();
    assert.strictEqual(entries.length >= 3, true);

    const errEntry = entries.find(e => e.tag === 'TEST_ERR');
    assert.ok(errEntry);
    assert.strictEqual(errEntry.level, 'ERROR');
    assert.strictEqual(errEntry.message, 'Error simulado');
    assert.ok(errEntry.details?.includes('404'));
  });

  it('limits buffer strictly to MAX_ENTRIES (1000 items) on overflow', () => {
    Logger.clear();
    for (let i = 0; i < 1100; i++) {
      Logger.debug('OVERFLOW', `Evento número ${i}`);
    }

    assert.strictEqual(Logger.getCount(), 1000);
    const text = Logger.getFormattedText();
    assert.ok(text.includes('Evento número 1099'));
    // The first 100 events should have been shifted out
    assert.strictEqual(text.includes('Evento número 0\n'), false);
    assert.strictEqual(text.includes('Evento número 99\n'), false);
    assert.strictEqual(text.includes('Evento número 100'), true);
  });
});
