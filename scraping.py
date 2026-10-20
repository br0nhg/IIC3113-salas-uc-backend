import argparse
import os
import re
import shutil
import time
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BASE_URL = "https://buscacursos.uc.cl/"
TEMP_DIR = BASE_DIR / "temp"
FINAL_FILE = BASE_DIR / "CursosUC" / "cursos_uc_2026-2.txt"

SEMESTER = "2026-2"
ALLOWED_BUILDINGS = ("BC", "A", "B", "C", "K")
ROOM_PATTERN = re.compile(r"^(BC|[ABCK])(\d+)$", re.IGNORECASE)
SCHEDULE_PATTERN = re.compile(
    r"^(?P<days>[LMWJVS](?:-[LMWJVS])*)"
    r":(?P<modules>\d+(?:,\d+)*)$",
    re.IGNORECASE,
)

DAYS = {
    "L": ("Lunes", "Lun"),
    "M": ("Martes", "Mar"),
    "W": ("Miércoles", "Mié"),
    "J": ("Jueves", "Jue"),
    "V": ("Viernes", "Vie"),
    "S": ("Sábado", "Sáb"),
}

TIME_MODULES = {
    1: ("08:20", "09:30"),
    2: ("09:40", "10:50"),
    3: ("11:00", "12:10"),
    4: ("12:20", "13:30"),
    5: ("14:50", "16:00"),
    6: ("16:10", "17:20"),
    7: ("17:30", "18:40"),
    8: ("18:50", "20:00"),
    9: ("20:10", "21:20"),
}

BUILDINGS = {
    "A": ("Edificio A", "Sector A de Ingeniería, San Joaquín"),
    "B": ("Edificio B", "Sector B de Ingeniería, San Joaquín"),
    "BC": ("Edificio BC", "Sector BC de Ingeniería, San Joaquín"),
    "C": ("Edificio C", "Sector C de Ingeniería, San Joaquín"),
    "K": ("Edificio K", "Sector K de Ingeniería, San Joaquín"),
}

PAYLOAD = {
    "cxml_semestre": SEMESTER,
    "cxml_sigla": "",
    "cxml_nrc": "",
    "cxml_nombre": "",
    "cxml_categoria": "TODOS",
    "cxml_area_fg": "TODOS",
    "cxml_formato_cur": "TODOS",
    "cxml_profesor": "",
    "cxml_campus": "San Joaquín",
    "cxml_unidad_academica": "TODOS",
    "cxml_horario_tipo_busqueda": "si_tenga",
    "cxml_horario_tipo_busqueda_actividad": "TODOS",
    "cxml_periodo": "TODOS",
    "cxml_escuela": "TODOS",
    "cxml_nivel": "TODOS",
}

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
NUMBERS = "0123456789"


def explorar_sigla(prefijo, cursos_set):
    try:
        from bs4 import BeautifulSoup
        from curl_cffi import requests
    except ImportError as error:
        raise RuntimeError(
            "Faltan dependencias del scraper. Instálalas con "
            "'pip install -r requirements.txt'."
        ) from error

    PAYLOAD["cxml_sigla"] = prefijo

    for attempt in range(1, 4):
        try:
            response = requests.get(
                BASE_URL, params=PAYLOAD, impersonate="chrome", timeout=30
            )
            response.raise_for_status()
            break
        except Exception as error:
            print(
                f"[!] Intento {attempt}/3 fallido para '{prefijo}': {error}"
            )
            if attempt == 3:
                return False
            time.sleep(attempt * 2)

    soup = BeautifulSoup(response.text, "html.parser")
    filas = soup.find_all(
        "tr", attrs={"class": ["resultadosRowImpar", "resultadosRowPar"]}
    )
    for fila in filas:
        campos = fila.get_text(separator="||", strip=True).split("||")
        cursos_set.add(tuple(campos))

    print(
        f"[{prefijo}] Encontrados: {len(filas)} | "
        f"Acumulados en esta letra: {len(cursos_set)}"
    )

    if len(filas) >= 500:
        largo = len(prefijo)
        caracteres = LETTERS if largo < 3 else NUMBERS
        if largo < 8:
            print(f"    -> [!] Límite para '{prefijo}'. Expandiendo búsqueda...")
            for caracter in caracteres:
                time.sleep(1)
                if not explorar_sigla(prefijo + caracter, cursos_set):
                    return False
        else:
            print(f"    -> [!] Límite para '{prefijo}', deteniendo expansión.")

    return True


