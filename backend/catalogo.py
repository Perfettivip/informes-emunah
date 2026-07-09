"""Catálogo de frases predefinidas por casilla de foto, tomadas de los
Informes 9 y 10 reales de FALABELLA.COM. El técnico elige una (o escribe
la suya) para cada foto, sin tener que redactar el informe desde cero.

Cada casilla corresponde a una posición fija de la plantilla (1 a 17),
agrupadas aquí por sección para mostrarlas ordenadas en el formulario.
"""

SECCIONES = [
    {
        "titulo": "Unidades Externas Condensadoras",
        "slots": [
            {
                "n": 1,
                "label": "Foto 1 - vista general condensadoras",
                "frases": [
                    "LIMPIEZA GENERAL EXTERNA Y MANTENIMIENTO DE UNIDADES CONDENSADORAS.  USO EQUIPO DE EPP COMPLETO.",
                    "LIMPIEZA GENERAL EXTERNA Y BRILLADO DE UNIDADES CONDENSADORAS.",
                ],
            },
            {
                "n": 2,
                "label": "Foto 2 - conexiones/serpentines internos",
                "frases": [
                    "REVISIÓN Y LIMPIEZA DE CONEXIONES ELÉCTRICAS Y TUBERÍA DE COBRE INTERNAS DE UNIDADES CONDENSADORAS.",
                    "LAVADO EXTERNO, LIMPIEZA DE SERPENTINES Y DE TABLEROS ELECTRICOS INTERNOS DE UNIDADES CONDENSADORAS.",
                ],
            },
        ],
    },
    {
        "titulo": "Seguridad en cubierta",
        "slots": [
            {
                "n": 3,
                "label": "Foto 3 - técnico con EPP/arnés",
                "frases": [
                    "USO COMPLETO DE EPP Y ARNÉS DE SEGURIDAD PARA MANTENIMIENTO DE UNIDADES CONDENSADORAS EN CUBIERTA.",
                ],
            },
        ],
    },
    {
        "titulo": "Estado de condensadoras",
        "slots": [
            {
                "n": 4,
                "label": "Foto 4 - conexiones eléctricas / cobre",
                "frases": [
                    "REVISIÓN DE CONEXIONES ELÉCTRICAS Y TUBERÍA DE COBRE EN UNIDAD CONDENSADORA, SIN NOVEDAD.",
                ],
            },
            {
                "n": 5,
                "label": "Foto 5 - aletas / serpentín",
                "frases": [
                    "ESTADO ACTUAL DE ALETAS DE SERPENTÍN DE CONDENSACIÓN.  SE RECOMIENDA CONTINUAR CON PEINADO PERIÓDICO DE SERPENTINES DE CONDENSADORAS.",
                    "DAÑO EN ALETAS DEL SERPENTIN DE CONDENSACION.  ES NECESARIO HACER UN PEINADO DE SERPENTINES DE CONDENSADORAS.",
                ],
            },
        ],
    },
    {
        "titulo": "Filtros y Manejadoras (1)",
        "slots": [
            {
                "n": 6,
                "label": "Foto 6 - desarme/limpieza filtros",
                "frases": ["DESARME, LIMPIEZA DE FILTROS."],
            },
            {
                "n": 7,
                "label": "Foto 7 - filtros y armado",
                "frases": ["LIMPIEZA DE FILTROS Y POSTERIOR ARMADO."],
            },
        ],
    },
    {
        "titulo": "Filtros y Manejadoras (2)",
        "slots": [
            {
                "n": 8,
                "label": "Foto 8 - equipo con filtros saturados",
                "frases": ["EQUIPO CON FILTROS SATURADOS DE POLVO, LIMPIO INTERNAMENTE Y ASEADO."],
            },
            {
                "n": 9,
                "label": "Foto 9 - lavado de filtros en cubierta",
                "frases": ["LIMPIEZA GENERAL DE FILTROS DE UNIDADES MANEJADORAS, LAVADO A PRESIÓN EN CUBIERTA."],
            },
        ],
    },
    {
        "titulo": "Manejadoras tipo Cassette / Fancoil",
        "slots": [
            {
                "n": 10,
                "label": "Foto 10 - montaje de filtro",
                "frases": ["MONTAJE DE FILTRO DE EQUIPO DE A.A. LIMPIO Y POSTERIOR INSTALACIÓN EN UNIDAD MANEJADORA."],
            },
            {
                "n": 11,
                "label": "Foto 11 - unidad cassette limpia",
                "frases": ["UNIDAD MANEJADORA TIPO CASSETTE.  EQUIPO LIMPIO INTERNAMENTE, FILTROS Y TAPAS EN SECADO PARA POSTERIOR INSTALACION."],
            },
        ],
    },
    {
        "titulo": "Manejadoras - blower y retorno",
        "slots": [
            {
                "n": 12,
                "label": "Foto 12 - blower y motores",
                "frases": ["UNIDAD MANEJADORA TIPO CASSETTE.  LIMPIA INTERNAMENTE.  BLOWER Y MOTORES ASEADOS."],
            },
            {
                "n": 13,
                "label": "Foto 13 - filtros y tapa de retorno",
                "frases": ["FILTROS Y TAPA DE RETORNO DE UNIDAD TIPO CASSETTE LIMPIOS.  PARA INSTALACION."],
            },
        ],
    },
    {
        "titulo": "Datacenter",
        "slots": [
            {
                "n": 14,
                "label": "Foto 14 - unidad limpia datacenter",
                "frases": ["UNIDAD MANEJADORA LIMPIA EN ÁREA DE DATACENTER."],
            },
            {
                "n": 15,
                "label": "Foto 15 - tableros / prueba de equipo",
                "frases": ["MANEJADORA DE DATACENTER LIMPIA INTERNAMENTE Y TABLEROS ELECTRICOS.  EQUIPO EN PRUEBA."],
            },
        ],
    },
    {
        "titulo": "Trabajos por Realizar - Ductos",
        "slots": [
            {
                "n": 16,
                "label": "Foto 16 - sellado/refuerzo de ductos",
                "frases": ["SELLADO Y REFUERZO DE AISLAMIENTO EN DUCTOS DE AIRE ACONDICIONADO.", "PEGADO DE CONDUCTOS REFUERZO EN UNIONES."],
            },
            {
                "n": 17,
                "label": "Foto 17 - compuertas/accesorios (dos líneas)",
                "frases": ["REVISIÓN DE COMPUERTAS Y ACCESORIOS DE DUCTOS EN CUBIERTA."],
                "frases2": ["SE DEBE RETIRAR MATERIAL SOBRANTE DEL ÁREA DE CUBIERTA.", "SE DEBE RETIRAR LA BASURA COLOCADO EN EL TECHO."],
            },
        ],
    },
]

OBSERVACIONES_1_3 = [
    "Filtros de unidades manejadoras y tipo cassette saturados de polvo.",
    "Se requiere lavado a presión de filtros retirados en cubierta.",
    "Unidades tipo MiniSPLIT del Datacenter con necesidad de mantenimiento y limpieza.",
]

TRABAJOS_EFECTUADOS = [
    "Se realizó limpieza y mantenimiento equipos de Aire Acondicionado, limpieza de filtros, serpentines, revisión eléctrica de tableros y limpieza de contactos eléctricos.",
    "Se realizo ajuste de carga de gas refrigerante.",
]

PARRAFO_INTRO_DEFAULT = (
    "Se realizó mantenimiento preventivo a El sistema VRV Daikin, unidades "
    "condensadoras y unidades manejadoras del cual salen las siguientes "
    "observaciones, además de las unidades tipo MiniSPLIT que atienden las "
    "necesidades del Datacenter."
)
