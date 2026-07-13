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

// Crear jugadores por equipo
function createTeamPlayers(teamId) {
  const players = [];
  let playerId = 1;

  // Porteros (2)
  for (let i = 0; i < 2; i++) {
    players.push(generatePlayer(
      `${teamId}_${String(playerId).padStart(3, '0')}`,
      getRandomName(),
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
      getRandomName(),
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
      getRandomName(),
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
      getRandomName(),
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
    description: 'Clásica y equilibrada'
  },
  '4-3-3': {
    name: '4-3-3',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CDM', 'CM', 'RW', 'ST', 'LW'],
    description: 'Ofensiva y dinámica'
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CDM', 'CAM', 'RW', 'LW', 'ST'],
    description: 'Defensiva y compacta'
  },
  '3-5-2': {
    name: '3-5-2',
    positions: ['GK', 'CB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'LB', 'ST', 'ST'],
    description: 'Arriesgada y ofensiva'
  },
  '5-3-2': {
    name: '5-3-2',
    positions: ['GK', 'RB', 'CB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'ST', 'ST'],
    description: 'Muy defensiva'
  }
};

// Tácticas por defecto
const DEFAULT_TACTICS = {
  mentality: 'Equilibrada',      // 'Muy Defensiva', 'Defensiva', 'Equilibrada', 'Ofensiva', 'Muy Ofensiva'
  pressure: 'Media',              // 'Baja', 'Media', 'Alta'
  tempo: 'Medio',                 // 'Bajo', 'Medio', 'Alto'
  width: 'Equilibrada',           // 'Estrecha', 'Equilibrada', 'Amplia'
  passStyle: 'Mixto',             // 'Corto', 'Mixto', 'Directo'
  defensiveLine: 'Media'          // 'Baja', 'Media', 'Alta'
};

// Datos de equipos (8 equipos)
const TEAMS = [
  {
    id: 'club-atletico',
    name: 'Club Atlántico',
    shortName: 'ATL',
    overall: 78,
    budget: 50000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'elite-united',
    name: 'Elite United',
    shortName: 'ELI',
    overall: 82,
    budget: 65000000,
    formation: '4-2-3-1',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'real-victoria',
    name: 'Real Victoria',
    shortName: 'RVT',
    overall: 75,
    budget: 45000000,
    formation: '4-4-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'sport-juvenil',
    name: 'Sport Juvenil',
    shortName: 'SPJ',
    overall: 71,
    budget: 35000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'dynamo-central',
    name: 'Dynamo Central',
    shortName: 'DYN',
    overall: 76,
    budget: 48000000,
    formation: '5-3-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'phoenix-power',
    name: 'Phoenix Power',
    shortName: 'PHX',
    overall: 79,
    budget: 55000000,
    formation: '4-3-3',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'titan-forces',
    name: 'Titan Forces',
    shortName: 'TIT',
    overall: 73,
    budget: 40000000,
    formation: '3-5-2',
    tactics: { ...DEFAULT_TACTICS }
  },
  {
    id: 'noble-lions',
    name: 'Noble Lions',
    shortName: 'NLN',
    overall: 77,
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
  TEAMS,
  VALID_POSITIONS,
  POSITIONS_BY_LINE,
  generatePlayer,
  getRandomName,
  createTeamPlayers,
  initializeTeams
};

// Si se ejecuta en navegador
if (typeof module === 'undefined') {
  window.DATA = DATA;
}
