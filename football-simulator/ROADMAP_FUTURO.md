# Fases y roadmap de Football Simulator

Documento maestro del estado del proyecto. Sustituye las listas de fases dispersas y debe ser la única referencia para decidir qué está terminado y qué queda pendiente.

Última revisión: **15 de julio de 2026**.

## Desarrollo completado — 15 de julio de 2026

1. Adaptación táctica progresiva mediante entrenamiento y partidos.
2. Roles individuales por posición, con efecto en movimientos y decisiones.
3. Instrucciones situacionales: perder tiempo, buscar el empate, defender resultado, atacar una banda o presionar a un rival.
4. Moral, confianza, rachas y efecto de errores, goles y suplencias.
5. Primera versión del filial: ocho juveniles de 16 a 20 años y un máximo de tres promociones por jornada.
6. Equipaciones: color local exclusivo por club y alternativa automática cuando existe conflicto visual.

## Pendientes posteriores

5. Movimientos sin balón, coberturas y coordinación posicional más avanzada.
6. Liderazgo del capitán y elección manual del brazalete.
7. Entrenamiento individual, nuevas posiciones y riesgo de sobrecarga.
8. Rehabilitación, recaídas y regreso gradual de lesionados.
9. Mercado: fichajes, ventas, cesiones, contratos y salarios.
10. Ampliar la cantera con generación de nuevas camadas, evolución juvenil y cesiones; la lista del filial y la promoción ya están disponibles.
11. Relaciones con el entrenador y descontento por minutos o rol.
12. Clima y estado del césped.
13. VAR para goles, penaltis, rojas y fueras de juego.
14. Animaciones de barrera, calentamiento, discusiones, pérdidas de tiempo y camilla.
15. Prórrogas y tandas de penaltis.
16. Mapas de calor, redes de pase, tiros y estadísticas tácticas.
17. Más personalidades arbitrales.
18. Copas y competiciones europeas.
19. Objetivos de directiva, afición y posibles despidos.
20. Historial de temporadas, palmarés, récords y rivalidades.

## Leyenda

- **Completada**: implementada, integrada y con una verificación proporcional a su riesgo.
- **Parcial**: existen piezas funcionales, pero todavía no cumple el objetivo completo de la fase.
- **Pendiente**: no existe una implementación utilizable de la fase.
- **Continua**: trabajo de calidad que acompaña a todas las versiones.

## Resumen ejecutivo

| Fase | Área | Estado | Resultado actual |
|---|---|---|---|
| 1 | Base del juego | Completada | Equipos, dashboard, navegación, plantilla y tácticas |
| 2 | Gestión avanzada de plantilla | Completada | Alineaciones, validación, formaciones y autoselección |
| 3 | Motor de partido | Completada | Eventos, estadísticas, fatiga y narración; ampliada por la Fase 7 |
| 4 | Liga completa | Completada | 14 jornadas, 56 partidos, IA rival, clasificación y campeón |
| 5 | Pulido inicial | Completada | Responsive, accesibilidad básica, estados finales y pruebas de liga |
| 5.1 | Cierre de calidad y publicación | Completada | Backups, salida segura, informe pospartido, balance y flujo de Pages |
| 6 | Disponibilidad y entrenamiento | Completada | Lesiones, sanciones, recuperación, entrenamiento e IA entre jornadas |
| 7 | Partido interactivo | Completada | Motor incremental, entrenador, cambios, disciplina y balón parado |
| 7.5 | Inteligencia espacial | Completada | Bloques, presión, coberturas, juego aéreo y porteros activos |
| 7.6 | Partidas guardadas | Completada | Tres ranuras, autoguardado aislado y migración del guardado anterior |
| 8 | Mercado y economía | Pendiente | Fichajes, ventas, contratos, salarios y presupuesto |
| 9 | Carrera multitemporada | Pendiente | Nuevas temporadas, evolución, cantera e historial |
| 10 | Competiciones y objetivos | Pendiente | Copa, directiva, dificultad y progresión del entrenador |

## Orden recomendado desde el estado actual

1. Publicar y revisar manualmente la versión candidata en GitHub Pages.
2. Implementar **Fase 8: mercado y economía**.
3. Implementar **Fase 9: carrera multitemporada**.
4. Implementar **Fase 10: competiciones y objetivos**.

La Fase 6 debe preceder al mercado y a las nuevas temporadas porque define qué jugadores pueden participar, cómo se recuperan y cómo evolucionan entre jornadas.

---

## Fases completadas

### Fase 1 — Base del juego

- Ocho equipos ficticios con plantillas y atributos.
- Selección de equipo y dashboard.
- Navegación entre plantilla, tácticas, liga, estadísticas y configuración.
- Clasificación básica y persistencia en navegador.
- Interfaz adaptable para escritorio y móvil.

### Fase 2 — Gestión avanzada de plantilla

