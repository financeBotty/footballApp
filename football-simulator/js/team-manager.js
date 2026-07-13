// ============================================
// GESTOR DE EQUIPOS Y PLANTILLAS
// ============================================

class TeamManager {
  constructor(teams = null) {
    this.teams = teams || DATA.initializeTeams();
    this.initializeAvailabilityData();
  }

  initializeAvailabilityData() {
    this.teams.forEach(team => {
      this.initializeTacticalIdentity(team);
      this.initializeCaptain(team);
      team.trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
      team.players.forEach(player => {
        if (player.injury) {
          const weeks = Number.isFinite(Number(player.injury.weeksRemaining))
            ? Number(player.injury.weeksRemaining)
            : Number(player.injury.matchesRemaining) || 0;
          player.injury = weeks > 0 ? {
            ...player.injury,
            weeksRemaining: weeks,
            matchesRemaining: weeks
          } : null;
        }
        player.suspensionMatches = Math.max(0, Number(player.suspensionMatches) || 0);
        player.yellowCardAccumulation = Math.max(0, Number(player.yellowCardAccumulation) || 0);
        player.trainingProgress = player.trainingProgress || {};
      });
    });
  }

  initializeCaptain(team) {
    const players = team.players || [];
    if (!players.length) return;
    const storedCaptain = players.find(player => player.id === team.captainId);
    if (storedCaptain && ['veteranía', 'calidad'].includes(team.captainReason)) return;
    const identityValue = String(team.id || team.name).split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const attribute = identityValue % 2 === 0 ? 'age' : 'overall';
    const captain = [...players].sort((a, b) => (Number(b[attribute]) || 0) - (Number(a[attribute]) || 0))[0];
    team.captainId = captain.id;
    team.captainReason = attribute === 'age' ? 'veteranía' : 'calidad';
  }

  initializeTacticalIdentity(team) {
    const isNewIdentity = !team.naturalStrategy;
    const scores = this.calculateStrategyScores(team);
    const naturalStrategy = team.naturalStrategy && DATA.TACTICAL_STRATEGIES[team.naturalStrategy]
      ? team.naturalStrategy
      : Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
    team.naturalStrategy = naturalStrategy;
    team.strategy = DATA.TACTICAL_STRATEGIES[team.strategy] ? team.strategy : naturalStrategy;
    if (isNewIdentity) {
      team.tactics = { ...team.tactics, ...DATA.TACTICAL_STRATEGIES[team.strategy] };
    }
    team.tacticalFamiliarity = this.getStrategyFamiliarity(team, team.strategy, scores);
  }

  calculateStrategyScores(team) {
    const players = team.players || [];
    const average = (list, attributes) => {
      if (!list.length) return 50;
      return list.reduce((sum, player) => sum + attributes.reduce((value, key) => value + (Number(player[key]) || 50), 0) / attributes.length, 0) / list.length;
    };
    const defenders = players.filter(player => ['CB', 'RB', 'LB'].includes(player.position));
    const midfielders = players.filter(player => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(player.position));
    const attackers = players.filter(player => ['ST', 'RW', 'LW'].includes(player.position));
    const wholeTeam = players.filter(player => player.position !== 'GK');
    const formationBonus = {
      '4-3-3': { 'Posesión': 10, 'Presión alta': 3 },
      '4-2-3-1': { 'Posesión': 12, 'Presión alta': 2 },
      '4-4-2': { 'Juego directo': 5, 'Contraataque': 3 },
      '5-3-2': { 'Bloque bajo': 12, 'Contraataque': 5 },
      '3-5-2': { 'Presión alta': 14, 'Posesión': 4 }
    }[team.formation] || {};
    return {
      'Posesión': average(midfielders, ['passing', 'dribbling']) + (formationBonus['Posesión'] || 0),
      'Presión alta': average(wholeTeam, ['stamina', 'pace', 'physical']) + (formationBonus['Presión alta'] || 0),
      'Juego directo': average(attackers, ['pace', 'shooting', 'physical']) + (formationBonus['Juego directo'] || 0),
      'Contraataque': (average(defenders, ['defending']) + average(attackers, ['pace', 'dribbling'])) / 2 + (formationBonus['Contraataque'] || 0),
      'Bloque bajo': average(defenders, ['defending', 'physical']) + (formationBonus['Bloque bajo'] || 0)
    };
  }

