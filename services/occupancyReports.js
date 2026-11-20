'use strict';

const { isIsoDate } = require('./officialReservations');

/*
 * Reportes de ocupación: un usuario avisa que una sala que aparece libre está
 * ocupada en un día y módulo. El administrador lo acepta (la sala queda no
 * disponible hasta la fecha y módulo que elija) o lo rechaza. Un reporte
 * pendiente vence cuando termina el bloque reportado.
 */

const TIME_ZONE = 'America/Santiago';

/** Término de cada módulo según el horario oficial UC (M1 08:20–09:30 … M9 20:10–21:20). */
const MODULE_END = {
  1: '09:30',
  2: '10:50',
  3: '12:10',
  4: '13:30',
  5: '16:00',
  6: '17:20',
  7: '18:40',
  8: '20:00',
  9: '21:20',
};

const REASON_LABELS = {
  class: 'Clase o ayudantía no programada',
  event: 'Evento o actividad',
  exam: 'Prueba o interrogación',
  locked: 'Sala cerrada o sin acceso',
  maintenance: 'Mantención o reparación',
  other: 'Otro motivo',
};

const DETAIL_MAX_LENGTH = 300;
/** Hasta cuántos días adelante se puede reportar y bloquear una sala. */
const MAX_REPORT_DAYS_AHEAD = 7;
const MAX_BLOCK_DAYS = 14;

/** Fecha (YYYY-MM-DD) y hora (HH:mm) actuales en Chile. */
function nowInSantiago(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isSunday(dateString) {
  return new Date(`${dateString}T00:00:00Z`).getUTCDay() === 0;
}

function isModule(value) {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

/** Compara dos bloques (fecha, módulo): negativo si a es anterior a b. */
function compareSlots(a, b) {
  return a.date.localeCompare(b.date) || a.module - b.module;
}

/** Indica si el bloque (fecha, módulo) ya terminó. */
function isBlockOver(date, module, clock = nowInSantiago()) {
  return date < clock.date || (date === clock.date && clock.time > MODULE_END[module]);
}

/** Valida el cuerpo de POST /reports. Devuelve { report } o { error }. */
function normalizeReportInput(body, clock = nowInSantiago()) {
  const roomName = typeof body?.roomId === 'string' ? body.roomId.trim().toUpperCase() : '';
  const date = typeof body?.date === 'string' ? body.date.trim() : '';
  const module = Number(body?.module);
  const reason = typeof body?.reason === 'string' ? body.reason : '';
  const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';

  if (!roomName) return { error: 'Indica la sala que quieres reportar.' };
  if (!isIsoDate(date)) return { error: 'La fecha debe usar el formato YYYY-MM-DD.' };
  if (isSunday(date)) return { error: 'No se pueden reportar salas en domingo.' };
  if (!isModule(module)) return { error: 'El módulo debe estar entre 1 y 9.' };
  if (!REASON_LABELS[reason]) return { error: 'Elige un motivo válido.' };
  if (detail.length > DETAIL_MAX_LENGTH) {
    return { error: `El detalle puede tener hasta ${DETAIL_MAX_LENGTH} caracteres.` };
  }
  if (reason === 'other' && !detail) return { error: 'Describe el motivo en el detalle.' };
  if (isBlockOver(date, module, clock)) {
    return { error: 'Ese módulo ya terminó; solo se pueden reportar módulos en curso o futuros.' };
  }
  if (date > addDays(clock.date, MAX_REPORT_DAYS_AHEAD)) {
    return { error: `Solo se puede reportar hasta ${MAX_REPORT_DAYS_AHEAD} días adelante.` };
  }
  return { report: { roomName, date, module, reason, detail } };
}

/** Valida el fin del bloqueo al aceptar un reporte. Devuelve { until } o { error }. */
function normalizeBlockEnd(report, untilDate, untilModule) {
  const until = { date: typeof untilDate === 'string' ? untilDate : '', module: Number(untilModule) };
  if (!isIsoDate(until.date)) return { error: 'La fecha de término debe usar el formato YYYY-MM-DD.' };
  if (isSunday(until.date)) return { error: 'La fecha de término no puede ser domingo.' };
  if (!isModule(until.module)) return { error: 'El módulo de término debe estar entre 1 y 9.' };
  if (compareSlots(until, { date: report.date, module: report.module }) < 0) {
    return { error: 'El término no puede ser anterior al módulo reportado.' };
  }
  if (until.date > addDays(report.date, MAX_BLOCK_DAYS)) {
    return { error: `El bloqueo puede durar hasta ${MAX_BLOCK_DAYS} días.` };
  }
  return { until };
}

/**
 * Bloques (fecha, módulo) que un reporte aceptado deja no disponibles, desde
 * el módulo reportado hasta el término fijado por el admin. Omite domingos.
 */
function expandBlockedSlots(report) {
  if (!report.blockedUntilDate || !report.blockedUntilModule) return [];
  const slots = [];
  for (let date = report.date; date <= report.blockedUntilDate; date = addDays(date, 1)) {
    if (isSunday(date)) continue;
    const first = date === report.date ? report.module : 1;
    const last = date === report.blockedUntilDate ? report.blockedUntilModule : 9;
    for (let module = first; module <= last; module += 1) slots.push({ date, module });
  }
  return slots;
}

/** Estado que ve el cliente: un pendiente cuyo bloque terminó aparece vencido. */
function effectiveStatus(report, clock = nowInSantiago()) {
  return report.status === 'pending' && isBlockOver(report.date, report.module, clock)
    ? 'expired'
    : report.status;
}

/** Texto del motivo que se muestra en la consulta de salas. */
function overlayReason(report) {
  const label = REASON_LABELS[report.reason] ?? REASON_LABELS.other;
  return report.detail ? `${label} (${report.detail})` : label;
}

/** Forma pública de un reporte para el frontend. */
function toPublicReport(report, clock = nowInSantiago()) {
  return {
    id: String(report.id),
    roomId: report.roomName,
    date: report.date,
    module: report.module,
    reason: report.reason,
    detail: report.detail,
    status: effectiveStatus(report, clock),
    blockedUntil:
      report.status === 'accepted' && report.blockedUntilDate
        ? { date: report.blockedUntilDate, module: report.blockedUntilModule }
        : null,
    createdAt: new Date(report.createdAt).toISOString(),
    reviewedAt: report.reviewedAt ? new Date(report.reviewedAt).toISOString() : null,
  };
}

module.exports = {
  MAX_BLOCK_DAYS,
  REASON_LABELS,
  addDays,
  compareSlots,
  effectiveStatus,
  expandBlockedSlots,
  isBlockOver,
  normalizeBlockEnd,
  normalizeReportInput,
  nowInSantiago,
  overlayReason,
  toPublicReport,
};
