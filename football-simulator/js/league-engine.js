// ============================================
// MOTOR DE LIGA
// ============================================

class LeagueEngine {
  constructor(teamManager) {
    this.teamManager = teamManager;
    this.schedule = [];
    this.results = [];
    this.standings = [];
    this.currentMatchday = 0;
    this.totalMatchdays = 0;
    this.processedDevelopmentMatchdays = [];
    this.controlledTeamId = null;
  }

  // Generar calendario usando algoritmo round-robin
  generateSchedule() {
    const teams = this.teamManager.getAllTeams();
    const schedule = [];

    if (teams.length < 2) {
      this.schedule = [];
      this.results = [];
      this.standings = [];
      this.totalMatchdays = 0;
      this.currentMatchday = 0;
      this.processedDevelopmentMatchdays = [];
      return schedule;
    }

    // Método del círculo: cada equipo juega exactamente una vez por jornada.
    // Un marcador BYE permite que también funcione con un número impar de equipos.
    const rotation = teams.map(team => team.id);
    if (rotation.length % 2 !== 0) rotation.push(null);
    const roundsPerLeg = rotation.length - 1;

    for (let round = 0; round < roundsPerLeg; round++) {
      for (let pair = 0; pair < rotation.length / 2; pair++) {
        let homeTeam = rotation[pair];
        let awayTeam = rotation[rotation.length - 1 - pair];
        if (!homeTeam || !awayTeam) continue;

        // Alternar el primer cruce evita que el equipo fijo acumule localías.
        if (pair === 0 && round % 2 === 1) {
          [homeTeam, awayTeam] = [awayTeam, homeTeam];
        }

        schedule.push(this.createMatch(`j${round + 1}-p${pair + 1}`, round + 1, homeTeam, awayTeam));
      }

      rotation.splice(1, 0, rotation.pop());
    }

    const firstLeg = [...schedule];
    firstLeg.forEach(match => {
      schedule.push(this.createMatch(
        `${match.id}-v2`,
        match.matchday + roundsPerLeg,
        match.awayTeam,
        match.homeTeam
      ));
    });

    this.schedule = schedule;
    this.results = [];
    this.totalMatchdays = roundsPerLeg * 2;
    this.currentMatchday = schedule.length ? 1 : 0;
    this.processedDevelopmentMatchdays = [];
    return schedule;
  }

  createMatch(id, matchday, homeTeam, awayTeam) {
    return {
      id,
      matchday,
      homeTeam,
      awayTeam,
      homeGoals: null,
      awayGoals: null,
      status: 'pending',
      played: false,
      simulationType: null
    };
  }

  // Obtener próximo partido del usuario
  getNextUserMatch(userTeamId) {
    return this.schedule.find(match =>
      match.status === 'pending' &&
      (match.homeTeam === userTeamId || match.awayTeam === userTeamId)
    ) || null;
  }

  // Obtener partidos de una jornada
  getMatchdayMatches(matchday) {
    return this.schedule.filter(match => match.matchday === matchday);
  }

  // Obtener partidos pendientes de una jornada
  getPendingMatchdayMatches(matchday) {
    return this.getMatchdayMatches(matchday).filter(match => match.status === 'pending');
  }

  // Registrar resultado de un partido
  recordResult(matchId, homeGoals, awayGoals, matchData = null) {
    const match = this.schedule.find(m => m.id === matchId);
    if (!match || match.played) return false;

    homeGoals = Math.max(0, Math.floor(Number(homeGoals) || 0));
    awayGoals = Math.max(0, Math.floor(Number(awayGoals) || 0));

    match.homeGoals = homeGoals;
    match.awayGoals = awayGoals;
    match.status = 'completed';
    match.played = true;

    if (matchData) {
      match.data = matchData;
      match.simulationType = matchData.simulationType || match.simulationType;
    }

    this.results.push({
      matchId,
      homeTeamId: match.homeTeam,
      awayTeamId: match.awayTeam,
      homeGoals,
      awayGoals,
      matchday: match.matchday,
      timestamp: new Date().toISOString()
    });

    this.updateStandings();
    this.processMatchdayDevelopment(match.matchday);
    this.advanceMatchday();
    return true;
  }

