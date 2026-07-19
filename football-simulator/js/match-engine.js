// ============================================
// MOTOR DE PARTIDO
// ============================================

class MatchEngine {
  constructor(homeTeam, awayTeam, teamManager) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.teamManager = teamManager;
    [homeTeam, awayTeam].forEach(team => {
      const lineup = this.teamManager.ensureValidStartingXI(team.id);
      if (!lineup.valid) throw new Error(`No se puede iniciar el partido: ${lineup.error}`);
    });
    
    this.matchState = {
      minute: 0,
      homeGoals: 0,
      awayGoals: 0,
      possession: 50,
      stats: {
        home: {
          shots: 0,
          shotsOnTarget: 0,
          saves: 0,
          fouls: 0,
          yellowCards: 0,
          redCards: 0,
          corners: 0,
          offsides: 0,
          passes: 0,
          tackles: 0,
          penalties: 0,
          penaltiesScored: 0
        },
        away: {
          shots: 0,
          shotsOnTarget: 0,
          saves: 0,
          fouls: 0,
          yellowCards: 0,
          redCards: 0,
          corners: 0,
          offsides: 0,
          passes: 0,
          tackles: 0,
          penalties: 0,
          penaltiesScored: 0
        }
      },
      events: [],
      playerStats: {},
      injuries: [],
      substitutions: {
        home: 0,
        away: 0
      },
      seed: this.generateMatchSeed()
    };

    this.matchState.penaltyPlan = Math.random() < 0.1 ? {
      minute: 12 + Math.floor(Math.random() * 64),
      isHome: Math.random() < 0.5,
      completed: false
    } : null;

