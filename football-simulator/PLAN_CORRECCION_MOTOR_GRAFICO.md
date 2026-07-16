# Plan de corrección del motor gráfico

## Objetivo

Eliminar movimientos incoherentes, teletransportes y diferencias entre el estado lógico y lo que muestra el simulador, manteniendo resultados equivalentes en las velocidades 1×, 3× y 5×.

## Estado

- Intervención completada: bloques 1 a 9.
- Posesión, porteros, reinicios, movimiento, fuera de juego, Canvas, transiciones y reloj migrados al nuevo flujo.
- Verificación esperada: 95/95 pruebas del motor, 10/10 de liga y 16/16 de regresión y presentación en Chromium headless aislado.
- Cierre visual: escritorio 1440×1100 y móvil 390×844 sin desbordamiento horizontal, con Canvas, marcador y velocidades visibles.
- Velocidades verificadas sobre el mismo partido: 49/143/237 revisiones en 1×/3×/5×, sin errores de consola ni excepciones de página.
- Continuidad por frame: máximos de jugador 1,03/1,63/2,10 y de balón 2,30/3,92/4,85 unidades en 1×/3×/5×.
- Tras bloquear el hilo principal durante 2 segundos a 5×, la recuperación quedó limitada a 0,95 minutos simulados y sin salto visual.
- Persistencia verificada en navegador: mismo partido y minuto exacto antes y después de guardar el estado en curso.
- Decisiones y salida del portero recalibradas: en 12 partidos de control, los 51 pases de portero buscaron mediocampo, bandas o ataque; ninguno volvió a la línea defensiva y el avance mínimo fue de 42,8 unidades.
- Pérdidas recalibradas sobre 18 partidos: 29 intercepciones en 493 pases (5,9%), 281 robos limpios en duelos cercanos y un 24,5% de escapes del poseedor; ningún resultado es automático.
- Alineación asiste los cambios con tres candidatos ordenados, porcentaje de encaje y código verde/azul/ámbar; cada rol individual muestra afinidad porcentual calculada con atributos del jugador.
- La narración muestra primero el evento más reciente y conserva el scroll arriba; confirmar una sustitución reanuda automáticamente el partido y cierra el panel de cambios.
- Estrés ampliado: 12 partidos completos con formaciones y estrategias combinadas, 48.116 ticks, cero bloqueos, cero saltos normales superiores a 4 unidades y cero discontinuidades inexplicadas del balón.
- El peor balón suelto dentro del área se resuelve en 8 ticks; la separación máxima balón-poseedor se mantiene en 0,8 unidades.

## Resumen de implementación

- La posesión actualiza propietario y balón como una única operación.
- El portero debe alcanzar el punto de contacto; una parada lejana genera rechace.
- Los saques de banda no forman barrera y esperan al lanzador físicamente.
- Los lanzadores de faltas se eligen combinando calidad y cercanía, sin quedar bloqueados por la línea del portero.
- Los jugadores conservan velocidad y aceleración con límites por tick.
- Las correcciones de separación y orden defensivo están limitadas.
- La disciplina defensiva permite que el portero salga a recoger un balón suelto y vuelve a ordenar el bloque después.
- Las acciones individuales tienen prioridad explícita sobre la basculación colectiva.
- Cada pase conserva una instantánea reglamentaria del fuera de juego.
- El juego directo y de ritmo alto admite un riesgo excepcional de desmarque adelantado real; la muestra de calibración produjo 1 fuera de juego en 20 partidos, sin delanteros permanentemente adelantados.
- Canvas avanza continuamente hacia el último snapshot, limita el recorrido por frame y usa el mismo estado visual para todas sus capas.
- Si un pase completo se resuelve entre frames a alta velocidad, el balón conserva visualmente el trayecto y no anticipa el indicador de posesión.
- Descanso y vuelta tras el gol son transiciones animadas hasta el saque de centro.
- El reloj usa un acumulador fijo y limita la recuperación después de una caída de FPS.
- Reinicios y transiciones de descanso conservan progreso, velocidades y propietario al guardar y recargar.

## Principios de trabajo

- Cada cambio importante debe comenzar con una prueba que reproduzca el problema.
- Balón, poseedor y punto de contacto deben formar una transición atómica.
- La velocidad de reproducción no debe modificar las decisiones ni la física del partido.
- Las correcciones visuales no deben ocultar estados lógicos inválidos.
- Los cambios se entregarán por bloques pequeños y verificables.

## Bloque 1 — Pruebas y posesión atómica

1. Crear pruebas para:
   - Captura y parada del portero.
   - Control después de pase e intercepción.
   - Sustitución del poseedor.
   - Distancia entre balón controlado y jugador.
   - Continuidad en 1×, 3× y 5×.
2. Centralizar todos los cambios de posesión.
3. Actualizar conjuntamente propietario, posición, altura y estado del balón.
4. Impedir que el balón sea asignado a jugadores fuera del terreno.
5. Vincular visualmente el balón controlado al poseedor interpolado.

### Criterios de aceptación

- Un balón con propietario nunca aparece separado de él.
- Una sustitución no mueve el balón al área técnica.
- Una captura no recoloca el balón antes de validar el contacto.
- Las pruebas existentes continúan superándose.

## Bloque 2 — Porteros y reinicios