  getStrategyFamiliarity(team, strategy, scores = null) {
    const strategyScores = scores || this.calculateStrategyScores(team);
    const best = Math.max(...Object.values(strategyScores));
    if (strategy === team.naturalStrategy) return 100;
    return Math.max(58, Math.min(88, Math.round(82 + ((strategyScores[strategy] || 50) - best) * 1.5)));
  }

  applyStrategy(teamId, strategy) {
    const team = this.getTeam(teamId);
    const preset = DATA.TACTICAL_STRATEGIES[strategy];
    if (!team || !preset) return false;
    team.strategy = strategy;
    team.tactics = { ...team.tactics, ...preset };
    team.tacticalFamiliarity = this.getStrategyFamiliarity(team, strategy);
    return true;
  }

  getPlayerAvailability(player) {
    if (!player) return { available: false, status: 'unknown', reason: 'Jugador no encontrado' };
    if (player.injury && Number(player.injury.weeksRemaining ?? player.injury.matchesRemaining) > 0) {
      const weeks = Number(player.injury.weeksRemaining ?? player.injury.matchesRemaining);
      return {
        available: false,
        status: 'injured',
        weeksRemaining: weeks,
        matchesRemaining: weeks,
        reason: `${player.injury.diagnosis || 'Lesionado'} · ${weeks} semana${weeks === 1 ? '' : 's'}`
      };
    }
    if (Number(player.suspensionMatches) > 0) {
      return {
        available: false,
        status: 'suspended',
        matchesRemaining: Number(player.suspensionMatches),
        reason: `Sancionado · ${player.suspensionMatches} jornada${player.suspensionMatches === 1 ? '' : 's'}`
      };
    }
    if ((Number(player.fitness) || 0) < 25) {
      return { available: false, status: 'recovering', reason: 'Recuperándose · fitness insuficiente' };
    }
    return { available: true, status: 'available', reason: 'Disponible' };
  }

  isPlayerAvailable(player) {
    return this.getPlayerAvailability(player).available;
  }

  getMedicalReport(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return [];
    return team.players.map(player => ({ player, ...this.getPlayerAvailability(player) }))
      .filter(item => !item.available || item.player.yellowCardAccumulation > 0);
  }

  setTrainingPlan(teamId, focus, intensity) {
    const team = this.getTeam(teamId);
    const focuses = ['recovery', 'balanced', 'physical', 'tactical', 'technical'];
    const intensities = ['low', 'medium', 'high'];
    if (!team || !focuses.includes(focus) || !intensities.includes(intensity)) return false;
    team.trainingPlan = { focus, intensity };
    return true;
  }

  chooseAITrainingPlan(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return false;
    const averageFitness = team.players.reduce((sum, player) => sum + player.fitness, 0) / team.players.length;
    const unavailable = team.players.filter(player => !this.isPlayerAvailable(player)).length;
    if (unavailable >= 2 || averageFitness < 68) team.trainingPlan = { focus: 'recovery', intensity: 'low' };
    else if (team.overall < 75) team.trainingPlan = { focus: 'physical', intensity: 'high' };
    else team.trainingPlan = { focus: 'tactical', intensity: 'medium' };
    return true;
  }

