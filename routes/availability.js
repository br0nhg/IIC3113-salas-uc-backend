const Router = require('express');

const { Building, Room, Day, TimeModule, Course, RoomOccupancy } = require('../models');

const router = Router();

router.get('/', async (req, res) => {
	try {
		const { building, room, day, module, onlyFree } = req.query;

		const buildings = await Building.findAll();
		const rooms = await Room.findAll();
		const days = await Day.findAll();
		const modules = await TimeModule.findAll();
		const courses = await Course.findAll();
		const occupancies = await RoomOccupancy.findAll();

		const buildingsById = new Map(buildings.map((item) => [item.id, item]));
		const roomsById = new Map(rooms.map((item) => [item.id, item]));
		const daysById = new Map(days.map((item) => [item.id, item]));
		const modulesById = new Map(modules.map((item) => [item.id, item]));
		const coursesById = new Map(courses.map((item) => [item.id, item]));

		const filtered = occupancies.filter((entry) => {
			const buildingRow = buildingsById.get(entry.buildingId);
			const roomRow = roomsById.get(entry.roomId);
			const dayRow = daysById.get(entry.dayId);
			const moduleRow = modulesById.get(entry.moduleId);

			return (
				(!building || buildingRow?.code === building) &&
				(!room || roomRow?.name === room) &&
				(!day || dayRow?.code === day) &&
				(!module || String(moduleRow?.number) === String(module)) &&
				(onlyFree !== 'true' || entry.isFree)
			);
		});

		const result = filtered.map((entry) => {
			const buildingRow = buildingsById.get(entry.buildingId);
			const roomRow = roomsById.get(entry.roomId);
			const dayRow = daysById.get(entry.dayId);
			const moduleRow = modulesById.get(entry.moduleId);
			const courseRow = coursesById.get(entry.courseId);

			return {
				roomId: roomRow?.name ?? null,
				buildingCode: buildingRow?.code ?? null,
				day: dayRow?.code ?? null,
				module: moduleRow?.number ?? null,
				isFree: entry.isFree,
				course: courseRow
					? {
							code: courseRow.code,
							section: null,
							name: courseRow.name,
						}
					: null,
			};
		});

		res.json(result);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;

