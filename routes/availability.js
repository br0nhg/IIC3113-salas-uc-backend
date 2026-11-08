const Router = require('express');

const { Building, Room, Day, TimeModule, Course, RoomOccupancy } = require('../models');

const router = Router();

/** Asociación con filtro opcional: solo se exige (INNER JOIN) cuando viene el filtro. */
function filteredInclude(model, as, attributes, where) {
	return where
		? { model, as, attributes, where, required: true }
		: { model, as, attributes, required: false };
}

router.get('/', async (req, res) => {
	try {
		const { building, room, day, module, onlyFree } = req.query;

		// Igual que antes: un módulo que no es número no coincide con ninguna fila.
		if (module && !/^\d+$/.test(String(module))) return res.json([]);

		// Los filtros se aplican en la base de datos en vez de cargar todas las tablas.
		const occupancies = await RoomOccupancy.findAll({
			attributes: ['id', 'isFree'],
			where: onlyFree === 'true' ? { isFree: true } : undefined,
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

		const result = occupancies.map((entry) => ({
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
		}));

		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
