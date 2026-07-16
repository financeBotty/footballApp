# Football Cultureta

## 📋 Descripción

Football Cultureta es un simulador de fútbol tipo manager completamente funcional en navegador. Permite crear un equipo, gestionar la plantilla, definir tácticas y simular partidos en una liga de 8 equipos ficticios.

La aplicación funciona completamente sin necesidad de servidor ni dependencias externas. Se abre directamente desde el archivo `index.html` en cualquier navegador moderno.

## 🎮 Características

### Fase 1 - Estructura Base (COMPLETADA)

✅ **Pantalla de Bienvenida**
- Interfaz limpia con opciones para iniciar o continuar partida

✅ **Selección de Equipo**
- 8 equipos ficticios con características únicas
- 8 escudos SVG originales basados en los colores de cada club
- Información de overall, presupuesto y descripción

✅ **Dashboard Principal**
- Información del equipo
- Próximo partido programado
- Top 5 de la clasificación
- Progreso de temporada

✅ **Gestión de Plantilla**
- 18+ jugadores por equipo con atributos realistas
- Tabla ordenable por overall, posición, edad, fitness y moral
- Selección manual de alineación de 11 jugadores
- Validación de alineación (1 portero, 3+ defensas, 2+ centrocampistas, 1+ delantero)

✅ **Formaciones**
- 4-4-2 (clásica)
- 4-3-3 (ofensiva)
- 4-2-3-1 (defensiva)
- 3-5-2 (arriesgada)
- 5-3-2 (muy defensiva)

✅ **Tácticas**
- Mentalidad: Muy Defensiva, Defensiva, Equilibrada, Ofensiva, Muy Ofensiva
- Presión: Baja, Media, Alta
- Ritmo: Bajo, Medio, Alto
- Anchura: Estrecha, Equilibrada, Amplia
- Estilo de Pase: Corto, Mixto, Directo
- Línea Defensiva: Baja, Media, Alta

✅ **Clasificación de Liga**
- Tabla ordenada por puntos, diferencia de goles y goles a favor
- Resalte del equipo del usuario
- Actualización en tiempo real

✅ **Guardado Automático**
- Tres partidas independientes en LocalStorage
- Menú de partidas al abrir el juego
- Guardado y recuperación de encuentros en curso
- Migración automática del guardado antiguo a la ranura 1
- Exportación e importación de backups JSON
- Aviso y fallback temporal si el navegador bloquea el almacenamiento

✅ **Interfaz Responsive**
- Diseño adaptable para escritorio, tablet y móvil
- Tres estilos intercambiables desde Configuración: Classic, gestor PC de los 90 y SNES/16-bit
- Navegación intuitiva
- Sin música ni reproducción de audio

### Fase 4 - Simulación Completa de Liga (COMPLETADA)

✅ **Temporada completa**
- Calendario round-robin de 14 jornadas y 56 partidos
- Dos enfrentamientos por pareja, con localía invertida
- Simulación automática de los partidos rivales al cerrar cada jornada
- Recalculo íntegro de clasificación tras cada resultado
- Historial y selector visual de todas las jornadas
- Detección del final de temporada y proclamación del campeón

✅ **IA de equipos rivales**
- Once inicial automático para cada club
- Mentalidad, presión y ritmo adaptados al nivel del oponente
- Modelo de goles ponderado por calidad, fitness, moral, táctica y localía
- Goleadores, asistentes, partidos jugados y desgaste para futbolistas de la IA

### Fase 5 - Polish Final (COMPLETADA)

✅ **Experiencia y calidad**
- Navegación móvil horizontal y controles táctiles más amplios
- Tablas y selectores de jornada con desplazamiento seguro en pantallas pequeñas
- Estados finales, resumen de jornada y banner de campeón
- Foco de teclado visible y soporte para movimiento reducido
- Pruebas automatizadas del calendario, IA, standings y persistencia
- Compatibilidad con partidas guardadas de fases anteriores

### Fase 7 - Partido Interactivo (COMPLETADA)

✅ **Motor vivo y campo táctico**
- Simulación incremental: el resultado no se calcula antes de mostrar el partido
- Prepartido para revisar alineación y táctica y elegir entre resultado rápido o simulador en directo
- Duración configurable de 1, 3, 5 o 10 minutos por parte
- Campo Canvas 2D con 22 jugadores, pelota, porteros y árbitro
- Jugadores y dorsales ampliados; árbitro representado como un punto negro con contorno
- Posiciones y movimientos influidos por formación, mentalidad, presión, ritmo y anchura
- Pases, controles, intercepciones, entradas, balones sueltos, disparos y paradas
- Los porteros blocan el balón antes de iniciar la distribución, sin rebotes visuales invertidos