  // Simulación ligera para los encuentros entre equipos controlados por la IA.
  simulateAIMatch(match) {
    if (!match || match.played) return null;
    const home = this.teamManager.getTeam(match.homeTeam);
    const away = this.teamManager.getTeam(match.awayTeam);
    if (!home || !away) return null;

    this.prepareAITeam(home, away);
    this.prepareAITeam(away, home);

    const homeStrength = this.getTeamStrength(home) + 3; // ventaja de local
    const awayStrength = this.getTeamStrength(away);
    const difference = homeStrength - awayStrength;
    const homeExpected = this.clamp(1.35 + difference * 0.035, 0.25, 3.4);
    const awayExpected = this.clamp(1.10 - difference * 0.03, 0.2, 3.1);
    const homeGoals = this.poisson(homeExpected);
    const awayGoals = this.poisson(awayExpected);

    this.updateAIPlayerStats(home, homeGoals);
    this.updateAIPlayerStats(away, awayGoals);
    this.recordResult(match.id, homeGoals, awayGoals, {
      simulationType: 'ai',
      homeStrength: Math.round(homeStrength * 10) / 10,
      awayStrength: Math.round(awayStrength * 10) / 10
    });

    return { matchId: match.id, homeGoals, awayGoals };
  }

  // Completa los partidos rivales de una jornada después del encuentro del usuario.
  simulateMatchday(matchday, userTeamId = null) {
    if (userTeamId) this.controlledTeamId = userTeamId;
    const simulated = [];
    this.getPendingMatchdayMatches(matchday).forEach(match => {
      const involvesUser = userTeamId &&
        (match.homeTeam === userTeamId || match.awayTeam === userTeamId);
      if (!involvesUser) {
        const result = this.simulateAIMatch(match);
        if (result) simulated.push(result);
      }
    });
    this.updateStandings();
    this.advanceMatchday();
    return simulated;
  }

  prepareAITeam(team, opponent) {
    if (this.teamManager.getStartingXI(team.id).length !== 11) {
      this.teamManager.autoSelectStartingXI(team.id);
    }

    const difference = (team.overall || 70) - (opponent.overall || 70);
    const mentality = difference >= 4 ? 'Ofensiva' : difference <= -4 ? 'Defensiva' : 'Equilibrada';
    team.tactics = {
      ...team.tactics,
      mentality,
      pressure: difference >= 2 ? 'Alta' : 'Media',
      tempo: difference >= 0 ? 'Alto' : 'Medio'
    };
  }

  processMatchdayDevelopment(matchday) {
    if (this.processedDevelopmentMatchdays.includes(matchday)) return false;
    const matches = this.getMatchdayMatches(matchday);
    if (!matches.length || matches.some(match => !match.played)) return false;
    this.teamManager.getAllTeams().forEach(team => {
      if (team.id !== this.controlledTeamId) this.teamManager.chooseAITrainingPlan(team.id);
    });
    matches.forEach(match => {
      [[match.homeTeam, match.homeGoals, match.awayGoals], [match.awayTeam, match.awayGoals, match.homeGoals]].forEach(([teamId, goalsFor, goalsAgainst]) => {
        const team = this.teamManager.getTeam(teamId);
        if (!team) return;
        const result = goalsFor > goalsAgainst ? 'V' : goalsFor < goalsAgainst ? 'D' : 'E';
        team.form = [...(team.form || []), result].slice(-5);
        const moraleChange = result === 'V' ? 3 : result === 'D' ? -3 : 0;
        team.players.forEach(player => { player.morale = Math.max(20, Math.min(100, (Number(player.morale) || 75) + moraleChange)); });
      });
    });
    this.teamManager.processCompletedMatchday(matchday);
    this.processedDevelopmentMatchdays.push(matchday);
    return true;
  }

