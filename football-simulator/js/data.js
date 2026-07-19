// ============================================
// DATOS INICIALES - EQUIPOS Y JUGADORES
// ============================================

// Función auxiliar para generar jugadores de forma consistente
function generatePlayer(id, name, age, position, overall) {
  const baseAttributes = {
    GK: { pace: 35, shooting: 20, passing: 55, dribbling: 30, defending: 25, physical: 70, goalkeeping: 80 },
    CB: { pace: 65, shooting: 30, passing: 65, dribbling: 40, defending: 80, physical: 80, goalkeeping: 10 },
    LB: { pace: 72, shooting: 35, passing: 68, dribbling: 50, defending: 75, physical: 75, goalkeeping: 10 },
    RB: { pace: 72, shooting: 35, passing: 68, dribbling: 50, defending: 75, physical: 75, goalkeeping: 10 },
    CDM: { pace: 68, shooting: 40, passing: 75, dribbling: 60, defending: 75, physical: 78, goalkeeping: 10 },
    CM: { pace: 70, shooting: 50, passing: 80, dribbling: 70, defending: 65, physical: 75, goalkeeping: 10 },
    CAM: { pace: 75, shooting: 70, passing: 82, dribbling: 80, defending: 40, physical: 70, goalkeeping: 10 },
    RW: { pace: 82, shooting: 72, passing: 75, dribbling: 85, defending: 35, physical: 72, goalkeeping: 10 },
    LW: { pace: 82, shooting: 72, passing: 75, dribbling: 85, defending: 35, physical: 72, goalkeeping: 10 },
    ST: { pace: 80, shooting: 85, passing: 70, dribbling: 80, defending: 30, physical: 78, goalkeeping: 10 }
  };

  const attrs = baseAttributes[position] || baseAttributes.CM;
  const variance = () => (Math.random() - 0.5) * 10;

  return {
    id,
    name,
    age,
    position,
    overall: Math.max(1, Math.min(99, overall)),
    pace: Math.max(1, Math.min(99, attrs.pace + variance())),
    shooting: Math.max(1, Math.min(99, attrs.shooting + variance())),
    passing: Math.max(1, Math.min(99, attrs.passing + variance())),
    dribbling: Math.max(1, Math.min(99, attrs.dribbling + variance())),
    defending: Math.max(1, Math.min(99, attrs.defending + variance())),
    physical: Math.max(1, Math.min(99, attrs.physical + variance())),
    goalkeeping: Math.max(1, Math.min(99, attrs.goalkeeping + variance())),
    stamina: Math.max(1, Math.min(99, 65 + variance())),
    fitness: 100,
    morale: 75,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    matchesPlayed: 0
  };
}

// Nombres ficticios variados
const firstNames = [
  'Daniel', 'Sergio', 'Alberto', 'Carlos', 'José', 'Miguel', 'Francisco', 'Antonio',
  'Luis', 'Fernando', 'Javier', 'Roberto', 'Andrés', 'Pablo', 'Ricardo', 'Enrique',
  'Mateo', 'Lucas', 'Alejandro', 'David', 'Gabriel', 'Manuel', 'Guillermo', 'Raúl',
  'Ángel', 'Rodolfo', 'Víctor', 'Paulino', 'Benjamín', 'Laureano'
];

const lastNames = [
  'Romero', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez',
  'Morales', 'Vargas', 'Castillo', 'Silva', 'Torres', 'Herrera', 'Flores', 'Ramos',
  'Gómez', 'Navarro', 'Rubio', 'Vidal', 'Delgado', 'Jiménez', 'Medina', 'Ortiz',
  'Franco', 'Guerrero', 'León', 'Duarte', 'Cobo', 'Verga'
];

