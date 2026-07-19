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
      this.initializeTeamIdentity(team);
      this.initializeTeamKits(team);
      this.initializeReserveSquad(team);
      this.initializeTacticalIdentity(team);
      this.initializeCaptain(team);
      team.tactics.situationalInstruction = team.tactics.situationalInstruction || 'Normal';
      team.activeMatchPlan = DATA.MATCH_PLANS[team.activeMatchPlan] ? team.activeMatchPlan : 'A';
      if (typeof team.tactics.pressTargetId === 'undefined') team.tactics.pressTargetId = null;
      team.trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
      team.players.forEach(player => {
        this.initializePlayerRole(player);
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

  initializeTeamIdentity(team) {
    const identity = DATA.PHILOSOPHICAL_IDENTITIES?.[team.id];
    if (!identity) return;
    team.name = identity.name;
    team.shortName = identity.shortName;
    team.current = identity.current;
    team.reserveName = identity.reserveName;
    (team.players || []).forEach(player => this.initializeThematicPlayerName(team, player));
    (team.reservePlayers || []).forEach(player => this.initializeThematicPlayerName(team, player));
  }

  initializeThematicPlayerName(team, player) {
    const firstTeamPrefix = `${team.id}_`;
    const reservePrefix = `${team.id}_filial_`;
    if (player.id.startsWith(reservePrefix)) {
      const index = Number(player.id.slice(reservePrefix.length)) - 1;
      if (Number.isInteger(index) && index >= 0) player.name = DATA.getReservePlayerName(team.id, index);
      return;
    }
    if (!player.id.startsWith(firstTeamPrefix)) return;
    const suffix = player.id.slice(firstTeamPrefix.length);
    if (!/^\d{3}$/.test(suffix)) return;
    player.name = DATA.getTeamPlayerName(team.id, Number(suffix) - 1);
  }

  initializeTeamKits(team) {
    const fallbackPalette = [
      ['#0ea5e9', '#fef08a'], ['#7c3aed', '#facc15'], ['#f8fafc', '#111827'], ['#22c55e', '#f8fafc'],
      ['#ef4444', '#1d4ed8'], ['#f97316', '#0f172a'], ['#334155', '#f8fafc'], ['#eab308', '#1e3a8a']
    ];
    const index = Math.max(0, this.teams.indexOf(team));
    const configured = DATA.TEAM_KITS?.[team.id];
    const fallback = fallbackPalette[index % fallbackPalette.length];
    team.primaryColor = configured?.primaryColor || team.primaryColor || fallback[0];
    team.alternateColor = configured?.alternateColor || team.alternateColor || fallback[1];
    team.crest = configured?.crest || team.crest || '';
  }

  initializeReserveSquad(team) {
    if (!Array.isArray(team.reservePlayers)) {
      const positions = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'RW', 'ST'];
      team.reservePlayers = positions.map((position, index) => {
        const player = DATA.generatePlayer(`${team.id}_filial_${index + 1}`, DATA.getReservePlayerName(team.id, index), 16 + (index % 5), position, 57 + (index % 9));
        player.fitness = 100;
        player.morale = 72;
        player.isAcademyPlayer = true;
        return player;
      });
    }
    team.reservePromotions = team.reservePromotions || { matchday: 0, count: 0 };
    team.reservePlayers.forEach(player => {
      player.isAcademyPlayer = true;
      this.initializePlayerRole(player);
      player.trainingProgress = player.trainingProgress || {};
      player.suspensionMatches = Math.max(0, Number(player.suspensionMatches) || 0);
      player.yellowCardAccumulation = Math.max(0, Number(player.yellowCardAccumulation) || 0);
    });
  }

  getAvailableRoles(position) {
    if (position === 'GK') return ['Portero clásico', 'Portero líbero'];
    if (position === 'CB') return ['Central marcador', 'Central con salida'];
    if (['RB', 'LB'].includes(position)) return ['Lateral equilibrado', 'Lateral ofensivo', 'Lateral defensivo'];
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position)) return ['Organizador', 'Box to box', 'Mediocentro defensivo'];
    if (['RW', 'LW'].includes(position)) return ['Extremo', 'Delantero interior'];
    return ['Delantero referencia', 'Falso nueve', 'Delantero móvil'];
  }

  getRoleSuitability(player, role) {
    if (!player || !this.getAvailableRoles(player.position).includes(role)) return 0;
    const profiles = {
      'Portero clásico': { goalkeeping: .62, physical: .14, passing: .08, overall: .16 },
      'Portero líbero': { goalkeeping: .4, passing: .24, pace: .16, dribbling: .07, overall: .13 },
      'Central marcador': { defending: .43, physical: .27, pace: .14, overall: .16 },
      'Central con salida': { defending: .28, passing: .3, dribbling: .11, physical: .12, overall: .19 },
      'Lateral equilibrado': { defending: .25, passing: .17, pace: .2, stamina: .15, physical: .08, overall: .15 },
      'Lateral ofensivo': { pace: .24, passing: .2, dribbling: .22, stamina: .13, defending: .07, overall: .14 },
      'Lateral defensivo': { defending: .4, physical: .2, pace: .12, passing: .08, overall: .2 },
      'Organizador': { passing: .4, dribbling: .18, overall: .17, stamina: .1, shooting: .06, defending: .09 },
      'Box to box': { stamina: .23, physical: .17, passing: .17, defending: .14, pace: .12, overall: .17 },
      'Mediocentro defensivo': { defending: .36, physical: .2, passing: .14, stamina: .12, overall: .18 },
      'Extremo': { pace: .28, dribbling: .28, passing: .13, shooting: .12, overall: .19 },
      'Delantero interior': { shooting: .27, dribbling: .24, pace: .15, passing: .12, overall: .22 },
      'Delantero referencia': { shooting: .34, physical: .23, dribbling: .09, pace: .09, overall: .25 },
      'Falso nueve': { passing: .23, dribbling: .23, shooting: .19, overall: .23, pace: .12 },
      'Delantero móvil': { pace: .25, dribbling: .22, shooting: .22, stamina: .1, overall: .21 }
    };
    const profile = profiles[role];
    if (!profile) return 0;
    const score = Object.entries(profile).reduce((sum, [attribute, weight]) =>
      sum + (Number(player[attribute]) || Number(player.overall) || 50) * weight, 0);
    return Math.round(Math.max(1, Math.min(99, score)));
  }

  // La media base describe al futbolista; esta media efectiva describe lo que
  // rinde en el puesto concreto que ocupa dentro del sistema.
  getEffectiveOverall(player, assignedPosition = null) {
    if (!player) return 0;
    const naturalPosition = player.position;
    const targetPosition = assignedPosition || naturalPosition;
    const baseOverall = Math.max(1, Math.min(99, Number(player.overall) || 1));
    if (targetPosition === naturalPosition) return Math.round(baseOverall);
    if ((targetPosition === 'GK') !== (naturalPosition === 'GK')) return Math.max(1, Math.round(baseOverall - 30));

    const profiles = {
      GK: { goalkeeping: .72, passing: .1, physical: .1, overall: .08 },
      CB: { defending: .4, physical: .22, pace: .13, passing: .12, overall: .23 },
      RB: { defending: .23, pace: .22, stamina: .18, passing: .14, dribbling: .1, overall: .13 },
      LB: { defending: .23, pace: .22, stamina: .18, passing: .14, dribbling: .1, overall: .13 },
      CDM: { defending: .27, passing: .22, stamina: .16, physical: .13, dribbling: .08, overall: .14 },
      CM: { passing: .28, stamina: .18, dribbling: .16, defending: .11, pace: .08, overall: .19 },
      CAM: { passing: .25, dribbling: .22, shooting: .16, pace: .09, stamina: .08, overall: .2 },
      RM: { pace: .2, passing: .19, dribbling: .2, stamina: .15, defending: .08, overall: .18 },
      LM: { pace: .2, passing: .19, dribbling: .2, stamina: .15, defending: .08, overall: .18 },
      RW: { pace: .25, dribbling: .24, shooting: .15, passing: .13, overall: .23 },
      LW: { pace: .25, dribbling: .24, shooting: .15, passing: .13, overall: .23 },
      ST: { shooting: .33, pace: .16, physical: .14, dribbling: .13, overall: .24 }
    };
    const profile = profiles[targetPosition] || { overall: 1 };
    const positionalScore = Object.entries(profile).reduce((sum, [attribute, weight]) =>
      sum + (Number(player[attribute]) || baseOverall) * weight, 0);
    const line = position => position === 'GK' ? 'gk' : ['CB', 'RB', 'LB'].includes(position) ? 'def' :
      ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position) ? 'mid' : 'att';
    const equivalents = {
      RB: ['LB', 'CB', 'RM'], LB: ['RB', 'CB', 'LM'], CB: ['RB', 'LB', 'CDM'],
      CDM: ['CM', 'CB'], CM: ['CDM', 'CAM', 'RM', 'LM'], CAM: ['CM', 'ST'],
      RM: ['RW', 'CM', 'RB'], LM: ['LW', 'CM', 'LB'],
      RW: ['RM', 'LW', 'ST'], LW: ['LM', 'RW', 'ST'], ST: ['RW', 'LW', 'CAM']
    };
    const familiar = (equivalents[targetPosition] || []).includes(naturalPosition);
    const transitionPenalty = familiar ? 0 : line(naturalPosition) === line(targetPosition) ? 2 : 6;
    let delta = Math.max(-15, Math.min(6, Math.round(positionalScore - baseOverall) - transitionPenalty));
    // Un cambio de puesto siempre debe ser legible en pantalla, incluso cuando
    // el cálculo de atributos redondearía exactamente a la misma valoración.
    if (delta === 0) delta = positionalScore > baseOverall + transitionPenalty ? 1 : -1;
    return Math.max(1, Math.min(99, Math.round(baseOverall + delta)));
  }

  getReplacementSuitability(teamId, outgoingId, candidateId, lineupIds = null) {
    const team = this.getTeam(teamId);
    const outgoing = this.getPlayer(teamId, outgoingId);
    const candidate = this.getPlayer(teamId, candidateId);
    if (!team || !outgoing || !candidate || outgoing.id === candidate.id || !this.isPlayerAvailable(candidate)) return 0;
    const ids = Array.isArray(lineupIds) && lineupIds.length ? lineupIds : team.startingXI;
    const assignment = this.assignLineupToFormation(teamId, ids).find(item => item.playerId === outgoingId);
    const targetPosition = assignment?.slotPosition || outgoing.position;
    const line = position => position === 'GK' ? 'gk' : ['CB', 'RB', 'LB'].includes(position) ? 'def' :
      ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position) ? 'mid' : 'att';
    if (targetPosition === 'GK' || candidate.position === 'GK') {
      if (targetPosition !== candidate.position) return 0;
    }
    const equivalents = {
      RM: ['RW', 'CM'], RW: ['RM', 'ST'], LM: ['LW', 'CM'], LW: ['LM', 'ST'],
      CDM: ['CM', 'CB'], CM: ['CDM', 'CAM', 'RM', 'LM'], CAM: ['CM', 'ST'],
      RB: ['LB', 'CB', 'RM'], LB: ['RB', 'CB', 'LM'], CB: ['CDM', 'RB', 'LB'], ST: ['RW', 'LW', 'CAM']
    };
    const positionFit = candidate.position === targetPosition ? 100 :
      (equivalents[targetPosition] || []).includes(candidate.position) ? 82 :
        line(candidate.position) === line(targetPosition) ? 64 : 34;
    const score = positionFit * .56 + (Number(candidate.overall) || 0) * .24 +
      (Number(candidate.fitness) || 0) * .12 + (Number(candidate.morale) || 0) * .08;
    return Math.round(Math.max(0, Math.min(99, score)));
  }

  initializePlayerRole(player) {
    const roles = this.getAvailableRoles(player.position);
    if (!roles.includes(player.role)) player.role = roles[0];
  }

  setPlayerRole(teamId, playerId, role) {
    const player = this.getPlayer(teamId, playerId);
    if (!player || !this.getAvailableRoles(player.position).includes(role)) return false;
    player.role = role;
    return true;
  }

  promoteReservePlayer(teamId, playerId, matchday) {
    const team = this.getTeam(teamId);
    if (!team) return { valid: false, error: 'Equipo no encontrado' };
    const day = Math.max(1, Number(matchday) || 1);
    if (team.reservePromotions.matchday !== day) team.reservePromotions = { matchday: day, count: 0 };
    if (team.reservePromotions.count >= 3) return { valid: false, error: 'Ya has subido tres jugadores esta jornada' };
    const index = team.reservePlayers.findIndex(player => player.id === playerId);
    if (index < 0) return { valid: false, error: 'Jugador del filial no encontrado' };
    const [player] = team.reservePlayers.splice(index, 1);
    player.isAcademyPlayer = true;
    player.promotedMatchday = day;
    player.trainingProgress = player.trainingProgress || {};
    team.players.push(player);
    team.reservePromotions.count++;
    return { valid: true, player, remaining: 3 - team.reservePromotions.count };
  }

  ensureEmergencyYouthForLineup(teamId, matchday = 1) {
    const team = this.getTeam(teamId);
    if (!team) return [];
    const promoted = [];
    const available = () => team.players.filter(player => this.isPlayerAvailable(player));
    const availableKeepers = () => available().filter(player => player.position === 'GK');
    const availableOutfield = () => available().filter(player => player.position !== 'GK');

    while ((available().length < 11 || !availableKeepers().length || availableOutfield().length < 10) && team.reservePlayers.length) {
      const needsKeeper = !availableKeepers().length;
      const candidates = team.reservePlayers
        .filter(player => this.isPlayerAvailable(player) &&
          (needsKeeper ? player.position === 'GK' : player.position !== 'GK'))
        .sort((a, b) => (Number(b.overall) || 0) - (Number(a.overall) || 0));
      const candidate = candidates[0];
      if (!candidate) break;
      team.reservePlayers.splice(team.reservePlayers.findIndex(player => player.id === candidate.id), 1);
      candidate.isAcademyPlayer = true;
      candidate.promotedMatchday = Math.max(1, Number(matchday) || 1);
      candidate.emergencyPromotion = true;
      candidate.trainingProgress = candidate.trainingProgress || {};
      this.initializePlayerRole(candidate);
      team.players.push(candidate);
      promoted.push(candidate);
    }

    if (promoted.length) {
      team.emergencyPromotions = [...(team.emergencyPromotions || []), ...promoted.map(player => ({
        playerId: player.id,
        matchday: Math.max(1, Number(matchday) || 1)
      }))];
    }
    return promoted;
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
    team.strategyExperience = team.strategyExperience || {};
    Object.keys(DATA.TACTICAL_STRATEGIES).forEach(strategy => {
      if (!Number.isFinite(team.strategyExperience[strategy])) {
        team.strategyExperience[strategy] = strategy === naturalStrategy ? 100 : this.getBaseStrategyFamiliarity(team, strategy, scores);
      }
    });
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

  getBaseStrategyFamiliarity(team, strategy, scores = null) {
    const strategyScores = scores || this.calculateStrategyScores(team);
    const best = Math.max(...Object.values(strategyScores));
    if (strategy === team.naturalStrategy) return 100;
    return Math.max(58, Math.min(88, Math.round(82 + ((strategyScores[strategy] || 50) - best) * 1.5)));
  }

  getStrategyFamiliarity(team, strategy, scores = null) {
    const stored = team.strategyExperience && Number(team.strategyExperience[strategy]);
    return Number.isFinite(stored) ? Math.max(0, Math.min(100, stored)) : this.getBaseStrategyFamiliarity(team, strategy, scores);
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

  applyMatchPlan(teamId, planId) {
    const team = this.getTeam(teamId);
    const plan = DATA.MATCH_PLANS[planId];
    if (!team || !plan) return false;
    team.activeMatchPlan = planId;
    team.tactics = { ...team.tactics, ...plan.tactics };
    return true;
  }

  getTacticalRecommendation(teamId, opponentId = null) {
    const team = this.getTeam(teamId);
    const opponent = this.getTeam(opponentId);
    if (!team) return { planId: 'A', reason: 'El plan equilibrado ofrece un punto de partida seguro.' };
    const morale = list => list.length
      ? list.reduce((sum, player) => sum + (Number(player.morale) || 0), 0) / list.length : 70;
    const difference = (Number(team.overall) || 70) - (Number(opponent?.overall) || 70);
    const moraleDifference = morale(team.players) - morale(opponent?.players || []);
    if (difference <= -4) return { planId: 'C', reason: `${opponent.name} parte con más calidad; conviene cerrar espacios y atacar con campo.` };
    if (difference >= 4 || moraleDifference >= 7) return { planId: 'B', reason: 'El equipo llega con ventaja de calidad o confianza: es un buen momento para apretar arriba.' };
    return { planId: 'A', reason: 'El duelo parece equilibrado; controlar el balón reduce riesgos innecesarios.' };
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
      const plan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
      const strategyGain = 2 + (plan.focus === 'tactical' ? 4 : plan.focus === 'balanced' ? 2 : 0) + (plan.intensity === 'high' ? 1 : 0);
      team.strategyExperience[team.strategy] = Math.min(100, this.getStrategyFamiliarity(team, team.strategy) + strategyGain);
      team.tacticalFamiliarity = team.strategyExperience[team.strategy];
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
      if (selectedUnavailable || this.getStartingXI(team.id).length !== 11) {
        this.ensureValidStartingXI(team.id, true, matchday);
      }
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

  ensureValidStartingXI(teamId, forceBest = false, matchday = 1) {
    const team = this.getTeam(teamId);
    if (!team) return { valid: false, repaired: false, error: 'Equipo no encontrado' };
    const promoted = this.ensureEmergencyYouthForLineup(teamId, matchday);
    const currentIds = Array.isArray(team.startingXI) ? team.startingXI : [];
    const current = this.validateLineup(teamId, currentIds);
    if (!forceBest && current.valid && this.getStartingXI(teamId).length === 11) {
      return { valid: true, repaired: false, promoted, players: this.getStartingXI(teamId) };
    }

    const selected = this.autoSelectStartingXI(teamId);
    const validation = this.validateLineup(teamId, team.startingXI || []);
    if (!selected || !validation.valid || this.getStartingXI(teamId).length !== 11) {
      return {
        valid: false,
        repaired: false,
        error: validation.error || 'No hay once jugadores disponibles para completar la alineación'
      };
    }
    return { valid: true, repaired: true, promoted, players: this.getStartingXI(teamId) };
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
    const configuredBands = Array.isArray(formation.bands) ? formation.bands.map(Number) : [];
    const bandCounts = configuredBands.length && configuredBands.reduce((sum, count) => sum + count, 0) === 10
      ? configuredBands
      : [defenseCount, midfieldCount, attackCount];
    const slots = fieldPositions.map((position, index) => {
      let bandStart = 0;
      let bandIndex = 0;
      for (let candidate = 0; candidate < bandCounts.length; candidate++) {
        if (index < bandStart + bandCounts[candidate]) {
          bandIndex = candidate;
          break;
        }
        bandStart += bandCounts[candidate];
      }
      return {
        position,
        line: index < defenseCount ? 'def' : index < defenseCount + midfieldCount ? 'mid' : 'att',
        visualBand: bandIndex,
        visualLineIndex: index - bandStart,
        visualLineCount: bandCounts[bandIndex],
        visualY: bandCounts.length === 1 ? 43 : 68 - (bandIndex * 50 / (bandCounts.length - 1))
      };
    });
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
        const score = player => {
          const reservedForLater = player.position !== slot.position &&
            slots.slice(slotIndex + 1).some(futureSlot => futureSlot.position === player.position) ? -120 : 0;
          return (player.position === slot.position ? 100 : 0) +
          roleAffinity(player.position, slot.position) +
          (naturalLine(player.position) === slot.line ? 42 : 0) + sideAffinity(player.position, slot.position) +
          (Number(player.overall) || 0) * 0.08 + reservedForLater;
        };
        return score(b) - score(a);
      })[0];
      if (!best) return;
      remaining.splice(remaining.findIndex(player => player.id === best.id), 1);
      assignments.push({
        playerId: best.id,
        slotPosition: slot.position,
        line: slot.line,
        lineIndex,
        lineCount: linePlayers.length,
        visualBand: slot.visualBand,
        visualLineIndex: slot.visualLineIndex,
        visualLineCount: slot.visualLineCount,
        visualY: slot.visualY
      });
    });
    if (goalkeeper) assignments.unshift({
      playerId: goalkeeper.id,
      slotPosition: 'GK',
      line: 'gk',
      lineIndex: 0,
      lineCount: 1,
      visualBand: -1,
      visualLineIndex: 0,
      visualLineCount: 1,
      visualY: 87
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

    const assignments = this.assignLineupToFormation(teamId, playersIds);
    const adapted = assignments.filter(assignment => {
      const player = this.getPlayer(teamId, assignment.playerId);
      return player && assignment.line !== 'gk' && player.position !== assignment.slotPosition;
    }).map(assignment => ({
      playerId: assignment.playerId,
      from: this.getPlayer(teamId, assignment.playerId).position,
      to: assignment.slotPosition
    }));

    return { valid: true, adapted };
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

    // Si falta un perfil exacto, completar primero la línea que tenga déficit.
    // Nunca se usa el segundo portero como relleno de una posición de campo.
    if (selectedIds.length < 11) {
      const numbers = team.formation.split('-').map(Number);
      const required = {
        def: Math.max(3, numbers[0] || 4),
        att: Math.max(1, numbers[numbers.length - 1] || 1)
      };
      required.mid = 10 - required.def - required.att;
      const lineFor = position => ['CB', 'RB', 'LB'].includes(position) ? 'def' :
        ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position) ? 'mid' : position === 'GK' ? 'gk' : 'att';
      const remaining = Object.values(playersByPosition).flat()
        .filter(player => player.position !== 'GK' && !selectedIds.includes(player.id));

      while (selectedIds.length < 11 && remaining.length) {
        const counts = { def: 0, mid: 0, att: 0 };
        selectedIds.map(id => this.getPlayer(teamId, id)).forEach(player => {
          const line = player ? lineFor(player.position) : null;
          if (line && counts[line] !== undefined) counts[line]++;
        });
        remaining.sort((a, b) => {
          const deficit = player => required[lineFor(player.position)] - counts[lineFor(player.position)];
          const score = player => deficit(player) * 1000 +
            (player.overall * 0.6) + (player.fitness * 0.25) + (player.morale * 0.15);
          return score(b) - score(a);
        });
        selectedIds.push(remaining.shift().id);
      }
    }

    if (selectedIds.length === 11 && this.validateLineup(teamId, selectedIds).valid) {
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