  getTeamStrength(team) {
    const starters = this.teamManager.getStartingXI(team.id);
    const available = team.players.filter(player => this.teamManager.isPlayerAvailable(player));
    const squad = starters.length === 11 ? starters : available.slice(0, 11);
    if (!squad.length) return team.overall || 70;
    const playerScore = squad.reduce((sum, player) => {
      const availability = (player.injured || player.redCards > 0) ? 0.75 : 1;
      return sum + ((player.overall * 0.7) + (player.fitness * 0.2) + (player.morale * 0.1)) * availability;
    }, 0) / squad.length;
    const mentalityBonus = team.tactics.mentality === 'Ofensiva' ? 1 :
      team.tactics.mentality === 'Defensiva' ? -0.5 : 0;
    return playerScore + mentalityBonus;
  }

  updateAIPlayerStats(team, goals) {
    const starters = this.teamManager.getStartingXI(team.id);
    starters.forEach(player => {
      player.matchesPlayed = (player.matchesPlayed || 0) + 1;
      player.fitness = Math.max(55, (player.fitness || 100) - (Math.floor(Math.random() * 7) + 4));
    });

    const scorers = starters.filter(player => ['ST', 'RW', 'LW', 'CAM', 'CM'].includes(player.position));
    const assisters = starters.filter(player => player.position !== 'GK');
    for (let goal = 0; goal < goals; goal++) {
      const scorer = this.weightedPlayer(scorers.length ? scorers : starters, 'shooting');
      const assister = this.weightedPlayer(assisters, 'passing');
      if (scorer) scorer.goals = (scorer.goals || 0) + 1;
      if (assister && assister !== scorer && Math.random() < 0.78) {
        assister.assists = (assister.assists || 0) + 1;
      }
    }

    // Recuperación entre jornadas.
    team.players.forEach(player => {
      player.fitness = Math.min(100, (player.fitness || 100) + 5);
    });
  }

  weightedPlayer(players, attribute) {
    if (!players || !players.length) return null;
    const total = players.reduce((sum, player) => sum + Math.max(1, player[attribute] || player.overall), 0);
    let roll = Math.random() * total;
    for (const player of players) {
      roll -= Math.max(1, player[attribute] || player.overall);
      if (roll <= 0) return player;
    }
    return players[players.length - 1];
  }

