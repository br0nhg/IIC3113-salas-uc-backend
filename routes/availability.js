const Router = require('express');

const { Op } = require('sequelize');
const {
	Building,
	Room,
	Day,
	TimeModule,
	Course,
	RoomOccupancy,
	OfficialReservation,
} = require('../models');
const { isIsoDate, weekBounds } = require('../services/officialReservations');

const router = Router();

/** Asociación con filtro opcional: solo se exige (INNER JOIN) cuando viene el filtro. */
function filteredInclude(model, as, attributes, where) {
	return where
		? { model, as, attributes, where, required: true }
		: { model, as, attributes, required: false };
}

router.get('/', async (req, res) => {
	try {
		const { building, room, day, module, onlyFree, date, weekStart } = req.query;

		// Igual que antes: un módulo que no es número no coincide con ninguna fila.
		if (module && !/^\d+$/.test(String(module))) return res.json([]);
		if (date && !isIsoDate(String(date))) {
			return res.status(400).json({ error: 'date debe usar el formato YYYY-MM-DD.' });
		}
		if (weekStart && !isIsoDate(String(weekStart))) {
			return res.status(400).json({ error: 'weekStart debe usar el formato YYYY-MM-DD.' });
		}
		if (date && weekStart) {
			return res.status(400).json({ error: 'Usa date o weekStart, no ambos.' });
		}

		// Los filtros se aplican en la base de datos en vez de cargar todas las tablas.
		const occupancies = await RoomOccupancy.findAll({
			attributes: ['id', 'isFree'],
			where: onlyFree === 'true' && !date && !weekStart ? { isFree: true } : undefined,
			include: [
				filteredInclude(Building, 'building', ['code'], building ? { code: String(building) } : null),
				filteredInclude(Room, 'room', ['name'], room ? { name: String(room) } : null),
				filteredInclude(Day, 'day', ['code'], day ? { code: String(day) } : null),
				filteredInclude(
					TimeModule,
					'module',
					['number'],
					module ? { number: Number(module) } : null,
				),
				{ model: Course, as: 'course', attributes: ['code', 'name'], required: false },
			],
			order: [['id', 'ASC']],
		});

		let result = occupancies.map((entry) => ({
			roomId: entry.room?.name ?? null,
			buildingCode: entry.building?.code ?? null,
			day: entry.day?.code ?? null,
			module: entry.module?.number ?? null,
			isFree: entry.isFree,
			course: entry.course
				? {
						code: entry.course.code,
						section: null,
						name: entry.course.name,
					}
				: null,
			reservation: null,
		}));

		if (date || weekStart) {
			const normalizedWeekStart = weekStart ? weekBounds(String(weekStart))[0] : null;
			const dateWhere = date
				? String(date)
				: { [Op.between]: weekBounds(String(weekStart)) };
			const reservationWhere = { date: dateWhere };
			if (room) reservationWhere.roomName = String(room).toUpperCase();
			if (module) reservationWhere.module = Number(module);

			let reservations = await OfficialReservation.findAll({
				where: reservationWhere,
				order: [['date', 'ASC'], ['roomName', 'ASC'], ['module', 'ASC']],
			});
			if (day) {
				reservations = reservations.filter((item) => dayCodeForDate(item.date) === String(day));
			}
			const reservedKeys = new Set(
				reservations.map((item) => `${item.roomName}|${item.module}|${item.date}`),
			);
			result = result.filter((item) => {
				const itemDate = date || dateForDayInWeek(normalizedWeekStart, item.day);
				return !reservedKeys.has(`${item.roomId}|${item.module}|${itemDate}`);
			});

			const rooms = await Room.findAll({
				where: { name: { [Op.in]: [...new Set(reservations.map((item) => item.roomName))] } },
				include: [{ model: Building, as: 'building', attributes: ['code'], required: true }],
			});
			const roomByName = new Map(rooms.map((item) => [item.name, item]));
			for (const reservation of reservations) {
				const roomRow = roomByName.get(reservation.roomName);
				if (!roomRow || (building && roomRow.building.code !== String(building))) continue;
				const reservationDay = dayCodeForDate(reservation.date);
				if (day && reservationDay !== String(day)) continue;
				result.push({
					roomId: roomRow.name,
					buildingCode: roomRow.building.code,
					day: reservationDay,
					module: reservation.module,
					isFree: false,
					course: null,
					reservation: { date: reservation.date, reason: reservation.reason },
				});
			}
		}

		if (onlyFree === 'true') result = result.filter((item) => item.isFree);

		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

const DAY_CODES = [null, 'L', 'M', 'W', 'J', 'V', 'S'];

function dayCodeForDate(dateString) {
	return DAY_CODES[new Date(`${dateString}T00:00:00Z`).getUTCDay()] ?? null;
}

function dateForDayInWeek(weekStart, dayCode) {
	const offset = DAY_CODES.indexOf(dayCode) - 1;
	if (offset < 0) return null;
	const date = new Date(`${weekStart}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
}

module.exports = router;