function getRandomName() {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

// La identidad de cada club nace de una corriente filosófica. Los nombres
// están ordenados para que cada dorsal interno conserve siempre al mismo
// pensador, aunque se cree una partida nueva.
const PHILOSOPHICAL_IDENTITIES = {
  'club-atletico': {
    name: 'Estoicos CF', shortName: 'EST', current: 'Estoicismo', reserveName: 'Homero B',
    thinkers: ['Zenón de Citio', 'Cleantes de Aso', 'Crisipo de Solos', 'Séneca', 'Epicteto', 'Marco Aurelio', 'Musonio Rufo', 'Panecio de Rodas', 'Posidonio', 'Hierocles', 'Catón de Útica', 'Junio Rústico', 'Cornuto', 'Aristón de Quíos', 'Diógenes de Babilonia', 'Antípatro de Tarso', 'Hecatón de Rodas', 'Trásea Peto'],
    poets: ['Homero', 'Safo', 'Píndaro', 'Hesíodo', 'Simónides', 'Alceo', 'Baquílides', 'Teognis']
  },
  'elite-united': {
    name: 'Academia Idealista', shortName: 'IDE', current: 'Idealismo', reserveName: 'Dante B',
    thinkers: ['Platón', 'Plotino', 'Porfirio', 'Jámblico', 'Proclo', 'San Agustín', 'San Anselmo', 'Nicolás de Cusa', 'Immanuel Kant', 'Johann Fichte', 'Friedrich Schelling', 'Georg Hegel', 'Arthur Schopenhauer', 'Francis Bradley', 'Bernard Bosanquet', 'Josiah Royce', 'Benedetto Croce', 'Ernst Cassirer'],
    poets: ['Dante Alighieri', 'William Blake', 'Novalis', 'Friedrich Hölderlin', 'John Keats', 'Percy Shelley', 'Giacomo Leopardi', 'Walt Whitman']
  },
  'real-victoria': {
    name: 'Círculo Racionalista', shortName: 'RAC', current: 'Racionalismo', reserveName: 'Sor Juana B',
    thinkers: ['René Descartes', 'Baruch Spinoza', 'Gottfried Leibniz', 'Nicolas Malebranche', 'Blaise Pascal', 'Christian Wolff', 'Antoine Arnauld', 'Arnold Geulincx', 'Anne Conway', 'Émilie du Châtelet', 'Pierre Bayle', 'Moses Mendelssohn', 'Gotthold Lessing', 'Nicolas de Condorcet', 'Bernard de Fontenelle', 'Louis de La Forge', 'Johannes Clauberg', 'François Poulain'],
    poets: ['Sor Juana Inés', 'Luis de Góngora', 'Francisco Quevedo', 'Lope de Vega', 'Calderón de la Barca', 'Molière', 'Jean Racine', 'Alexander Pope']
  },
  'sport-juvenil': {
    name: 'Jardín Epicúreo', shortName: 'EPI', current: 'Epicureísmo', reserveName: 'Horacio B',
    thinkers: ['Epicuro de Samos', 'Metrodoro de Lámpsaco', 'Hermarco de Mitilene', 'Lucrecio', 'Filodemo de Gadara', 'Zenón de Sidón', 'Demetrio de Laconia', 'Colotes de Lámpsaco', 'Polieno de Lámpsaco', 'Leontion', 'Temista de Lámpsaco', 'Idomeneo de Lámpsaco', 'Diógenes de Enoanda', 'Apolodoro de Atenas', 'Basilides de Tiro', 'Patrón de Atenas', 'Fedro de Atenas', 'Cayo Amafinio'],
    poets: ['Horacio', 'Virgilio', 'Ovidio', 'Catulo', 'Propercio', 'Tibulo', 'Marcial', 'Juvenal']
  },
  'dynamo-central': {
    name: 'Ágora Existencialista', shortName: 'EXI', current: 'Existencialismo', reserveName: 'Rilke B',
    thinkers: ['Søren Kierkegaard', 'Friedrich Nietzsche', 'Martin Heidegger', 'Jean-Paul Sartre', 'Simone de Beauvoir', 'Albert Camus', 'Karl Jaspers', 'Gabriel Marcel', 'Maurice Merleau-Ponty', 'Emmanuel Levinas', 'Miguel de Unamuno', 'José Ortega y Gasset', 'Nicola Abbagnano', 'Viktor Frankl', 'Martin Buber', 'Paul Tillich', 'Nikolái Berdiáyev', 'Lev Shestov'],
    poets: ['Rainer Maria Rilke', 'Paul Celan', 'Fernando Pessoa', 'Alejandra Pizarnik', 'Sylvia Plath', 'Cesare Pavese', 'T. S. Eliot', 'Wisława Szymborska']
  },
  'phoenix-power': {
    name: 'Unión Empirista', shortName: 'EMP', current: 'Empirismo', reserveName: 'Shakespeare B',
    thinkers: ['Francis Bacon', 'Thomas Hobbes', 'John Locke', 'George Berkeley', 'David Hume', 'Robert Boyle', 'Isaac Newton', 'David Hartley', 'Thomas Reid', 'Adam Smith', 'Jeremy Bentham', 'John Stuart Mill', 'Étienne de Condillac', 'Claude Helvétius', 'A. J. Ayer', 'Rudolf Carnap', 'Otto Neurath', 'Moritz Schlick'],
    poets: ['William Shakespeare', 'John Milton', 'William Wordsworth', 'Samuel Coleridge', 'Lord Byron', 'Emily Dickinson', 'Robert Frost', 'W. B. Yeats']
  },
  'titan-forces': {
    name: 'Deportivo Materialista', shortName: 'MAT', current: 'Materialismo', reserveName: 'Neruda B',
    thinkers: ['Leucipo de Mileto', 'Demócrito de Abdera', 'Julien de La Mettrie', 'Paul d’Holbach', 'Denis Diderot', 'Ludwig Feuerbach', 'Karl Marx', 'Friedrich Engels', 'Vladimir Lenin', 'Antonio Gramsci', 'György Lukács', 'Ernst Bloch', 'Louis Althusser', 'Walter Benjamin', 'Herbert Marcuse', 'Theodor Adorno', 'Lucio Colletti', 'Evald Iliénkov'],
    poets: ['Pablo Neruda', 'César Vallejo', 'Rafael Alberti', 'Miguel Hernández', 'Roque Dalton', 'Nicolás Guillén', 'Bertolt Brecht', 'Nazım Hikmet']
  },
  'noble-lions': {
    name: 'Ateneo Humanista', shortName: 'HUM', current: 'Humanismo', reserveName: 'Garcilaso B',
    thinkers: ['Erasmo de Róterdam', 'Pico della Mirandola', 'Tomás Moro', 'Juan Luis Vives', 'Michel de Montaigne', 'Nicolás Maquiavelo', 'Coluccio Salutati', 'Leonardo Bruni', 'Leon Battista Alberti', 'Marsilio Ficino', 'Guillaume Budé', 'Johannes Reuchlin', 'Rodolfo Agrícola', 'Pier Paolo Vergerio', 'Giannozzo Manetti', 'François Rabelais', 'Baltasar Castiglione', 'Lorenzo Valla'],
    poets: ['Garcilaso de la Vega', 'Francesco Petrarca', 'Giovanni Boccaccio', 'Pierre de Ronsard', 'Joachim du Bellay', 'Ausonio', 'Torquato Tasso', 'Ludovico Ariosto']
  }
};

function getTeamPlayerName(teamId, index) {
  return PHILOSOPHICAL_IDENTITIES[teamId]?.thinkers[index] || getRandomName();
}

function getReservePlayerName(teamId, index) {
  return PHILOSOPHICAL_IDENTITIES[teamId]?.poets[index] || getRandomName();
}

// Crear jugadores por equipo
function createTeamPlayers(teamId) {
  const players = [];
  let playerId = 1;

  // Porteros (2)
  for (let i = 0; i < 2; i++) {
    players.push(generatePlayer(
      `${teamId}_${String(playerId).padStart(3, '0')}`,
      getTeamPlayerName(teamId, playerId - 1),
      Math.floor(Math.random() * 8) + 25,
      'GK',
      Math.floor(Math.random() * 20) + 70
    ));
    playerId++;
  }

  // Defensas (6)
  const defPositions = ['CB', 'CB', 'RB', 'LB', 'CB', 'RB'];
  for (const pos of defPositions) {
    players.push(generatePlayer(
      `${teamId}_${String(playerId).padStart(3, '0')}`,
      getTeamPlayerName(teamId, playerId - 1),
      Math.floor(Math.random() * 10) + 24,
      pos,
      Math.floor(Math.random() * 18) + 68
    ));
    playerId++;
  }

  // Centrocampistas (6)
  const midPositions = ['CDM', 'CM', 'CM', 'CAM', 'CM', 'CDM'];
  for (const pos of midPositions) {
    players.push(generatePlayer(
      `${teamId}_${String(playerId).padStart(3, '0')}`,
      getTeamPlayerName(teamId, playerId - 1),
      Math.floor(Math.random() * 9) + 24,
      pos,
      Math.floor(Math.random() * 16) + 69
    ));
    playerId++;
  }

  // Delanteros (4)
  const fwdPositions = ['ST', 'RW', 'LW', 'ST'];
  for (const pos of fwdPositions) {
    players.push(generatePlayer(
      `${teamId}_${String(playerId).padStart(3, '0')}`,
      getTeamPlayerName(teamId, playerId - 1),
      Math.floor(Math.random() * 7) + 23,
      pos,
      Math.floor(Math.random() * 18) + 70
    ));
    playerId++;
  }

  return players;
}

// Configuración de formaciones
const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST', 'ST'],
    bands: [4, 4, 2],
    description: 'Clásica y equilibrada'
  },
  '4-3-3': {
    name: '4-3-3',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CDM', 'CM', 'RW', 'ST', 'LW'],
    bands: [4, 3, 3],
    description: 'Ofensiva y dinámica'
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST'],
    bands: [4, 2, 3, 1],
    description: 'Defensiva y compacta'
  },
  '4-1-4-1': {
    name: '4-1-4-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'RM', 'CM', 'CM', 'LM', 'ST'],
    bands: [4, 1, 4, 1],
    description: 'Pivote único y bloque equilibrado'
  },
  '4-3-2-1': {
    name: '4-3-2-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'CAM', 'CAM', 'ST'],
    bands: [4, 3, 2, 1],
    description: 'Árbol de Navidad y juego interior'
  },
  '4-2-2-2': {
    name: '4-2-2-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'CAM', 'ST', 'ST'],
    bands: [4, 2, 2, 2],
    description: 'Doble pivote y dos mediapuntas'
  },
  '3-5-2': {
    name: '3-5-2',
    positions: ['GK', 'CB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LB', 'ST', 'ST'],
    bands: [3, 5, 2],
    description: 'Arriesgada y ofensiva'
  },
  '3-4-3': {
    name: '3-4-3',
    positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'RW', 'ST', 'LW'],
    bands: [3, 4, 3],
    description: 'Amplitud y presión con tres atacantes'
  },
  '3-4-2-1': {
    name: '3-4-2-1',
    positions: ['GK', 'CB', 'CB', 'CB', 'RM', 'CM', 'CM', 'LM', 'CAM', 'CAM', 'ST'],
    bands: [3, 4, 2, 1],
    description: 'Carrileros y dos jugadores entre líneas'
  },
  '5-3-2': {
    name: '5-3-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'ST', 'ST'],
    bands: [5, 3, 2],
    description: 'Muy defensiva'
  },
  '5-4-1': {
    name: '5-4-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'RM', 'CM', 'CM', 'LM', 'ST'],
    bands: [5, 4, 1],
    description: 'Bloque bajo y máxima protección'
  },
  '5-2-3': {
    name: '5-2-3',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CM', 'CM', 'RW', 'ST', 'LW'],
    bands: [5, 2, 3],
    description: 'Defensa de cinco y salida con tres puntas'
  }
};