✅ **Consola del entrenador**
- Instrucciones tácticas aplicables durante el encuentro
- Estado en vivo de fitness, tarjetas y lesiones
- Hasta cinco sustituciones manuales
- Selección de cambios pulsando directamente el nombre del jugador en su panel de estado
- Cola para preparar y confirmar varios cambios a la vez
- Suplentes recomendados por posición, overall y fitness
- IA rival que modifica táctica y realiza cambios según marcador y minuto
- Pausa manual, velocidades 1×, 3× y 5×, salto al descanso y salto al final
- Solo el descanso, una expulsión o una lesión exigen pulsar “Continuar”
- Las faltas se ponen en juego de inmediato y la reproducción usa una cadencia base duplicada

✅ **Disciplina y balón parado**
- Faltas, amarillas, dobles amarillas y rojas directas
- Fueras de juego según pelota, mitad rival y penúltimo defensor
- Lesiones leves o con necesidad de sustitución
- Faltas directas, barrera, penaltis y rechaces
- Inferioridad numérica real después de una expulsión
- Guardado y recuperación automática de partidos en curso

## 🚀 Cómo Usar

### Abrir la Aplicación

1. Abre `index.html` directamente en tu navegador (no necesita servidor)
2. La aplicación se cargará inmediatamente

### Comenzar Nueva Partida

1. Elige una de las tres ranuras del menú inicial
2. Pulsa "Nueva partida"
3. Selecciona uno de los 8 equipos disponibles
4. Se abre el dashboard principal

### Navegar por la Aplicación

Usa el menú superior para acceder a:
- **Inicio**: Dashboard principal
- **Plantilla**: Gestión de jugadores y alineación
- **Tácticas**: Configuración de táctica
- **Próximo Partido**: Vista previa del siguiente encuentro
- **Liga**: Tabla de clasificación
- **Estadísticas**: Goleadores, asistentes, etc.
- **Configuración**: Guardar/Nueva partida

### Gestionar la Plantilla

1. Ve a "Plantilla"
2. Ordena por los criterios deseados
3. Selecciona 11 jugadores con checkbox
4. Valida que cumpla requisitos (1 GK, 3+ DEF, 2+ MID, 1+ FWD)
5. Click "Guardar Alineación"

Alternativa: Click "Auto-seleccionar" para que el sistema elija automáticamente

### Configurar Tácticas

1. Ve a "Tácticas"
2. Ajusta cada parámetro según tu estrategia
3. Click "Guardar Tácticas"

Las tácticas afectarán al comportamiento del equipo en los partidos

### Guardar/Continuar Partida

- La aplicación siempre comienza en el menú de tres partidas
- Cada ranura mantiene de forma independiente el equipo y el progreso de liga
- Al continuar una ranura siempre se abre el dashboard principal
- Los partidos interrumpidos no se reanudan: se descartan y comienzan desde cero al volver a jugarlos
- La aplicación guarda automáticamente los cambios en la ranura activa
- Desde Configuración puedes guardar, volver al menú o reiniciar solo la ranura actual
- Sobrescribir o borrar una partida requiere confirmación

## 📁 Estructura del Proyecto

```
football-simulator/
├── index.html                 # Punto de entrada
├── css/
│   └── styles.css            # Estilos oscuros responsive
├── js/
│   ├── app.js                # Aplicación principal
│   ├── data.js               # Datos de equipos y jugadores
│   ├── storage.js            # Gestor de LocalStorage
│   ├── team-manager.js       # Gestor de equipos y plantillas
│   ├── league-engine.js      # Motor de liga y calendario
│   ├── match-engine.js       # Motor de partido (base para Fase 3)
│   └── ui.js                 # Gestor de interfaz
└── assets/
    └── README.txt            # Notas de fase
```

## 🛠️ Tecnología

- **HTML5**: Estructura semántica
- **CSS3**: Variables CSS, Flexbox, Grid, Media Queries
- **JavaScript ES6+**: Programación orientada a objetos sin dependencias
- **LocalStorage**: Persistencia de datos en navegador

## 💾 Almacenamiento

Los datos se guardan en LocalStorage con el prefijo `fs_slot_N_`, donde `N` es una ranura entre 1 y 3:

| Clave | Contenido |
|-------|----------|
| `fs_slot_N_gameState` | Estado completo del juego |
| `fs_slot_N_userTeam` | ID del equipo seleccionado |
| `fs_slot_N_teams` | Datos de todos los equipos |
| `fs_slot_N_leagueState` | Estado de la liga |
| `fs_slot_N_currentMatch` | Estado temporal de un partido interrumpido; se descarta al cargar |
| `fs_activeSlot` | Última ranura utilizada |

Este sistema funciona en GitHub Pages porque no necesita servidor. Las partidas pertenecen al navegador y dominio actuales: borrar los datos del sitio, usar otro dispositivo o cambiar de dominio no traslada el progreso.

## 📊 Datos de Jugadores

Cada jugador contiene:

```javascript
{
  id: "club-atletico_001",
  name: "Zenón de Citio",
  age: 24,
  position: "ST",
  overall: 78,
  pace: 82,
  shooting: 80,
  passing: 68,
  dribbling: 76,
  defending: 30,
  physical: 74,
  goalkeeping: 10,
  stamina: 85,
  fitness: 100,
  morale: 80,
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
  matchesPlayed: 0
}
```