    this.initializePlayerStats();
  }

  // Generar semilla para reproducibilidad
  generateMatchSeed() {
    return Date.now() + Math.random();
  }

  // Inicializar estadísticas de jugadores
  initializePlayerStats() {
    const homeXI = this.teamManager.getStartingXI(this.homeTeam.id);
    const awayXI = this.teamManager.getStartingXI(this.awayTeam.id);

    [...homeXI, ...awayXI].forEach(player => {
      this.matchState.playerStats[player.id] = {
        teamId: player.teamId || this.homeTeam.id,
        position: player.position,
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        tackles: 0,
        saves: 0,
        keyPasses: 0,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 0,
        rating: 6.5,
        onPitch: true
      };
    });
  }

  // Calcular fuerza ofensiva
  calculateAttackStrength(team) {
    const XI = this.teamManager.getStartingXI(team.id);
    if (XI.length === 0) return 0;

    let totalAttack = 0;
    XI.forEach(player => {
      const attackValue = (
        (player.shooting * 0.3) +
        (player.pace * 0.2) +
        (player.dribbling * 0.2) +
        (player.passing * 0.15) +
        (player.overall * 0.15)
      );
      totalAttack += attackValue;
    });

    return totalAttack / XI.length;
  }

  // Calcular fuerza defensiva
  calculateDefenseStrength(team) {
    const XI = this.teamManager.getStartingXI(team.id);
    if (XI.length === 0) return 0;

    let totalDefense = 0;
    XI.forEach(player => {
      const defenseValue = (
        (player.defending * 0.3) +
        (player.physical * 0.25) +
        (player.pace * 0.2) +
        (player.overall * 0.25)
      );
      totalDefense += defenseValue;
    });

    return totalDefense / XI.length;
  }

  // Calcular fuerza del centro del campo
  calculateMidfieldStrength(team) {
    const XI = this.teamManager.getStartingXI(team.id);
    if (XI.length === 0) return 0;

    const midfielders = XI.filter(p => 
      ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position)
    );

    if (midfielders.length === 0) return 0;

    let totalMidfield = 0;
    midfielders.forEach(player => {
      const midfieldValue = (
        (player.passing * 0.35) +
        (player.dribbling * 0.25) +
        (player.stamina * 0.2) +
        (player.overall * 0.2)
      );
      totalMidfield += midfieldValue;
    });

    return totalMidfield / midfielders.length;
  }

  // Calcular posesión
  calculatePossession(homeTeam, awayTeam, homeAdvantage = 0.02) {
    const homeMidfield = this.calculateMidfieldStrength(homeTeam);
    const awayMidfield = this.calculateMidfieldStrength(awayTeam);

    const tactics = homeTeam.tactics;
    let homeModifier = 1.0;
    let awayModifier = 1.0;

    // Modificadores por táctica
    if (tactics.passStyle === 'Corto') homeModifier += 0.05;
    if (tactics.passStyle === 'Directo') homeModifier -= 0.05;

    const totalHome = homeMidfield * homeModifier;
    const totalAway = awayMidfield * awayModifier;
    const total = totalHome + totalAway;

    if (total === 0) return 50;

    let possession = (totalHome / total) * 100;
    possession += homeAdvantage * 100;

    return Math.max(25, Math.min(75, possession));
  }

  // Calcular probabilidad de ocasión
  calculateChancesProbability(isHome, homeTeam, awayTeam) {
    const attackingTeam = isHome ? homeTeam : awayTeam;
    const defendingTeam = isHome ? awayTeam : homeTeam;

    const attack = this.calculateAttackStrength(attackingTeam);
    const defense = this.calculateDefenseStrength(defendingTeam);
    const midfield = this.calculateMidfieldStrength(attackingTeam);

    let probability = (attack / 100) * 0.4 + (midfield / 100) * 0.3 - (defense / 100) * 0.3;

    // Modificador por táctica
    const tactics = attackingTeam.tactics;
    if (tactics.mentality === 'Muy Ofensiva') probability += 0.03;
    if (tactics.mentality === 'Ofensiva') probability += 0.015;
    if (tactics.mentality === 'Muy Defensiva') probability -= 0.03;

    // Modificador por diferencia de goles
    const goalDifference = this.matchState.homeGoals - this.matchState.awayGoals;
    if (!isHome && goalDifference < 0) probability += 0.02; // Visitante necesita empatar/ganar
    if (isHome && goalDifference > 0) probability -= 0.01; // Local protege ventaja

    return Math.max(0.01, Math.min(0.1, probability));
  }

  // Simular evento en un minuto (mejorado Fase 3)
  simulateMinute(minute) {
    this.matchState.minute = minute;

    if (this.matchState.penaltyPlan && !this.matchState.penaltyPlan.completed && minute >= this.matchState.penaltyPlan.minute) {
      this.generatePenalty(this.matchState.penaltyPlan.isHome, minute);
      this.matchState.penaltyPlan.completed = true;
    }

    // Actualizar fitness y estadísticas de jugadores
    const homeXI = this.teamManager.getStartingXI(this.homeTeam.id);
    const awayXI = this.teamManager.getStartingXI(this.awayTeam.id);

    [...homeXI, ...awayXI].forEach(player => {
      const playerStats = this.matchState.playerStats[player.id];
      if (!playerStats) return;
      
      if (playerStats.onPitch) {
        // Fitness decay basado en stamina (decrece más en segunda parte)
        const fitnessLoss = (1 - player.stamina / 100) * (minute > 45 ? 0.4 : 0.3);
        player.fitness = Math.max(0, player.fitness - fitnessLoss);
        
        // Incrementar minutos jugados
        playerStats.minutesPlayed++;
        
        // Actualizar rating basado en posición y performance
        this.updatePlayerRating(player, playerStats, minute);
      }
    });

    // Actualizar posesión (más dinámica en segunda parte)
    const possessionVariance = minute > 45 ? 2 : 1.5;
    this.matchState.possession = this.calculatePossession(
      this.homeTeam,
      this.awayTeam,
      minute > 45 ? 0.01 : 0.02
    ) + (Math.random() - 0.5) * possessionVariance;
    
    this.matchState.possession = Math.max(25, Math.min(75, this.matchState.possession));

    // Calcular probabilidades de ocasión (más altas después de pauses)
    let homeChanceProb = this.calculateChancesProbability(true, this.homeTeam, this.awayTeam);
    let awayChanceProb = this.calculateChancesProbability(false, this.homeTeam, this.awayTeam);

    // Incrementar probabilidad en minutos clave
    if ([15, 30, 45, 60, 75, 89].includes(minute)) {
      homeChanceProb *= 1.3;
      awayChanceProb *= 1.3;
    }

    // Generar ocasión
    if (Math.random() < homeChanceProb) {
      this.generateChance(true, minute);
    }

    if (Math.random() < awayChanceProb) {
      this.generateChance(false, minute);
    }

    // Generar pases (estadística)
    const possProbability = this.matchState.possession / 100;
    this.matchState.stats.home.passes += Math.floor(Math.random() * 3) + (possProbability > 0.5 ? 2 : 0);
    this.matchState.stats.away.passes += Math.floor(Math.random() * 3) + (possProbability < 0.5 ? 2 : 0);

    // Generar evento menor
    if (Math.random() < 0.08) { // Más eventos ahora
      this.generateMinorEvent(minute);
    }
    
    // Posible tarjeta roja por acumulación de amarillas
    if (minute === 45 || minute === 90) {
      this.checkRedCardAccumulation();
    }
  }

  // Actualizar rating del jugador
  updatePlayerRating(player, playerStats, minute) {
    let rating = 6.0; // Base
    
    // Añadir puntos según posición y atributos
    if (player.position === 'GK') {
      rating += (player.goalkeeping / 100) * 2;
    } else if (['CB', 'RB', 'LB'].includes(player.position)) {
      rating += (player.defending / 100) * 1.5;
      rating += (player.physical / 100) * 0.5;
    } else if (['CDM', 'CM', 'CAM'].includes(player.position)) {
      rating += (player.passing / 100) * 1.5;
      rating += (player.dribbling / 100) * 0.5;
    } else if (['ST', 'RW', 'LW'].includes(player.position)) {
      rating += (player.shooting / 100) * 1.5;
      rating += (player.dribbling / 100) * 0.5;
    }
    
    // Penalty por tarjetas
    rating -= playerStats.yellowCards * 0.3;
    rating -= playerStats.redCards * 2.0;
    
    // Penalty por goles en contra (para portero)
    if (player.position === 'GK') {
      const goalsAgainst = this.matchState.homeGoals + this.matchState.awayGoals;
      rating -= goalsAgainst * 0.5;
    }
    
    // Bonus por goles y asistencias
    rating += playerStats.goals * 0.5;
    rating += playerStats.assists * 0.3;
    
    // Penalty por fitness bajo
    if (player.fitness < 30) rating -= 1.0;
    
    // Clamp rating entre 1 y 10
    playerStats.rating = Math.max(1, Math.min(10, Math.round(rating * 10) / 10));
  }

  // Verificar acumulación de tarjetas rojas
  checkRedCardAccumulation() {
    const homeXI = this.teamManager.getStartingXI(this.homeTeam.id);
    const awayXI = this.teamManager.getStartingXI(this.awayTeam.id);
    
    [...homeXI, ...awayXI].forEach(player => {
      const playerStats = this.matchState.playerStats[player.id];
      if (playerStats && playerStats.yellowCards >= 2 && playerStats.redCards === 0) {
        playerStats.redCards++;
      }
    });
  }

  // Generar ocasión de gol (mejorado Fase 3)
  generateChance(isHome, minute) {
    const shootingTeam = isHome ? this.homeTeam : this.awayTeam;
    const defendingTeam = isHome ? this.awayTeam : this.homeTeam;
    const XI = this.teamManager.getStartingXI(shootingTeam.id).filter(p => 
      this.matchState.playerStats[p.id] && this.matchState.playerStats[p.id].onPitch
    );

    // Seleccionar atacante (preferencia delanteros/extremos)
    let attackers = XI.filter(p => ['ST', 'RW', 'LW', 'CAM'].includes(p.position));
    if (attackers.length === 0) attackers = XI;
    if (attackers.length === 0) return;

    const scorer = attackers[Math.floor(Math.random() * attackers.length)];
    if (!scorer) return;

    const scorerStats = this.matchState.playerStats[scorer.id];

    // Probabilidad de tiro
    const shotProbability = (scorer.shooting / 100) * 0.8 + Math.random() * 0.2;
    if (Math.random() > shotProbability) {
      this.recordEvent(isHome, 'CHANCE_MISSED', minute, scorer.name);
      return;
    }

    scorerStats.shots++;
    this.recordEvent(isHome, 'SHOT', minute, scorer.name);
    this.matchState.stats[isHome ? 'home' : 'away'].shots++;

    // Probabilidad de tiro a puerta
    if (Math.random() < 0.6) {
      this.recordEvent(isHome, 'SHOT_ON_TARGET', minute, scorer.name);
      this.matchState.stats[isHome ? 'home' : 'away'].shotsOnTarget++;
      scorerStats.shots++; // Contar como shot on target también

      // Probabilidad de gol
      const defenseTeamGK = this.teamManager.getStartingXI(defendingTeam.id)
        .find(p => p.position === 'GK');

      if (!defenseTeamGK) return;

      const goalProbability = (scorer.shooting / 100) * 0.5 - (defenseTeamGK.goalkeeping / 100) * 0.3;

      if (Math.random() < goalProbability) {
        this.scoreGoal(isHome, minute, scorer, defenseTeamGK);
      } else {
        this.recordEvent(isHome, 'SAVE', minute, defenseTeamGK.name);
        this.matchState.stats[isHome ? 'away' : 'home'].saves++;
        this.matchState.playerStats[defenseTeamGK.id].saves++;
      }
    }
  }

  // Anotar gol
  scoreGoal(isHome, minute, scorer, goalkeeper, allowAssist = true) {
    if (isHome) {
      this.matchState.homeGoals++;
    } else {
      this.matchState.awayGoals++;
    }

    this.matchState.playerStats[scorer.id].goals++;

    // Buscar asistente
    const XI = this.teamManager.getStartingXI(isHome ? this.homeTeam.id : this.awayTeam.id);
    const passers = XI.filter(p => p.id !== scorer.id && p.passing > 70);

    if (allowAssist && passers.length > 0) {
      const assister = passers[Math.floor(Math.random() * passers.length)];
      if (assister) {
        this.matchState.playerStats[assister.id].assists++;
        this.recordEvent(isHome, 'GOAL', minute, `${scorer.name} (asistencia de ${assister.name})`);
      }
    } else {
      this.recordEvent(isHome, 'GOAL', minute, scorer.name);
    }
  }

  generatePenalty(isHome, minute) {
    const shootingTeam = isHome ? this.homeTeam : this.awayTeam;
    const defendingTeam = isHome ? this.awayTeam : this.homeTeam;
    const taker = this.teamManager.getStartingXI(shootingTeam.id)
      .filter(player => this.matchState.playerStats[player.id]?.onPitch && player.position !== 'GK')
      .sort((a, b) => (b.shooting + b.overall * .35) - (a.shooting + a.overall * .35))[0];
    const keeper = this.teamManager.getStartingXI(defendingTeam.id)
      .find(player => player.position === 'GK' && this.matchState.playerStats[player.id]?.onPitch);
    if (!taker || !keeper) return false;
    const side = isHome ? 'home' : 'away';
    this.matchState.stats[side].penalties++;
    this.matchState.stats[side].shots++;
    this.matchState.playerStats[taker.id].shots++;
    this.recordEvent(isHome, 'PENALTY_AWARDED', minute, shootingTeam.name);
    this.recordEvent(isHome, 'PENALTY', minute, taker.name);
    const goalChance = Math.max(.62, Math.min(.82,
      .72 + (taker.shooting - 75) / 350 - (keeper.goalkeeping - 75) / 500));
    const roll = Math.random();
    if (roll < goalChance) {
      this.matchState.stats[side].shotsOnTarget++;
      this.matchState.stats[side].penaltiesScored++;
      this.scoreGoal(isHome, minute, taker, keeper, false);
    } else if (roll < goalChance + .08) {
      this.recordEvent(isHome, 'POST', minute, `${taker.name} envía el penalti al poste`);
    } else {
      const defendingSide = isHome ? 'away' : 'home';
      this.matchState.stats[side].shotsOnTarget++;
      this.matchState.stats[defendingSide].saves++;
      this.matchState.playerStats[keeper.id].saves++;
      this.recordEvent(!isHome, 'SAVE', minute, `${keeper.name} detiene el penalti`);
    }
    return true;
  }

  // Generar evento menor (mejorado Fase 3)
  generateMinorEvent(minute) {
    const eventTypes = ['FOUL', 'YELLOW_CARD', 'CORNER', 'OFFSIDE', 'TACKLE', 'INJURY'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    let isHome = Math.random() > 0.5;
    const team = isHome ? this.homeTeam : this.awayTeam;
    const XI = this.teamManager.getStartingXI(team.id).filter(p => 
      this.matchState.playerStats[p.id] && this.matchState.playerStats[p.id].onPitch
    );
    const player = XI[Math.floor(Math.random() * XI.length)];

    if (!player) return;

    switch (eventType) {
      case 'FOUL':
        this.recordEvent(isHome, 'FOUL', minute, player.name);
        this.matchState.stats[isHome ? 'home' : 'away'].fouls++;
        
        // Posibilidad de tarjeta (10% si la conducta es mala)
        if (Math.random() < 0.1 && this.matchState.playerStats[player.id].yellowCards === 0) {
          this.matchState.playerStats[player.id].yellowCards++;
          this.recordEvent(isHome, 'YELLOW_CARD', minute, player.name);
          this.matchState.stats[isHome ? 'home' : 'away'].yellowCards++;
        } else if (Math.random() < 0.02 && this.matchState.playerStats[player.id].redCards === 0) {
          this.matchState.playerStats[player.id].redCards++;
          this.recordEvent(isHome, 'RED_CARD', minute, player.name);
          this.matchState.stats[isHome ? 'home' : 'away'].redCards++;
          this.handleRedCard(isHome, player, minute);
        }
        break;
        
      case 'YELLOW_CARD':
        if (this.matchState.playerStats[player.id].yellowCards < 2) {
          this.matchState.playerStats[player.id].yellowCards++;
          this.recordEvent(isHome, 'YELLOW_CARD', minute, player.name);
          this.matchState.stats[isHome ? 'home' : 'away'].yellowCards++;
          
          // Segunda tarjeta amarilla = roja
          if (this.matchState.playerStats[player.id].yellowCards === 2) {
            this.matchState.playerStats[player.id].redCards++;
            this.recordEvent(isHome, 'RED_CARD', minute, `${player.name} (segunda amarilla)`);
            this.handleRedCard(isHome, player, minute);
          }
        }
        break;
        
      case 'CORNER':
        isHome = !isHome; // El equipo que no tiene el balón hace el corner
        this.recordEvent(isHome, 'CORNER', minute, '');
        this.matchState.stats[isHome ? 'home' : 'away'].corners++;
        break;
        
      case 'OFFSIDE':
        this.recordEvent(isHome, 'OFFSIDE', minute, player.name);
        this.matchState.stats[isHome ? 'home' : 'away'].offsides++;
        break;
        
      case 'TACKLE':
        this.matchState.playerStats[player.id].tackles++;
        this.matchState.stats[isHome ? 'home' : 'away'].tackles++;
        break;
        
      case 'INJURY':
        if (Math.random() < 0.05) { // Solo 5% de probabilidad de lesión
          this.handleInjury(isHome, player, minute);
        }
        break;
    }
  }

  // Manejar tarjeta roja
  handleRedCard(isHome, player, minute) {
    this.matchState.playerStats[player.id].onPitch = false;
    const team = isHome ? this.homeTeam : this.awayTeam;
    const XI = this.teamManager.getStartingXI(team.id);
    
    // Marcar como no disponible
    const playerData = XI.find(p => p.id === player.id);
    if (playerData) playerData.fitness = 0; // Jugador expulsado no puede continuar
  }

  // Manejar lesión
  handleInjury(isHome, player, minute) {
    const team = isHome ? this.homeTeam : this.awayTeam;
    const injuryDuration = Math.floor(Math.random() * 5) + 1; // 1-5 jornadas
    
    this.matchState.injuries.push({
      player: player.name,
      team: isHome ? 'HOME' : 'AWAY',
      minute,
      duration: injuryDuration
    });
    
    this.recordEvent(isHome, 'INJURY', minute, player.name);
    
    // Hacer sustitución automática si es posible
    if (this.matchState.substitutions[isHome ? 'home' : 'away'] < 3) {
      this.handleSubstitution(isHome, player, minute);
    } else {
      this.matchState.playerStats[player.id].onPitch = false;
    }
  }

  // Manejar sustitución
  handleSubstitution(isHome, playerOut, minute) {
    const team = isHome ? this.homeTeam : this.awayTeam;
    const XI = this.teamManager.getStartingXI(team.id);
    const bench = team.players.filter(p => !XI.find(x => x.id === p.id) && p.fitness > 0);
    
    if (bench.length === 0) return;
    
    // Buscar suplente por posición similar
    const positionMatch = bench.filter(p => p.position === playerOut.position);
    const replacement = (positionMatch.length > 0 ? positionMatch : bench)[0];
    
    if (replacement) {
      this.recordEvent(isHome, 'SUBSTITUTION', minute, 
        `Entra ${replacement.name} por ${playerOut.name}`);
      this.matchState.playerStats[replacement.id] = {
        teamId: team.id,
        position: replacement.position,
        goals: 0,
        assists: 0,
        shots: 0,
        passes: 0,
        tackles: 0,
        saves: 0,
        keyPasses: 0,
        yellowCards: 0,
        redCards: 0,
        minutesPlayed: 90 - minute,
        rating: 6.5,
        onPitch: true
      };
      
      this.matchState.playerStats[playerOut.id].onPitch = false;
      this.matchState.substitutions[isHome ? 'home' : 'away']++;
    }
  }

  // Registrar evento
  recordEvent(isHome, eventType, minute, details = '') {
    const eventNarrations = {
      'CHANCE_MISSED': `${minute}' Oportunidad desperdiciada por ${details}`,
      'SHOT': `${minute}' Tiro de ${details}`,
      'SHOT_ON_TARGET': `${minute}' ¡Tiro a puerta! ${details}`,
      'SAVE': `${minute}' ¡Parada! ${details} despeja`,
      'GOAL': `${minute}' ⚽ ¡GOOOOOL! ${details}`,
      'PENALTY_AWARDED': `${minute}' ¡Penalti para ${details}!`,
      'PENALTY': `${minute}' ${details} se prepara para lanzar el penalti`,
      'POST': `${minute}' ${details}`,
      'FOUL': `${minute}' Falta cometida por ${details}`,
      'YELLOW_CARD': `${minute}' 🟨 Tarjeta amarilla a ${details}`,
      'RED_CARD': `${minute}' 🔴 Tarjeta roja a ${details}`,
      'CORNER': `${minute}' Saque de esquina`,
      'OFFSIDE': `${minute}' Fuera de juego de ${details}`,
      'START_MATCH': `${minute}' Comienza el partido`,
      'END_FIRST_HALF': `${minute}' Fin de la primera parte`,
      'START_SECOND_HALF': `${minute}' Comienza la segunda parte`,
      'END_MATCH': `${minute}' Fin del partido`,
      'INJURY': `${minute}' ⚠️ Lesión de ${details}`,
      'SUBSTITUTION': `${minute}' Cambio: ${details}`
    };

    const narration = eventNarrations[eventType] || `${minute}' Evento: ${eventType}`;

    this.matchState.events.push({
      minute,
      type: eventType,
      team: isHome ? 'HOME' : 'AWAY',
      narration,
      details
    });
  }

  // Simular partido completo
  simulateFullMatch() {
    this.recordEvent(true, 'START_MATCH', 0);

    // Primera parte (0-45 minutos)
    for (let minute = 1; minute <= 45; minute++) {
      this.simulateMinute(minute);
    }

    // Tiempo de descuento primera parte (0-3 minutos)
    const firstHalfAddedTime = Math.floor(Math.random() * 4);
    for (let minute = 46; minute <= 45 + firstHalfAddedTime; minute++) {
      this.simulateMinute(minute);
    }

    this.recordEvent(true, 'END_FIRST_HALF', 45 + firstHalfAddedTime);

    // Segunda parte (46-90 minutos)
    this.recordEvent(true, 'START_SECOND_HALF', 46 + firstHalfAddedTime);

    for (let minute = 46 + firstHalfAddedTime + 1; minute <= 90 + firstHalfAddedTime; minute++) {
      this.simulateMinute(minute);
    }

    // Tiempo de descuento segunda parte (1-6 minutos)
    const secondHalfAddedTime = Math.floor(Math.random() * 6) + 1;
    for (let minute = 91 + firstHalfAddedTime; minute <= 90 + firstHalfAddedTime + secondHalfAddedTime; minute++) {
      this.simulateMinute(minute);
    }

    this.recordEvent(true, 'END_MATCH', 90 + firstHalfAddedTime + secondHalfAddedTime);

    return this.getMatchResult();
  }

  // Obtener resultado del partido
  getMatchResult() {
    return {
      homeGoals: this.matchState.homeGoals,
      awayGoals: this.matchState.awayGoals,
      matchState: this.matchState,
      playerStats: this.matchState.playerStats,
      events: this.matchState.events
    };
  }

  // Finalizar y registrar resultado del partido
  finalizeMatch() {
    const result = this.getMatchResult();
    
    // Actualizar estadísticas de equipo
    this.updateTeamStats(true, result); // Home
    this.updateTeamStats(false, result); // Away
    
    // Actualizar estadísticas de jugador
    this.updatePlayerStats(true); // Home
    this.updatePlayerStats(false); // Away
    
    return result;
  }

  // Actualizar estadísticas del equipo
  updateTeamStats(isHome, result) {
    const team = isHome ? this.homeTeam : this.awayTeam;
    const goalsFor = isHome ? result.homeGoals : result.awayGoals;
    const goalsAgainst = isHome ? result.awayGoals : result.homeGoals;

    // Las estadísticas de liga viven en LeagueEngine; este acumulado se
    // conserva para compatibilidad con el motor y los guardados anteriores.
    team.stats = team.stats || {
      played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0
    };
    team.stats.played++;
    team.stats.goalsFor += goalsFor;
    team.stats.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      team.stats.wins++;
      team.stats.points += 3;
    } else if (goalsFor === goalsAgainst) {
      team.stats.draws++;
      team.stats.points += 1;
    } else {
      team.stats.losses++;
    }
  }

  // Actualizar estadísticas del jugador
  updatePlayerStats(isHome) {
    const team = isHome ? this.homeTeam : this.awayTeam;
    const XI = this.teamManager.getStartingXI(team.id);

    XI.forEach(player => {
      const playerStats = this.matchState.playerStats[player.id];
      if (!playerStats) return;

      // Actualizar datos de jugador
      if (playerStats.onPitch) {
        player.matchesPlayed++;
        player.goals += playerStats.goals;
        player.assists += playerStats.assists;
        
        // Actualizar fitness después del partido
        player.fitness = Math.max(30, player.fitness - (100 - player.stamina) * 0.5);
      }

      // Penalidad moral por tarjetas
      if (playerStats.yellowCards > 0) {
        player.morale = Math.max(0, player.morale - playerStats.yellowCards * 5);
      }
      
      if (playerStats.redCards > 0) {
        player.morale = Math.max(0, player.morale - 15);
      }
    });
  }

  // Recuperación después del partido
  recoveryAfterMatch(isHome, recoveryDays = 2) {
    const team = isHome ? this.homeTeam : this.awayTeam;
    const XI = this.teamManager.getStartingXI(team.id);

    XI.forEach(player => {
      // Recuperación de fitness
      const fitnessRecovery = Math.min(100 - player.fitness, recoveryDays * 15);
      player.fitness = Math.min(100, player.fitness + fitnessRecovery);

      // Recuperación de morale
      const moraleRecovery = Math.min(100 - player.morale, recoveryDays * 10);
      player.morale = Math.min(100, player.morale + moraleRecovery);
    });
  }

  // Serializar partido
  serialize() {
    return JSON.stringify(this.matchState);
  }
}

// Exportar para uso en navegador
if (typeof module === 'undefined') {
  window.MatchEngine = MatchEngine;
}
