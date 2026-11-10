'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isIsoDate, normalizeImport, parseModules, weekBounds } = require('../services/officialReservations');

test('valida fechas calendario reales', () => {
  assert.equal(isIsoDate('2026-11-10'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('10-11-2026'), false);
});

test('acepta arreglos, módulos individuales y rangos', () => {
  assert.deepEqual(parseModules([4, 3, 4]), [3, 4]);
  assert.deepEqual(parseModules(5), [5]);
  assert.deepEqual(parseModules('3-5, 7'), [3, 4, 5, 7]);
  assert.equal(parseModules('7-3'), null);
  assert.equal(parseModules(10), null);
});

test('normaliza una importación y expande cada módulo', () => {
  const result = normalizeImport([
    { sala: ' b12 ', fecha: '2026-11-10', modulos: [5], motivo: ' Interrogación ' },
    { sala: 'K201', fecha: '2026-11-12', modulos: '3-4', motivo: 'Evento' },
  ]);
  assert.deepEqual(result.reservations.map(({ groupId: _groupId, ...item }) => item), [
    { roomName: 'B12', date: '2026-11-10', module: 5, reason: 'Interrogación' },
    { roomName: 'K201', date: '2026-11-12', module: 3, reason: 'Evento' },
    { roomName: 'K201', date: '2026-11-12', module: 4, reason: 'Evento' },
  ]);
  assert.equal(result.reservations[1].groupId, result.reservations[2].groupId);
});

test('rechaza duplicados y archivos con filas inválidas', () => {
  assert.match(normalizeImport([]).error, /arreglo no vacío/);
  assert.equal(normalizeImport([
    { sala: 'B12', fecha: '2026-11-10', modulos: [5, 5], motivo: 'Prueba' },
  ]).error, undefined);
  assert.match(normalizeImport([
    { sala: 'B12', fecha: '2026-11-10', modulos: 5, motivo: 'Uno' },
    { sala: 'B12', fecha: '2026-11-10', modulos: 5, motivo: 'Dos' },
  ]).error, /duplicada/);
  assert.match(normalizeImport([
    { sala: 'B12', fecha: '2026-11-15', modulos: 5, motivo: 'Domingo' },
  ]).error, /domingo/);
});

test('calcula los límites lunes-domingo de una semana', () => {
  assert.deepEqual(weekBounds('2026-11-12'), ['2026-11-09', '2026-11-15']);
  assert.deepEqual(weekBounds('2026-11-15'), ['2026-11-09', '2026-11-15']);
});