- Selección manual y automática del once.
- Validación de once jugadores y mínimos por línea.
- Ordenación por posición, nivel, edad, fitness y moral.
- Formaciones 4-4-2, 4-3-3, 4-2-3-1, 3-5-2 y 5-3-2.
- Configuración táctica persistente.

### Fase 3 — Motor de partido

- Simulación de eventos, goles, tarjetas, lesiones y sustituciones.
- Narración y estadísticas de partido.
- Fatiga, moral y actualización de estadísticas de futbolistas.
- Integración del resultado con la liga.

El motor clásico permanece como soporte para simulaciones rápidas. El partido del usuario utiliza el motor incremental de la Fase 7.

### Fase 4 — Liga completa

- Calendario de ida y vuelta: 14 jornadas y 56 partidos.
- Simulación automática del resto de encuentros de cada jornada.
- Recalculo de clasificación y criterios de desempate.
- Historial por jornada y resumen de temporada.
- Detección y presentación del campeón.

### Fase 5 — Pulido inicial

- Responsive desde 320 px.
- Navegación y tablas adaptadas a pantallas pequeñas.
- Foco visible, controles táctiles y reducción de movimiento.
- Estados vacíos, final de temporada y mensajes de resultado.
- Suite de pruebas del calendario, clasificación y persistencia.

### Fase 7 — Partido interactivo

- Partido incremental cuyo resultado no está precalculado.
- Duración de 1, 3, 5 o 10 minutos por parte.
- Prepartido con descanso para ajustar alineación y táctica, y elección entre resultado rápido o simulador.
- Velocidades 1×, 3× y 5×, pausa y saltos al descanso o final.
- Campo Canvas con 22 jugadores, pelota, porteros y árbitro.
- Campo compacto con jugadores reforzados visualmente y controles de reproducción situados encima.
- Pases, controles, entradas, robos, tiros, postes, paradas y goles.
- Continuidad física: el balón conserva su punto de recepción y nunca asigna controles a distancia.
- Prioridad de remate en ocasiones claras delante de portería y sin defensores próximos.
- Faltas, penaltis, amarillas, dobles amarillas, rojas y lesiones.
- Pausa obligatoria únicamente en descansos, expulsiones y lesiones.
- Fueras de juego y faltas indirectas.
- Panel derecho intercambiable entre narración, táctica, equipo y cambios.
- Hasta cinco sustituciones, cola de cambios y recomendaciones posicionales.
- IA rival con ajustes tácticos y sustituciones.
- Carga segura desde el dashboard: los partidos interrumpidos no se restauran y vuelven a comenzar desde cero.

### Fase 7.5 — Inteligencia espacial

- Separación entre compañeros y conservación de estructura.
- Basculación colectiva, presión, cobertura y transiciones.
- Desmarques y puntos anticipados de recepción.
- Pases rasos, al espacio, elevados y centros.
- Duelos aéreos y remates de cabeza.
- Porteros que anticipan centros y actúan como líbero con línea alta.
- Indicadores de presión, cobertura, trayectoria y línea defensiva.

### Fase 7.6 — Tres partidas guardadas

- Menú de tres ranuras al arrancar siempre el juego.
- Equipo y liga aislados por ranura; los partidos a medias se descartan al cargar.
- Continuar, sobrescribir y borrar con confirmación.
- Fecha, jornada y aviso de partido interrumpido visibles en el menú.
- Guardado manual y automático en la ranura activa.
- Migración del guardado antiguo a la primera ranura.
- Funcionamiento sin servidor, compatible con GitHub Pages.

---

## Fase 5.1 — Cierre de calidad y publicación

**Estado: Completada.**

### Entregado

- Exportación de una ranura o de las tres como JSON.
- Importación validada en una ranura y restauración de backups completos.
- Salida confirmada del partido, avisando de que el encuentro se reiniciará.
- Informe pospartido con MVP, valoraciones, estadísticas y cronología.
- Balance de 500 partidos y segunda muestra de control tras los ajustes.
- Ajuste de rojas, amarillas y lesiones a partir de la muestra masiva.
- Diseño responsive para nuevas pantallas de desarrollo, backups e informe.
- Fallback temporal y aviso cuando `localStorage` está bloqueado.
- Detección de ranuras y backups corruptos.
- Workflow estático de GitHub Pages y archivo `.nojekyll`.
- Nuevas pruebas de regresión para desarrollo y backups.

### Criterios de cierre

- Un backup exportado puede restaurarse sin perder liga, plantilla o partido activo.
- Salir o recargar durante un partido no registra resultados duplicados.
- Las nuevas pantallas conservan el responsive desde 320 px.
- Una simulación masiva no revela frecuencias deportivas claramente anómalas.
- El proyecto está preparado para desplegarse en GitHub Pages sin servidor.

Antes de hacer pública la URL se mantiene una revisión manual operativa en Chrome, Firefox y Safari; no requiere cambios de arquitectura.

---

## Fase 6 — Disponibilidad, recuperación y entrenamiento

**Estado: Completada.**

### Entregado