// Tácticas por defecto
const DEFAULT_TACTICS = {
  mentality: 'Equilibrada',      // 'Muy Defensiva', 'Defensiva', 'Equilibrada', 'Ofensiva', 'Muy Ofensiva'
  pressure: 'Media',              // 'Baja', 'Media', 'Alta'
  tempo: 'Medio',                 // 'Bajo', 'Medio', 'Alto'
  width: 'Equilibrada',           // 'Estrecha', 'Equilibrada', 'Amplia'
  passStyle: 'Mixto',             // 'Corto', 'Mixto', 'Directo'
  defensiveLine: 'Media',         // 'Baja', 'Media', 'Alta'
  situationalInstruction: 'Normal',
  pressTargetId: null
};

const MATCH_PLANS = {
  A: {
    id: 'A', name: 'Controlar', symbol: '●',
    description: 'Tener el balón y reducir el caos.',
    effects: ['+ posesión', '+ estabilidad', 'riesgo medio'],
    tactics: { mentality: 'Equilibrada', pressure: 'Media', tempo: 'Medio', width: 'Amplia', passStyle: 'Corto', defensiveLine: 'Media', situationalInstruction: 'Normal' }
  },
  B: {
    id: 'B', name: 'Buscar el gol', symbol: '▲',
    description: 'Acelerar, presionar arriba y asumir riesgos.',
    effects: ['+ ocasiones', '+ presión', '- energía'],
    tactics: { mentality: 'Ofensiva', pressure: 'Alta', tempo: 'Alto', width: 'Amplia', passStyle: 'Mixto', defensiveLine: 'Alta', situationalInstruction: 'Buscar el empate' }
  },
  C: {
    id: 'C', name: 'Proteger', symbol: '■',
    description: 'Cerrar espacios y salir al contraataque.',
    effects: ['+ seguridad', '+ contraataque', '- posesión'],
    tactics: { mentality: 'Defensiva', pressure: 'Baja', tempo: 'Bajo', width: 'Estrecha', passStyle: 'Directo', defensiveLine: 'Baja', situationalInstruction: 'Defender resultado' }
  }
};

