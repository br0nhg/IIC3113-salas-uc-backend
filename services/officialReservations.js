'use strict';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseModules(value) {
  const values = Array.isArray(value) ? value : [value];
  const modules = [];

  for (const item of values) {
    if (Number.isInteger(item)) {
      modules.push(item);
      continue;
    }
    if (typeof item !== 'string') return null;
    for (const part of item.split(',')) {
      const token = part.trim();
      const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        if (start > end) return null;
        for (let module = start; module <= end; module += 1) modules.push(module);
      } else if (/^\d+$/.test(token)) {
        modules.push(Number(token));
      } else {
        return null;
      }
    }
  }

  const unique = [...new Set(modules)];
  return unique.length > 0 && unique.every((module) => module >= 1 && module <= 9)
    ? unique.sort((a, b) => a - b)
    : null;
}

function normalizeImport(body) {
  const input = Array.isArray(body) ? body : body?.reservas;
  if (!Array.isArray(input) || input.length === 0) {
    return { error: 'El archivo debe contener un arreglo no vacío de reservas.' };
  }
  if (input.length > 2000) return { error: 'El archivo no puede contener más de 2.000 reservas.' };

  const reservations = [];
  for (const [index, raw] of input.entries()) {
    const row = index + 1;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { error: `La reserva ${row} debe ser un objeto.` };
    }
    const roomName = typeof raw.sala === 'string' ? raw.sala.trim().toUpperCase() : '';
    const date = typeof raw.fecha === 'string' ? raw.fecha.trim() : '';
    const reason = typeof raw.motivo === 'string' ? raw.motivo.trim() : '';
    const modules = parseModules(raw.modulos);

    if (!roomName) return { error: `Falta sala en la reserva ${row}.` };
    if (!isIsoDate(date)) return { error: `La fecha de la reserva ${row} debe usar YYYY-MM-DD.` };
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) {
      return { error: `La reserva ${row} cae en domingo, día que no está disponible en la app.` };
    }
    if (!modules) return { error: `Los módulos de la reserva ${row} deben estar entre 1 y 9.` };
    if (!reason || reason.length > 200) {
      return { error: `El motivo de la reserva ${row} debe tener entre 1 y 200 caracteres.` };
    }
    for (const module of modules) reservations.push({ roomName, date, module, reason });
  }

  const seen = new Set();
  for (const reservation of reservations) {
    const key = `${reservation.roomName}|${reservation.date}|${reservation.module}`;
    if (seen.has(key)) return { error: `Hay una reserva duplicada para ${reservation.roomName}, ${reservation.date}, M${reservation.module}.` };
    seen.add(key);
  }
  return { reservations };
}

/** Lunes y domingo de la semana ISO que contiene YYYY-MM-DD. */
function weekBounds(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay();
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)];
}

module.exports = { isIsoDate, normalizeImport, parseModules, weekBounds };