- Fitness y stamina influyen en el partido.
- Pueden producirse lesiones leves y lesiones que fuerzan un cambio.
- Las tarjetas reducen el equipo durante el encuentro.
- Estado único: disponible, lesionado, sancionado o recuperándose.
- Duración en jornadas y actualización exactamente una vez al cerrar la jornada.
- Exclusión de no disponibles en alineación manual, autoselección, banquillo e IA.
- Un partido de sanción por roja y sanción por cada cinco amarillas acumuladas.
- Parte médico y sanciones integrado en Plantilla.
- Planes de recuperación, equilibrado, físico, táctico y técnico.
- Intensidad baja, media o alta con recuperación, progreso y riesgo diferentes.
- Progreso acumulado de atributos hasta un máximo de 99.
- Plan de entrenamiento automático para rivales según fitness, bajas y nivel.
- Persistencia y migración de lesiones, sanciones, entrenamiento y jornadas procesadas.
- Suite específica de nueve pruebas.

### Criterios de cierre

- Un lesionado no puede jugar hasta cumplir su recuperación.
- Un expulsado cumple su sanción en jornadas posteriores.
- El paso de jornada actualiza exactamente una vez lesiones, sanciones y fitness.
- La autoselección nunca incluye jugadores no disponibles.
- El usuario entiende desde plantilla y previa por qué un jugador no puede participar.

---

## Fase 8 — Mercado y economía

**Estado: Pendiente.**

### Alcance propuesto

- Ventanas de fichajes.
- Búsqueda y filtrado de jugadores.
- Ofertas de compra, venta y cesión.
- Valor de mercado y negociación básica.
- Contratos con duración y salario.
- Presupuesto de fichajes y masa salarial.
- Necesidades de plantilla para la IA.
- Historial de movimientos.

### Dependencias

- Requiere la disponibilidad de la Fase 6.
- Debe definir límites de plantilla antes de comenzar la Fase 9.

### Criterios de cierre

- Ninguna operación puede dejar presupuesto o plantilla en un estado inválido.
- La IA compra y vende según posición, edad, nivel y economía.
- Contratos, salarios y movimientos persisten correctamente.

---

## Fase 9 — Carrera multitemporada

**Estado: Pendiente.**

### Alcance propuesto

- Comenzar una nueva temporada después de la jornada 14.
- Envejecimiento, desarrollo, declive y retirada.
- Potencial y evolución condicionados por minutos y entrenamiento.
- Historial de campeones, temporadas y récords.
- Renovación de calendarios y estadísticas de temporada.
- Cantera, juveniles y scouting básico.
- Ofertas para entrenar a otros clubes.

### Dependencias

- Requiere entrenamiento y recuperación de la Fase 6.
- Requiere contratos y economía de la Fase 8.

### Criterios de cierre

- Finalizar una temporada crea la siguiente sin perder el historial.
- Edad, contratos, desarrollo y plantillas avanzan una sola vez.
- Una partida puede superar varias temporadas sin corromperse.

---

## Fase 10 — Competiciones, directiva y progresión

**Estado: Pendiente.**

### Alcance propuesto

- Copa eliminatoria y Supercopa.
- Objetivos de directiva por temporada.
- Confianza, evaluación y posible despido.
- Niveles de dificultad sin bonificaciones ocultas.
- Reputación y progresión del entrenador.
- Premios individuales y récords.
- Competiciones continentales si aumenta el número de clubes.

### Criterios de cierre

- Calendario y fatiga integran varias competiciones sin solapamientos inválidos.
- Los objetivos se evalúan con reglas visibles.
- La dificultad modifica decisiones y recursos, no resultados prefijados.

---

## Mejoras continuas de jugabilidad

Estas tareas no necesitan una fase independiente, pero deben entrar en las versiones que correspondan:

- Mejor informe pospartido y explicación táctica.
- Más roles e instrucciones individuales.
- Mayor variedad de saques de esquina y faltas laterales.
- Ventaja arbitral, saques de banda y de puerta más explícitos.
- Ajuste estadístico del motor mediante simulaciones masivas.
- Regresión de trayectorias para impedir retrocesos o teletransportes al cambiar la posesión.
- Rendimiento estable del Canvas en móviles modestos.
- Accesibilidad, contraste, teclado y reducción de movimiento.
- Mensajes comprensibles cuando un guardado no puede escribirse o restaurarse.

## Fuera de alcance actual

- Multijugador y servidores en tiempo real.
- Sincronización en la nube entre dispositivos.
- Licencias, nombres o escudos de clubes reales.
- Motor gráfico 3D.
- Aplicaciones nativas para iOS o Android.

Estas posibilidades no son necesarias para publicar una primera versión sólida en GitHub Pages.

## Próxima implementación recomendada

1. Realizar la revisión visual manual de la versión candidata publicada.
2. Comenzar la **Fase 8** por el modelo de contrato, valor de mercado y presupuestos.
3. Añadir después ofertas, negociación, ventas y decisiones de mercado de la IA.