const QUICK_ORDERS = [
  { value: 'Normal', label: 'Volver al plan', description: 'Cancelar la orden temporal.' },
  { value: 'Buscar el empate', label: 'Buscar el gol', description: 'Más ritmo y llegadas.' },
  { value: 'Perder tiempo', label: 'Bajar el ritmo', description: 'Dormir el partido.' },
  { value: 'Presionar rival', label: 'Presionar salida', description: 'Ahogar al poseedor.' },
  { value: 'Atacar izquierda', label: 'Atacar izquierda', description: 'Volcar el juego a esa banda.' },
  { value: 'Atacar derecha', label: 'Atacar derecha', description: 'Volcar el juego a esa banda.' },
  { value: 'Defender resultado', label: 'Cerrar el partido', description: 'Priorizar la protección.' }
];

// Identidades tácticas. Cada plantilla recibe de inicio la que mejor encaja
// con sus atributos; el entrenador puede cambiarla, con un coste de adaptación.
const TACTICAL_STRATEGIES = {
  'Posesión': {
    mentality: 'Ofensiva', pressure: 'Media', tempo: 'Medio',
    width: 'Amplia', passStyle: 'Corto', defensiveLine: 'Alta'
  },
  'Presión alta': {
    mentality: 'Ofensiva', pressure: 'Alta', tempo: 'Alto',
    width: 'Equilibrada', passStyle: 'Corto', defensiveLine: 'Alta'
  },
  'Juego directo': {
    mentality: 'Ofensiva', pressure: 'Media', tempo: 'Alto',
    width: 'Amplia', passStyle: 'Directo', defensiveLine: 'Media'
  },
  'Contraataque': {
    mentality: 'Defensiva', pressure: 'Baja', tempo: 'Alto',
    width: 'Amplia', passStyle: 'Directo', defensiveLine: 'Baja'
  },
  'Bloque bajo': {
    mentality: 'Muy Defensiva', pressure: 'Baja', tempo: 'Bajo',
    width: 'Estrecha', passStyle: 'Mixto', defensiveLine: 'Baja'
  }
};