  poisson(lambda) {
    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
      count++;
      product *= Math.random();
    } while (product > limit && count < 10);
    return count - 1;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Actualizar clasificación
  updateStandings() {
    const teams = this.teamManager.getAllTeams();
    const standings = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }));

    // Procesar todos los resultados completados
    this.schedule.forEach(match => {
      if (!match.played) return;

      const homeStanding = standings.find(s => s.teamId === match.homeTeam);
      const awayStanding = standings.find(s => s.teamId === match.awayTeam);

      if (homeStanding && awayStanding) {
        homeStanding.played++;
        awayStanding.played++;
        homeStanding.goalsFor += match.homeGoals;
        homeStanding.goalsAgainst += match.awayGoals;
        awayStanding.goalsFor += match.awayGoals;
        awayStanding.goalsAgainst += match.homeGoals;

        if (match.homeGoals > match.awayGoals) {
          homeStanding.wins++;
          homeStanding.points += 3;
          awayStanding.losses++;
        } else if (match.homeGoals < match.awayGoals) {
          awayStanding.wins++;
          awayStanding.points += 3;
          homeStanding.losses++;
        } else {
          homeStanding.draws++;
          awayStanding.draws++;
          homeStanding.points += 1;
          awayStanding.points += 1;
        }

        homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
        awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
      }
    });

    // Ordenar la tabla
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });

    this.standings = standings;
    return standings;
  }

  // Obtener posición en la tabla
  getTeamPosition(teamId) {
    const position = this.standings.findIndex(s => s.teamId === teamId);
    return position >= 0 ? position + 1 : null;
  }

  // Obtener clasificación actual
  getStandings() {
    return this.standings;
  }

  // Avanzar a siguiente jornada
  advanceMatchday() {
    // Buscar próximos partidos pendientes
    const nextPending = this.schedule.find(m => m.status === 'pending');
    if (nextPending) {
      const nextMatchday = nextPending.matchday;
      if (this.currentMatchday < nextMatchday) {
        this.currentMatchday = nextMatchday;
      }
    } else if (this.schedule.length) {
      this.currentMatchday = this.totalMatchdays;
    }
    return this.currentMatchday;
  }

  // Obtener jornada actual
  getCurrentMatchday() {
    return this.currentMatchday;
  }

  // Obtener resumen de temporada
  getSeasonSummary() {
    const completed = this.schedule.filter(m => m.played).length;
    const total = this.schedule.length;

    return {
      totalMatches: total,
      completedMatches: completed,
      remainingMatches: total - completed,
      progress: total ? (completed / total) * 100 : 0,
      currentMatchday: this.currentMatchday,
      standings: this.getStandings(),
      complete: total > 0 && completed === total,
      champion: total > 0 && completed === total ? this.standings[0] : null
    };
  }

  // Verificar si la liga está completa
  isLeagueComplete() {
    return this.schedule.length > 0 && this.schedule.every(m => m.played);
  }

  isScheduleValid() {
    const teamCount = this.teamManager.getAllTeams().length;
    if (teamCount < 2 || this.schedule.length !== teamCount * (teamCount - 1)) return false;

    const pairings = new Map();
    for (const match of this.schedule) {
      if (!match.homeTeam || !match.awayTeam || match.homeTeam === match.awayTeam) return false;
      const key = [match.homeTeam, match.awayTeam].sort().join('|');
      if (!pairings.has(key)) pairings.set(key, []);
      pairings.get(key).push(match);
    }

    return pairings.size === (teamCount * (teamCount - 1)) / 2 &&
      [...pairings.values()].every(matches =>
        matches.length === 2 && matches[0].homeTeam === matches[1].awayTeam);
  }

  migrateLegacySchedule(legacySchedule) {
    const playedMatches = legacySchedule.filter(match => match.played);
    this.generateSchedule();

    playedMatches.forEach(oldMatch => {
      let target = this.schedule.find(match => !match.played &&
        match.homeTeam === oldMatch.homeTeam && match.awayTeam === oldMatch.awayTeam);
      if (!target) {
        target = this.schedule.find(match => !match.played &&
          match.homeTeam === oldMatch.awayTeam && match.awayTeam === oldMatch.homeTeam);
        if (target) {
          this.recordResult(target.id, oldMatch.awayGoals, oldMatch.homeGoals, {
            ...(oldMatch.data || {}),
            migrated: true
          });
          return;
        }
      }
      if (target) {
        this.recordResult(target.id, oldMatch.homeGoals, oldMatch.awayGoals, {
          ...(oldMatch.data || {}),
          migrated: true
        });
      }
    });

    this.updateStandings();
    this.advanceMatchday();
  }

  // Serializar estado
  serialize() {
    return JSON.stringify({
      schedule: this.schedule,
      results: this.results,
      standings: this.standings,
      currentMatchday: this.currentMatchday,
      totalMatchdays: this.totalMatchdays,
      processedDevelopmentMatchdays: this.processedDevelopmentMatchdays,
      controlledTeamId: this.controlledTeamId
    });
  }

  // Deserializar estado
  static deserialize(data, teamManager) {
    const league = new LeagueEngine(teamManager);
    const parsed = JSON.parse(data);
    league.schedule = Array.isArray(parsed.schedule) ? parsed.schedule : [];
    league.results = Array.isArray(parsed.results) ? parsed.results : [];
    league.standings = Array.isArray(parsed.standings) ? parsed.standings : [];
    league.totalMatchdays = parsed.totalMatchdays ||
      Math.max(0, ...league.schedule.map(match => match.matchday || 0));
    league.currentMatchday = parsed.currentMatchday || (league.schedule.length ? 1 : 0);
    league.processedDevelopmentMatchdays = Array.isArray(parsed.processedDevelopmentMatchdays)
      ? parsed.processedDevelopmentMatchdays : [];
    league.controlledTeamId = parsed.controlledTeamId || null;
    if (!league.schedule.length) {
      league.generateSchedule();
    } else if (!league.isScheduleValid()) {
      league.migrateLegacySchedule(league.schedule);
    }
    league.updateStandings();
    league.advanceMatchday();
    return league;
  }
}

// Exportar para uso en navegador
if (typeof module === 'undefined') {
  window.LeagueEngine = LeagueEngine;
}