def extraer_sigla(linea):
    columnas = linea.split("\t")
    return columnas[1] if len(columnas) > 1 else linea


def _is_course_format(value):
    normalized = value.casefold()
    return (
        "presencial" in normalized
        or "online" in normalized
        or normalized in {"híbrido", "hibrido"}
    )


def _parse_scraped_file(file_path):
    """Return courses, rooms and occupied slots from a consolidated scraper file."""
    courses = {}
    rooms = set()
    occupied = defaultdict(set)
    warnings = []

    with Path(file_path).open(encoding="utf-8") as source:
        for line_number, raw_line in enumerate(source, start=1):
            fields = raw_line.rstrip("\r\n").split("\t")
            if len(fields) < 2:
                warnings.append(f"línea {line_number}: registro incompleto")
                continue

            campus_index = next(
                (
                    index
                    for index in range(len(fields) - 1, 5, -1)
                    if fields[index].strip().casefold() == "san joaquín"
                ),
                None,
            )
            if campus_index is None or campus_index + 4 > len(fields):
                continue

            format_index = next(
                (
                    index
                    for index in range(6, campus_index)
                    if _is_course_format(fields[index].strip())
                ),
                None,
            )
            if format_index is None or format_index + 1 >= campus_index:
                warnings.append(
                    f"línea {line_number}: no se pudo identificar el nombre del curso"
                )
                continue

            course_code = fields[1].strip().upper()
            course_name = fields[format_index + 1].strip()
            schedule_fields = fields[campus_index + 4 :]

            for offset in range(0, len(schedule_fields) - 2, 3):
                schedule, _activity, room_name = schedule_fields[offset : offset + 3]
                room_name = room_name.strip().upper()
                room_match = ROOM_PATTERN.fullmatch(room_name)
                if not room_match:
                    continue

                schedule_match = SCHEDULE_PATTERN.fullmatch(schedule.strip().upper())
                if not schedule_match:
                    warnings.append(
                        f"línea {line_number}: horario inválido '{schedule}'"
                    )
                    continue

                building_code = room_match.group(1).upper()
                if building_code not in ALLOWED_BUILDINGS:
                    continue

                courses.setdefault(course_code, course_name)
                rooms.add((room_name, building_code))
                for day_code in schedule_match.group("days").split("-"):
                    for module_text in schedule_match.group("modules").split(","):
                        module_number = int(module_text)
                        if module_number not in TIME_MODULES:
                            warnings.append(
                                f"línea {line_number}: módulo fuera de rango "
                                f"'{module_number}'"
                            )
                            continue
                        occupied[(room_name, day_code, module_number)].add(course_code)

    return courses, rooms, occupied, warnings


def _load_database_settings():
    try:
        from dotenv import load_dotenv
    except ImportError as error:
        raise RuntimeError(
            "Falta python-dotenv. Instala las dependencias con "
            "'pip install -r requirements.txt'."
        ) from error

    load_dotenv(BASE_DIR / ".env", override=True)
    required = ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(f"Faltan variables en .env: {', '.join(missing)}")

    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.environ["DB_PORT"]),
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "dbname": os.environ["DB_NAME"],
    }


def _insert_returning_id(cursor, table, columns, values):
    placeholders = ", ".join(["%s"] * len(values))
    quoted_columns = ", ".join(f'"{column}"' for column in columns)
    cursor.execute(
        f'INSERT INTO "{table}" ({quoted_columns}) '
        f"VALUES ({placeholders}) RETURNING id",
        values,
    )
    return cursor.fetchone()[0]