  registerMatchConsequences(teamId, matchState, matchday) {
    if (!matchState || !matchState.players) return;
    Object.values(matchState.players).filter(state => state.teamId === teamId && state.appeared).forEach(state => {
      const player = this.getPlayer(teamId, state.id);
      if (!player) return;
      const injury = (matchState.injuries || []).find(item => item.playerId === state.id &&
        Number(item.weeksRemaining ?? item.matchesRemaining) > 0);
      if (injury) {
        const weeks = Number(injury.weeksRemaining ?? injury.matchesRemaining);
        player.injury = {
          severity: injury.severity,
          diagnosis: injury.diagnosis,
          weeksRemaining: weeks,
          matchesRemaining: weeks,
          createdMatchday: matchday
        };
      }
      if (state.redCards > 0) {
        player.suspensionMatches = Math.max(1, player.suspensionMatches || 0);
        player.suspensionCreatedMatchday = matchday;
      }
      if (state.yellowCards > 0) {
        player.yellowCardAccumulation = (player.yellowCardAccumulation || 0) + state.yellowCards;
        if (player.yellowCardAccumulation >= 5) {
          player.yellowCardAccumulation -= 5;
          player.suspensionMatches = Math.max(1, player.suspensionMatches || 0);
          player.suspensionCreatedMatchday = matchday;
        }
      }
    });
  }

  processCompletedMatchday(matchday) {
    this.teams.forEach(team => {
      this.applyTrainingPlan(team, matchday);
      team.players.forEach(player => {
        if (player.injury && player.injury.createdMatchday !== matchday) {
          const remaining = Math.max(0, Number(player.injury.weeksRemaining ?? player.injury.matchesRemaining) - 1);
          player.injury.weeksRemaining = remaining;
          player.injury.matchesRemaining = remaining;
          if (!remaining) player.injury = null;
        }
        if (player.suspensionMatches > 0 && player.suspensionCreatedMatchday !== matchday) {
          player.suspensionMatches = Math.max(0, player.suspensionMatches - 1);
        }
        if (!player.suspensionMatches) player.suspensionCreatedMatchday = null;
      });
      const selectedUnavailable = (team.startingXI || []).some(id => !this.isPlayerAvailable(this.getPlayer(team.id, id)));
      if (selectedUnavailable || this.getStartingXI(team.id).length !== 11) this.autoSelectStartingXI(team.id);
    });
  }

  applyTrainingPlan(team, matchday = null) {
    const plan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
    const factor = { low: 0.75, medium: 1, high: 1.25 }[plan.intensity] || 1;
    const recovery = { recovery: 16, balanced: 10, physical: 7, tactical: 9, technical: 9 }[plan.focus] || 10;
    const attributes = {
      physical: ['physical', 'stamina'],
      tactical: ['passing', 'defending'],
      technical: ['passing', 'dribbling', 'shooting'],
      balanced: ['passing', 'physical'],
      recovery: []
    }[plan.focus] || [];
    team.players.forEach(player => {
      player.fitness = Math.min(100, (Number(player.fitness) || 70) + recovery * factor);
      if (player.injury) return;
      attributes.forEach(attribute => {
        player.trainingProgress[attribute] = (player.trainingProgress[attribute] || 0) + 0.16 * factor;
        if (player.trainingProgress[attribute] >= 1 && player[attribute] < 99) {
          player[attribute]++;
          player.trainingProgress[attribute]--;
        }
      });
      if (plan.intensity === 'high' && player.fitness < 55 && Math.random() < 0.025) {
        player.injury = {
          severity: 'minor',
          diagnosis: 'Sobrecarga muscular',
          weeksRemaining: 1,
          matchesRemaining: 1,
          createdMatchday: matchday
        };
      }
    });
  }