// Cada club tiene una primera equipación exclusiva y una alternativa de alto
// contraste. El motor decide cuál usa el visitante en cada enfrentamiento.
const TEAM_KITS = {
  'club-atletico': { primaryColor: '#0ea5e9', alternateColor: '#fef08a', crest: 'assets/crests/club-atletico.svg' },
  'elite-united': { primaryColor: '#7c3aed', alternateColor: '#facc15', crest: 'assets/crests/elite-united.svg' },
  'real-victoria': { primaryColor: '#f8fafc', alternateColor: '#111827', crest: 'assets/crests/real-victoria.svg' },
  'sport-juvenil': { primaryColor: '#22c55e', alternateColor: '#f8fafc', crest: 'assets/crests/sport-juvenil.svg' },
  'dynamo-central': { primaryColor: '#ef4444', alternateColor: '#1d4ed8', crest: 'assets/crests/dynamo-central.svg' },
  'phoenix-power': { primaryColor: '#f97316', alternateColor: '#0f172a', crest: 'assets/crests/phoenix-power.svg' },
  'titan-forces': { primaryColor: '#334155', alternateColor: '#f8fafc', crest: 'assets/crests/titan-forces.svg' },
  'noble-lions': { primaryColor: '#eab308', alternateColor: '#1e3a8a', crest: 'assets/crests/noble-lions.svg' }
};