def guardar_en_base_de_datos(file_path, dry_run=False):
    courses, rooms, occupied, warnings = _parse_scraped_file(file_path)
    if not rooms:
        raise RuntimeError(
            "No se encontraron salas válidas de los edificios A, B, BC, C o K."
        )

    occupied_rows = sum(len(course_codes) for course_codes in occupied.values())
    total_slots = len(rooms) * len(DAYS) * len(TIME_MODULES)
    free_slots = total_slots - len(occupied)
    summary = {
        "courses": len(courses),
        "rooms": len(rooms),
        "occupied": occupied_rows,
        "free": free_slots,
        "warnings": len(warnings),
    }

    if dry_run:
        return summary

    try:
        import psycopg
    except ImportError as error:
        raise RuntimeError(
            "Falta psycopg. Instala las dependencias con "
            "'pip install -r requirements.txt'."
        ) from error

    settings = _load_database_settings()
    with psycopg.connect(**settings) as connection:
        with connection.cursor() as cursor:
            # Piso y capacidad los ingresa el administrador; se conservan.
            cursor.execute('SELECT name, capacity, floor FROM "Rooms"')
            room_info = {name: (capacity, floor) for name, capacity, floor in cursor.fetchall()}

            # Estas tablas representan una fotografía del semestre scrapeado.
            cursor.execute('DELETE FROM "RoomOccupancies"')
            cursor.execute('DELETE FROM "Courses"')
            cursor.execute('DELETE FROM "Rooms"')
            cursor.execute('DELETE FROM "Buildings"')

            day_ids = {}
            for code, (name, short_name) in DAYS.items():
                cursor.execute(
                    'SELECT id FROM "Days" WHERE code = %s ORDER BY id LIMIT 1',
                    (code,),
                )
                row = cursor.fetchone()
                if row:
                    day_ids[code] = row[0]
                    cursor.execute(
                        'UPDATE "Days" SET name = %s, "shortName" = %s, '
                        '"updatedAt" = NOW() WHERE id = %s',
                        (name, short_name, row[0]),
                    )
                else:
                    day_ids[code] = _insert_returning_id(
                        cursor,
                        "Days",
                        ("code", "name", "shortName", "createdAt", "updatedAt"),
                        (code, name, short_name, "now", "now"),
                    )

            module_ids = {}
            for number, (start, end) in TIME_MODULES.items():
                cursor.execute(
                    'SELECT id FROM "TimeModules" WHERE number = %s '
                    "ORDER BY id LIMIT 1",
                    (number,),
                )
                row = cursor.fetchone()
                if row:
                    module_ids[number] = row[0]
                    cursor.execute(
                        'UPDATE "TimeModules" SET start = %s, "end" = %s, '
                        '"updatedAt" = NOW() WHERE id = %s',
                        (start, end, row[0]),
                    )
                else:
                    module_ids[number] = _insert_returning_id(
                        cursor,
                        "TimeModules",
                        ("number", "start", "end", "createdAt", "updatedAt"),
                        (number, start, end, "now", "now"),
                    )

            building_ids = {}
            for code in ALLOWED_BUILDINGS:
                name, description = BUILDINGS[code]
                building_ids[code] = _insert_returning_id(
                    cursor,
                    "Buildings",
                    ("code", "name", "description", "createdAt", "updatedAt"),
                    (code, name, description, "now", "now"),
                )

            room_ids = {}
            for room_name, building_code in sorted(rooms):
                room_ids[room_name] = _insert_returning_id(
                    cursor,
                    "Rooms",
                    (
                        "name",
                        "buildingId",
                        "capacity",
                        "floor",
                        "createdAt",
                        "updatedAt",
                    ),
                    (
                        room_name,
                        building_ids[building_code],
                        *room_info.get(room_name, (None, None)),
                        "now",
                        "now",
                    ),
                )

            course_ids = {}
            for code, name in sorted(courses.items()):
                course_ids[code] = _insert_returning_id(
                    cursor,
                    "Courses",
                    ("code", "name", "createdAt", "updatedAt"),
                    (code, name, "now", "now"),
                )

            occupancy_rows = []
            for room_name, building_code in sorted(rooms):
                for day_code in DAYS:
                    for module_number in TIME_MODULES:
                        slot_courses = occupied.get(
                            (room_name, day_code, module_number), set()
                        )
                        if slot_courses:
                            for course_code in sorted(slot_courses):
                                occupancy_rows.append(
                                    (
                                        room_ids[room_name],
                                        building_ids[building_code],
                                        day_ids[day_code],
                                        module_ids[module_number],
                                        course_ids[course_code],
                                        False,
                                    )
                                )
                        else:
                            occupancy_rows.append(
                                (
                                    room_ids[room_name],
                                    building_ids[building_code],
                                    day_ids[day_code],
                                    module_ids[module_number],
                                    None,
                                    True,
                                )
                            )

            cursor.executemany(
                'INSERT INTO "RoomOccupancies" '
                '("roomId", "buildingId", "dayId", "moduleId", "courseId", '
                '"isFree", "createdAt", "updatedAt") '
                "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
                occupancy_rows,
            )

    return summary