Posiciones válidas:
- `GK`: Portero
- `CB`, `RB`, `LB`: Defensa
- `CDM`, `CM`, `CAM`, `RM`, `LM`: Centrocampista
- `ST`, `RW`, `LW`: Delantero

## ⚙️ Equipos

La liga contiene 8 equipos inspirados en corrientes filosóficas. Sus plantillas
usan nombres de pensadores vinculados a cada corriente y sus filiales, nombres
de poetas:

1. **Estoicos CF** - Estoicismo - Overall 78
2. **Academia Idealista** - Idealismo - Overall 82 (más fuerte)
3. **Círculo Racionalista** - Racionalismo - Overall 75
4. **Jardín Epicúreo** - Epicureísmo - Overall 71 (más débil)
5. **Ágora Existencialista** - Existencialismo - Overall 76
6. **Unión Empirista** - Empirismo - Overall 79
7. **Deportivo Materialista** - Materialismo - Overall 73
8. **Ateneo Humanista** - Humanismo - Overall 77

## 🎯 Limitaciones Conocidas

- La liga está diseñada como una temporada única; no hay ascensos ni nuevas temporadas.
- No existe mercado de fichajes ni contratos.
- Los partidos de la IA usan una simulación estadística rápida, no la narración minuto a minuto.
- Las partidas son locales al navegador; no existe sincronización en la nube.

## 📈 Estado de las Fases

El estado completo, las fases pendientes, sus dependencias y criterios de cierre se mantienen únicamente en [`ROADMAP_FUTURO.md`](ROADMAP_FUTURO.md). Los archivos `*_CHANGELOG.md` son históricos y no determinan el estado actual del proyecto.

## 🌐 Compatibilidad

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

Requiere:
- JavaScript habilitado
- LocalStorage disponible
- Tamaño mínimo de pantalla: 320px (mobile friendly)

## 🧪 Pruebas

Para verificar el funcionamiento:

1. **Abre index.html** - La pantalla de bienvenida debe cargar sin errores
2. **Inicia nueva partida** - Debería mostrar selección de equipos
3. **Selecciona un equipo** - Dashboard debe cargar correctamente
4. **Prueba navegación** - Todas las secciones deben ser accesibles
5. **Abre consola (F12)** - No debería haber errores en rojo

La prueba automatizada se ejecuta abriendo `tests/league-engine.test.html`. Debe mostrar **10/10 pruebas superadas**. No usa servidor, librerías ni instalación previa.

La Fase 7 y su ampliación espacial se verifican abriendo `tests/live-match-engine.test.html`. Debe mostrar **99/99 pruebas superadas** y cubre campo, tácticas, sustituciones, colisiones, tiros, definición de ocasiones claras, penaltis con frecuencia del 10% en simulación directa y rápida, fueras de juego, pausas por incidencias, disciplina, lesiones, separación, transiciones, pases elevados, continuidad física del balón, porteros, persistencia y finalización.

Disponibilidad, sanciones, entrenamiento, progreso, sugerencias de alineación, afinidad de roles, temas visuales, contraste, escudos de club y validación de backups se verifican en `tests/phase6-release.test.html`. Debe mostrar **16/16 pruebas superadas**.

Recorrido final recomendado:

1. Crea una partida y selecciona un equipo.
2. Revisa que todos los clubes tengan cero partidos en Liga.
3. Juega o salta tu encuentro: los cuatro resultados de la jornada deben aparecer.
4. Comprueba que todos los equipos suman un partido y que el calendario avanza.
5. Completa 14 jornadas y verifica el campeón, 56/56 partidos y 14 PJ por club.
6. Recarga la página para confirmar que calendario, resultados y clasificación persisten.

En la consola puedes acceder a: `window.footballApp` para debugging

## 📝 Notas de Desarrollo

- El código está comentado en puntos clave
- Cada clase gestiona una responsabilidad específica
- Las rutas son todas relativas (compatible con file://)
- No hay dependencias externas (jQuery, React, etc.)
- Compatible con módulos ES6 pero ejecuta en global scope

## 🐛 Solución de Problemas

| Problema | Solución |
|----------|----------|
| Pantalla en blanco | Abre consola (F12), verifica errores de JavaScript |
| No se guarda progreso | Verifica que LocalStorage esté habilitado |
| Botones no responden | Recarga la página (Ctrl+Shift+R) |
| Estilos incorrectos | Verifica que styles.css cargue correctamente |

## 📄 Licencia

Uso libre para propósitos educativos y personales.

## 🙋 Ayuda y Soporte

Consulta la consola del navegador (F12) para mensajes de error detallados.

---

**Versión Actual:** 1.2 - Partido interactivo y guardado multiranura

**Última Actualización:** julio de 2026

**Desarrollado:** HTML5 + CSS3 + JavaScript Puro