1. Crear un punto físico de captura para el portero.
2. Hacer que el portero llegue al balón antes de blocarlo.
3. Diferenciar salida, parada, retención y distribución.
4. Crear estados específicos para saque de banda, falta, penalti y fuera de juego.
5. Llevar progresivamente balón y lanzador al punto de reinicio.
6. Eliminar la barrera en los saques de banda.
7. Formar barrera solamente cuando el tipo y la posición de la falta lo requieran.

### Criterios de aceptación

- El portero nunca aparece repentinamente con el balón.
- El balón no cambia de zona al comenzar un reinicio.
- Los saques de banda no agrupan artificialmente cuatro defensores.
- Ningún reinicio queda bloqueado esperando eternamente al lanzador.

## Bloque 3 — Movimiento físico

1. Añadir velocidad y aceleración persistentes a cada jugador.
2. Limitar desplazamiento y giro por tick.
3. Usar parámetros específicos para jugadores de campo y porteros.
4. Evitar la frenada asintótica cerca del objetivo.
5. Integrar la separación entre jugadores como una corrección limitada.
6. Eliminar correcciones defensivas mediante saltos directos de coordenadas.

### Criterios de aceptación

- Ningún jugador supera el desplazamiento máximo establecido.
- Los cambios de dirección son progresivos.
- El portero llega con rapidez al balón sin teletransportarse.
- Los jugadores no vibran al separarse ni atraviesan al portero.

## Bloque 4 — Posicionamiento táctico

1. Separar formación base, comportamiento colectivo y acción individual.
2. Definir prioridades explícitas entre comportamientos.
3. Evitar escrituras sucesivas contradictorias sobre el mismo objetivo.
4. Mantener carriles y distancias entre líneas.
5. Revisar presión, apoyos, transiciones y bloque defensivo.
6. Reservar acciones individuales para carreras, disputas y reinicios.

### Criterios de aceptación

- Un jugador no cambia repetidamente de objetivo dentro del mismo ciclo.
- Las líneas mantienen orden y separación.
- Los centrales no abandonan su zona sin una razón táctica explícita.
- El bloque responde al balón sin deformarse.

## Bloque 5 — Fuera de juego

1. Evaluarlo únicamente en el instante del pase.
2. Guardar una instantánea del balón, receptor y penúltimo defensor.
3. Separar la decisión reglamentaria de la interpolación visual.
4. Mantener a los delanteros en posición legal sin pegarlos artificialmente a la línea.
5. Sincronizar la línea visual con las posiciones mostradas.

### Criterios de aceptación

- Un jugador legal al golpeo no cae posteriormente en fuera de juego.
- Los delanteros temporizan las carreras y no permanecen adelantados.
- La línea mostrada coincide con los jugadores que ve el usuario.

## Bloque 6 — Interpolación gráfica

1. Mantener snapshots lógico anterior y actual con marcas temporales.
2. Interpolar todos los elementos desde el mismo instante visual.
3. Vincular el balón controlado al pie del poseedor interpolado.
4. Interpolar altura, sombras y trayectorias.
5. Dibujar líneas defensivas, fuera de juego y marcadores con posiciones visuales.
6. Limpiar correctamente entidades eliminadas o sustituidas.

### Criterios de aceptación

- Balón, jugadores, árbitro y líneas representan el mismo instante.
- No existen saltos al cambiar de propietario o fase.
- Los balones aéreos no cambian de altura por escalones.
- Las trayectorias parten del balón realmente dibujado.

## Bloque 7 — Transiciones especiales

1. Animar la vuelta después de los goles.
2. Preparar el descanso sin teletransportes visibles.
3. Integrar lesiones y sustituciones con el estado del partido.
4. Limpiar carreras, posesión y acciones antiguas al cambiar de fase.
5. Definir qué elementos se congelan y cuáles continúan durante una pausa.

### Criterios de aceptación

- Descanso, celebraciones y lesiones no provocan apariciones.
- El balón no conserva un propietario inválido después de una transición.
- Reanudar un partido no mezcla posiciones anteriores y nuevas.

## Bloque 8 — Bucle temporal y rendimiento

1. Sustituir el `setTimeout` acumulativo por un acumulador de tiempo fijo.
2. Limitar los ticks de recuperación después de una caída de FPS.
3. Separar velocidad lógica y frecuencia de dibujo.
4. Reducir reconstrucciones del DOM durante el partido.
5. Mantener el guardado fuera del camino crítico del renderizado.

### Criterios de aceptación

- La duración real se mantiene estable en cada velocidad.
- Una caída de FPS no produce una ráfaga de teletransportes.
- 1×, 3× y 5× generan exactamente las mismas decisiones con la misma semilla.

## Bloque 9 — Validación final

1. Ejecutar simulaciones largas con distintas tácticas y formaciones.
2. Registrar desplazamientos máximos de jugadores y balón.
3. Comprobar continuamente la distancia entre balón y propietario.
4. Validar manualmente porteros, reinicios, fueras de juego y sustituciones.
5. Probar escritorio, móvil y escenarios con FPS reducidos.
6. Actualizar documentación y pruebas de regresión.

## Orden de entrega

1. Pruebas y posesión atómica.
2. Porteros y reinicios.
3. Movimiento y posicionamiento.
4. Fuera de juego e interpolación.
5. Transiciones, temporización y validación final.
