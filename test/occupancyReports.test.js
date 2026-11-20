'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  effectiveStatus,
  expandBlockedSlots,
  isBlockOver,
  normalizeBlockEnd,
  normalizeReportInput,
  nowInSantiago,
} = require('../services/occupancyReports');

// Martes 24/11/2026 a las 11:30 (módulo 3 en curso).
const CLOCK = { date: '2026-11-24', time: '11:30' };

test('usa la hora de Chile', () => {
  // 14:30 UTC = 11:30 en Santiago (UTC-3 en noviembre).
  assert.deepEqual(nowInSantiago(new Date('2026-11-24T14:30:00Z')), CLOCK);
});

test('un bloque termina con su módulo', () => {
  assert.equal(isBlockOver('2026-11-24', 2, CLOCK), true);
  assert.equal(isBlockOver('2026-11-24', 3, CLOCK), false);
  assert.equal(isBlockOver('2026-11-23', 9, CLOCK), true);
  assert.equal(isBlockOver('2026-11-25', 1, CLOCK), false);
});

test('valida un reporte nuevo', () => {
  const valid = { roomId: ' b12 ', date: '2026-11-24', module: 3, reason: 'event', detail: ' Ensayo ' };
  assert.deepEqual(normalizeReportInput(valid, CLOCK).report, {
    roomName: 'B12',
    date: '2026-11-24',
    module: 3,
    reason: 'event',
    detail: 'Ensayo',
  });
  assert.ok(normalizeReportInput({ ...valid, module: 2 }, CLOCK).error, 'módulo ya terminado');
  assert.ok(normalizeReportInput({ ...valid, date: '2026-11-29' }, CLOCK).error, 'domingo');
  assert.ok(normalizeReportInput({ ...valid, date: '2026-12-10' }, CLOCK).error, 'muy adelante');
  assert.ok(normalizeReportInput({ ...valid, reason: 'nada' }, CLOCK).error, 'motivo inválido');
  assert.ok(normalizeReportInput({ ...valid, reason: 'other', detail: '' }, CLOCK).error, 'otro sin detalle');
  assert.ok(normalizeReportInput({ ...valid, module: 10 }, CLOCK).error, 'módulo fuera de rango');
});

test('valida el término del bloqueo al aceptar', () => {
  const report = { date: '2026-11-24', module: 3 };
  assert.deepEqual(normalizeBlockEnd(report, '2026-11-24', 3).until, { date: '2026-11-24', module: 3 });
  assert.ok(normalizeBlockEnd(report, '2026-11-24', 2).error, 'antes del reporte');
  assert.ok(normalizeBlockEnd(report, '2026-12-20', 1).error, 'más de 14 días');
  assert.ok(normalizeBlockEnd(report, '2026-11-29', 1).error, 'domingo');
});

test('expande los bloques cubiertos sin domingos', () => {
  const slots = expandBlockedSlots({
    date: '2026-11-28',
    module: 8,
    blockedUntilDate: '2026-11-30',
    blockedUntilModule: 2,
  });
  assert.deepEqual(slots, [
    { date: '2026-11-28', module: 8 },
    { date: '2026-11-28', module: 9 },
    { date: '2026-11-30', module: 1 },
    { date: '2026-11-30', module: 2 },
  ]);
  assert.deepEqual(expandBlockedSlots({ date: '2026-11-24', module: 3 }), []);
});

test('un reporte pendiente vence al terminar su bloque', () => {
  assert.equal(effectiveStatus({ status: 'pending', date: '2026-11-24', module: 2 }, CLOCK), 'expired');
  assert.equal(effectiveStatus({ status: 'pending', date: '2026-11-24', module: 3 }, CLOCK), 'pending');
  assert.equal(effectiveStatus({ status: 'accepted', date: '2026-11-24', module: 1 }, CLOCK), 'accepted');
});