  // Obtener un equipo por ID
  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId) || null;
  }

  // Obtener todos los equipos
  getAllTeams() {
    return this.teams;
  }

  // Obtener un jugador específico
  getPlayer(teamId, playerId) {
    const team = this.getTeam(teamId);
    if (!team) return null;
    return team.players.find(p => p.id === playerId) || null;
  }

  // Actualizar táctica de un equipo
  updateTactics(teamId, newTactics) {
    const team = this.getTeam(teamId);
    if (team) {
      const { strategy, ...instructions } = newTactics;
      team.tactics = { ...team.tactics, ...instructions };
      if (strategy && strategy !== team.strategy) this.applyStrategy(teamId, strategy);
      return true;
    }
    return false;
  }

  // Cambiar formación
  setFormation(teamId, formationName) {
    const team = this.getTeam(teamId);
    const formation = DATA.FORMATIONS[formationName];
    const defensiveLineSize = Number(String(formationName).split('-')[0]);
    if (!team || !formation || defensiveLineSize < 3) {
      return false;
    }
    team.formation = formationName;
    return true;
  }

  // Convierte cualquier sistema en sus tres líneas clásicas y asigna cada
  // titular al puesto que mejor encaja. La geometría depende de la formación,
  // no del nombre de la posición natural del futbolista.
  assignLineupToFormation(teamId, playerIds) {
    const team = this.getTeam(teamId);
    const formation = team ? DATA.FORMATIONS[team.formation] : null;
    if (!team || !formation) return [];
    const numbers = team.formation.split('-').map(Number);
    const defenseCount = Math.max(3, numbers[0] || 4);
    const attackCount = Math.max(1, numbers[numbers.length - 1] || 1);
    const midfieldCount = 10 - defenseCount - attackCount;
    const fieldPositions = formation.positions.slice(1);
    const slots = fieldPositions.map((position, index) => ({
      position,
      line: index < defenseCount ? 'def' : index < defenseCount + midfieldCount ? 'mid' : 'att'
    }));
    const remaining = playerIds.map(id => this.getPlayer(teamId, id)).filter(player => player && player.position !== 'GK');
    const goalkeeper = playerIds.map(id => this.getPlayer(teamId, id)).find(player => player && player.position === 'GK');
    const naturalLine = position => ['CB', 'RB', 'LB'].includes(position) ? 'def' :
      ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position) ? 'mid' : 'att';
    const sideAffinity = (playerPosition, slotPosition) => {
      const left = ['LB', 'LM', 'LW'];
      const right = ['RB', 'RM', 'RW'];
      return (left.includes(playerPosition) && left.includes(slotPosition)) ||
        (right.includes(playerPosition) && right.includes(slotPosition)) ? 18 : 0;
    };
    const roleAffinity = (playerPosition, slotPosition) => {
      const equivalents = { RM: 'RW', RW: 'RM', LM: 'LW', LW: 'LM', CDM: 'CM', CAM: 'CM' };
      return equivalents[playerPosition] === slotPosition || equivalents[slotPosition] === playerPosition ? 72 : 0;
    };
    const assignments = [];
    slots.forEach((slot, slotIndex) => {
      const linePlayers = slots.filter(item => item.line === slot.line);
      const lineIndex = slots.slice(0, slotIndex).filter(item => item.line === slot.line).length;
      const best = remaining.sort((a, b) => {
        const score = player => (player.position === slot.position ? 100 : 0) +
          roleAffinity(player.position, slot.position) +
          (naturalLine(player.position) === slot.line ? 42 : 0) + sideAffinity(player.position, slot.position) +
          (Number(player.overall) || 0) * 0.08;
        return score(b) - score(a);
      })[0];
      if (!best) return;
      remaining.splice(remaining.findIndex(player => player.id === best.id), 1);
      assignments.push({
        playerId: best.id,
        slotPosition: slot.position,
        line: slot.line,
        lineIndex,
        lineCount: linePlayers.length
      });
    });
    if (goalkeeper) assignments.unshift({
      playerId: goalkeeper.id,
      slotPosition: 'GK',
      line: 'gk',
      lineIndex: 0,
      lineCount: 1
    });
    return assignments;
  }

  // Validar alineación
  validateLineup(teamId, playersIds) {
    const team = this.getTeam(teamId);
    if (!team || playersIds.length !== 11) {
      return { valid: false, error: 'Se requieren exactamente 11 jugadores' };
    }

    // Verificar duplicados
    if (new Set(playersIds).size !== 11) {
      return { valid: false, error: 'Hay jugadores duplicados' };
    }

    // Obtener jugadores
    const selectedPlayers = playersIds.map(id => this.getPlayer(teamId, id)).filter(p => p);

    if (selectedPlayers.length !== 11) {
      return { valid: false, error: 'Algunos jugadores no existen' };
    }

    const unavailable = selectedPlayers.find(player => !this.isPlayerAvailable(player));
    if (unavailable) {
      return { valid: false, error: `${unavailable.name} no está disponible: ${this.getPlayerAvailability(unavailable).reason}` };
    }

    // Contar por posición
    const positionCounts = {};
    selectedPlayers.forEach(p => {
      positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
    });

    // Validar requisitos
    if (!positionCounts.GK || positionCounts.GK !== 1) {
      return { valid: false, error: 'Se requiere exactamente 1 portero' };
    }

    const defensePositions = ['CB', 'RB', 'LB'];
    const defenseCount = defensePositions.reduce((sum, pos) => sum + (positionCounts[pos] || 0), 0);
    if (defenseCount < 3) {
      return { valid: false, error: 'Se requieren al menos 3 defensas' };
    }

    const midfieldPositions = ['CDM', 'CM', 'CAM', 'RM', 'LM'];
    const midfieldCount = midfieldPositions.reduce((sum, pos) => sum + (positionCounts[pos] || 0), 0);
    if (midfieldCount < 2) {
      return { valid: false, error: 'Se requieren al menos 2 centrocampistas' };
    }

    const attackPositions = ['RW', 'LW', 'ST'];
    const attackCount = attackPositions.reduce((sum, pos) => sum + (positionCounts[pos] || 0), 0);
    if (attackCount < 1) {
      return { valid: false, error: 'Se requiere al menos 1 atacante' };
    }

    const assignments = this.assignLineupToFormation(teamId, playersIds);
    const naturalLine = position => defensePositions.includes(position) ? 'def' :
      midfieldPositions.includes(position) ? 'mid' : 'att';
    const equivalents = { RM: 'RW', RW: 'RM', LM: 'LW', LW: 'LM', CDM: 'CM', CAM: 'CM' };
    const misplaced = assignments.find(assignment => {
      const player = this.getPlayer(teamId, assignment.playerId);
      if (!player || assignment.line === 'gk') return false;
      return player.position !== assignment.slotPosition &&
        equivalents[player.position] !== assignment.slotPosition &&
        equivalents[assignment.slotPosition] !== player.position &&
        naturalLine(player.position) !== assignment.line;
    });
    if (misplaced) {
      const player = this.getPlayer(teamId, misplaced.playerId);
      return { valid: false, error: `${player.name} no encaja en el puesto ${misplaced.slotPosition} de la formación ${team.formation}` };
    }

    return { valid: true };
  }

  // Establecer alineación titular
  setStartingXI(teamId, playersIds) {
    const validation = this.validateLineup(teamId, playersIds);
    if (!validation.valid) {
      return validation;
    }

    const team = this.getTeam(teamId);
    if (team) {
      team.startingXI = playersIds;
      return { valid: true, success: 'Alineación establecida correctamente' };
    }
    return { valid: false, error: 'Equipo no encontrado' };
  }

  // Obtener alineación titular
  getStartingXI(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return [];
    return team.startingXI.map(id => this.getPlayer(teamId, id)).filter(player => player && this.isPlayerAvailable(player));
  }

  // Seleccionar automáticamente la mejor alineación (Fase 2 - Mejorado)
  autoSelectStartingXI(teamId) {
    const team = this.getTeam(teamId);
    if (!team) return false;

    const formation = DATA.FORMATIONS[team.formation];
    if (!formation) return false;

    // Agrupar jugadores por posición
    const playersByPosition = {};
    team.players.filter(player => this.isPlayerAvailable(player)).forEach(player => {
      if (!playersByPosition[player.position]) {
        playersByPosition[player.position] = [];
      }
      playersByPosition[player.position].push(player);
    });

    // Ordenar cada posición por overall, fitness y morale
    for (const pos in playersByPosition) {
      playersByPosition[pos].sort((a, b) => {
        const scoreA = (a.overall * 0.6) + (a.fitness * 0.25) + (a.morale * 0.15);
        const scoreB = (b.overall * 0.6) + (b.fitness * 0.25) + (b.morale * 0.15);
        return scoreB - scoreA;
      });
    }

    // Seleccionar jugadores según la formación
    const selectedIds = [];
    const formationPositions = formation.positions || [];
    const positionMap = {
      'RM': 'RW', // Mappear a posición similar si no existe
      'LM': 'LW'
    };

    for (const pos of formationPositions) {
      const targetPos = positionMap[pos] || pos;
      if (playersByPosition[targetPos] && playersByPosition[targetPos].length > 0) {
        const player = playersByPosition[targetPos].shift();
        selectedIds.push(player.id);
      }
    }

    // Si no se pueden llenar todas las posiciones, buscar alternativas
    if (selectedIds.length < 11) {
      for (const pos in playersByPosition) {
        while (playersByPosition[pos].length > 0 && selectedIds.length < 11) {
          const player = playersByPosition[pos].shift();
          if (!selectedIds.includes(player.id)) {
            selectedIds.push(player.id);
          }
        }
      }
    }

    if (selectedIds.length === 11) {
      team.startingXI = selectedIds;
      return true;
    }

    return false;
  }

  // Ordenar jugadores por criterio
  sortPlayers(teamId, criterion = 'overall') {
    const team = this.getTeam(teamId);
    if (!team) return [];

    const players = [...team.players];

    switch (criterion) {
      case 'overall':
        return players.sort((a, b) => b.overall - a.overall);
      case 'position':
        return players.sort((a, b) => a.position.localeCompare(b.position));
      case 'age':
        return players.sort((a, b) => a.age - b.age);
      case 'fitness':
        return players.sort((a, b) => b.fitness - a.fitness);
      case 'morale':
        return players.sort((a, b) => b.morale - a.morale);
      default:
        return players;
    }
  }

  // Actualizar estadísticas de jugador
  updatePlayerStats(teamId, playerId, statsUpdate) {
    const player = this.getPlayer(teamId, playerId);
    if (!player) return false;

    for (const key in statsUpdate) {
      if (key === 'fitness') {
        player.fitness = Math.max(0, Math.min(100, player.fitness + statsUpdate[key]));
      } else if (key === 'morale') {
        player.morale = Math.max(0, Math.min(100, player.morale + statsUpdate[key]));
      } else if (['goals', 'assists', 'yellowCards', 'redCards', 'matchesPlayed'].includes(key)) {
        player[key] = Math.max(0, player[key] + statsUpdate[key]);
      }
    }

    return true;
  }

  // Recuperación parcial de fitness después de un partido
  recoveryAfterMatch(teamId, playersIds) {
    playersIds.forEach(playerId => {
      const player = this.getPlayer(teamId, playerId);
      if (player) {
        // Recuperación proporcional al stamina
        const recovery = 10 + (player.stamina * 0.1);
        player.fitness = Math.min(100, player.fitness + recovery);
      }
    });
  }

  // Actualizar estadísticas del equipo
  updateTeamStats(teamId, statsUpdate) {
    const team = this.getTeam(teamId);
    if (!team) return false;

    for (const key in statsUpdate) {
      if (team.stats.hasOwnProperty(key)) {
        team.stats[key] += statsUpdate[key];
      }
    }

    return true;
  }

  // Serializar estado para guardar
  serialize() {
    return JSON.stringify(this.teams);
  }

  // Deserializar estado desde guardado
  static deserialize(data) {
    const teams = JSON.parse(data);
    const manager = new TeamManager([]);
    manager.teams = teams;
    manager.initializeAvailabilityData();
    return manager;
  }
}

// Exportar para uso en navegador
if (typeof module === 'undefined') {
  window.TeamManager = TeamManager;
}
