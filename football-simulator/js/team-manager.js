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
      team.trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
      team.players.forEach(player => {
        player.injury = player.injury && Number(player.injury.matchesRemaining) > 0 ? player.injury : null;
        player.suspensionMatches = Math.max(0, Number(player.suspensionMatches) || 0);
        player.yellowCardAccumulation = Math.max(0, Number(player.yellowCardAccumulation) || 0);
        player.trainingProgress = player.trainingProgress || {};
      });
    });
  }

  getPlayerAvailability(player) {
    if (!player) return { available: false, status: 'unknown', reason: 'Jugador no encontrado' };
    if (player.injury && Number(player.injury.matchesRemaining) > 0) {
      return {
        available: false,
        status: 'injured',
        matchesRemaining: Number(player.injury.matchesRemaining),
        reason: `Lesionado · ${player.injury.matchesRemaining} jornada${player.injury.matchesRemaining === 1 ? '' : 's'}`
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
      const injury = (matchState.injuries || []).find(item => item.playerId === state.id && item.matchesRemaining > 0);
      if (injury) {
        player.injury = {
          severity: injury.severity,
          matchesRemaining: injury.matchesRemaining,
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
          player.injury.matchesRemaining = Math.max(0, Number(player.injury.matchesRemaining) - 1);
          if (!player.injury.matchesRemaining) player.injury = null;
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
        player.injury = { severity: 'minor', matchesRemaining: 1, createdMatchday: matchday };
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
      team.tactics = { ...team.tactics, ...newTactics };
      return true;
    }
    return false;
  }

  // Cambiar formación
  setFormation(teamId, formationName) {
    const team = this.getTeam(teamId);
    if (!team || !DATA.FORMATIONS[formationName]) {
      return false;
    }
    team.formation = formationName;
    return true;
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