def _print_summary(summary, prefix="Carga completada"):
    print(f"\n=== {prefix.upper()} ===")
    print(f"Cursos: {summary['courses']}")
    print(f"Salas: {summary['rooms']}")
    print(f"Ocupaciones: {summary['occupied']}")
    print(f"Bloques libres: {summary['free']}")
    if summary["warnings"]:
        print(f"Registros ignorados/advertencias: {summary['warnings']}")


def _download_and_consolidate(start_letter, non_interactive=False):
    if start_letter:
        start_index = LETTERS.find(start_letter)
        TEMP_DIR.mkdir(exist_ok=True)

        print("\n=== INICIANDO EXTRACCIÓN ===")
        for char in LETTERS[start_index:]:
            print(f"\n>> Procesando árbol de búsqueda para la letra: {char}")
            courses_for_letter = set()
            temp_file = TEMP_DIR / f"cursos_{char}.txt"
            temp_file.unlink(missing_ok=True)
            completed = explorar_sigla(char, courses_for_letter)
            if not completed:
                raise RuntimeError(
                    f"No se pudo completar la letra {char}; no se modificó la base."
                )

            with temp_file.open("w", encoding="utf-8") as output:
                for course in courses_for_letter:
                    output.write("\t".join(course) + "\n")
            print(f"[*] Progreso guardado temporalmente: '{temp_file}'")
            time.sleep(1)

    if not TEMP_DIR.exists():
        if FINAL_FILE.exists():
            print(f"[*] No hay archivos temporales; se usará '{FINAL_FILE}'.")
            return FINAL_FILE
        raise RuntimeError(
            f"La carpeta '{TEMP_DIR}' no existe y tampoco hay un archivo consolidado."
        )

    missing_letters = [
        char for char in LETTERS if not (TEMP_DIR / f"cursos_{char}.txt").exists()
    ]
    if missing_letters:
        print("\n[!] ADVERTENCIA: faltan archivos para estas letras:")
        print(f"    -> {', '.join(missing_letters)}")
        if non_interactive:
            raise RuntimeError(
                "La extracción está incompleta; no se modificó la base de datos."
            )
        answer = input("¿Consolidar los archivos existentes? (S/N): ").strip().upper()
        if answer != "S":
            raise RuntimeError("Proceso cancelado; los temporales se conservaron.")

    print("\n=== INICIANDO CONSOLIDACIÓN ===")
    unique_courses = set()
    for char in LETTERS:
        temp_file = TEMP_DIR / f"cursos_{char}.txt"
        if temp_file.exists():
            with temp_file.open(encoding="utf-8") as source:
                unique_courses.update(line.strip() for line in source if line.strip())

    FINAL_FILE.parent.mkdir(parents=True, exist_ok=True)
    with FINAL_FILE.open("w", encoding="utf-8") as output:
        for course in sorted(unique_courses, key=extraer_sigla):
            output.write(course + "\n")

    print(f"[*] {len(unique_courses)} cursos únicos guardados en '{FINAL_FILE}'.")
    return FINAL_FILE


def main():
    parser = argparse.ArgumentParser(
        description="Scrapea BuscaCursos UC y sincroniza la base de datos del backend."
    )
    parser.add_argument(
        "--import-file",
        type=Path,
        help="omite la descarga e importa un TXT consolidado existente",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="valida y resume los datos sin conectarse a la base de datos",
    )
    parser.add_argument(
        "--start-letter",
        choices=list(LETTERS),
        help="inicia la descarga en esta letra sin solicitar entrada interactiva",
    )
    args = parser.parse_args()

    if args.import_file:
        data_file = args.import_file.resolve()
        if not data_file.is_file():
            parser.error(f"no existe el archivo: {data_file}")
    else:
        start_letter = args.start_letter
        if start_letter is None:
            start_letter = input(
                "¿Desde qué letra deseas empezar? "
                "(A-Z; Enter usa temporales o el consolidado existente): "
            ).strip().upper()
        if start_letter and start_letter not in LETTERS:
            parser.error("la letra inicial debe estar entre A y Z")
        data_file = _download_and_consolidate(
            start_letter, non_interactive=args.start_letter is not None
        )

    summary = guardar_en_base_de_datos(data_file, dry_run=args.dry_run)
    _print_summary(summary, "validación completada" if args.dry_run else "carga completada")

    if not args.import_file and TEMP_DIR.exists() and not args.dry_run:
        shutil.rmtree(TEMP_DIR)
        print(f"Carpeta temporal '{TEMP_DIR}' eliminada correctamente.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        print(f"\n[!] {error}")
        raise SystemExit(1)
