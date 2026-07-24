// ============================================
// LOCALIZACIÓN DE LA INTERFAZ
// Español es el idioma base; la capa inglesa traduce también vistas dinámicas.
// ============================================

const I18N = (() => {
  const STORAGE_KEY = 'fs_setting_language';

  const EN = {
    'Nuestros pensadores también la rompen en la dinámica de lo inesperado: el fútbol.': 'Our thinkers also shine in the dynamics of the unexpected: football.',
    'Retrato pixelado de un filósofo clásico': 'Pixel-art portrait of a classical philosopher',
    'Antigüedad clásica': 'Classical antiquity',
    'Renacimiento · siglos XV–XVI': 'Renaissance · 15th–16th centuries',
    'Racionalismo · siglos XVII–XVIII': 'Rationalism · 17th–18th centuries',
    'Filosofía contemporánea · siglo XX': 'Contemporary philosophy · 20th century',
    'Empirismo · siglos XVII–XIX': 'Empiricism · 17th–19th centuries',
    'Existencialismo · siglos XIX–XX': 'Existentialism · 19th–20th centuries',
    'Pensamiento social · siglos XIX–XX': 'Social thought · 19th–20th centuries',
    'Tradición clásica y medieval': 'Classical and medieval tradition',
    'Idealismo · siglos XVIII–XX': 'Idealism · 18th–20th centuries',
    'Tradición filosófica': 'Philosophical tradition',
    'Elige una partida': 'Choose a save',
    'Tu progreso se guarda automáticamente en este navegador.': 'Your progress is saved automatically in this browser.',
    '⚠ El navegador ha bloqueado el almacenamiento. El progreso solo durará hasta cerrar esta pestaña.': '⚠ The browser has blocked storage. Progress will only last until you close this tab.',
    'Vacía': 'Empty',
    'Última usada': 'Last used',
    'Guardada': 'Saved',
    'Nueva partida': 'New game',
    'Continuar': 'Continue',
    'Nueva': 'New',
    'Borrar': 'Delete',
    'Jornada': 'Matchday',
    'Modo': 'Mode',
    'Director Deportivo': 'Sporting Director',
    'Partido interrumpido · se reiniciará': 'Interrupted match · it will restart',
    'Configura tu experiencia': 'Set up your experience',
    'Elige la presentación y el nivel de gestión antes de seleccionar tu club.': 'Choose the presentation and management depth before selecting your club.',
    'Gráfica': 'Graphics',
    'Podrás cambiarla después desde Ajustes.': 'You can change it later in Settings.',
    'Gráfica de la interfaz': 'Interface graphics',
    'Blanco, negro y sin ruido visual': 'Black, white and free of visual noise',
    'Define qué responsabilidades quieres asumir.': 'Choose which responsibilities you want to take on.',
    'Solo simulador. Entra al partido sin gestionar el equipo desde el banquillo.': 'Simulator only. Enter the match without managing the team from the dugout.',
    'Simulador y entrenador: alineaciones, tácticas y decisiones durante el partido.': 'Simulator and coach: line-ups, tactics and in-match decisions.',
    'En desarrollo': 'In development',
    'Todo lo anterior, más fichajes y gestión integral cuando estén disponibles.': 'Everything above, plus transfers and full sporting management when available.',
    'Estilo visual': 'Visual style',
    'Elige la apariencia del juego. El cambio se aplica al instante y no afecta a la partida.': 'Choose the game appearance. Changes apply instantly and do not affect your save.',
    'Tema de la interfaz': 'Interface theme',
    'Modo de juego': 'Game mode',
    'Elige cuánto quieres gestionar.': 'Choose how much you want to manage.',
    'Solo simulador. Entra al partido y juega.': 'Simulator only. Jump into the match and play.',
    'Simulador y entrenador. Gestiona once, tácticas y club.': 'Simulator and coach. Manage your XI, tactics and club.',
    'Todo lo anterior, más fichajes y gestión deportiva.': 'Everything above, plus transfers and sporting management.',
    'Próximamente': 'Coming soon',
    'Volver': 'Back',
    '← Volver': '← Back',
    'Elegir equipo': 'Choose team',
    'Elige tu Equipo': 'Choose your Team',
    'Selecciona el equipo que deseas gestionar en la liga': 'Select the team you want to manage in the league',
    'Media': 'Overall',
    'Presupuesto': 'Budget',
    'Seleccionar': 'Select',
    'Inicio': 'Home',
    'Resumen de la temporada': 'Season overview',
    'Alineación': 'Line-up',
    'Once, formación y roles': 'XI, formation and roles',
    'Club': 'Club',
    'Entrenamiento y cantera': 'Training and academy',
    'Partido': 'Match',
    'Preparación y simulador': 'Preparation and simulator',
    'Liga': 'League',
    'Clasificación y calendario': 'Table and fixtures',
    'Datos': 'Stats',
    'Rendimiento y estadísticas': 'Performance and statistics',
    'Ajustes': 'Settings',
    'Gráfica y preferencias': 'Graphics and preferences',
    'Secciones principales': 'Main sections',
    'Secciones': 'Sections',
    'Jugar': 'Play',
    'Gestionar': 'Manage',
    'Tu Equipo': 'Your Team',
    'Posición:': 'Position:',
    'Jugadores:': 'Players:',
    'Formación:': 'Formation:',
    'Posición': 'Position',
    'Jugadores': 'Players',
    'Formación': 'Formation',
    'Próximo Partido': 'Next Match',
    'Preparar partido': 'Prepare match',
    'Jugar partido': 'Play match',
    'Clasificación (Top 5)': 'Table (Top 5)',
    'Progreso de Temporada': 'Season Progress',
    'Rendimiento del equipo': 'Team performance',
    'Goles / partido': 'Goals / match',
    'Victorias': 'Wins',
    'Diferencia': 'Difference',
    'Fitness medio': 'Average fitness',
    'Moral media': 'Average morale',
    'Disponibles': 'Available',
    'Goleadores': 'Top scorers',
    'Asistencias': 'Assists',
    'Más utilizados': 'Most used',
    'Disciplina': 'Discipline',
    'Sin registros todavía': 'No records yet',
    '⚽ Goleadores': '⚽ Top scorers',
    '↗ Asistencias': '↗ Assists',
    '▦ Más utilizados': '▦ Most used',
    '🟨 Disciplina': '🟨 Discipline',
    'Gestión de la alineación': 'Line-up management',
    'Elige el once y define cómo jugará, todo en el mismo lugar.': 'Choose the XI and define how it will play, all in one place.',
    'bajas': 'unavailable',
    'cantera': 'academy',
    'Once': 'XI',
    'Elegir titulares': 'Choose starters',
    'Plan': 'Plan',
    'Formación e identidad': 'Formation and identity',
    'Roles': 'Roles',
    'Función individual': 'Individual role',
    'Cambiar sistema': 'Change system',
    'Once automático': 'Automatic XI',
    'Limpiar': 'Clear',
    'Guardar alineación': 'Save line-up',
    'Selecciona primero en el campo al jugador que quieres cambiar.': 'First select the player on the pitch you want to replace.',
    'El once necesita un portero. Selecciónalo antes de completar la alineación.': 'The XI needs a goalkeeper. Select one before completing the line-up.',
    'Elige jugadores de la lista para construir tu once': 'Choose players from the list to build your XI',
    'Elige jugadores': 'Choose players',
    'Pulsa para añadir o retirar': 'Tap to add or remove',
    'Todos': 'All',
    'Porteros': 'Goalkeepers',
    'Defensas': 'Defenders',
    'Medios': 'Midfielders',
    'Ataque': 'Attack',
    'Disponible': 'Available',
    'POR': 'GK',
    'LD': 'RB',
    'DFC': 'CB',
    'LI': 'LB',
    'MCD': 'DM',
    'MC': 'CM',
    'MCO': 'AM',
    'ED': 'RW',
    'EI': 'LW',
    'DC': 'ST',
    'MED': 'OVR',
    'MEDIA': 'OVERALL',
    'FÍS': 'FIT',
    'MOR': 'MOR',
    'Protege la portería, domina el área y da el primer pase.': 'Protects the goal, commands the box and starts the build-up.',
    'Defiende el centro, gana duelos y sostiene la salida de balón.': 'Defends central areas, wins duels and supports the build-up.',
    'Ocupa el lateral izquierdo y equilibra defensa, recorrido y apoyo.': 'Operates at left-back, balancing defending, movement and support.',
    'Ocupa el lateral derecho y combina defensa, recorrido y apoyo.': 'Operates at right-back, combining defending, movement and support.',
    'Protege a la defensa, recupera y ordena la circulación.': 'Protects the defence, wins the ball and organises possession.',
    'Conecta las líneas y marca el ritmo con y sin balón.': 'Links the lines and sets the tempo with and without the ball.',
    'Juega entre líneas para crear ocasiones y llegar al área.': 'Plays between the lines to create chances and reach the box.',
    'Ataca desde la izquierda con velocidad, regate y desborde.': 'Attacks from the left with pace, dribbling and penetration.',
    'Ataca desde la derecha con velocidad, regate y desborde.': 'Attacks from the right with pace, dribbling and penetration.',
    'Fija a los centrales y convierte las ocasiones del equipo.': 'Occupies the centre-backs and converts the team’s chances.',
    'Plan base': 'Base plan',
    'Cómo juega el equipo': 'How the team plays',
    'Define la formación, la identidad y el plan de salida. Las consignas situacionales se deciden durante el partido.': 'Define the formation, identity and starting plan. Situational instructions are decided during the match.',
    'Estructura': 'Structure',
    'Identidad': 'Identity',
    'Planes de partido': 'Match plans',
    'Se aplican al instante': 'Applied instantly',
    'Ayudante táctico': 'Tactical assistant',
    'Ajustes avanzados': 'Advanced settings',
    'Actitud, presión, construcción y anchura': 'Mentality, pressure, build-up and width',
    'Ajuste fino': 'Fine tuning',
    'Cuatro decisiones': 'Four decisions',
    'Roles individuales': 'Individual roles',
    'Gestión diaria': 'Daily management',
    'Organiza el entrenamiento, revisa la disponibilidad y desarrolla la cantera.': 'Organise training, review availability and develop the academy.',
    'Resumen del club': 'Club overview',
    'Plan semanal': 'Weekly plan',
    'Intensidad': 'Intensity',
    'Cupo cantera': 'Academy slots',
    'Entrenamiento': 'Training',
    'Plan semanal y disponibilidad': 'Weekly plan and availability',
    'Cantera': 'Academy',
    'Filial y promociones': 'Reserve team and promotions',
    'Primer equipo': 'First team',
    'Entrenamiento y disponibilidad': 'Training and availability',
    'Todo disponible': 'Everyone available',
    'Define la carga de la próxima jornada': 'Set the workload for the next matchday',
    'Enfoque': 'Focus',
    'Recuperación': 'Recovery',
    'Equilibrado': 'Balanced',
    'Equilibrada': 'Balanced',
    'Físico': 'Physical',
    'Táctico': 'Tactical',
    'Técnico': 'Technical',
    'Baja': 'Low',
    'Media': 'Medium',
    'Alta': 'High',
    'Se aplica al completar cada jornada. Una intensidad alta mejora más, pero aumenta la fatiga y el riesgo.': 'Applied after each matchday. High intensity improves more, but increases fatigue and risk.',
    'Disponibilidad': 'Availability',
    'Parte médico y sanciones': 'Medical report and suspensions',
    'Plantilla completa': 'Full squad',
    'Todos los jugadores están disponibles.': 'All players are available.',
    'Desarrollo': 'Development',
    'Filial': 'Reserve team',
    'Selecciona talento del filial para incorporarlo al primer equipo.': 'Select reserve-team talent to promote to the first team.',
    'Subir seleccionados': 'Promote selected',
    'Elegido': 'Selected',
    'Elegir': 'Select',
    'No quedan jugadores disponibles en el filial.': 'No players remain available in the reserve team.',
    'Todo preparado': 'All set',
    'Local': 'Home',
    'Visitante': 'Away',
    'LOCAL': 'HOME',
    'VISITANTE': 'AWAY',
    'Once válido': 'Valid XI',
    '✓ Once válido': '✓ Valid XI',
    'Sin bajas': 'No absences',
    'titulares': 'starters',
    'Empezar el partido': 'Start the match',
    'Minutos por parte': 'Minutes per half',
    'Simulador': 'Simulator',
    'Campo en directo': 'Live pitch',
    'Narración': 'Commentary',
    'Relato en directo': 'Live commentary',
    'Resultado': 'Result',
    'Resolución inmediata': 'Instant result',
    'Editar alineación': 'Edit line-up',
    'Usar mejor XI': 'Use best XI',
    'Ver alineación completa': 'View full line-up',
    'Alineación titular': 'Starting line-up',
    'Análisis opcional': 'Optional analysis',
    'Identidad, puntos fuertes y claves del rival': 'Identity, strengths and opposition keys',
    'Opcional': 'Optional',
    'Claves del partido': 'Match keys',
    'Lo que debes saber antes de jugar': 'What you need to know before playing',
    'Partido en directo': 'Live match',
    'cambios': 'substitutions',
    'Táctica': 'Tactics',
    'Ajustar el plan': 'Adjust the plan',
    'Hacer cambios': 'Make substitutions',
    'Elegir jugador': 'Choose player',
    'Órdenes rápidas': 'Quick instructions',
    'Respuesta inmediata': 'Immediate response',
    'Pausa': 'Pause',
    'Reanudar': 'Resume',
    'Velocidad': 'Speed',
    'Hasta descanso': 'To half-time',
    'Hasta final': 'To full-time',
    'Salir al menú': 'Exit to menu',
    'Posesión': 'Possession',
    'Tiros': 'Shots',
    'A puerta': 'On target',
    'Faltas': 'Fouls',
    'F. juego': 'Offsides',
    'local': 'home',
    'Prepartido': 'Pre-match',
    'Transición': 'Open play',
    'Árbitro': 'Referee',
    'Presión': 'Pressure',
    'Cobertura': 'Cover',
    'Línea local': 'Home line',
    'Línea visitante': 'Away line',
    'Balón elevado': 'Aerial ball',
    'Cerrar y volver al partido': 'Close and return to match',
    'Decisiones': 'Decisions',
    'Plan táctico': 'Tactical plan',
    'Cambios': 'Substitutions',
    'Lectura del partido': 'Match reading',
    'Sistema': 'System',
    'Elige una estructura para recolocar al equipo': 'Choose a shape to reposition the team',
    '+ posesión · + estabilidad · riesgo medio': '+ possession · + stability · medium risk',
    '+ ocasiones · + presión · - energía': '+ chances · + pressure · - energy',
    '+ seguridad · + contraataque · - posesión': '+ security · + counter-attack · - possession',
    'Cambios automáticos': 'Automatic substitutions',
    'El asistente elige por cansancio, estado y encaje.': 'The assistant chooses based on fatigue, condition and fit.',
    'Hacer cambios automáticos': 'Make automatic substitutions',
    'Primera parte: deja como máximo 2 cambios usados. Desde el descanso: utiliza todos los restantes.': 'First half: use no more than 2 substitutions. From half-time: use all remaining changes.',
    'Banquillo': 'Bench',
    'Ordenado por encaje': 'Sorted by fit',
    'Preparar cambio': 'Queue substitution',
    'Confirmar cambios': 'Confirm substitutions',
    'Sale': 'Off',
    'SALE': 'OFF',
    'Entra': 'On',
    'ENTRA': 'ON',
    'Toca un titular': 'Tap a starter',
    'Elige un suplente': 'Choose a substitute',
    'No hay cambios preparados.': 'No substitutions queued.',
    'Selecciona un jugador y prepara el cambio para continuar.': 'Select a player and queue the substitution to continue.',
    'Cambio obligatorio': 'Mandatory substitution',
    'El jugador lesionado debe ser sustituido antes de continuar.': 'The injured player must be replaced before continuing.',
    'Clasificación': 'Table',
    'Partidos del equipo': 'Team matches',
    'partidos disputados': 'matches played',
    'Equipo': 'Team',
    'PJ': 'P',
    'V': 'W',
    'E': 'D',
    'D': 'L',
    'GC': 'GA',
    'DG': 'GD',
    'Pts': 'Pts',
    'Calendario completo': 'Full schedule',
    'partidos': 'matches',
    'Pendiente': 'Pending',
    'Estadísticas de la Liga': 'League Statistics',
    'Top Goleadores': 'Top Scorers',
    'Top Asistentes': 'Top Assists',
    'Sin datos': 'No data',
    'Así juega': 'How they play',
    'Once actual': 'Current XI',
    'Plantilla': 'Squad',
    'Pulsa para abrir su ficha': 'Tap to open the profile',
    'Club de fútbol': 'Football club',
    'Una identidad construida para competir en equipo.': 'An identity built to compete as a team.',
    'Su función': 'Their role',
    'Sus cualidades principales son': 'Their main qualities are',
    'Aporta equilibrio y soluciones en su zona del campo.': 'Provides balance and solutions in their area of the pitch.',
    'Habilidades': 'Skills',
    'Esta temporada': 'This season',
    'partidos': 'matches',
    'goles': 'goals',
    'asistencias': 'assists',
    'forma': 'fitness',
    'moral': 'morale',
    'Velocidad': 'Pace',
    'Tiro': 'Shooting',
    'Pase': 'Passing',
    'Regate': 'Dribbling',
    'Defensa': 'Defending',
    'Portería': 'Goalkeeping',
    'velocidad': 'pace',
    'tiro': 'shooting',
    'pase': 'passing',
    'regate': 'dribbling',
    'defensa': 'defending',
    'físico': 'physical',
    'portería': 'goalkeeping',
    'Portero': 'Goalkeeper',
    'Lateral derecho': 'Right-back',
    'Defensa central': 'Centre-back',
    'Lateral izquierdo': 'Left-back',
    'Mediocentro defensivo': 'Defensive midfielder',
    'Mediocentro': 'Central midfielder',
    'Mediapunta': 'Attacking midfielder',
    'Extremo derecho': 'Right winger',
    'Extremo izquierdo': 'Left winger',
    'Delantero centro': 'Centre-forward',
    'Configuración': 'Settings',
    'Diseño original moderno': 'Modern original design',
    'Gestor de PC de 1996': '1996 PC manager',
    'Estilo deportivo 16-bit': '16-bit sports style',
    'Idioma': 'Language',
    'Elige el idioma de toda la interfaz.': 'Choose the language for the entire interface.',
    'Español': 'Spanish',
    'Inglés': 'English',
    'Partidos': 'Matches',
    'Duración predeterminada por parte': 'Default duration per half',
    'Copias de seguridad': 'Backups',
    'Exportar o importar partidas': 'Export or import saves',
    'Descarga tus partidas para conservarlas fuera de este navegador.': 'Download your saves to keep them outside this browser.',
    'Exportar partida actual': 'Export current save',
    'Exportar las tres partidas': 'Export all three saves',
    'Ranura de destino': 'Target slot',
    'Importar backup': 'Import backup',
    'Un backup completo restaura sus ranuras originales. Una partida individual se importa en la ranura seleccionada.': 'A full backup restores its original slots. A single save is imported into the selected slot.',
    'Guardar y volver al menú': 'Save and return to menu',
    'El progreso se guarda automáticamente.': 'Progress is saved automatically.',
    'Plan semanal actualizado': 'Weekly plan updated',
    'Duración predeterminada guardada': 'Default duration saved',
    'Mejor XI preparado para el partido': 'Best XI prepared for the match',
    'Mejor XI aplicado para el próximo partido': 'Best XI applied for the next match',
    '✓ Alineación guardada correctamente': '✓ Line-up saved successfully',
    'Selecciona un archivo JSON': 'Select a JSON file',
    'Backup exportado': 'Backup exported',
    'Backup importado correctamente': 'Backup imported successfully',
    'No hay una partida que exportar': 'There is no save to export',
    'No se pudo descargar el backup': 'The backup could not be downloaded',
    'El archivo no contiene JSON válido': 'The file does not contain valid JSON',
    'Clásica y equilibrada': 'Classic and balanced',
    'Ofensiva y dinámica': 'Attacking and dynamic',
    'Defensiva y compacta': 'Defensive and compact',
    'Pivote único y bloque equilibrado': 'Single pivot and balanced block',
    'Árbol de Navidad y juego interior': 'Christmas tree and central play',
    'Doble pivote y dos mediapuntas': 'Double pivot and two attacking midfielders',
    'Arriesgada y ofensiva': 'Risky and attacking',
    'Amplitud y presión con tres atacantes': 'Width and pressure with three forwards',
    'Carrileros y dos jugadores entre líneas': 'Wing-backs and two players between the lines',
    'Muy defensiva': 'Very defensive',
    'Bloque bajo y máxima protección': 'Low block and maximum protection',
    'Defensa de cinco y salida con tres puntas': 'Back five and three-forward outlet',
    'Controlar': 'Control',
    'Buscar el gol': 'Chase a goal',
    'Proteger': 'Protect',
    'Tener el balón y reducir el caos.': 'Keep the ball and reduce chaos.',
    'Acelerar, presionar arriba y asumir riesgos.': 'Raise the tempo, press high and take risks.',
    'Cerrar espacios y salir al contraataque.': 'Close spaces and break on the counter.',
    'Volver al plan': 'Return to plan',
    'Bajar el ritmo': 'Slow the tempo',
    'Presionar salida': 'Press the build-up',
    'Atacar izquierda': 'Attack left',
    'Atacar derecha': 'Attack right',
    'Atacar por dentro': 'Attack through the middle',
    'Conservar balón': 'Keep possession',
    'Salir a la contra': 'Counter-attack',
    'Colgar balones': 'Cross early',
    'Disparar más': 'Shoot more',
    'Replegar líneas': 'Drop deeper',
    'Entrar fuerte': 'Tackle harder',
    'Cerrar el partido': 'Shut down the match',
    'Posesión': 'Possession',
    'Presión alta': 'High press',
    'Juego directo': 'Direct play',
    'Contraataque': 'Counter-attack',
    'Bloque bajo': 'Low block',
    'Estoicismo': 'Stoicism',
    'Idealismo': 'Idealism',
    'Racionalismo': 'Rationalism',
    'Epicureísmo': 'Epicureanism',
    'Existencialismo': 'Existentialism',
    'Empirismo': 'Empiricism',
    'Materialismo': 'Materialism',
    'Humanismo': 'Humanism',
    'La serenidad ante la adversidad y el dominio de aquello que depende de uno mismo.': 'Serenity in adversity and mastery of what lies within one’s control.',
    'Disciplina, estructura y resistencia emocional: competir sin perder la forma aunque el partido se vuelva incómodo.': 'Discipline, structure and emotional resilience: competing without losing shape when the match becomes uncomfortable.',
    'La realidad se orienta hacia una forma superior que primero debe ser pensada.': 'Reality is directed towards a higher form that must first be conceived.',
    'Persigue un modelo de juego reconocible y colectivo, convencido de que la idea debe ordenar cada movimiento.': 'It pursues a recognisable collective game model, convinced that the idea should organise every movement.',
    'La razón, el método y las relaciones claras permiten comprender y organizar el mundo.': 'Reason, method and clear relationships allow the world to be understood and organised.',
    'Interpreta el campo como un problema de espacios: orden, pase calculado y decisiones con poco margen para la improvisación.': 'It reads the pitch as a problem of space: order, measured passing and decisions with little room for improvisation.',
    'La buena vida nace del placer sobrio, la amistad y la ausencia de perturbación.': 'The good life grows from measured pleasure, friendship and freedom from disturbance.',
    'Quiere disfrutar con el balón, asociarse con sencillez y evitar un partido caótico o innecesariamente sufrido.': 'It wants to enjoy the ball, combine simply and avoid a chaotic or needlessly painful match.',
    'Cada elección construye lo que somos y nos hace responsables de nuestro destino.': 'Every choice builds who we are and makes us responsible for our destiny.',
    'Un equipo intenso y valiente que acepta el riesgo, exige iniciativa individual y se define mediante sus decisiones.': 'An intense, brave team that accepts risk, demands individual initiative and defines itself through its decisions.',
    'El conocimiento comienza en la experiencia, la observación y la prueba.': 'Knowledge begins with experience, observation and testing.',
    'Lee lo que sucede, prueba soluciones y adapta su plan a la evidencia que ofrece el partido.': 'It reads what happens, tests solutions and adapts its plan to the evidence offered by the match.',
    'Las condiciones materiales y las fuerzas concretas explican el movimiento de la realidad.': 'Material conditions and concrete forces explain the movement of reality.',
    'Da valor al físico, al territorio y al trabajo colectivo: el partido se conquista con acciones tangibles.': 'It values physicality, territory and collective work: the match is won through tangible actions.',
    'La dignidad, la capacidad y el desarrollo integral de la persona ocupan el centro.': 'Human dignity, ability and holistic development take centre stage.',
    'Busca un equipo equilibrado que potencie a cada futbolista y ponga el talento individual al servicio del conjunto.': 'It seeks a balanced team that develops every footballer and puts individual talent at the service of the whole.'
  };

  const PATTERNS = [
    [/^Nueva partida · Ranura (\d+)$/, (_, n) => `New game · Slot ${n}`],
    [/^Partida (\d+)$/, (_, n) => `Save ${n}`],
    [/^Escudo de (.+)$/, (_, team) => `${team} crest`],
    [/^Retrato inventado de (.+) · (.+)$/, (_, player, era) => `Invented portrait of ${player} · ${EN[era] || era}`],
    [/^Jornada (\d+)$/, (_, n) => `Matchday ${n}`],
    [/^Próximo Partido - Jornada (\d+)$/, (_, n) => `Next Match — Matchday ${n}`],
    [/^(\d+)\.ª jornada$/, (_, n) => `Matchday ${n}`],
    [/^(\d+) años$/, (_, n) => `${n} years old`],
    [/^(\d+) años · Disponible$/, (_, n) => `${n} years old · Available`],
    [/^(\d+) años · (.+)$/, (_, n, position) => `${n} years old · ${EN[position] || position}`],
    [/^(Portero|Lateral derecho|Defensa central|Lateral izquierdo|Mediocentro defensivo|Mediocentro|Mediapunta|Extremo derecho|Extremo izquierdo|Delantero centro) · (\d+) años$/, (_, position, n) => `${EN[position] || position} · ${n} years old`],
    [/^(velocidad|tiro|pase|regate|defensa|físico|portería)(, (velocidad|tiro|pase|regate|defensa|físico|portería))+$/, value => value.split(', ').map(skill => EN[skill] || skill).join(', ')],
    [/^(\d+) jugadores$/, (_, n) => `${n} players`],
    [/^(\d+) puntos$/, (_, n) => `${n} points`],
    [/^(\d+) partidos$/, (_, n) => `${n} matches`],
    [/^(\d+) goles$/, (_, n) => `${n} goals`],
    [/^(\d+) asistencias$/, (_, n) => `${n} assists`],
    [/^(\d+) asist\.$/, (_, n) => `${n} ast.`],
    [/^(\d+) avisos$/, (_, n) => `${n} alerts`],
    [/^(\d+) \/ (\d+) partidos$/, (_, played, total) => `${played} / ${total} matches`],
    [/^(\d+)\/(\d+) partidos$/, (_, played, total) => `${played}/${total} matches`],
    [/^(\d+) cantera$/, (_, n) => `${n} academy`],
    [/^(\d+) PJ$/, (_, n) => `${n} apps`],
    [/^(\d+)pts$/, (_, n) => `${n}pts`],
    [/^(\d+)\/3 promociones$/, (_, n) => `${n}/3 promotions`],
    [/^de (\d+) disponibles$/, (_, n) => `of ${n} available`],
    [/^Elige hasta (\d+) canteranos?$/, (_, n) => `Choose up to ${n} academy player${n === '1' ? '' : 's'}`],
    [/^(\d+)\/(\d+) elegidos · al completar el cupo subirán juntos$/, (_, a, b) => `${a}/${b} selected · they will be promoted together when the quota is filled`],
    [/^Subir (\d+) seleccionados?$/, (_, n) => `Promote ${n} selected`],
    [/^Modo: (.+)$/, (_, mode) => `Mode: ${EN[mode] || mode}`],
    [/^Posición: (.+)$/, (_, value) => `Position: ${value}`],
    [/^Jugadores: (\d+)$/, (_, value) => `Players: ${value}`],
    [/^Formación: (.+)$/, (_, value) => `Formation: ${value}`],
    [/^Desarrollo · (.+)$/, (_, current) => `Development · ${EN[current] || current}`],
    [/^(.+) · (\d+) titulares$/, (_, formation, count) => `${formation} · ${count} starters`],
    [/^(LOCAL|VISITANTE) · (.+)$/, (_, venue, detail) => `${EN[venue] || venue} · ${detail}`],
    [/^(POR|LD|DFC|LI|MCD|MC|MCO|ED|EI|DC) · (.+)$/, (_, position, detail) => `${EN[position] || position} · ${detail}`],
    [/^Sus cualidades principales son (.+)\.$/, (_, skills) => `Their main qualities are ${skills.split(', ').map(skill => EN[skill.charAt(0).toUpperCase() + skill.slice(1)]?.toLowerCase() || skill).join(', ')}.`],
    [/^(.+) · (Portero|Lateral derecho|Defensa central|Lateral izquierdo|Mediocentro defensivo|Mediocentro|Mediapunta|Extremo derecho|Extremo izquierdo|Delantero centro)$/, (_, club, position) => `${club} · ${EN[position] || position}`],
    [/^Transición · Árbitro (.+)$/, (_, value) => `Open play · Referee ${value}`],
    [/^(\d+)\/5 cambios$/, (_, count) => `${count}/5 substitutions`],
    [/^Lectura del partido · (.+)$/, (_, minute) => `Match reading · ${minute}`],
    [/^Aplicar Plan ([ABC])$/, (_, plan) => `Apply Plan ${plan}`],
    [/^PLAN ([ABC])$/, (_, plan) => `PLAN ${plan}`],
    [/^(POR|LD|DFC|LI|MCD|MC|MCO|ED|EI|DC|GK|RB|CB|LB|DM|CM|AM|RW|LW|ST) · MED (\d+) · confianza (\d+)$/, (_, position, overall, confidence) => `${EN[position] || position} · OVR ${overall} · confidence ${confidence}`],
    [/^Disponible · (POR|LD|DFC|LI|MCD|MC|MCO|ED|EI|DC)$/, (_, position) => `Available · ${EN[position] || position}`],
    [/^Partido equilibrado \((\d+)% de posesión\): mantén la estructura y observa dónde aparece la ventaja\.$/, (_, possession) => `Balanced match (${possession}% possession): keep your shape and watch for the advantage to emerge.`],
    [/^El rival está imponiendo el partido \((\d+)% de posesión y (.+) a puerta\): recupera control antes de acelerar\.$/, (_, possession, shots) => `The opposition is controlling the match (${possession}% possession and ${shots} on target): regain control before increasing the tempo.`],
    [/^Se añaden (\d+) minutos$/, (_, n) => `${n} minutes added`],
    [/^Fuera de juego de (.+)$/, (_, name) => `${name} is offside`],
    [/^Entra (.+) por (.+)$/, (_, incoming, outgoing) => `${incoming} replaces ${outgoing}`],
    [/^⚽ Gol de (.+)$/, (_, name) => `⚽ Goal by ${name}`],
    [/^⚽ Gol de cabeza de (.+)$/, (_, name) => `⚽ Header by ${name}`],
    [/^(.+) intercepta el pase$/, (_, name) => `${name} intercepts the pass`],
    [/^(.+) sale y atrapa el balón aéreo$/, (_, name) => `${name} comes out and claims the aerial ball`],
    [/^(.+) gana el duelo aéreo$/, (_, name) => `${name} wins the aerial duel`],
    [/^(.+) roba el balón$/, (_, name) => `${name} wins the ball`],
    [/^Falta de (.+) sobre (.+)$/, (_, defender, victim) => `${defender} fouls ${victim}`],
    [/^¡Penalti para (.+)!$/, (_, team) => `Penalty for ${team}!`],
    [/^Expulsado (.+)$/, (_, name) => `${name} is sent off`],
    [/^(.+) lanza el penalti$/, (_, name) => `${name} takes the penalty`],
    [/^(.+) dispara la falta$/, (_, name) => `${name} shoots from the free kick`],
    [/^(.+) pone el balón en juego$/, (_, name) => `${name} restarts play`],
    [/^(.+) modifica sus instrucciones(.*)$/, (_, team, suffix) => `${team} changes its instructions${suffix}`],
    [/^(.+) cambia de (.+) a (.+)$/, (_, team, from, to) => `${team} switches from ${from} to ${to}`]
  ];

  let language = 'es';
  let observer = null;
  let nativeAlert = null;
  let nativeConfirm = null;
  const localizedText = new WeakMap();

  function readLanguage() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es';
    } catch (error) {
      return 'es';
    }
  }

  function translate(value) {
    if (language !== 'en' || typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    let translated = EN[trimmed];
    if (!translated) {
      for (const [pattern, replacement] of PATTERNS) {
        if (pattern.test(trimmed)) {
          translated = trimmed.replace(pattern, replacement);
          break;
        }
      }
    }
    if (!translated || translated === trimmed) return value;
    const start = value.indexOf(trimmed);
    return `${value.slice(0, start)}${translated}${value.slice(start + trimmed.length)}`;
  }

  function translateElement(element) {
    if (!(element instanceof Element) || element.matches('script, style')) return;
    ['aria-label', 'title', 'placeholder', 'alt', 'data-help'].forEach(attribute => {
      if (element.hasAttribute(attribute)) {
        const current = element.getAttribute(attribute);
        const localized = translate(current);
        if (localized !== current) element.setAttribute(attribute, localized);
      }
    });
  }

  function localizeDOM(root = document.body) {
    if (language !== 'en' || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (localizedText.get(root) === root.nodeValue) return;
      const localized = translate(root.nodeValue);
      if (localized !== root.nodeValue) {
        root.nodeValue = localized;
        localizedText.set(root, localized);
      }
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.parentElement?.matches('script, style')) {
          if (localizedText.get(node) === node.nodeValue) {
            node = walker.nextNode();
            continue;
          }
          const localized = translate(node.nodeValue);
          if (localized !== node.nodeValue) {
            node.nodeValue = localized;
            localizedText.set(node, localized);
          }
        }
      } else {
        translateElement(node);
      }
      node = walker.nextNode();
    }
  }

  function setLanguage(nextLanguage) {
    language = nextLanguage === 'en' ? 'en' : 'es';
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // La interfaz sigue funcionando aunque el navegador bloquee la persistencia.
    }
    document.documentElement.lang = language;
    return language;
  }

  function init() {
    setLanguage(readLanguage());
    if (!observer) {
      observer = new MutationObserver(records => {
        if (language !== 'en') return;
        records.forEach(record => {
          if (record.type === 'characterData') localizeDOM(record.target);
          record.addedNodes.forEach(node => localizeDOM(node));
        });
      });
      observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    }
    if (!nativeAlert) {
      nativeAlert = window.alert.bind(window);
      nativeConfirm = window.confirm.bind(window);
      window.alert = message => nativeAlert(translate(String(message)));
      window.confirm = message => nativeConfirm(translate(String(message)));
    }
    localizeDOM(document.body);
  }

  return {
    init,
    getLanguage: () => language,
    locale: () => language === 'en' ? 'en-GB' : 'es-ES',
    setLanguage,
    t: translate,
    localizeDOM
  };
})();