// Datos de equipos (8 equipos)
const TEAMS = [
  {
    id: 'club-atletico',
    name: PHILOSOPHICAL_IDENTITIES['club-atletico'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['club-atletico'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['club-atletico'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['club-atletico'].reserveName,
    overall: 78,
    ...TEAM_KITS['club-atletico'],
    budget: 50000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'elite-united',
    name: PHILOSOPHICAL_IDENTITIES['elite-united'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['elite-united'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['elite-united'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['elite-united'].reserveName,
    overall: 82,
    ...TEAM_KITS['elite-united'],
    budget: 65000000,
    formation: '4-2-3-1',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'real-victoria',
    name: PHILOSOPHICAL_IDENTITIES['real-victoria'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['real-victoria'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['real-victoria'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['real-victoria'].reserveName,
    overall: 75,
    ...TEAM_KITS['real-victoria'],
    budget: 45000000,
    formation: '4-4-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'sport-juvenil',
    name: PHILOSOPHICAL_IDENTITIES['sport-juvenil'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['sport-juvenil'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['sport-juvenil'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['sport-juvenil'].reserveName,
    overall: 71,
    ...TEAM_KITS['sport-juvenil'],
    budget: 35000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'dynamo-central',
    name: PHILOSOPHICAL_IDENTITIES['dynamo-central'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['dynamo-central'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['dynamo-central'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['dynamo-central'].reserveName,
    overall: 76,
    ...TEAM_KITS['dynamo-central'],
    budget: 48000000,
    formation: '5-3-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'phoenix-power',
    name: PHILOSOPHICAL_IDENTITIES['phoenix-power'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['phoenix-power'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['phoenix-power'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['phoenix-power'].reserveName,
    overall: 79,
    ...TEAM_KITS['phoenix-power'],
    budget: 55000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'titan-forces',
    name: PHILOSOPHICAL_IDENTITIES['titan-forces'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['titan-forces'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['titan-forces'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['titan-forces'].reserveName,
    overall: 73,
    ...TEAM_KITS['titan-forces'],
    budget: 40000000,
    formation: '3-5-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'noble-lions',
    name: PHILOSOPHICAL_IDENTITIES['noble-lions'].name,
    shortName: PHILOSOPHICAL_IDENTITIES['noble-lions'].shortName,
    current: PHILOSOPHICAL_IDENTITIES['noble-lions'].current,
    reserveName: PHILOSOPHICAL_IDENTITIES['noble-lions'].reserveName,
    overall: 77,
    ...TEAM_KITS['noble-lions'],
    budget: 52000000,
    formation: '4-4-2',
    tactics: { ...DEFAULT_TACTICS }
  }
];

// Generar equipos completos con jugadores
function initializeTeams() {
  return TEAMS.map(team => ({
    ...team,
    players: createTeamPlayers(team.id),
    startingXI: [], // Se rellenará después
    stats: {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }
  }));
}

// Posiciones válidas en el juego
const VALID_POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'RM', 'LM'];

// Las claves internas se mantienen para no romper partidas guardadas ni el
// motor, pero toda la interfaz utiliza nomenclatura futbolística en español.
const POSITION_LABELS = {
  GK: 'POR', RB: 'LD', CB: 'DFC', LB: 'LI', CDM: 'MCD', CM: 'MC',
  CAM: 'MCO', RW: 'ED', LW: 'EI', ST: 'DC', RM: 'MD', LM: 'MI', CF: 'SD'
};

const POSITION_NAMES = {
  GK: 'Portero', RB: 'Lateral derecho', CB: 'Defensa central', LB: 'Lateral izquierdo',
  CDM: 'Mediocentro defensivo', CM: 'Mediocentro', CAM: 'Mediapunta',
  RW: 'Extremo derecho', LW: 'Extremo izquierdo', ST: 'Delantero centro',
  RM: 'Interior derecho', LM: 'Interior izquierdo', CF: 'Segundo delantero'
};

function getPositionLabel(position, fullName = false) {
  return (fullName ? POSITION_NAMES : POSITION_LABELS)[position] || position;
}

// Posiciones por línea
const POSITIONS_BY_LINE = {
  goalkeeper: ['GK'],
  defense: ['CB', 'RB', 'LB'],
  midfield: ['CDM', 'CM', 'CAM', 'RM', 'LM'],
  attack: ['RW', 'LW', 'ST']
};

// Exportar todo para uso en otros módulos
const DATA = {
  FORMATIONS,
  DEFAULT_TACTICS,
  MATCH_PLANS,
  QUICK_ORDERS,
  TACTICAL_STRATEGIES,
  TEAM_KITS,
  PHILOSOPHICAL_IDENTITIES,
  TEAMS,
  VALID_POSITIONS,
  POSITION_LABELS,
  POSITION_NAMES,
  POSITIONS_BY_LINE,
  getPositionLabel,
  generatePlayer,
  getRandomName,
  getTeamPlayerName,
  getReservePlayerName,
  createTeamPlayers,
  initializeTeams
};

// Si se ejecuta en navegador
if (typeof module === 'undefined') {
  window.DATA = DATA;
}
