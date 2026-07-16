// ============================================
// FASE 7 - MOTOR DE PARTIDO VIVO
// ============================================

class LiveMatchEngine {
  constructor(homeTeam, awayTeam, teamManager, options = {}) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.teamManager = teamManager;
    this.userTeamId = options.userTeamId || null;
    this.halfDuration = [1, 3, 5, 10].includes(Number(options.halfDuration))
      ? Number(options.halfDuration) : 3;
    this.seed = Number(options.seed) || (Date.now() % 2147483647);
    this.randomState = this.seed;
    this.committed = false;
    this.state = options.state ? options.state : this.createInitialState();
  }

  createInitialState() {
    const matchKits = this.selectMatchKits();
    const home = this.createTeamState(this.homeTeam, 'home', matchKits.home);
    const away = this.createTeamState(this.awayTeam, 'away', matchKits.away);
    const firstOwner = this.random() < 0.5 ? home.onField[8] : away.onField[8];
    const owner = firstOwner || home.onField.find(Boolean) || away.onField.find(Boolean);
    const firstHalfKickoffSide = home.onField.includes(owner) ? 'home' : 'away';
    const players = this.createPlayerStates(home, away);
    this.assignGoalkeeperKits(players, matchKits);
    const cardStrictness = 1 + Math.floor(this.random() * 10);
    const maxRedCards = cardStrictness === 10 ? 3 : cardStrictness >= 5 ? 2 : 1;
    const kickoffPlayer = players[owner];
    if (kickoffPlayer) {
      kickoffPlayer.x = kickoffPlayer.side === 'home' ? 49.2 : 50.8;
      kickoffPlayer.y = 34;
      kickoffPlayer.targetX = kickoffPlayer.x;
      kickoffPlayer.targetY = kickoffPlayer.y;
    }

    return {
      minute: 0,
      displayMinute: 0,
      half: 1,
      phase: 'KICK_OFF',
      status: 'ready',
      complete: false,
      pausedReason: null,
      score: { home: 0, away: 0 },
      hasTrailed: { home: false, away: false },
      stats: {
        home: this.emptyTeamStats(),
        away: this.emptyTeamStats()
      },
      teams: { home, away },
      players,
      ball: {
        x: 50, y: 34, state: 'controlled', ownerId: owner,
        fromX: 50, fromY: 34, targetX: 50, targetY: 34,
        progress: 1, duration: 1, receiverId: null, action: null,
        passType: 'ground', height: 0, arc: 0, controlledSince: 0
      },
      referee: {
        x: 48, y: 42, targetX: 48, targetY: 42,
        cardStrictness,
        maxRedCards
      },
      restart: null,
      events: [
        this.makeEvent('START_MATCH', 'Comienza el partido', 0),
        this.makeEvent('REFEREE_PROFILE', `Árbitro tarjetero: ${cardStrictness}/10`, 0)
      ],
      eventCursor: 0,
      injuries: [],
      requiredInjurySubstitution: null,
      decisions: [],
      lastActionMinute: 0,
      visualRevision: 0,
      possessionSide: home.onField.includes(owner) ? 'home' : 'away',
      firstHalfKickoffSide,
      secondHalfKickoffSide: firstHalfKickoffSide === 'home' ? 'away' : 'home',
      possessionChangedAt: 0,
      transitionUntil: 0,
      celebration: null,
      goalBallReturn: null,
      halfTimeTransition: null,
      animations: { substitutions: [], medical: null, captainProtest: null },
      coaches: {
        home: { side: 'home', x: 35, y: 73.5, targetX: 35, targetY: 73.5, location: 'bench', dismissed: false, nextMoveAt: 1 },
        away: { side: 'away', x: 65, y: 73.5, targetX: 65, targetY: 73.5, location: 'bench', dismissed: false, nextMoveAt: 1 }
      },
      coachDismissal: this.random() < 0.1 ? {
        side: this.random() < 0.5 ? 'home' : 'away',
        minute: 18 + Math.floor(this.random() * 68),
        completed: false
      } : null,
      addedTime: {
        firstHalf: 2 + Math.floor(this.random() * 4),
        secondHalf: 4 + Math.floor(this.random() * 5)
      },
      aiCheckpoints: []
    };
  }

  emptyTeamStats() {
    return {
      shots: 0, shotsOnTarget: 0, saves: 0, fouls: 0,
      yellowCards: 0, redCards: 0, corners: 0, offsides: 0,
      throwIns: 0, passes: 0, tackles: 0, possessionTicks: 0
    };
  }

  createTeamState(team, side, kit = null) {
    if (this.teamManager.getStartingXI(team.id).length !== 11) {
      this.teamManager.autoSelectStartingXI(team.id);
    }
    const onField = this.teamManager.getStartingXI(team.id).map(player => player.id);
    const bench = team.players
      .filter(player => !onField.includes(player.id) && this.teamManager.isPlayerAvailable(player))
      .map(player => player.id);
    const captainChoice = team.captainReason === 'veteranía' ? 'age' : 'overall';
    const designatedCaptain = onField.includes(team.captainId) ? team.players.find(player => player.id === team.captainId) : null;
    const captain = designatedCaptain || onField.map(id => team.players.find(player => player.id === id)).filter(Boolean)
      .sort((a, b) => (Number(b[captainChoice]) || 0) - (Number(a[captainChoice]) || 0))[0];
    const formationAssignments = this.teamManager.assignLineupToFormation(team.id, onField);
    return {
      teamId: team.id,
      side,
      onField,
      bench,
      usedPlayers: [...onField],
      substitutions: 0,
      tactics: { ...team.tactics },
      strategy: team.strategy,
      naturalStrategy: team.naturalStrategy,
      tacticalFamiliarity: Number(team.tacticalFamiliarity) || 100,
      captainId: captain ? captain.id : onField[0],
      captainReason: team.captainReason,
      formationAssignments,
      formation: team.formation,
      kitColor: kit?.color || team.primaryColor,
      kitType: kit?.type || 'local'
    };
  }

  selectMatchKits() {
    const homeColor = this.homeTeam.primaryColor || '#0ea5e9';
    const awayPrimary = this.awayTeam.primaryColor || '#f43f5e';
    const conflict = this.colorDistance(homeColor, awayPrimary) < 150;
    return {
      home: { color: homeColor, type: 'local' },
      away: {
        color: conflict ? (this.awayTeam.alternateColor || '#f8fafc') : awayPrimary,
        type: conflict ? 'alternativa' : 'local'
      }
    };
  }

  createPlayerStates(home, away) {
    const states = {};
    [home, away].forEach(teamState => {
      const team = this.teamManager.getTeam(teamState.teamId);
      team.players.forEach(player => {
        const onField = teamState.onField.includes(player.id);
        const anchor = this.getAnchor(player, teamState, teamState.onField);
        const formationAssignment = teamState.formationAssignments.find(item => item.playerId === player.id);
        states[player.id] = {
          id: player.id,
          teamId: team.id,
          side: teamState.side,
          name: player.name,
          number: team.players.indexOf(player) + 1,
          position: player.position,
          role: player.role,
          confidence: this.clamp(35 + (Number(player.morale) || 75) * 0.4, 35, 80),
          assignedPosition: formationAssignment ? formationAssignment.slotPosition : player.position,
          formationLine: formationAssignment ? formationAssignment.line : null,
          x: anchor.x,
          y: anchor.y,
          baseX: anchor.x,
          baseY: anchor.y,
          targetX: anchor.x,
          targetY: anchor.y,
          velocityX: 0,
          velocityY: 0,
          targetIntent: 'formation',
          onField,
          appeared: onField,
          substitutedOut: false,
          fitness: Number(player.fitness) || 100,
          yellowCards: 0,
          redCards: 0,
          injured: false,
          mustLeave: false,
          goals: 0,
          assists: 0,
          minutesPlayed: 0,
          rating: 6.5,
          actionTargetX: null,
          actionTargetY: null,
          actionTargetUntil: 0,
          lastDuelMinute: -1,
          isPressing: false,
          isCovering: false,
          isCaptain: player.id === teamState.captainId
        };
      });
    });
    return states;
  }

  getGoalkeeperPalette() {
    return [
      { name: 'verde', color: '#22c55e' },
      { name: 'amarillo', color: '#facc15' },
      { name: 'blanco', color: '#f8fafc' },
      { name: 'rojo', color: '#ef4444' },
      { name: 'azul', color: '#3b82f6' },
      { name: 'gris', color: '#94a3b8' },
      { name: 'morado', color: '#a855f7' }
    ];
  }

  colorDistance(first, second) {
    const rgb = color => {
      const value = String(color || '').replace('#', '');
      if (!/^[0-9a-f]{6}$/i.test(value)) return [0, 0, 0];
      return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
    };
    const a = rgb(first);
    const b = rgb(second);
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  assignGoalkeeperKits(players, matchKits = null) {
    const teamKitColors = matchKits
      ? [matchKits.home.color, matchKits.away.color]
      : [this.state?.teams?.home?.kitColor || this.homeTeam.primaryColor || '#0ea5e9',
        this.state?.teams?.away?.kitColor || this.awayTeam.primaryColor || '#f43f5e'];
    const palette = this.getGoalkeeperPalette();
    // Los dos porteros comparten equipación. Elegimos el color que conserva
    // mayor contraste simultáneo con las camisetas local y visitante.
    const selected = [...palette].sort((a, b) => {
      const contrast = option => Math.min(...teamKitColors.map(teamColor => this.colorDistance(option.color, teamColor)));
      return contrast(b) - contrast(a);
    })[0] || palette[5];
    ['home', 'away'].forEach(side => {
      Object.values(players).filter(player => player.side === side && player.position === 'GK').forEach(player => {
        player.goalkeeperColor = selected.color;
        player.goalkeeperColorName = selected.name;
      });
    });
  }

  getAnchor(player, teamState, lineupIds) {
    const side = teamState.side;
    const assignment = (teamState.formationAssignments || []).find(item => item.playerId === player.id);
    const fallbackLine = player.position === 'GK' ? 'gk' :
      ['CB', 'RB', 'LB'].includes(player.position) ? 'def' :
        ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(player.position) ? 'mid' : 'att';
    const line = assignment ? assignment.line : fallbackLine;
    const lineX = { gk: 6, def: 22, mid: 48, att: 74 }[line];
    const x = side === 'home' ? lineX : 100 - lineX;
    const lineIndex = assignment ? assignment.lineIndex : 0;
    const lineCount = assignment ? assignment.lineCount : 1;
    const y = line === 'gk' ? 34 : (68 / (lineCount + 1)) * (lineIndex + 1);
    return { x, y };
  }

  startMatch() {
    if (this.state.status === 'ready') {
      this.state.status = 'playing';
      this.state.phase = 'BUILD_UP';
    }
    return this.getLiveState();
  }

  getPlaybackTiming(speed = 1, logicStep = 0.05) {
    const safeSpeed = [1, 3, 5].includes(Number(speed)) ? Number(speed) : 1;
    const safeStep = Number(logicStep) > 0 ? Number(logicStep) : 0.05;
    const playbackBoost = 1.75;
    const stepsPerHalf = 45 / safeStep;
    const baseTickMs = (this.halfDuration * 60 * 1000) / stepsPerHalf;
    return {
      speed: safeSpeed,
      playbackBoost,
      logicStep: safeStep,
      baseTickMs,
      tickDelayMs: baseTickMs / (safeSpeed * playbackBoost),
      animationSeconds: baseTickMs / 1000
    };
  }

  simulateNextStep(step = 0.25, playbackSeconds = null) {
    if (this.state.complete) return this.getLiveState();
    this.state.visualRevision = (Number(this.state.visualRevision) || 0) + 1;
    const elapsedSeconds = Number.isFinite(playbackSeconds)
      ? Math.max(0, playbackSeconds)
      : (this.halfDuration * 60 * step) / 90;
    this.advanceTechnicalArea(elapsedSeconds);
    this.advanceCaptainProtest(elapsedSeconds);

    if (this.state.animations.medical) {
      this.state.status = 'playing';
      this.state.pausedReason = null;
      this.advanceMedicalAnimation(elapsedSeconds);
      return this.getLiveState();
    }
    if (this.getRequiredInjurySubstitution()) {
      this.state.status = 'paused';
      this.state.pausedReason = 'injury-substitution';
      return this.getLiveState();
    }
    if (this.state.celebration) {
      this.state.status = 'playing';
      this.state.pausedReason = null;
      this.advanceGoalCelebration(elapsedSeconds);
      return this.getLiveState();
    }
    if (this.state.goalBallReturn) {
      this.state.status = 'playing';
      this.state.pausedReason = null;
      this.advanceGoalBallReturn(elapsedSeconds);
      return this.getLiveState();
    }
    if (this.state.halfTimeTransition) {
      this.state.status = 'playing';
      this.state.pausedReason = null;
      this.advanceHalfTimeTransition(elapsedSeconds);
      return this.getLiveState();
    }

    if (this.state.status === 'ready') this.startMatch();
    this.state.status = 'playing';
    this.state.pausedReason = null;

    let clockStep = step;
    if (this.state.restart) {
      const charged = Number(this.state.restart.clockElapsed) || 0;
      clockStep = Math.min(step, Math.max(0, 0.35 - charged));
      this.state.restart.clockElapsed = charged + clockStep;
    }
    this.state.minute += clockStep;
    this.state.displayMinute = Math.ceil(this.state.minute);
    this.updateFitness(clockStep);
    this.updateTacticalTargets();
    this.moveEntities(step);
    this.advanceBall(step);
    this.runAI();
    this.maybeDismissCoach();

    // La celebración termina antes de señalar el descanso o el final.
    if (this.state.celebration) return this.getLiveState();

    if (this.state.half === 1) {
      if (this.state.minute >= 45 && !this.state.events.some(event => event.type === 'ADDED_TIME_FIRST_HALF')) {
        this.addEvent('ADDED_TIME_FIRST_HALF', `Se añaden ${this.state.addedTime.firstHalf} minutos`, 45);
      }
      if (this.state.minute >= 45 + this.state.addedTime.firstHalf) {
        this.addEvent('HALF_TIME', 'Descanso', 45, null, true);
        this.startHalfTimeTransition();
      }
    } else {
      if (this.state.minute >= 90 && !this.state.events.some(event => event.type === 'ADDED_TIME_SECOND_HALF')) {
        this.addEvent('ADDED_TIME_SECOND_HALF', `Se añaden ${this.state.addedTime.secondHalf} minutos`, 90);
      }
      if (this.state.minute >= 90 + this.state.addedTime.secondHalf) this.finishMatch();
    }
    return this.getLiveState();
  }

  resumeSecondHalf() {
    if (this.state.phase !== 'HALF_TIME') return false;
    this.state.minute = 45.01;
    this.state.displayMinute = 46;
    this.state.half = 2;
    this.state.phase = 'KICK_OFF';
    this.state.status = 'playing';
    this.state.pausedReason = null;
    this.addEvent('SECOND_HALF', 'Comienza la segunda parte', 46);
    return true;
  }

  prepareSecondHalfKickoff() {
    const kickoffSide = this.state.secondHalfKickoffSide ||
      (this.state.firstHalfKickoffSide === 'away' ? 'home' : 'away');
    return this.prepareKickoffAtCenter(kickoffSide, 45);
  }

  prepareKickoffAtCenter(kickoffSide, possessionChangedAt = this.state.minute) {
    Object.values(this.state.players).forEach(player => {
      if (!player.onField) return;
      player.x = player.baseX;
      player.y = player.baseY;
      player.targetX = player.baseX;
      player.targetY = player.baseY;
      player.actionTargetUntil = 0;
      player.isPressing = false;
      player.isCovering = false;
    });
    const kickoffPlayer = this.getKickoffPlayer(kickoffSide);
    if (kickoffPlayer) {
      kickoffPlayer.x = kickoffSide === 'home' ? 49.2 : 50.8;
      kickoffPlayer.y = 34;
      kickoffPlayer.targetX = kickoffPlayer.x;
      kickoffPlayer.targetY = kickoffPlayer.y;
    }
    this.state.restart = null;
    this.state.transitionUntil = 0;
    this.state.possessionSide = kickoffSide;
    this.state.possessionChangedAt = possessionChangedAt;
    this.state.ball = {
      ...this.state.ball,
      x: 50, y: 34, fromX: 50, fromY: 34, targetX: 50, targetY: 34,
      ownerId: kickoffPlayer ? kickoffPlayer.id : null,
      state: kickoffPlayer ? 'controlled' : 'dead',
      action: null, receiverId: null, passerId: null,
      progress: 1, height: 0, arc: 0, heldByKeeper: false, heldUntil: null
    };
    return kickoffSide;
  }

  getKickoffPlayer(kickoffSide) {
    return this.onField(kickoffSide)
      .filter(player => player.position !== 'GK' && !player.mustLeave)
      .sort((a, b) => {
        const distanceToBase = player => Math.hypot(player.baseX - 50, player.baseY - 34);
        return distanceToBase(a) - distanceToBase(b);
      })[0];
  }

  createKickoffReposition(kickoffSide) {
    const kickoffPlayer = this.getKickoffPlayer(kickoffSide);
    const origins = {};
    const targets = {};
    Object.values(this.state.players).forEach(player => {
      if (!player.onField) return;
      origins[player.id] = { x: player.x, y: player.y };
      targets[player.id] = { x: player.baseX, y: player.baseY };
      if (kickoffPlayer && player.id === kickoffPlayer.id) {
        targets[player.id] = { x: kickoffSide === 'home' ? 49.2 : 50.8, y: 34 };
      }
      player.targetX = targets[player.id].x;
      player.targetY = targets[player.id].y;
      player.velocityX = 0;
      player.velocityY = 0;
    });
    return { origins, targets, kickoffPlayerId: kickoffPlayer ? kickoffPlayer.id : null };
  }

  startHalfTimeTransition() {
    const kickoffSide = this.state.secondHalfKickoffSide ||
      (this.state.firstHalfKickoffSide === 'away' ? 'home' : 'away');
    const reposition = this.createKickoffReposition(kickoffSide);
    this.state.halfTimeTransition = {
      kickoffSide,
      elapsedSeconds: 0,
      durationSeconds: 3,
      playerOrigins: reposition.origins,
      playerTargets: reposition.targets,
      ballFromX: this.state.ball.x,
      ballFromY: this.state.ball.y,
      refereeFromX: this.state.referee.x,
      refereeFromY: this.state.referee.y
    };
    this.state.ball.ownerId = null;
    this.state.ball.state = 'returning';
    this.state.ball.action = null;
    this.state.phase = 'HALF_TIME_SETUP';
  }

  advanceHalfTimeTransition(elapsedSeconds) {
    const transition = this.state.halfTimeTransition;
    if (!transition) return;
    transition.elapsedSeconds += elapsedSeconds;
    const progress = this.clamp(transition.elapsedSeconds / transition.durationSeconds, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    Object.entries(transition.playerTargets).forEach(([playerId, target]) => {
      const player = this.state.players[playerId];
      const origin = transition.playerOrigins[playerId];
      if (!player || !player.onField || !origin) return;
      player.x = origin.x + (target.x - origin.x) * eased;
      player.y = origin.y + (target.y - origin.y) * eased;
    });
    this.state.ball.x = transition.ballFromX + (50 - transition.ballFromX) * eased;
    this.state.ball.y = transition.ballFromY + (34 - transition.ballFromY) * eased;
    this.state.referee.x = transition.refereeFromX + (50 - transition.refereeFromX) * eased;
    this.state.referee.y = transition.refereeFromY + (34 - transition.refereeFromY) * eased;
    if (progress < 1) return;
    this.state.halfTimeTransition = null;
    this.prepareSecondHalfKickoff();
    this.state.phase = 'HALF_TIME';
    this.state.pausedReason = 'half-time';
    this.state.status = 'paused';
  }

  updateFitness(step) {
    Object.values(this.state.players).forEach(state => {
      if (!state.onField || state.mustLeave) return;
      const player = this.getPlayer(state.id);
      const teamState = this.getTeamState(state.teamId);
      const pressureCost = teamState.tactics.pressure === 'Alta' ? 1.3 :
        teamState.tactics.pressure === 'Baja' ? 0.78 : 1;
      const tempoCost = teamState.tactics.tempo === 'Alto' ? 1.2 :
        teamState.tactics.tempo === 'Bajo' ? 0.84 : 1;
      const positionCost = player.position === 'GK' ? 0.36 :
        ['CM', 'CDM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'RB', 'LB'].includes(player.position) ? 1.08 :
          player.position === 'CB' ? 0.92 : 1;
      const activityCost = (state.isPressing ? 1.16 : 1) *
        (this.state.transitionUntil > this.state.minute && player.position !== 'GK' ? 1.08 : 1);
      const drainPerMinute = 0.14 + (100 - player.stamina) * 0.005;
      const adaptationCost = 1 + (100 - (teamState.tacticalFamiliarity || 100)) / 180;
      const drain = drainPerMinute * pressureCost * tempoCost * positionCost * activityCost * adaptationCost * step;
      state.fitness = Math.max(5, state.fitness - drain);
      state.minutesPlayed += step;
    });
  }

  advanceTechnicalArea(elapsedSeconds) {
    const animations = this.state.animations;
    animations.substitutions = animations.substitutions.filter(animation => {
      animation.elapsedSeconds += elapsedSeconds;
      const progress = this.clamp(animation.elapsedSeconds / animation.durationSeconds, 0, 1);
      animation.player.x = animation.fromX + (animation.toX - animation.fromX) * progress;
      animation.player.y = animation.fromY + (animation.toY - animation.fromY) * progress;
      return progress < 1;
    });

    Object.values(this.state.coaches).forEach(coach => {
      if (coach.dismissed) return;
      if (this.state.minute >= coach.nextMoveAt) {
        const center = coach.side === 'home' ? 35 : 65;
        const returnsToBench = coach.location !== 'bench' && this.random() < 0.48;
        coach.location = returnsToBench ? 'bench' : 'technical-area';
        coach.targetX = returnsToBench ? center : center + (this.random() - 0.5) * 16;
        coach.targetY = returnsToBench ? 73.5 : 69.2;
        coach.nextMoveAt = this.state.minute + 2.5 + this.random() * 5.5;
      }
      coach.x += (coach.targetX - coach.x) * Math.min(0.24, Math.max(0.03, elapsedSeconds * 0.35));
      coach.y += (coach.targetY - coach.y) * Math.min(0.24, Math.max(0.03, elapsedSeconds * 0.35));
    });
  }

  advanceCaptainProtest(elapsedSeconds) {
    const protest = this.state.animations.captainProtest;
    if (!protest) return;
    const captain = this.state.players[protest.playerId];
    if (!captain || !captain.onField) {
      this.state.animations.captainProtest = null;
      return;
    }
    protest.remainingSeconds = Math.max(0, protest.remainingSeconds - elapsedSeconds);
    const referee = this.state.referee;
    const sideOffset = captain.side === 'home' ? -2.2 : 2.2;
    captain.targetX = this.clamp(referee.x + sideOffset, 2, 98);
    captain.targetY = this.clamp(referee.y + 1.5, 2, 66);
    captain.actionTargetX = captain.targetX;
    captain.actionTargetY = captain.targetY;
    captain.actionTargetUntil = this.state.minute + 0.8;
    const movement = Math.min(0.3, Math.max(0.05, elapsedSeconds * 0.3));
    captain.x += (captain.targetX - captain.x) * movement;
    captain.y += (captain.targetY - captain.y) * movement;
    if (protest.remainingSeconds <= 0) this.state.animations.captainProtest = null;
  }

  maybeCaptainProtest(side, reason) {
    const teamState = this.state.teams[side];
    const captain = teamState ? this.state.players[teamState.captainId] : null;
    if (!captain || !captain.onField || this.random() >= 0.2) return false;
    const duration = 2 + this.random() * 3;
    this.state.animations.captainProtest = {
      type: 'captain-protest', side, playerId: captain.id, reason,
      durationSeconds: duration, remainingSeconds: duration
    };
    this.addEvent('CAPTAIN_PROTEST', `${captain.name}, capitán, pide explicaciones al árbitro por ${reason}`, null, side);
    return true;
  }

  advanceMedicalAnimation(elapsedSeconds) {
    const animation = this.state.animations.medical;
    if (!animation) return;
    animation.elapsedSeconds += elapsedSeconds;
    const progress = this.clamp(animation.elapsedSeconds / animation.durationSeconds, 0, 1);
    const approach = this.clamp(progress / 0.42, 0, 1);
    const exit = this.clamp((progress - 0.42) / 0.58, 0, 1);
    const exitX = animation.side === 'home' ? 42 : 58;
    const exitY = 70;
    const playerX = animation.fromX + (exitX - animation.fromX) * exit;
    const playerY = animation.fromY + (exitY - animation.fromY) * exit;
    animation.player.x = playerX;
    animation.player.y = playerY;
    animation.medics[0].x = animation.fromX - 2 + (playerX - 2 - (animation.fromX - 2)) * approach;
    animation.medics[0].y = 70 + (playerY - 70) * approach;
    animation.medics[1].x = animation.fromX + 2 + (playerX + 2 - (animation.fromX + 2)) * approach;
    animation.medics[1].y = 70 + (playerY - 70) * approach;
    if (approach >= 1) {
      animation.medics[0].x = playerX - 2;
      animation.medics[0].y = playerY;
      animation.medics[1].x = playerX + 2;
      animation.medics[1].y = playerY;
    }
    if (progress < 1) return;
    const player = this.state.players[animation.playerId];
    if (player && player.onField && !player.mustLeave) {
      player.x = player.baseX;
      player.y = player.baseY;
      player.targetX = player.baseX;
      player.targetY = player.baseY;
    } else if (player && player.onField) {
      player.x = exitX;
      player.y = 66;
      player.targetX = exitX;
      player.targetY = 66;
    }
    this.state.animations.medical = null;
  }

  addStoppageTime(minutes) {
    const key = this.state.half === 1 ? 'firstHalf' : 'secondHalf';
    const cap = this.state.half === 1 ? 12 : 18;
    this.state.addedTime[key] = Math.min(cap, this.state.addedTime[key] + minutes);
  }

  maybeDismissCoach() {
    const dismissal = this.state.coachDismissal;
    if (!dismissal || dismissal.completed || this.state.minute < dismissal.minute) return;
    dismissal.completed = true;
    this.state.coaches[dismissal.side].dismissed = true;
    const team = this.teamManager.getTeam(this.state.teams[dismissal.side].teamId);
    this.addEvent('COACH_RED_CARD', `El árbitro expulsa al entrenador de ${team.name}`, null, dismissal.side);
    this.addStoppageTime(1);
  }

  updateTacticalTargets() {
    const ball = this.state.ball;
    ['home', 'away'].forEach(side => {
      const teamState = this.state.teams[side];
      const hasBall = this.ownerSide() === side;
      const direction = side === 'home' ? 1 : -1;
      const mentality = teamState.tactics.mentality || 'Equilibrada';
      const instruction = teamState.tactics.situationalInstruction || 'Normal';
      let mentalShift = { 'Muy Defensiva': -8, 'Defensiva': -4, 'Equilibrada': 0, 'Ofensiva': 5, 'Muy Ofensiva': 9 }[mentality] || 0;
      if (instruction === 'Buscar el empate') mentalShift += 7;
      if (instruction === 'Defender resultado' || instruction === 'Perder tiempo') mentalShift -= 6;
      const width = teamState.tactics.width === 'Amplia' ? 1.2 : teamState.tactics.width === 'Estrecha' ? 0.75 : 1;
      teamState.onField.forEach(id => {
        const state = this.state.players[id];
        if (!state || !state.onField) return;
        state.isPressing = false;
        state.isCovering = false;
        state.targetIntent = 'formation';
        if (state.mustLeave) {
          state.targetX = state.side === 'home' ? 42 : 58;
          state.targetY = 66;
          return;
        }
        const player = this.getPlayer(id);
        const anchor = { x: state.baseX, y: state.baseY };
        const ballInfluence = (ball.x - 50) * 0.32;
        const defensiveLineShift = state.formationLine === 'def'
          ? teamState.tactics.defensiveLine === 'Alta' ? 6 : teamState.tactics.defensiveLine === 'Baja' ? -5 : 0
          : 0;
        state.targetX = this.clamp(anchor.x + ballInfluence + direction * (mentalShift + defensiveLineShift) + (hasBall ? direction * 6 : 0), 3, 97);
        state.targetY = this.clamp(34 + (anchor.y - 34) * width + (ball.y - 34) * 0.2, 3, 65);
        if (instruction === 'Atacar izquierda' && hasBall) state.targetY = this.clamp(state.targetY - 9, 3, 65);
        if (instruction === 'Atacar derecha' && hasBall) state.targetY = this.clamp(state.targetY + 9, 3, 65);
        if (state.role === 'Lateral ofensivo' && hasBall) state.targetX = this.clamp(state.targetX + direction * 9, 3, 97);
        if (state.role === 'Lateral defensivo') state.targetX = this.clamp(state.targetX - direction * 4, 3, 97);
        if (state.role === 'Falso nueve') state.targetX = this.clamp(state.targetX - direction * 9, 3, 97);
        if (state.role === 'Delantero referencia') state.targetX = this.clamp(state.targetX + direction * 5, 3, 97);
        if (player.position === 'GK') {
          const sweeperBonus = teamState.tactics.defensiveLine === 'Alta' ? 5 : teamState.tactics.defensiveLine === 'Baja' ? -1 : 1;
          state.targetX = side === 'home'
            ? this.clamp(5 + ball.x * 0.08 + sweeperBonus, 4, 20)
            : this.clamp(95 - (100 - ball.x) * 0.08 - sweeperBonus, 80, 96);
          state.targetY = this.clamp(34 + (ball.y - 34) * 0.35, 22, 46);
          const ballApproachingBox = ['passing', 'shooting'].includes(ball.state) &&
            (side === 'home' ? ball.targetX < 20 : ball.targetX > 80);
          if (ballApproachingBox) {
            state.targetX = this.clamp(ball.targetX, side === 'home' ? 3 : 82, side === 'home' ? 18 : 97);
            state.targetY = this.clamp(ball.targetY, 18, 50);
          }
          if (ball.ownerId === state.id && ball.heldByKeeper) {
            state.targetX = state.x;
            state.targetY = state.y;
          }
        }
        if (state.actionTargetUntil > this.state.minute) {
          state.targetX = state.actionTargetX;
          state.targetY = state.actionTargetY;
          state.targetIntent = 'individual-action';
        }
        if (this.state.transitionUntil > this.state.minute && player.position !== 'GK') {
          const wonBall = this.state.possessionSide === side;
          state.targetX = this.clamp(state.targetX + direction * (wonBall ? 7 : -6), 3, 97);
        }
      });

      if (hasBall && ball.ownerId) {
        const owner = this.state.players[ball.ownerId];
        const ownerBuildsFromBack = owner.position === 'GK' || owner.formationLine === 'def';
        const support = teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && player.id !== ball.ownerId && player.position !== 'GK' && !player.mustLeave)
          .sort((a, b) => {
            // En campo rival la defensa conserva la estructura; en salida de
            // balón sí puede acercarse un defensa o pivote para dar apoyo.
            const linePenalty = player => !ownerBuildsFromBack && player.formationLine === 'def' ? 35 :
              ownerBuildsFromBack && player.formationLine === 'att' ? 10 : 0;
            return this.distance(a, owner) + linePenalty(a) - this.distance(b, owner) - linePenalty(b);
          });
        support.slice(0, 3).forEach((player, index) => {
          const forwardRun = index === 2 && this.state.transitionUntil > this.state.minute ? 7 : 0;
          player.targetX = this.clamp(owner.x - direction * (3 + index * 2) + direction * forwardRun, 4, 96);
          const laneRelation = this.clamp((player.baseY - owner.baseY) * 0.45, -10, 10);
          player.targetY = this.clamp(owner.y + laneRelation, 4, 64);
        });
        teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && player.id !== ball.ownerId &&
            ['ST', 'CF', 'RW', 'LW'].includes(player.position) && !player.mustLeave)
          .forEach(player => {
            const data = this.getPlayer(player.id);
            const isFinisher = data.shooting >= 74 && data.shooting > data.passing + 4;
            if (!isFinisher) return;
            const desiredX = side === 'home' ? this.clamp(84 + data.shooting * 0.07, 84, 91) : this.clamp(16 - data.shooting * 0.07, 9, 16);
            player.targetX = this.keepRunOnside(side, desiredX, 1.4);
            player.targetY = player.position === 'ST' || player.position === 'CF'
              ? this.clamp(34 + (player.baseY - 34) * 0.25, 26, 42)
              : this.clamp(player.baseY, 18, 50);
          });
      }

      if (!hasBall && ball.ownerId) {
        const ballInOwnThird = side === 'home' ? ball.x < 38 : ball.x > 62;
        const availablePressers = teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && !player.mustLeave && player.position !== 'GK');
        const preferredPressers = ballInOwnThird
          ? availablePressers
          : availablePressers.filter(player => player.formationLine !== 'def');
        const pressers = (preferredPressers.length ? preferredPressers : availablePressers)
          .sort((a, b) => {
            const linePenalty = player => player.formationLine === 'def' && !ballInOwnThird ? 38 :
              player.formationLine === 'mid' ? 2 : 0;
            return this.distance(a, ball) + linePenalty(a) - this.distance(b, ball) - linePenalty(b);
          });
        const count = teamState.tactics.pressure === 'Alta' ? 2 : 1;
        pressers.slice(0, count).forEach((player, index) => {
          player.targetX = ball.x + (side === 'home' ? -1 : 1) * (index + 1);
          player.targetY = ball.y + (index ? 2 : 0);
          player.isPressing = true;
          player.targetIntent = 'press';
        });
        const owner = this.state.players[ball.ownerId];
        const cover = pressers.find(player => !player.isPressing && ['CB', 'RB', 'LB', 'CDM', 'CM'].includes(player.position));
        if (cover && owner) {
          cover.targetX = this.clamp(owner.x - direction * 9, cover.baseX - 14, cover.baseX + 14);
          cover.targetY = this.clamp(owner.y * 0.45 + cover.baseY * 0.55, cover.baseY - 13, cover.baseY + 13);
          cover.isCovering = true;
        }
        if (instruction === 'Presionar rival') {
          const selectedTarget = this.state.players[teamState.tactics.pressTargetId];
          const ballOwner = this.state.players[this.state.ball.ownerId];
          const target = selectedTarget && selectedTarget.onField && selectedTarget.side !== side
            ? selectedTarget
            : ballOwner && ballOwner.onField && ballOwner.side !== side
              ? ballOwner
              : this.onField(side === 'home' ? 'away' : 'home').filter(player => player.position !== 'GK')
                .sort((a, b) => this.getPlayer(b.id).overall - this.getPlayer(a.id).overall)[0];
          if (target && target.onField && target.side !== side) {
            pressers.slice(0, 2).forEach((player, index) => {
              player.targetX = target.x + (side === 'home' ? -1 : 1) * (index + 1);
              player.targetY = target.y + index * 2;
              player.isPressing = true;
            });
          }
        }
      }

      // El bloque bascula hacia la pelota, pero conserva distancias entre líneas.
      const outfield = teamState.onField.map(id => this.state.players[id])
        .filter(player => player && player.onField && player.position !== 'GK');
      if (outfield.length) {
        const blockCenterY = outfield.reduce((sum, player) => sum + player.targetY, 0) / outfield.length;
        const desiredCenterY = this.clamp(34 + (ball.y - 34) * 0.48, 18, 50);
        outfield.forEach(player => {
          player.targetY = this.clamp(player.targetY + (desiredCenterY - blockCenterY) * 0.55, 3, 65);
          const anchorLimit = hasBall ? 28 : 23;
          player.targetX = this.clamp(player.targetX, player.baseX - anchorLimit, player.baseX + anchorLimit);
        });
      }

      // Las acciones individuales válidas (desmarque, conducción o disputa)
      // tienen prioridad sobre la basculación colectiva calculada después.
      teamState.onField.map(id => this.state.players[id])
        .filter(player => player && player.onField && player.actionTargetUntil > this.state.minute && !player.mustLeave)
        .forEach(player => {
          player.targetX = player.actionTargetX;
          player.targetY = player.actionTargetY;
          player.targetIntent = 'individual-action';
        });

      // Los delanteros temporizan el desmarque con la penúltima línea rival.
      // Se escalonan para no acabar todos sobre el mismo punto ni partir antes
      // de que el pasador golpee el balón.
      if (hasBall && ball.ownerId && ball.state === 'controlled') {
        teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && player.id !== ball.ownerId &&
            ['ST', 'CF', 'RW', 'LW'].includes(player.position) && !player.mustLeave)
          .sort((a, b) => a.baseY - b.baseY)
          .forEach((player, index) => {
            player.targetX = this.keepRunOnside(side, player.targetX, 2.8 + index * 0.65);
          });
      }

      this.applyTeamShapeDiscipline(teamState);
      // Los atacantes también guardan la línea cuando el rival tiene el balón;
      // así un cambio de posesión no los encuentra varios metros adelantados.
      // Una carrera asociada a un pase ya golpeado o a un balón dividido sí
      // continúa, porque el fuera de juego se juzgó en el momento del pase.
      teamState.onField.map(id => this.state.players[id])
        .filter(player => player && player.onField && player.id !== ball.ownerId && !player.isPressing &&
          ['ST', 'CF', 'RW', 'LW'].includes(player.position) && !player.mustLeave)
        .sort((a, b) => a.baseY - b.baseY)
        .forEach((player, index) => {
          const activeRun = player.actionTargetUntil > this.state.minute;
          if (activeRun && ['passing', 'shooting', 'loose'].includes(ball.state)) return;
          player.targetX = this.keepRunOnside(side, player.targetX, 2.8 + index * 0.65);
        });
      this.keepDefensiveLineAheadOfKeeper(teamState);
    });

    this.state.referee.targetX = this.clamp(ball.x + (ball.x < 50 ? 7 : -7), 12, 88);
    this.state.referee.targetY = this.clamp(ball.y + (ball.y < 34 ? 8 : -8), 8, 60);

    if (this.state.restart) {
      const restart = this.state.restart;
      const defendingSide = restart.teamSide === 'home' ? 'away' : 'home';
      const wallDirection = restart.teamSide === 'home' ? 1 : -1;
      const attackingDistance = restart.teamSide === 'home' ? 100 - restart.x : restart.x;
      const wallCount = restart.type === 'free-kick' && attackingDistance < 45
        ? (attackingDistance < 28 ? 4 : 3)
        : 0;
      if (wallCount) {
        this.onField(defendingSide).filter(player => player.position !== 'GK')
          .sort((a, b) => this.distance(a, ball) - this.distance(b, ball))
          .slice(0, wallCount)
          .forEach((player, index) => {
            player.targetX = this.clamp(restart.x + wallDirection * 9, 4, 96);
            player.targetY = this.clamp(restart.y + (index - (wallCount - 1) / 2) * 2.2, 4, 64);
          });
      }
      const taker = restart.takerId ? this.state.players[restart.takerId] : null;
      if (taker && taker.onField) {
        taker.targetX = restart.x - (taker.side === 'home' ? 0.8 : -0.8);
        taker.targetY = restart.type === 'throw-in' ? (restart.y < 34 ? 2 : 66) : restart.y;
        taker.targetIntent = 'restart';
      }
    }
  }

  advanceGoalCelebration(elapsedSeconds) {
    const celebration = this.state.celebration;
    if (!celebration) return;
    celebration.remainingSeconds = Math.max(0, celebration.remainingSeconds - elapsedSeconds);
    const teammates = this.onField(celebration.scoringSide);
    const participantIds = new Set(celebration.participantIds);
    const participants = teammates.filter(player => participantIds.has(player.id));
    const inwardX = celebration.cornerX < 50 ? 1 : -1;
    const inwardY = celebration.cornerY < 34 ? 1 : -1;
    const elapsed = celebration.durationSeconds - celebration.remainingSeconds;
    const progress = this.clamp(elapsed / celebration.durationSeconds, 0, 1);

    teammates.forEach(player => {
      player.targetX = player.baseX;
      player.targetY = player.baseY;
      player.isPressing = false;
      player.isCovering = false;
    });
    participants.forEach((player, index) => {
      if (celebration.type === 'SIDELINE_RUN') {
        const startingX = celebration.scoringSide === 'home' ? 96 : 4;
        const runDirection = celebration.scoringSide === 'home' ? -1 : 1;
        player.targetX = startingX + runDirection * (8 + progress * 32) + runDirection * index * 2;
        player.targetY = celebration.cornerY + inwardY * (1.5 + index * 1.8);
      } else if (celebration.type === 'GOAL_HUDDLE') {
        const centerX = celebration.scoringSide === 'home' ? 91 : 9;
        const angle = (Math.PI * 2 * index) / Math.max(1, participants.length);
        player.targetX = centerX + Math.cos(angle) * 3.2;
        player.targetY = 34 + Math.sin(angle) * 5;
      } else {
        const column = index % 3;
        const row = Math.floor(index / 3);
        player.targetX = celebration.cornerX + inwardX * (1.2 + column * 1.6);
        player.targetY = celebration.cornerY + inwardY * (1.2 + row * 1.45);
      }
    });
    this.onField(celebration.kickoffSide).forEach(player => {
      player.targetX = player.baseX;
      player.targetY = player.baseY;
      player.isPressing = false;
      player.isCovering = false;
    });

    const movement = 1 - Math.exp(-Math.max(0.04, elapsedSeconds) * 0.65);
    Object.values(this.state.players).forEach(player => {
      if (!player.onField) return;
      player.x += (player.targetX - player.x) * Math.min(0.32, movement);
      player.y += (player.targetY - player.y) * Math.min(0.32, movement);
    });
    this.applySpatialSeparation(0.38);
    this.enforceDefensiveOrder(0.65);
    this.state.referee.targetX = 50;
    this.state.referee.targetY = 34;
    this.state.referee.x += (50 - this.state.referee.x) * Math.min(0.22, movement);
    this.state.referee.y += (34 - this.state.referee.y) * Math.min(0.22, movement);

    if (celebration.remainingSeconds <= 0) this.completeGoalCelebration(celebration.kickoffSide);
  }

  advanceGoalBallReturn(elapsedSeconds) {
    const ballReturn = this.state.goalBallReturn;
    if (!ballReturn) return;
    ballReturn.elapsedSeconds += elapsedSeconds;
    const progress = this.clamp(ballReturn.elapsedSeconds / ballReturn.durationSeconds, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    if (!ballReturn.playerOrigins || !ballReturn.playerTargets) {
      const reposition = this.createKickoffReposition(ballReturn.kickoffSide);
      ballReturn.playerOrigins = reposition.origins;
      ballReturn.playerTargets = reposition.targets;
      ballReturn.kickoffPlayerId = reposition.kickoffPlayerId;
    }
    Object.entries(ballReturn.playerTargets).forEach(([playerId, target]) => {
      const player = this.state.players[playerId];
      const origin = ballReturn.playerOrigins[playerId];
      if (!player || !player.onField || !origin) return;
      player.x = origin.x + (target.x - origin.x) * eased;
      player.y = origin.y + (target.y - origin.y) * eased;
    });
    this.state.ball.x = ballReturn.fromX + (50 - ballReturn.fromX) * eased;
    this.state.ball.y = ballReturn.fromY + (34 - ballReturn.fromY) * eased;
    if (progress < 1) return;
    const kickoffSide = ballReturn.kickoffSide;
    this.state.ball.x = 50;
    this.state.ball.y = 34;
    this.state.goalBallReturn = null;
    this.prepareKickoffAtCenter(kickoffSide, this.state.minute);
    this.state.phase = 'KICK_OFF';
  }

  moveEntities(step) {
    Object.values(this.state.players).forEach(state => {
      if (!state.onField) return;
      const player = this.getPlayer(state.id);
      const isRestartTaker = this.state.restart?.takerId === state.id;
      const keeperChasingLooseBall = state.position === 'GK' && this.state.ball.state === 'loose' &&
        this.isBallInOwnPenaltyArea(state.side) &&
        Math.hypot(state.targetX - this.state.ball.x, state.targetY - this.state.ball.y) < 0.5;
      const speedBoost = isRestartTaker ? 2.1 : keeperChasingLooseBall ? 1.65 : 1;
      const normalizedStep = Math.max(0.2, step / 0.05);
      const calculatedMaxStep = (0.78 + player.pace / 125) * (state.fitness / 100) * normalizedStep * speedBoost;
      const maxStep = Math.min(isRestartTaker ? 3.2 : keeperChasingLooseBall ? 2.5 : 1.9, calculatedMaxStep);
      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(state.velocityX)) state.velocityX = 0;
      if (!Number.isFinite(state.velocityY)) state.velocityY = 0;
      if (distance < 0.06) {
        state.velocityX = 0;
        state.velocityY = 0;
        return;
      }
      const desiredMagnitude = Math.min(maxStep, distance);
      const desiredX = dx / distance * desiredMagnitude;
      const desiredY = dy / distance * desiredMagnitude;
      const acceleration = maxStep * (isRestartTaker ? 0.82 : keeperChasingLooseBall ? 0.72 : 0.48);
      let changeX = desiredX - state.velocityX;
      let changeY = desiredY - state.velocityY;
      const changeMagnitude = Math.hypot(changeX, changeY);
      if (changeMagnitude > acceleration) {
        changeX *= acceleration / changeMagnitude;
        changeY *= acceleration / changeMagnitude;
      }
      state.velocityX += changeX;
      state.velocityY += changeY;
      let moveX = state.velocityX;
      let moveY = state.velocityY;
      const moveDistance = Math.hypot(moveX, moveY);
      if (moveDistance >= distance) {
        moveX = dx;
        moveY = dy;
        state.velocityX = 0;
        state.velocityY = 0;
      }
      state.x = this.clamp(state.x + moveX, 2, 98);
      state.y = this.clamp(state.y + moveY, 2, 66);
    });
    this.applySpatialSeparation(0.38);
    this.enforceDefensiveOrder(0.65);
    const referee = this.state.referee;
    referee.x += (referee.targetX - referee.x) * 0.14;
    referee.y += (referee.targetY - referee.y) * 0.14;
    if (this.state.ball.ownerId) {
      const owner = this.state.players[this.state.ball.ownerId];
      if (owner) {
        this.state.ball.x = this.clamp(owner.x + (owner.side === 'home' ? 0.8 : -0.8), 2, 98);
        this.state.ball.y = this.clamp(owner.y, 2, 66);
      }
    }
  }

  applySpatialSeparation(maxPush = Infinity, maxTotalPush = maxPush) {
    const players = [...this.onField('home'), ...this.onField('away')].filter(player => !player.mustLeave);
    const protectedTakerId = this.state.restart?.takerId || null;
    const corrections = Object.fromEntries(players.map(player => [player.id, { x: 0, y: 0 }]));
    for (let firstIndex = 0; firstIndex < players.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < players.length; secondIndex++) {
        const first = players[firstIndex];
        const second = players[secondIndex];
        if (first.id === protectedTakerId || second.id === protectedTakerId) continue;
        if (first.position === 'GK' || second.position === 'GK') continue;
        const sameTeam = first.side === second.side;
        const ownsBall = this.state.ball.ownerId === first.id || this.state.ball.ownerId === second.id;
        const minimum = sameTeam ? 3.1 : ownsBall ? 0 : 1.35;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimum) continue;
        const angle = distance > 0.05 ? Math.atan2(dy, dx) : ((firstIndex + secondIndex) * 1.7);
        const push = Math.min(maxPush, (minimum - distance) * 0.52);
        const pushX = Math.cos(angle) * push;
        const pushY = Math.sin(angle) * push;
        corrections[first.id].x -= pushX;
        corrections[first.id].y -= pushY;
        corrections[second.id].x += pushX;
        corrections[second.id].y += pushY;
      }
    }
    players.forEach(player => {
      let correctionX = corrections[player.id].x;
      let correctionY = corrections[player.id].y;
      const magnitude = Math.hypot(correctionX, correctionY);
      if (magnitude > maxTotalPush) {
        correctionX *= maxTotalPush / magnitude;
        correctionY *= maxTotalPush / magnitude;
      }
      player.x = this.clamp(player.x + correctionX, 2, 98);
      player.y = this.clamp(player.y + correctionY, 2, 66);
    });
  }

  applyTeamShapeDiscipline(teamState) {
    const direction = teamState.side === 'home' ? 1 : -1;
    const ownerId = this.state.ball.ownerId;
    const activeAction = player => player.actionTargetUntil > this.state.minute;
    const lines = ['def', 'mid', 'att'].map(line => ({
      line,
      players: teamState.onField.map(id => this.state.players[id])
        .filter(player => player && player.onField && !player.mustLeave && player.formationLine === line)
    })).filter(group => group.players.length);

    // Nadie cambia de banda solo por ofrecer apoyo. Los perseguidores tienen
    // algo más de libertad, pero conservan el lado de partida.
    lines.forEach(group => group.players.forEach(player => {
      const chasesLooseBall = this.state.ball.state === 'loose' && activeAction(player) &&
        player.actionTargetX === this.state.ball.x && player.actionTargetY === this.state.ball.y;
      const laneFreedom = chasesLooseBall ? 34 : player.isPressing ? 20 : activeAction(player) || player.id === ownerId ? 17 : 13;
      player.targetY = this.clamp(player.targetY, player.baseY - laneFreedom, player.baseY + laneFreedom);
    }));

    const centers = lines.map(group => {
      const structured = group.players.filter(player => !player.isPressing && player.id !== ownerId && !activeAction(player));
      const source = structured.length ? structured : group.players;
      return {
        ...group,
        center: source.reduce((sum, player) => sum + player.targetX, 0) / source.length,
        rawCenter: source.reduce((sum, player) => sum + player.targetX, 0) / source.length
      };
    });
    // Primero evitamos que el bloque se parta. Después, desde la línea de
    // ataque hacia atrás, garantizamos el escalonamiento. Así una línea de
    // fuera de juego baja hace retroceder al medio y la defensa, no vuelve a
    // empujar al delantero a posición antirreglamentaria.
    for (let index = 1; index < centers.length; index++) {
      const previous = centers[index - 1];
      const current = centers[index];
      current.center = direction > 0
        ? Math.min(current.center, previous.center + 25)
        : Math.max(current.center, previous.center - 25);
    }
    for (let index = centers.length - 1; index > 0; index--) {
      const current = centers[index];
      const previous = centers[index - 1];
      previous.center = direction > 0
        ? Math.min(previous.center, current.center - 9)
        : Math.max(previous.center, current.center + 9);
    }
    const freedom = { def: 5.5, mid: 7, att: 8 };
    centers.forEach(group => group.players.forEach(player => {
      if (player.isPressing || player.id === ownerId || activeAction(player)) return;
      const roleBonus = player.formationLine === 'def' && player.role === 'Lateral ofensivo' ? 4 : 0;
      const backward = freedom[group.line];
      const forward = backward + roleBonus;
      const shiftedTarget = player.targetX + (group.center - group.rawCenter);
      player.targetX = direction > 0
        ? this.clamp(shiftedTarget, group.center - backward, group.center + forward)
        : this.clamp(shiftedTarget, group.center - forward, group.center + backward);
    }));
    // Si varios jugadores chocan con el límite de dispersión, recentramos la
    // línea completa para que el promedio también respete la distancia fijada.
    centers.forEach(group => {
      const structured = group.players.filter(player => !player.isPressing && player.id !== ownerId && !activeAction(player));
      for (let pass = 0; pass < 2 && structured.length; pass++) {
        const actualCenter = structured.reduce((sum, player) => sum + player.targetX, 0) / structured.length;
        const correction = group.center - actualCenter;
        structured.forEach(player => {
          const roleBonus = player.formationLine === 'def' && player.role === 'Lateral ofensivo' ? 4 : 0;
          const backward = freedom[group.line];
          const forward = backward + roleBonus;
          player.targetX = direction > 0
            ? this.clamp(player.targetX + correction, group.center - backward, group.center + forward)
            : this.clamp(player.targetX + correction, group.center - forward, group.center + backward);
        });
      }
    });
  }

  getDefensiveUnit(teamState) {
    const players = teamState.onField.map(id => this.state.players[id]).filter(player => player && player.onField && !player.mustLeave);
    return {
      keeper: players.find(player => player.position === 'GK'),
      defenders: players.filter(player => player.formationLine === 'def' ||
        (!player.formationLine && ['CB', 'RB', 'LB'].includes(player.position)))
    };
  }

  keepDefensiveLineAheadOfKeeper(teamState) {
    const { keeper, defenders } = this.getDefensiveUnit(teamState);
    if (!keeper || !defenders.length) return;
    const gap = 5.5;
    const keeperHoldingBall = this.state.ball.ownerId === keeper.id && this.state.ball.heldByKeeper;
    const keeperChasingLooseBall = this.state.ball.state === 'loose' && this.isBallInOwnPenaltyArea(teamState.side) &&
      keeper.actionTargetUntil > this.state.minute;
    if (teamState.side === 'home') {
      const deepestDefenderTarget = Math.min(...defenders.map(player => player.targetX));
      if (!keeperHoldingBall && !keeperChasingLooseBall) {
        keeper.targetX = this.clamp(Math.min(keeper.targetX, deepestDefenderTarget - gap), 4, 20);
      }
      defenders.forEach(player => {
        player.targetX = this.clamp(Math.max(player.targetX, keeper.targetX + gap), 9.5, 97);
      });
    } else {
      const deepestDefenderTarget = Math.max(...defenders.map(player => player.targetX));
      if (!keeperHoldingBall && !keeperChasingLooseBall) {
        keeper.targetX = this.clamp(Math.max(keeper.targetX, deepestDefenderTarget + gap), 80, 96);
      }
      defenders.forEach(player => {
        player.targetX = this.clamp(Math.min(player.targetX, keeper.targetX - gap), 3, 90.5);
      });
    }
  }

  enforceDefensiveOrder(maxCorrection = Infinity) {
    ['home', 'away'].forEach(side => {
      const teamState = this.state.teams[side];
      const { keeper, defenders } = this.getDefensiveUnit(teamState);
      if (!keeper || !defenders.length) return;
      const minimumVisibleGap = 2.2;
      defenders.forEach(defender => {
        if (defender.id === this.state.restart?.takerId) return;
        if (side === 'home' && defender.x < keeper.x + minimumVisibleGap) {
          defender.x = this.clamp(Math.min(keeper.x + minimumVisibleGap, defender.x + maxCorrection), 2, 98);
        }
        if (side === 'away' && defender.x > keeper.x - minimumVisibleGap) {
          defender.x = this.clamp(Math.max(keeper.x - minimumVisibleGap, defender.x - maxCorrection), 2, 98);
        }
      });
    });
  }

  advanceBall(step) {
    const ball = this.state.ball;
    if (this.state.phase === 'HALF_TIME') return;
    if (this.state.restart) {
      if (ball.state === 'dead-ball-moving') {
        ball.progress = Math.min(1, ball.progress + step / ball.duration);
        ball.x = ball.fromX + (ball.targetX - ball.fromX) * ball.progress;
        ball.y = ball.fromY + (ball.targetY - ball.fromY) * ball.progress;
        if (ball.progress >= 1) ball.state = 'set-piece';
        return;
      }
      this.state.restart.wait -= step;
      if (this.state.restart.wait <= 0) this.executeRestart();
      return;
    }
    if (ball.state === 'passing' || ball.state === 'shooting') {
      ball.progress = Math.min(1, ball.progress + step / ball.duration);
      ball.x = ball.fromX + (ball.targetX - ball.fromX) * ball.progress;
      ball.y = ball.fromY + (ball.targetY - ball.fromY) * ball.progress;
      ball.height = Math.sin(Math.PI * ball.progress) * (ball.arc || 0);
      if (ball.state === 'passing' && ball.action === 'pass' && ['cross', 'lofted'].includes(ball.passType) && !ball.claimChecked && ball.progress > 0.55) {
        ball.claimChecked = true;
        if (this.tryKeeperClaim(ball)) return;
        if (ball.claimPending) ball.claimChecked = false;
      }
      if (ball.state === 'passing' && ball.action === 'pass' && (ball.passType === 'ground' || ball.progress > 0.82)) {
        const passer = this.state.players[ball.passerId];
        const defendingSide = passer && passer.side === 'home' ? 'away' : 'home';
        const collision = this.onField(defendingSide)
          .filter(player => !player.mustLeave)
          .sort((a, b) => this.distance(a, ball) - this.distance(b, ball))[0];
        const collisionDistance = collision ? this.distance(collision, ball) : Infinity;
        const checkedDefenders = Array.isArray(ball.interceptionCheckedIds) ? ball.interceptionCheckedIds : [];
        if (collision && collisionDistance < 2.05 && !checkedDefenders.includes(collision.id)) {
          checkedDefenders.push(collision.id);
          ball.interceptionCheckedIds = checkedDefenders;
          const passerData = passer ? this.getPlayer(passer.id) : { passing: 50 };
          const defenderData = this.getPlayer(collision.id);
          const cutChance = this.clamp(
            0.07 + defenderData.defending / 520 + Math.max(0, 2.05 - collisionDistance) * 0.07 - passerData.passing / 620,
            0.06,
            0.34
          );
          if (this.random() < cutChance) {
            if (passer) passer.confidence = this.clamp((passer.confidence || 70) - 1.5, 20, 100);
            const cleanControlChance = this.clamp(
              0.28 + defenderData.defending / 260 + defenderData.physical / 650 - passerData.passing / 700,
              0.28,
              0.68
            );
            const cleanControl = this.random() < cleanControlChance && this.takeControlAtBall(collision, 2.2);
            if (!cleanControl) this.makeBallLoose(ball.x, ball.y);
            this.addEvent('INTERCEPTION', cleanControl
              ? `${collision.name} anticipa y se queda con el balón`
              : `${collision.name} mete el pie y corta el pase`, null, collision.side);
            return;
          }
        }
      }
      if (ball.progress >= 1) this.resolveJourney();
      return;
    }
    if (ball.state === 'loose') {
      this.resolveLooseBall();
      return;
    }
    if (!ball.ownerId) return this.resetPossession();

    const owner = this.state.players[ball.ownerId];
    if (!owner || !owner.onField || owner.mustLeave) return this.resetPossession();
    this.state.stats[owner.side].possessionTicks++;

    // Tras una parada el balón permanece blocado en las manos. Al terminar
    // la retención, el portero distribuye en vez de retroceder con la pelota.
    if (owner.position === 'GK' && Number.isFinite(ball.heldUntil)) {
      if (this.state.minute < ball.heldUntil) return;
      ball.heldUntil = null;
      ball.heldByKeeper = false;
      this.startPass(owner);
      return;
    }

    // Una ocasión manifiesta prevalece sobre cualquier instrucción de pase o
    // ritmo: delante de portería y sin defensor cercano, el jugador remata.
    if (this.hasClearScoringChance(owner)) {
      this.startShot(owner, false);
      return;
    }

    const collisionOpponent = this.onField(owner.side === 'home' ? 'away' : 'home')
      .filter(player => !player.mustLeave)
      .sort((a, b) => this.distance(a, owner) - this.distance(b, owner))[0];
    if (
      collisionOpponent && this.distance(collisionOpponent, owner) <= 3.45 &&
      this.state.minute - Math.max(owner.lastDuelMinute, collisionOpponent.lastDuelMinute) >= 0.3
    ) {
      owner.lastDuelMinute = this.state.minute;
      collisionOpponent.lastDuelMinute = this.state.minute;
      this.resolveTackle(collisionOpponent, owner, true);
      return;
    }

    // La frecuencia de decisiones depende del tiempo simulado, no del refresco
    // visual. Esto mantiene resultados comparables a 1, 3, 5 o 10 min/parte.
    const ownerTactics = this.state.teams[owner.side].tactics;
    let tempoMultiplier = ownerTactics.tempo === 'Alto' ? 1.25 : ownerTactics.tempo === 'Bajo' ? 0.78 : 1;
    if (ownerTactics.situationalInstruction === 'Perder tiempo') tempoMultiplier *= 0.55;
    if (ownerTactics.situationalInstruction === 'Buscar el empate') tempoMultiplier *= 1.25;
    const controlledSince = Number.isFinite(ball.controlledSince) ? ball.controlledSince : this.state.minute;
    if (!Number.isFinite(ball.controlledSince)) ball.controlledSince = controlledSince;
    const controlledFor = Math.max(0, this.state.minute - controlledSince);
    const baseMaximumHold = owner.position === 'GK'
      ? 0.18
      : ownerTactics.tempo === 'Alto' ? 0.27 : ownerTactics.tempo === 'Bajo' ? 0.46 : 0.35;
    const maximumHold = ownerTactics.situationalInstruction === 'Perder tiempo'
      ? Math.min(0.65, baseMaximumHold * 1.4)
      : ownerTactics.situationalInstruction === 'Buscar el empate'
        ? baseMaximumHold * 0.78
        : baseMaximumHold;
    const minimumHold = owner.position === 'GK' ? 0.06 : 0.08;
    if (controlledFor < minimumHold) return;
    const mustDecide = controlledFor >= maximumHold;
    if (!mustDecide && this.random() > this.clamp(step * 2.8 * tempoMultiplier, 0.015, 0.78)) return;

    const opponents = this.onField(owner.side === 'home' ? 'away' : 'home').filter(player => !player.mustLeave);
    const nearest = opponents.sort((a, b) => this.distance(a, owner) - this.distance(b, owner))[0];
    if (nearest && this.distance(nearest, owner) < 3.4 && this.random() < 0.32) {
      this.resolveTackle(nearest, owner);
      return;
    }

    const attackingDistance = owner.side === 'home' ? 100 - owner.x : owner.x;
    this.chooseRoleAction(owner, attackingDistance);
  }

  chooseRoleAction(owner, attackingDistance) {
    const data = this.getPlayer(owner.id);
    const position = owner.position;
    if (owner.role === 'Organizador' || owner.role === 'Central con salida') {
      if (this.random() < 0.9) this.startPass(owner);
      else this.startDribble(owner);
      return;
    }
    if (owner.role === 'Falso nueve' && attackingDistance > 20 && this.random() < 0.72) {
      this.startPass(owner);
      return;
    }
    if (owner.role === 'Delantero referencia' && attackingDistance < 38 && this.random() < 0.72) {
      this.startShot(owner, false);
      return;
    }
    if (['GK', 'CB', 'RB', 'LB'].includes(position)) {
      if (this.random() < 0.88) this.startPass(owner);
      else this.startDribble(owner);
      return;
    }
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position)) {
      const creativeQuality = (data.passing * 0.5) + (data.dribbling * 0.2) + (data.overall * 0.3);
      if (creativeQuality >= 78 && data.shooting >= 68 && attackingDistance < 32 && this.random() < 0.3) {
        this.startShot(owner, false);
      } else if (this.random() < (creativeQuality >= 78 ? 0.82 : 0.74)) {
        this.startPass(owner);
      } else {
        this.startDribble(owner);
      }
      return;
    }
    const associationQuality = (data.passing * 0.4) + (data.dribbling * 0.3) + (data.overall * 0.3);
    const shotChance = this.clamp(0.12 + data.shooting / 260 + (attackingDistance < 25 ? 0.18 : 0), 0.2, 0.68);
    if (attackingDistance < 42 && this.random() < shotChance) {
      this.startShot(owner, false);
    } else if (associationQuality >= 76 && this.random() < 0.62) {
      this.startPass(owner);
    } else if (associationQuality >= 76) {
      this.startDribble(owner);
    } else {
      this.startPass(owner);
    }
  }

  hasClearScoringChance(owner) {
    if (!owner || owner.position === 'GK') return false;
    const goalDistance = owner.side === 'home' ? 100 - owner.x : owner.x;
    const centralDistance = Math.abs(owner.y - 34);
    if (goalDistance > 30 || centralDistance > 18) return false;
    const defendingSide = owner.side === 'home' ? 'away' : 'home';
    const nearestOutfield = this.onField(defendingSide)
      .filter(player => player.position !== 'GK' && !player.mustLeave)
      .sort((a, b) => this.distance(a, owner) - this.distance(b, owner))[0];
    return !nearestOutfield || this.distance(nearestOutfield, owner) > 7.5;
  }

  startDribble(owner) {
    const direction = owner.side === 'home' ? 1 : -1;
    owner.actionTargetX = this.clamp(owner.x + direction * (6 + this.random() * 8), 3, 97);
    owner.actionTargetY = this.clamp(owner.y + (this.random() - 0.5) * 12, 3, 65);
    owner.actionTargetUntil = this.state.minute + 1.2;
    owner.targetX = owner.actionTargetX;
    owner.targetY = owner.actionTargetY;
    this.state.ball.controlledSince = this.state.minute;
    this.state.phase = 'TRANSITION';
  }

  startPass(owner, forcedReceiverId = null, options = {}) {
    const mates = this.onField(owner.side).filter(player => player.id !== owner.id && !player.mustLeave);
    if (!mates.length) return;
    const direction = owner.side === 'home' ? 1 : -1;
    const teamState = this.state.teams[owner.side];
    const passStyle = teamState.tactics.passStyle;
    const strategy = teamState.strategy || teamState.naturalStrategy || 'Posesión';
    const player = this.getPlayer(owner.id);
    const ownerIsGoalkeeper = owner.position === 'GK';
    const directForwardOption = candidate => candidate.position !== 'GK' &&
      direction * (candidate.x - owner.x) > 0.75;
    let forcedPassType = null;
    let candidates = [...mates];
    let goalkeeperDistribution = false;

    if (ownerIsGoalkeeper) {
      // El portero no participa en rondos repetidos con su defensa. Busca una
      // salida reconocible hacia el círculo central, una banda o la punta.
      forcedReceiverId = null;
      const outletPositions = ['CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF'];
      const outlets = mates.filter(mate => outletPositions.includes(mate.position));
      const advancedOutlets = outlets.filter(mate => direction * (mate.x - 50) >= -3);
      candidates = advancedOutlets.length ? advancedOutlets : outlets.length
        ? outlets
        : mates.filter(mate => mate.position !== 'GK');
      candidates = candidates.sort((a, b) => {
        const score = candidate => {
          const progress = direction * (candidate.x - owner.x);
          const wideLane = ['RM', 'LM', 'RW', 'LW'].includes(candidate.position) ? 7 : 0;
          const centralLane = ['CDM', 'CM', 'CAM'].includes(candidate.position) ? 5 : 0;
          return progress + wideLane + centralLane;
        };
        return score(b) - score(a);
      });
      forcedPassType = 'lofted';
      goalkeeperDistribution = true;
    } else if (!forcedReceiverId && ['CB', 'RB', 'LB'].includes(owner.position)) {
      const strategyLongChance = {
        'Posesión': 0.05,
        'Presión alta': 0.08,
        'Juego directo': 0.25,
        'Contraataque': 0.2,
        'Bloque bajo': 0.13
      }[strategy] || 0.08;
      const longPassChance = this.clamp(
        strategyLongChance + player.passing / 1100 + (passStyle === 'Directo' ? 0.07 : 0) - (passStyle === 'Corto' ? 0.04 : 0),
        0.04,
        0.38
      );
      if (this.random() < longPassChance) {
        const longTargets = mates.filter(mate => ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(mate.position));
        if (longTargets.length) {
          candidates = longTargets.sort((a, b) => direction * (b.x - a.x));
          forcedPassType = 'lofted';
        }
      } else {
        const circulation = mates.filter(mate => ['CB', 'RB', 'LB', 'CDM'].includes(mate.position));
        if (circulation.length) candidates = circulation.sort((a, b) => this.distance(owner, a) - this.distance(owner, b));
      }
    } else if (!forcedReceiverId && ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(owner.position)) {
      const creativeQuality = player.passing * 0.55 + player.dribbling * 0.2 + player.overall * 0.25;
      if (creativeQuality >= 78 && this.random() < 0.62) {
        const insideTargets = mates.filter(mate => ['ST', 'CF', 'CAM', 'CM'].includes(mate.position) && direction * (mate.x - owner.x) > 4);
        if (insideTargets.length) {
          candidates = insideTargets.sort((a, b) => direction * (b.x - a.x));
          forcedPassType = 'through';
        }
      } else {
        const wideTargets = mates.filter(mate => ['RW', 'LW', 'RM', 'LM', 'RB', 'LB'].includes(mate.position));
        if (wideTargets.length) candidates = wideTargets.sort((a, b) => Math.abs(b.y - 34) - Math.abs(a.y - 34));
      }
    } else if (!forcedReceiverId && ['ST', 'CF', 'RW', 'LW'].includes(owner.position)) {
      const associationQuality = player.passing * 0.4 + player.dribbling * 0.3 + player.overall * 0.3;
      const associationTargets = mates.filter(mate => associationQuality >= 76
        ? ['ST', 'CF', 'RW', 'LW', 'CAM', 'CM'].includes(mate.position)
        : ['CAM', 'CM', 'RM', 'LM'].includes(mate.position));
      if (associationTargets.length) candidates = associationTargets.sort((a, b) => this.distance(owner, a) - this.distance(owner, b));
    }

    // El estilo Directo nunca recicla hacia atrás: la misma regla se aplica
    // al portero y a todas las líneas, incluso si una decisión previa había
    // sugerido un receptor defensivo.
    if (passStyle === 'Directo') {
      const forwardCandidates = candidates.filter(directForwardOption);
      const allForwardMates = (goalkeeperDistribution ? candidates : mates).filter(directForwardOption);
      candidates = forwardCandidates.length ? forwardCandidates : allForwardMates;
      const forcedReceiver = forcedReceiverId ? this.state.players[forcedReceiverId] : null;
      if (!forcedReceiver || !directForwardOption(forcedReceiver)) forcedReceiverId = null;
      if (!candidates.length && !forcedReceiverId) {
        this.startDribble(owner);
        return;
      }
    }

    // Con alternativas disponibles, el pasador evita entregar la pelota a un
    // compañero que ya se encuentra claramente adelantado. Los estilos más
    // verticales admiten un riesgo pequeño de descoordinación del desmarque.
    if (!forcedReceiverId) {
      const onsideCandidates = candidates.filter(candidate => !this.getOffsideDecision(owner, candidate).isOffside);
      const offsideCandidates = candidates.filter(candidate => this.getOffsideDecision(owner, candidate).isOffside);
      const safeMates = (goalkeeperDistribution ? candidates : mates)
        .filter(candidate => !this.getOffsideDecision(owner, candidate).isOffside &&
        (passStyle !== 'Directo' || directForwardOption(candidate)));
      const offsideRisk = this.clamp(
        0.01 + (passStyle === 'Directo' ? 0.055 : 0) +
        (teamState.tactics.tempo === 'Alto' ? 0.025 : 0) +
        (this.state.transitionUntil > this.state.minute ? 0.02 : 0) +
        (['Ofensiva', 'Muy Ofensiva'].includes(teamState.tactics.mentality) ? 0.015 : 0),
        0.01,
        0.12
      );
      const acceptsRisk = offsideCandidates.length > 0 && this.random() > 1 - offsideRisk;
      if (acceptsRisk) candidates = offsideCandidates;
      else if (onsideCandidates.length) candidates = onsideCandidates;
      else if (safeMates.length) candidates = safeMates;
      else if (passStyle === 'Directo') {
        this.startDribble(owner);
        return;
      }
    }

    if (!goalkeeperDistribution) {
      candidates = candidates.sort((a, b) => {
        if (passStyle === 'Corto') return this.distance(owner, a) - this.distance(owner, b);
        if (passStyle === 'Directo') return direction * (b.x - a.x);
        return (direction * b.x + this.random() * 20) - (direction * a.x + this.random() * 20);
      });
    }
    const candidatePoolSize = goalkeeperDistribution ? 5 : passStyle === 'Corto' ? 2 : passStyle === 'Directo' ? 4 : 3;
    let receiver = forcedReceiverId ? this.state.players[forcedReceiverId] : candidates[Math.floor(this.random() * Math.min(candidatePoolSize, candidates.length))];
    if (!receiver) return;
    const inAttackingThird = owner.side === 'home' ? owner.x > 67 : owner.x < 33;
    const isWide = owner.y < 15 || owner.y > 53;
    const shouldCross = !forcedReceiverId && inAttackingThird && isWide;
    if (shouldCross) {
      const targets = mates.filter(mate => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(mate.position) &&
          (passStyle !== 'Directo' || directForwardOption(mate)))
        .sort((a, b) => direction * (b.x - a.x));
      if (targets[0]) receiver = targets[Math.floor(this.random() * Math.min(2, targets.length))];
    }
    const distance = this.distance(owner, receiver);
    const progressiveDistance = direction * (receiver.x - owner.x);
    const ownerIsAttacker = ['ST', 'CF', 'RW', 'LW'].includes(owner.position);
    const ownerIsDefender = ['GK', 'CB', 'RB', 'LB'].includes(owner.position);
    const receiverIsDefender = ['GK', 'CB', 'RB', 'LB'].includes(receiver.position);
    const receiverIsAttacker = ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(receiver.position);
    const longForwardChance = {
      'Posesión': 0.05,
      'Presión alta': 0.08,
      'Juego directo': 0.34,
      'Contraataque': 0.28,
      'Bloque bajo': 0.12
    }[strategy] || 0.08;
    let passType = forcedPassType;
    if (shouldCross) passType = 'cross';
    else if (ownerIsAttacker && receiverIsDefender) passType = 'ground';
    else if (!passType && ownerIsDefender && receiverIsAttacker && distance > 22 && forcedReceiverId && passStyle === 'Directo') passType = 'lofted';
    else if (!passType) {
      const canPlayLongForward = progressiveDistance > 12 && distance > 19;
      const adjustedLongChance = this.clamp(longForwardChance + (passStyle === 'Directo' ? 0.1 : 0) - (passStyle === 'Corto' ? 0.04 : 0), 0.02, 0.48);
      passType = (canPlayLongForward && this.random() < adjustedLongChance)
        ? 'lofted'
        : progressiveDistance > 13 && this.random() < 0.32 ? 'through' : 'ground';
    }
    const runDx = receiver.targetX - receiver.x;
    const runDy = receiver.targetY - receiver.y;
    const runDistance = Math.hypot(runDx, runDy) || 1;
    // El pase puede guiar la carrera, pero no viajar diez metros por delante
    // de un receptor incapaz de llegar. Los balones largos siguen teniendo
    // profundidad, con un punto de encuentro alcanzable.
    const naturalLead = Math.min(passType === 'through' ? 3.1 : 1.8, distance * 0.07);
    const throughLead = passType === 'through' ? direction * Math.min(2.4, Math.max(0.8, progressiveDistance * 0.1)) : 0;
    const passTargetX = shouldCross
      ? owner.side === 'home'
        ? this.clamp(passStyle === 'Directo' ? Math.max(owner.x + 1, 90 + this.random() * 6) : 90 + this.random() * 6, 2, 98)
        : this.clamp(passStyle === 'Directo' ? Math.min(owner.x - 1, 10 - this.random() * 6) : 10 - this.random() * 6, 2, 98)
      : this.clamp(receiver.x + (runDx / runDistance) * naturalLead + throughLead, 2, 98);
    const passTargetY = shouldCross
      ? this.clamp(27 + this.random() * 14, 25, 43)
      : this.clamp(receiver.y + (runDy / runDistance) * naturalLead + (this.random() - 0.5) * 1.5, 2, 66);
    const kickX = this.state.ball.x;
    const kickY = this.state.ball.y;
    receiver.actionTargetX = passTargetX;
    receiver.actionTargetY = passTargetY;
    receiver.actionTargetUntil = this.state.minute + 1.5;
    this.state.stats[owner.side].passes++;
    const offside = options.skipOffside
      ? { isOffside: false, lineX: null }
      : this.getOffsideDecision(owner, receiver);
    this.state.ball = {
      ...this.state.ball,
      ownerId: null,
      state: 'passing',
      fromX: kickX, fromY: kickY,
      x: kickX, y: kickY,
      targetX: passTargetX,
      targetY: passTargetY,
      progress: 0,
      duration: this.clamp(Math.hypot(passTargetX - kickX, passTargetY - kickY) / (42 + player.passing * 0.36), 0.2, 0.78),
      receiverId: receiver.id,
      passerId: owner.id,
      action: offside.isOffside ? 'offside-pass' : 'pass',
      passType,
      height: 0,
      arc: passType === 'cross' ? 10 : passType === 'lofted' ? 7 : passType === 'through' ? 1.5 : 0,
      claimChecked: false,
      claimPending: false,
      claimRoll: null,
      interceptionCheckedIds: [],
      offsideSnapshot: {
        isOffside: offside.isOffside,
        lineX: offside.lineX,
        secondLastOpponentId: offside.secondLastOpponentId || null,
        ballX: Number.isFinite(offside.ballX) ? offside.ballX : kickX,
        receiverX: Number.isFinite(offside.receiverX) ? offside.receiverX : receiver.x,
        evaluatedAt: Number.isFinite(offside.evaluatedAt) ? offside.evaluatedAt : this.state.minute
      },
      offsideLineX: offside.isOffside ? offside.lineX : null,
      offsidePlayerId: offside.isOffside ? receiver.id : null
    };
    this.state.phase = 'BUILD_UP';
  }

  resolveJourney() {
    const ball = this.state.ball;
    ball.height = 0;
    if (ball.action === 'shot' || ball.action === 'header' || ball.action === 'free-kick' || ball.action === 'penalty') {
      this.resolveShot(ball);
      return;
    }
    if (ball.action === 'offside-pass') {
      this.resolveOffside(ball);
      return;
    }
    if (ball.action === 'pass' && (ball.targetY <= 2.05 || ball.targetY >= 65.95)) {
      const passer = this.state.players[ball.passerId];
      const throwInSide = passer && passer.side === 'home' ? 'away' : 'home';
      this.awardThrowIn(throwInSide, ball.targetX, ball.targetY);
      return;
    }
    const receiver = this.state.players[ball.receiverId];
    const passer = this.getPlayer(ball.passerId);
    if (!receiver || !receiver.onField) return this.makeBallLoose(ball.x, ball.y);
    if (ball.passType === 'cross' || ball.passType === 'lofted') {
      this.resolveAerialDuel(receiver, ball);
      return;
    }
    const opponents = this.onField(receiver.side === 'home' ? 'away' : 'home')
      .filter(player => player.position !== 'GK')
      .sort((a, b) => this.distance(a, ball) - this.distance(b, ball));
    const interceptor = opponents[0];
    const interceptorDistance = interceptor ? this.distance(interceptor, ball) : Infinity;
    const pressure = interceptor ? Math.max(0, 13 - interceptorDistance) : 0;
    const interceptionChance = interceptor && interceptorDistance <= 4.5
      ? this.clamp(0.04 + pressure * 0.018 + this.getPlayer(interceptor.id).defending / 650 - passer.passing / 700, 0.025, 0.36)
      : 0;
    if (interceptor && this.random() < interceptionChance) {
      const passerState = this.state.players[ball.passerId];
      if (passerState) passerState.confidence = this.clamp((passerState.confidence || 70) - 2, 20, 100);
      if (!this.takeControlAtBall(interceptor, 5)) return this.makeBallLoose(ball.x, ball.y);
      this.addEvent('INTERCEPTION', `${interceptor.name} intercepta el pase`, null, interceptor.side);
      return;
    }
    const receiverDistance = this.distance(receiver, ball);
    const controlChance = receiverDistance <= 4.5
      ? this.clamp(0.7 + this.getPlayer(receiver.id).dribbling / 400 - pressure * 0.02 - receiverDistance * 0.025, 0.35, 0.96)
      : 0;
    if (this.random() < controlChance && this.takeControlAtBall(receiver, 4.5)) return;
    else this.makeBallLoose(ball.x, ball.y);
  }

  tryKeeperClaim(ball) {
    ball.claimPending = false;
    const passer = this.state.players[ball.passerId];
    if (!passer) return false;
    const defendingSide = passer.side === 'home' ? 'away' : 'home';
    const inBox = defendingSide === 'home' ? ball.targetX < 17 : ball.targetX > 83;
    if (!inBox || ball.targetY < 13 || ball.targetY > 55) return false;
    const keeper = this.onField(defendingSide).find(player => player.position === 'GK');
    if (!keeper) return false;
    const keeperDistance = this.distance(keeper, ball);
    if (keeperDistance > 8) return false;
    const keeperData = this.getPlayer(keeper.id);
    const passerData = this.getPlayer(passer.id);
    const claimChance = this.clamp(0.26 + keeperData.goalkeeping / 190 - passerData.passing / 330, 0.18, 0.72);
    if (!Number.isFinite(ball.claimRoll)) ball.claimRoll = this.random();
    if (ball.claimRoll >= claimChance) return false;
    if (keeperDistance > 3.2) {
      keeper.actionTargetX = this.clamp(ball.x, keeper.side === 'home' ? 2 : 82, keeper.side === 'home' ? 18 : 98);
      keeper.actionTargetY = this.clamp(ball.y, 13, 55);
      keeper.actionTargetUntil = this.state.minute + 0.35;
      keeper.targetX = keeper.actionTargetX;
      keeper.targetY = keeper.actionTargetY;
      ball.claimPending = true;
      return false;
    }
    // La distancia ya se ha validado contra el balón en vuelo. La posesión se
    // concede de forma atómica para no recolocar la pelota antes del contacto.
    if (!this.givePossession(keeper.id)) return false;
    this.addEvent('KEEPER_CLAIM', `${keeper.name} sale y atrapa el balón aéreo`, null, defendingSide);
    return true;
  }

  resolveAerialDuel(receiver, ball) {
    const opponents = this.onField(receiver.side === 'home' ? 'away' : 'home')
      .filter(player => !player.mustLeave)
      .sort((a, b) => this.distance(a, ball) - this.distance(b, ball));
    const defender = opponents[0];
    const receiverDistance = this.distance(receiver, ball);
    const defenderDistance = defender ? this.distance(defender, ball) : Infinity;
    if (receiverDistance > 5.5 && defenderDistance > 5.5) return this.makeBallLoose(ball.x, ball.y);
    const receiverData = this.getPlayer(receiver.id);
    const defenderData = defender ? this.getPlayer(defender.id) : null;
    const attackingScore = receiverDistance <= 5.5
      ? receiverData.physical * 0.55 + receiverData.overall * 0.45 + this.random() * 35 - receiverDistance * 2
      : -Infinity;
    const defendingScore = defenderData && defenderDistance <= 5.5
      ? defenderData.physical * 0.55 + defenderData.defending * 0.45 + this.random() * 35
      : -Infinity;
    const winner = attackingScore >= defendingScore ? receiver : defender;
    if (!winner) return this.makeBallLoose(ball.x, ball.y);
    this.addEvent('AERIAL_DUEL', `${winner.name} gana el duelo aéreo`, null, winner.side);
    const closeToGoal = receiver.side === 'home' ? ball.x > 82 : ball.x < 18;
    if (winner.id === receiver.id && ball.passType === 'cross' && closeToGoal && this.random() < 0.58) {
      this.startShot(receiver, false, 'header');
      return;
    }
    if (winner.id !== receiver.id && ['CB', 'RB', 'LB', 'CDM'].includes(winner.position)) {
      this.startClearance(winner);
      return;
    }
    if (!this.takeControlAtBall(winner, 5.5)) this.makeBallLoose(ball.x, ball.y);
  }

  startClearance(defender) {
    if (!defender || !defender.onField || !this.takeControlAtBall(defender, 5.5)) {
      this.makeBallLoose(this.state.ball.x, this.state.ball.y);
      return false;
    }
    const direction = defender.side === 'home' ? 1 : -1;
    const candidates = this.onField(defender.side)
      .filter(player => player.id !== defender.id && player.position !== 'GK' && !player.mustLeave)
      .filter(player => !this.getOffsideDecision(defender, player).isOffside)
      .sort((a, b) => {
        const advanceA = direction * (a.x - defender.x);
        const advanceB = direction * (b.x - defender.x);
        const scoreA = advanceA * 1.4 - this.distance(defender, a) * 0.35;
        const scoreB = advanceB * 1.4 - this.distance(defender, b) * 0.35;
        return scoreB - scoreA;
      });
    const receiver = candidates[0];
    if (!receiver) return true;
    this.addEvent('CLEARANCE', `${defender.name} despeja buscando a ${receiver.name}`, null, defender.side);
    this.startPass(defender, receiver.id);
    if (this.state.ball.state === 'passing') {
      this.state.ball.passType = 'lofted';
      this.state.ball.arc = 7;
      this.state.ball.duration = Math.max(this.state.ball.duration, 0.42);
    }
    return true;
  }

  getOffsideLine(side) {
    const opponents = this.onField(side === 'home' ? 'away' : 'home');
    if (opponents.length < 2) return side === 'home' ? 99 : 1;
    const sorted = [...opponents].sort((a, b) => side === 'home' ? b.x - a.x : a.x - b.x);
    const secondLastOpponent = sorted[1];
    return side === 'home'
      ? Math.max(secondLastOpponent.x, this.state.ball.x)
      : Math.min(secondLastOpponent.x, this.state.ball.x);
  }

  keepRunOnside(side, desiredX, margin = 1.2) {
    const lineX = this.getOffsideLine(side);
    return side === 'home'
      ? Math.min(desiredX, Math.max(49.5, lineX - margin))
      : Math.max(desiredX, Math.min(50.5, lineX + margin));
  }

  getOffsideDecision(passer, receiver) {
    const opponents = this.onField(receiver.side === 'home' ? 'away' : 'home');
    if (opponents.length < 2) return { isOffside: false, lineX: null };
    const homeAttacksRight = receiver.side === 'home';
    const sorted = [...opponents].sort((a, b) => homeAttacksRight ? b.x - a.x : a.x - b.x);
    const secondLastOpponent = sorted[1];
    const lineX = homeAttacksRight
      ? Math.max(secondLastOpponent.x, this.state.ball.x)
      : Math.min(secondLastOpponent.x, this.state.ball.x);
    const inOpposingHalf = homeAttacksRight ? receiver.x > 50 : receiver.x < 50;
    const aheadOfBall = homeAttacksRight ? receiver.x > this.state.ball.x + 0.5 : receiver.x < this.state.ball.x - 0.5;
    const beyondLine = homeAttacksRight ? receiver.x > lineX + 0.5 : receiver.x < lineX - 0.5;
    const distanceToLine = homeAttacksRight ? receiver.x - lineX : lineX - receiver.x;
    return {
      isOffside: inOpposingHalf && aheadOfBall && beyondLine,
      lineX,
      distanceToLine,
      secondLastOpponentId: secondLastOpponent.id,
      ballX: this.state.ball.x,
      receiverX: receiver.x,
      evaluatedAt: this.state.minute
    };
  }

  resolveOffside(ball) {
    const receiver = this.state.players[ball.offsidePlayerId || ball.receiverId];
    if (!receiver) return this.resetPossession();
    const defendingSide = receiver.side === 'home' ? 'away' : 'home';
    this.state.stats[receiver.side].offsides++;
    this.addEvent('OFFSIDE', `Fuera de juego de ${receiver.name}`, null, receiver.side);
    this.state.ball.ownerId = null;
    this.state.ball.state = 'set-piece';
    this.state.ball.x = ball.targetX;
    this.state.ball.y = ball.targetY;
    this.state.ball.offsideLineX = null;
    this.state.phase = 'SET_PIECE';
    this.state.restart = {
      type: 'indirect-free-kick',
      teamSide: defendingSide,
      x: ball.targetX,
      y: ball.targetY,
      wait: 0.45
    };
  }

  awardThrowIn(teamSide, x, y) {
    const touchlineY = y < 34 ? 1.5 : 66.5;
    const fromX = this.clamp(this.state.ball.x, 2, 98);
    const fromY = this.clamp(this.state.ball.y, 2, 66);
    const targetX = this.clamp(x, 4, 96);
    const travelDistance = Math.hypot(targetX - fromX, touchlineY - fromY);
    this.state.stats[teamSide].throwIns++;
    this.addEvent('THROW_IN', `Saque de banda para ${this.teamManager.getTeam(this.state.teams[teamSide].teamId).name}`, null, teamSide);
    this.state.ball = {
      ...this.state.ball,
      ownerId: null,
      state: travelDistance > 0.1 ? 'dead-ball-moving' : 'set-piece',
      action: null,
      x: fromX,
      y: fromY,
      fromX,
      fromY,
      targetX,
      targetY: touchlineY,
      progress: travelDistance > 0.1 ? 0 : 1,
      duration: this.clamp(travelDistance / 30, 0.08, 0.28),
      height: 0,
      arc: 0
    };
    const taker = this.onField(teamSide).filter(player => !player.mustLeave)
      .sort((a, b) => this.distance(a, { x: targetX, y: touchlineY }) - this.distance(b, { x: targetX, y: touchlineY }))[0];
    if (taker) {
      taker.actionTargetX = targetX;
      taker.actionTargetY = touchlineY < 34 ? 2 : 66;
      taker.actionTargetUntil = this.state.minute + 2.5;
      taker.targetX = taker.actionTargetX;
      taker.targetY = taker.actionTargetY;
    }
    this.state.phase = 'SET_PIECE';
    this.state.restart = {
      type: 'throw-in',
      teamSide,
      takerId: taker ? taker.id : null,
      x: targetX,
      y: touchlineY,
      wait: 0.8,
      clockElapsed: 0,
      setupTicks: 0
    };
  }

  resolveTackle(defender, attacker, forcedCollision = false) {
    const defenderData = this.getPlayer(defender.id);
    const attackerData = this.getPlayer(attacker.id);
    const pressure = this.getTeamState(defender.teamId).tactics.pressure;
    const attackerInBox = attacker.side === 'home' ? attacker.x > 84 : attacker.x < 16;
    const baseFoulChance = 0.14 + (pressure === 'Alta' ? 0.09 : 0) + (100 - defender.fitness) / 350;
    const foulChance = this.clamp(baseFoulChance * (attackerInBox ? 0.52 : 1), 0.055, 0.42);
    if (this.random() < foulChance) {
      this.commitFoul(defender, attacker);
      return;
    }
    if ((attacker.y < 8 || attacker.y > 60) && this.random() < 0.28) {
      const throwInSide = this.random() < 0.72 ? defender.side : attacker.side;
      this.awardThrowIn(throwInSide, (defender.x + attacker.x) / 2, attacker.y);
      return;
    }
    const winChance = this.clamp(
      0.35 + defenderData.defending / 220 + defenderData.physical / 500 - attackerData.dribbling / 260 +
        (forcedCollision ? 0.07 : 0),
      0.18,
      0.84
    );
    if (this.random() < winChance) {
      this.state.stats[defender.side].tackles++;
      if (!this.takeControlAtBall(defender, 3.8)) {
        this.makeBallLoose((defender.x + attacker.x) / 2, (defender.y + attacker.y) / 2);
        return;
      }
      if (this.random() < 0.3) this.addEvent('TACKLE', `${defender.name} roba el balón`, null, defender.side);
    } else if (forcedCollision && this.random() < 0.45) {
      this.makeBallLoose((defender.x + attacker.x) / 2, (defender.y + attacker.y) / 2);
      this.addEvent('DUEL', `${defender.name} y ${attacker.name} dejan el balón dividido`, null, null);
    } else {
      const escapeDirection = attacker.side === 'home' ? 1 : -1;
      attacker.actionTargetX = this.clamp(attacker.x + escapeDirection * 4, 3, 97);
      attacker.actionTargetY = this.clamp(attacker.y + (this.random() - .5) * 5, 3, 65);
      attacker.actionTargetUntil = this.state.minute + .45;
      attacker.targetX = attacker.actionTargetX;
      attacker.targetY = attacker.actionTargetY;
      this.state.ball.controlledSince = this.state.minute;
    }
  }

  commitFoul(defender, victim) {
    this.state.stats[defender.side].fouls++;
    const severity = this.random();
    const probabilities = this.getCardProbabilities();
    const cardRoll = this.random();
    let card = null;
    if (cardRoll < probabilities.red) card = 'red';
    else if (cardRoll < probabilities.red + probabilities.yellow) card = 'yellow';
    if (card && !this.giveCard(defender, card)) card = null;
    const foulX = victim.x;
    const inPenaltyArea = victim.side === 'home' ? foulX > 84 : foulX < 16;
    const restartType = inPenaltyArea ? 'penalty' : 'free-kick';
    this.addEvent('FOUL', `Falta de ${defender.name} sobre ${victim.name}${card ? ` · ${card === 'red' ? 'roja' : 'amarilla'}` : ''}`, null, defender.side);
    if (this.random() < 0.025 + severity * 0.035) this.injurePlayer(victim, defender);
    this.state.ball.ownerId = null;
    this.state.ball.state = 'set-piece';
    this.state.ball.x = victim.x;
    this.state.ball.y = victim.y;
    this.state.phase = 'SET_PIECE';
    // La colocación de la falta debe verse, pero no sentirse como una pausa.
    this.state.restart = { type: restartType, teamSide: victim.side, x: victim.x, y: victim.y, wait: 0.2 };
    this.state.referee.targetX = victim.x;
    this.state.referee.targetY = victim.y + 3;
    if (restartType === 'penalty') this.maybeCaptainProtest(defender.side, 'el penalti');
  }

  giveCard(playerState, card) {
    const stats = this.state.stats[playerState.side];
    if (card === 'yellow') {
      if (playerState.yellowCards >= 1 && this.totalRedCards() >= this.getMaxRedCards()) return false;
      playerState.yellowCards++;
      stats.yellowCards++;
      if (playerState.yellowCards >= 2) this.giveCard(playerState, 'red');
      return true;
    } else if (!playerState.redCards) {
      if (this.totalRedCards() >= this.getMaxRedCards()) return false;
      playerState.redCards = 1;
      stats.redCards++;
      playerState.onField = false;
      const teamState = this.state.teams[playerState.side];
      teamState.onField = teamState.onField.filter(id => id !== playerState.id);
      if (this.state.ball.ownerId === playerState.id) this.state.ball.ownerId = null;
      this.addEvent('RED_CARD', `Expulsado ${playerState.name}`, null, playerState.side, true);
      return true;
    }
    return false;
  }

  getCardProbabilities() {
    const strictness = this.clamp(Number(this.state.referee.cardStrictness) || 5, 1, 10);
    return {
      yellow: 0.075 + strictness * 0.027,
      red: 0.001 + strictness * strictness * 0.00022
    };
  }

  getMaxRedCards() {
    const strictness = this.clamp(Number(this.state.referee.cardStrictness) || 5, 1, 10);
    return strictness === 10 ? 3 : strictness >= 5 ? 2 : 1;
  }

  totalRedCards() {
    return this.state.stats.home.redCards + this.state.stats.away.redCards;
  }

  injurePlayer(victim, offender = null) {
    if (victim.injured) return;
    const diagnosis = this.createInjuryDiagnosis();
    victim.injured = true;
    victim.mustLeave = true;
    victim.fitness = Math.max(5, victim.fitness - diagnosis.fitnessLoss);
    const injury = {
      playerId: victim.id,
      teamId: victim.teamId,
      minute: this.state.displayMinute,
      severity: diagnosis.severity,
      diagnosis: diagnosis.name,
      weeksRemaining: diagnosis.weeks,
      matchesRemaining: diagnosis.weeks,
      causedBy: offender ? offender.id : null
    };
    this.state.injuries.push(injury);
    this.state.animations.medical = {
      playerId: victim.id,
      side: victim.side,
      elapsedSeconds: 0,
      durationSeconds: 9,
      fromX: victim.x,
      fromY: victim.y,
      player: { ...victim },
      medics: [
        { x: victim.x - 2, y: 70 },
        { x: victim.x + 2, y: 70 }
      ]
    };
    this.addStoppageTime(2);
    const durationText = diagnosis.weeks === 0
      ? 'sin baja posterior'
      : `${diagnosis.weeks} semana${diagnosis.weeks === 1 ? '' : 's'} de baja`;
    const isUserPlayer = victim.teamId === this.userTeamId;
    this.addEvent('INJURY', `${victim.name}: ${diagnosis.name} · ${durationText}`, null, victim.side, isUserPlayer);
    if (isUserPlayer && this.canReplaceInjuredPlayer(victim.side)) {
      this.state.requiredInjurySubstitution = { teamId: victim.teamId, playerId: victim.id };
    } else if (!isUserPlayer) {
      this.makeAutomaticSubstitution(victim.side, victim.id);
    }
  }

  createInjuryDiagnosis() {
    const roll = this.random();
    if (roll < 0.04) {
      return { severity: 'critical', name: 'Rotura del ligamento cruzado anterior', weeks: 22 + Math.floor(this.random() * 5), fitnessLoss: 45 };
    }
    if (roll < 0.11) {
      return { severity: 'very-severe', name: 'Fractura de peroné', weeks: 14 + Math.floor(this.random() * 7), fitnessLoss: 40 };
    }
    if (roll < 0.27) {
      return { severity: 'severe', name: 'Desgarro de isquiotibiales grado II', weeks: 5 + Math.floor(this.random() * 4), fitnessLoss: 32 };
    }
    if (roll < 0.55) {
      return { severity: 'moderate', name: 'Esguince de tobillo grado I', weeks: 1 + Math.floor(this.random() * 3), fitnessLoss: 22 };
    }
    return { severity: 'minor', name: 'Contusión muscular leve', weeks: 0, fitnessLoss: 12 };
  }

  canReplaceInjuredPlayer(side) {
    const teamState = this.state.teams[side];
    return teamState.substitutions < 5 && teamState.bench.some(id => {
      const player = this.state.players[id];
      return player && !player.appeared;
    });
  }

  getRequiredInjurySubstitution() {
    const requirement = this.state.requiredInjurySubstitution;
    if (!requirement) return null;
    const teamState = this.getTeamState(requirement.teamId);
    const player = this.state.players[requirement.playerId];
    if (!teamState || !player || !player.onField || !this.canReplaceInjuredPlayer(teamState.side)) {
      this.state.requiredInjurySubstitution = null;
      return null;
    }
    return requirement;
  }

  executeRestart() {
    const restart = this.state.restart;
    if (!restart) return;
    if (this.state.ball.state === 'dead-ball-moving') return;
    let taker = restart.takerId ? this.state.players[restart.takerId] : null;
    if (!taker || !taker.onField || taker.mustLeave) {
      taker = restart.type === 'throw-in'
        ? this.onField(restart.teamSide).filter(player => !player.mustLeave)
          .sort((a, b) => this.distance(a, restart) - this.distance(b, restart))[0]
        : this.bestSetPieceTaker(restart.teamSide, restart);
      restart.takerId = taker ? taker.id : null;
      restart.setupTicks = 0;
    }
    if (restart.type === 'throw-in' && (!taker || !taker.onField || taker.mustLeave)) {
      taker = this.onField(restart.teamSide).filter(player => !player.mustLeave)
        .sort((a, b) => this.distance(a, restart) - this.distance(b, restart))[0];
      restart.takerId = taker ? taker.id : null;
      restart.setupTicks = 0;
    }
    if (!taker) {
      this.state.restart = null;
      return this.resetPossession();
    }
    const takerTarget = restart.type === 'throw-in' ? {
      x: restart.x - (taker.side === 'home' ? 0.8 : -0.8),
      y: restart.y < 34 ? 2 : 66
    } : {
      x: restart.x - (taker.side === 'home' ? 0.8 : -0.8),
      y: restart.y
    };
    restart.setupTicks = (Number(restart.setupTicks) || 0) + 1;
    if (this.distance(taker, takerTarget) > 0.65) {
      taker.targetX = takerTarget.x;
      taker.targetY = takerTarget.y;
      taker.actionTargetX = taker.targetX;
      taker.actionTargetY = taker.targetY;
      taker.actionTargetUntil = this.state.minute + 0.5;
      restart.wait = 0.08;
      return;
    }
    this.state.restart = null;
    const attackingDistance = restart.teamSide === 'home' ? 100 - restart.x : restart.x;
    if (restart.type === 'throw-in') {
      const nearby = this.onField(restart.teamSide).filter(player => !player.mustLeave)
        .sort((a, b) => this.distance(a, restart) - this.distance(b, restart));
      const receiver = nearby.find(player => player.id !== taker.id) || nearby[0];
      taker.targetX = taker.x;
      taker.targetY = taker.y;
      this.givePossession(taker.id);
      // No existe fuera de juego directo desde un saque de banda.
      if (receiver && receiver.id !== taker.id) this.startPass(taker, receiver.id, { skipOffside: true });
    } else if (restart.type === 'indirect-free-kick') {
      this.addEvent('INDIRECT_FREE_KICK', `${taker.name} reanuda tras el fuera de juego`, null, restart.teamSide);
      this.givePossession(taker.id);
      this.startPass(taker);
    } else if (restart.type === 'penalty') {
      this.addEvent('PENALTY', `${taker.name} lanza el penalti`, null, restart.teamSide);
      this.startShot(taker, true, 'penalty');
    } else if (
      (this.state.teams[restart.teamSide].tactics.setPiecePreference === 'Disparar' && attackingDistance < 42) ||
      (attackingDistance < 32 && this.state.teams[restart.teamSide].tactics.setPiecePreference !== 'Corto' && this.random() < 0.64)
    ) {
      this.addEvent('FREE_KICK', `${taker.name} dispara la falta`, null, restart.teamSide);
      this.startShot(taker, true, 'free-kick');
    } else {
      this.addEvent('FREE_KICK', `${taker.name} pone el balón en juego`, null, restart.teamSide);
      this.givePossession(taker.id);
      this.startPass(taker);
    }
  }

  bestSetPieceTaker(side, restart = null) {
    return this.onField(side).filter(player => !player.mustLeave && player.position !== 'GK')
      .sort((a, b) => {
        const pa = this.getPlayer(a.id);
        const pb = this.getPlayer(b.id);
        const score = (state, player) => {
          const quality = restart?.type === 'penalty'
            ? player.shooting * 1.8 + player.overall * 0.4
            : player.shooting + player.passing;
          const travel = restart ? this.distance(state, restart) : 0;
          return quality - travel * (restart?.type === 'penalty' ? 1.4 : 2.8);
        };
        return score(b, pb) - score(a, pa);
      })[0];
  }

  startShot(shooter, setPiece = false, action = 'shot') {
    const side = shooter.side;
    const goalX = side === 'home' ? 96.5 : 3.5;
    this.state.stats[side].shots++;
    const player = this.getPlayer(shooter.id);
    const kickX = this.state.ball.x;
    const kickY = this.state.ball.y;
    const familiarity = this.state.teams[side].tacticalFamiliarity || 100;
    const adaptationMultiplier = 0.82 + familiarity * 0.0018;
    const confidenceMultiplier = 0.9 + (Number(shooter.confidence) || 50) / 500;
    const shotQuality = this.clamp((
      0.35 + player.shooting / 160 + (action === 'penalty' ? 0.25 : 0) +
        (action === 'header' ? player.physical / 500 - 0.13 : 0) - (setPiece && action !== 'penalty' ? 0.04 : 0)) * adaptationMultiplier * confidenceMultiplier,
      0.35,
      0.96
    );
    this.state.ball = {
      ...this.state.ball,
      ownerId: null,
      state: 'shooting',
      fromX: kickX, fromY: kickY,
      x: kickX, y: kickY,
      targetX: goalX,
      targetY: 29 + this.random() * 10,
      progress: 0,
      duration: 0.18,
      shooterId: shooter.id,
      receiverId: null,
      action,
      passType: action === 'header' ? 'header' : 'shot',
      height: 0,
      arc: action === 'header' ? 3 : 1.5,
      onTarget: true,
      shotQuality
    };
    this.state.phase = 'ATTACK';
  }

  resolveShot(ball) {
    const shooter = this.state.players[ball.shooterId];
    if (!shooter) return this.resetPossession();
    const defendingSide = shooter.side === 'home' ? 'away' : 'home';
    const keeper = this.onField(defendingSide).find(player => player.position === 'GK');
    const shooterData = this.getPlayer(shooter.id);
    const keeperData = keeper ? this.getPlayer(keeper.id) : null;
    const shotQuality = ball.shotQuality || shooterData.shooting / 100;
    const keeperQuality = keeperData ? keeperData.goalkeeping : 50;
    const goalChance = ball.action === 'penalty'
      ? this.clamp(0.72 + (shooterData.shooting - 75) / 350 - (keeperQuality - 75) / 500, 0.62, 0.82)
      : this.clamp(0.08 + shotQuality * 0.34 - keeperQuality / 600, 0.08, 0.42);
    const roll = this.random();
    const postChance = ball.action === 'penalty' ? 0.07 : 0.12;
    const isHeader = ball.action === 'header';
    if (roll < goalChance) {
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.score[shooter.side]++;
      shooter.goals++;
      shooter.confidence = this.clamp(shooter.confidence + 10, 0, 100);
      this.onField(shooter.side).filter(player => player.id !== shooter.id).forEach(player => { player.confidence = this.clamp(player.confidence + 2, 0, 100); });
      this.onField(defendingSide).forEach(player => { player.confidence = this.clamp(player.confidence - 2, 0, 100); });
      const goalContext = this.registerGoalContext(shooter.side);
      this.addEvent('GOAL', `⚽ ${isHeader ? 'Gol de cabeza' : 'Gol'} de ${shooter.name}`, null, shooter.side, shooter.teamId === this.userTeamId ? false : this.state.minute > 60);
      this.resetAfterGoal(defendingSide, shooter.id, goalContext);
    } else if (roll < goalChance + postChance) {
      shooter.confidence = this.clamp(shooter.confidence - 2, 0, 100);
      const postName = this.random() < 0.5 ? 'poste izquierdo' : 'poste derecho';
      this.addEvent('POST', `¡Al palo! El ${isHeader ? 'remate de cabeza' : 'disparo'} de ${shooter.name} golpea el ${postName}`, null, shooter.side);
      const reboundX = shooter.side === 'home' ? 96 : 4;
      const reboundY = this.random() < 0.5 ? 28 : 40;
      this.makeBallLoose(reboundX, reboundY);
    } else if (keeper) {
      shooter.confidence = this.clamp(shooter.confidence - 2, 0, 100);
      keeper.confidence = this.clamp(keeper.confidence + 5, 0, 100);
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.stats[defendingSide].saves++;
      this.addEvent('SAVE', `${keeper.name} detiene el ${isHeader ? 'remate de cabeza' : 'disparo'}`, null, defendingSide);
      if (this.distance(keeper, this.state.ball) <= 3.2 && this.givePossession(keeper.id)) {
        this.state.ball.heldByKeeper = true;
        this.state.ball.heldUntil = this.state.minute + 0.6;
        keeper.actionTargetX = keeper.x;
        keeper.actionTargetY = keeper.y;
        keeper.actionTargetUntil = this.state.ball.heldUntil;
      } else {
        // Si no alcanza el punto de impacto no aparece con el balón: lo desvía
        // y debe disputar el rechace desde su posición real.
        const reboundX = this.clamp(ball.x + (defendingSide === 'home' ? 2.4 : -2.4), 2, 98);
        const reboundY = this.clamp(ball.y + (this.random() < 0.5 ? -2.5 : 2.5), 2, 66);
        this.makeBallLoose(reboundX, reboundY);
        keeper.actionTargetX = reboundX;
        keeper.actionTargetY = reboundY;
        keeper.actionTargetUntil = this.state.minute + 0.5;
      }
    } else {
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.score[shooter.side]++;
      shooter.goals++;
      shooter.confidence = this.clamp(shooter.confidence + 10, 0, 100);
      const goalContext = this.registerGoalContext(shooter.side);
      this.addEvent('GOAL', `⚽ ${isHeader ? 'Gol de cabeza' : 'Gol'} de ${shooter.name}`, null, shooter.side);
      this.resetAfterGoal(defendingSide, shooter.id, goalContext);
    }
  }

  registerGoalContext(scoringSide) {
    const opponentSide = scoringSide === 'home' ? 'away' : 'home';
    const scoringGoals = this.state.score[scoringSide];
    const opponentGoals = this.state.score[opponentSide];
    const context = {
      late: this.state.minute >= 80,
      equalizer: scoringGoals === opponentGoals,
      comeback: this.state.hasTrailed[scoringSide] && scoringGoals > opponentGoals,
      lateGoAhead: this.state.minute >= 70 && scoringGoals === opponentGoals + 1
    };
    if (scoringGoals > opponentGoals) this.state.hasTrailed[opponentSide] = true;
    return context;
  }

  resetAfterGoal(kickoffSide, scorerId = null, goalContext = null) {
    const scoringSide = kickoffSide === 'home' ? 'away' : 'home';
    const types = ['SOLO_CORNER', 'TRIO_CORNER', 'TEAM_CORNER', 'SIDELINE_RUN', 'GOAL_HUDDLE'];
    const type = types[Math.floor(this.random() * types.length)];
    const upperCorner = this.random() < 0.5;
    const importance = goalContext || { late: false, equalizer: false, comeback: false, lateGoAhead: false };
    const baseDuration = 6 + Math.floor(this.random() * 7);
    const durationSeconds = this.clamp(
      baseDuration + (importance.late ? 6 : 0) + (importance.equalizer ? 5 : 0) +
        (importance.comeback ? 7 : 0) + (importance.lateGoAhead ? 3 : 0),
      6,
      25
    );
    // El portero conserva su posición durante las celebraciones para que el
    // bloque nunca aparezca por detrás de él en la transición al saque.
    const eligible = this.onField(scoringSide).filter(player => !player.mustLeave && player.position !== 'GK');
    const scorer = this.state.players[scorerId] || eligible.find(player => player.position !== 'GK') || eligible[0];
    const closest = scorer ? eligible.filter(player => player.id !== scorer.id)
      .sort((a, b) => this.distance(a, scorer) - this.distance(b, scorer)) : [];
    let participants = scorer ? [scorer] : [];
    if (type === 'TRIO_CORNER' || type === 'SIDELINE_RUN') participants = [...participants, ...closest.slice(0, 2)];
    else if (type === 'TEAM_CORNER') participants = eligible;
    else if (type === 'GOAL_HUDDLE') participants = [...participants, ...closest.slice(0, 4)];
    this.state.celebration = {
      type,
      scoringSide,
      kickoffSide,
      scorerId: scorer ? scorer.id : null,
      participantIds: participants.map(player => player.id),
      cornerX: scoringSide === 'home' ? 98 : 2,
      cornerY: upperCorner ? 2 : 66,
      importance,
      durationSeconds,
      remainingSeconds: durationSeconds
    };
    this.state.goalBallReturn = null;
    this.state.ball = {
      ...this.state.ball,
      x: scoringSide === 'home' ? 101.3 : -1.3,
      targetX: scoringSide === 'home' ? 101.3 : -1.3,
      ownerId: null,
      state: 'dead',
      action: null,
      receiverId: null,
      height: 0,
      arc: 0
    };
    this.state.phase = 'GOAL_CELEBRATION';
    this.maybeCaptainProtest(kickoffSide, 'el gol');
  }

  completeGoalCelebration(kickoffSide) {
    Object.values(this.state.players).forEach(player => {
      if (player.onField) player.actionTargetUntil = 0;
    });
    const reposition = this.createKickoffReposition(kickoffSide);
    this.state.celebration = null;
    this.state.goalBallReturn = {
      kickoffSide,
      elapsedSeconds: 0,
      durationSeconds: 3,
      fromX: this.state.ball.x,
      fromY: this.state.ball.y,
      playerOrigins: reposition.origins,
      playerTargets: reposition.targets,
      kickoffPlayerId: reposition.kickoffPlayerId
    };
    this.state.ball.ownerId = null;
    this.state.ball.state = 'returning';
    this.state.ball.fromX = this.state.ball.x;
    this.state.ball.fromY = this.state.ball.y;
    this.state.ball.targetX = 50;
    this.state.ball.targetY = 34;
    this.state.phase = 'KICK_OFF_SETUP';
  }

  makeBallLoose(x, y) {
    const numericX = Number(x);
    const numericY = Number(y);
    const safeX = this.clamp(Number.isFinite(numericX) ? numericX : 50, 2, 98);
    const safeY = this.clamp(Number.isFinite(numericY) ? numericY : 34, 2, 66);
    this.state.ball = {
      ...this.state.ball,
      x: safeX, y: safeY, fromX: safeX, fromY: safeY, targetX: safeX, targetY: safeY,
      ownerId: null, receiverId: null, passerId: null,
      state: 'loose', action: null, height: 0, arc: 0, progress: 1
    };
    this.state.phase = 'LOOSE_BALL';
  }

  resolveLooseBall() {
    const candidates = [...this.onField('home'), ...this.onField('away')]
      .filter(player => !player.mustLeave)
      .sort((a, b) => this.looseBallDistance(a) - this.looseBallDistance(b));
    const winner = candidates[0];
    if (!winner) return this.resetPossession();
    const challengers = ['home', 'away'].map(side => candidates.find(player => player.side === side)).filter(Boolean);
    challengers.forEach(player => {
      player.actionTargetX = this.state.ball.x;
      player.actionTargetY = this.state.ball.y;
      player.actionTargetUntil = this.state.minute + 0.8;
      player.targetX = this.state.ball.x;
      player.targetY = this.state.ball.y;
    });
    ['home', 'away'].forEach(side => {
      const challenger = challengers.find(player => player.side === side);
      const cover = candidates.find(player => player.side === side && player.id !== challenger?.id && player.position !== 'GK');
      if (!challenger || !cover) return;
      const direction = side === 'home' ? 1 : -1;
      cover.actionTargetX = this.clamp(this.state.ball.x - direction * 5, 3, 97);
      cover.actionTargetY = this.clamp(this.state.ball.y + (cover.baseY < this.state.ball.y ? -4 : 4), 3, 65);
      cover.actionTargetUntil = this.state.minute + 0.6;
      cover.targetX = cover.actionTargetX;
      cover.targetY = cover.actionTargetY;
    });
    const collectionDistance = winner.position === 'GK' && this.isBallInOwnPenaltyArea(winner.side) ? 4.2 : 2.8;
    if (this.distance(winner, this.state.ball) < collectionDistance) {
      this.takeControlAtBall(winner, collectionDistance);
    }
  }

  isBallInOwnPenaltyArea(side, ball = this.state.ball) {
    if (!ball) return false;
    const insideLength = side === 'home' ? ball.x <= 18 : ball.x >= 82;
    return insideLength && ball.y >= 12 && ball.y <= 56;
  }

  looseBallDistance(player) {
    const inOwnBox = this.isBallInOwnPenaltyArea(player.side);
    const keeperBonus = player.position === 'GK' && inOwnBox ? 9 : 0;
    return this.distance(player, this.state.ball) - keeperBonus;
  }

  givePossession(playerId) {
    const player = this.state.players[playerId];
    if (!player || !player.onField || player.mustLeave) return false;
    const previousSide = this.state.possessionSide || this.ownerSide();
    if (previousSide && previousSide !== player.side) {
      this.state.possessionChangedAt = this.state.minute;
      this.state.transitionUntil = this.state.minute + 1.4;
      this.state.phase = 'TRANSITION';
    }
    this.state.possessionSide = player.side;
    const contactX = this.clamp(player.x + (player.side === 'home' ? 0.8 : -0.8), 2, 98);
    const contactY = this.clamp(player.y, 2, 66);
    this.state.ball.ownerId = playerId;
    this.state.ball.state = 'controlled';
    this.state.ball.action = null;
    this.state.ball.x = contactX;
    this.state.ball.y = contactY;
    this.state.ball.fromX = contactX;
    this.state.ball.fromY = contactY;
    this.state.ball.targetX = contactX;
    this.state.ball.targetY = contactY;
    this.state.ball.progress = 1;
    this.state.ball.height = 0;
    this.state.ball.arc = 0;
    this.state.ball.receiverId = null;
    this.state.ball.passerId = null;
    this.state.ball.shooterId = null;
    this.state.ball.offsideLineX = null;
    this.state.ball.offsidePlayerId = null;
    this.state.ball.offsideSnapshot = null;
    this.state.ball.heldByKeeper = false;
    this.state.ball.heldUntil = null;
    this.state.ball.controlledSince = this.state.minute;
    // Al quedar controlado el balón terminan las carreras asociadas al pase o
    // al duelo anterior. Si alguna quedó más allá de la línea, vuelve a una
    // referencia legal antes de que el nuevo poseedor decida.
    this.onField(player.side)
      .filter(teammate => teammate.id !== player.id && !teammate.isPressing &&
        ['ST', 'CF', 'RW', 'LW'].includes(teammate.position) && !teammate.mustLeave)
      .sort((a, b) => a.baseY - b.baseY)
      .forEach((teammate, index) => {
        const safeTargetX = this.keepRunOnside(player.side, teammate.targetX, 2.8 + index * 0.65);
        if (safeTargetX === teammate.targetX) return;
        teammate.targetX = safeTargetX;
        teammate.actionTargetUntil = this.state.minute;
      });
    if (this.state.transitionUntil <= this.state.minute) this.state.phase = 'BUILD_UP';
    return true;
  }

  takeControlAtBall(player, maxDistance = 4) {
    // El receptor conserva su posición real. La interpolación visual acerca la
    // pelota a su pie en el siguiente fotograma, sin hacer aparecer al jugador.
    if (!player || !player.onField || this.distance(player, this.state.ball) > maxDistance) return false;
    return this.givePossession(player.id);
  }

  resetPossession(preferredSide = null) {
    const side = preferredSide || (this.random() < 0.5 ? 'home' : 'away');
    const candidates = this.onField(side).filter(player => !player.mustLeave)
      .sort((a, b) => this.distance(a, this.state.ball) - this.distance(b, this.state.ball));
    const owner = candidates[0];
    if (owner) {
      if (this.distance(owner, this.state.ball) <= 2.8) this.givePossession(owner.id);
      else this.makeBallLoose(this.state.ball.x, this.state.ball.y);
    }
  }

  ownerSide() {
    const owner = this.state.players[this.state.ball.ownerId];
    return owner ? owner.side : null;
  }

  runAI() {
    const aiSide = this.homeTeam.id === this.userTeamId ? 'away' : 'home';
    const minute = Math.floor(this.state.minute);
    const checkpoint = [30, 60, 75].find(value => minute >= value && !this.state.aiCheckpoints.includes(value));
    if (!checkpoint) return;
    this.state.aiCheckpoints.push(checkpoint);
    const losing = this.state.score[aiSide] < this.state.score[aiSide === 'home' ? 'away' : 'home'];
    const winning = this.state.score[aiSide] > this.state.score[aiSide === 'home' ? 'away' : 'home'];
    const tactics = losing
      ? { mentality: checkpoint >= 75 ? 'Muy Ofensiva' : 'Ofensiva', pressure: 'Alta', tempo: 'Alto' }
      : winning && checkpoint >= 75
        ? { mentality: 'Defensiva', pressure: 'Media', tempo: 'Bajo' }
        : {};
    if (Object.keys(tactics).length) this.applyTactics(this.state.teams[aiSide].teamId, tactics, true);
    if (checkpoint >= 60) {
      const tired = this.onField(aiSide).filter(player => player.position !== 'GK')
        .sort((a, b) => a.fitness - b.fitness)[0];
      if (tired && (tired.fitness < 78 || checkpoint >= 75)) this.makeAutomaticSubstitution(aiSide, tired.id);
    }
  }

  applyTactics(teamId, changes, isAI = false) {
    const teamState = this.getTeamState(teamId);
    if (!teamState) return { valid: false, error: 'Equipo no encontrado' };
    const allowed = ['mentality', 'pressure', 'tempo', 'width', 'passStyle', 'defensiveLine', 'setPiecePreference', 'situationalInstruction', 'pressTargetId'];
    allowed.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(changes, key)) teamState.tactics[key] = changes[key];
    });
    if (changes.strategy && changes.strategy !== teamState.strategy && DATA.TACTICAL_STRATEGIES[changes.strategy]) {
      teamState.strategy = changes.strategy;
      teamState.tactics = { ...teamState.tactics, ...DATA.TACTICAL_STRATEGIES[changes.strategy] };
      const team = this.teamManager.getTeam(teamId);
      teamState.tacticalFamiliarity = this.teamManager.getStrategyFamiliarity(team, changes.strategy);
    }
    this.state.decisions.push({ minute: this.state.displayMinute, teamId, type: 'tactics', changes: { ...changes }, isAI });
    const team = this.teamManager.getTeam(teamId);
    const adaptation = teamState.tacticalFamiliarity < 90 ? ` · adaptación ${teamState.tacticalFamiliarity}%` : '';
    this.addEvent('TACTICS', `${team.name} modifica sus instrucciones${adaptation}`, null, teamState.side);
    return { valid: true };
  }

  makeSubstitution(teamId, playerOutId, playerInId, isAI = false) {
    const teamState = this.getTeamState(teamId);
    if (!teamState) return { valid: false, error: 'Equipo no encontrado' };
    if (teamState.substitutions >= 5) return { valid: false, error: 'No quedan sustituciones' };
    const outgoing = this.state.players[playerOutId];
    const incoming = this.state.players[playerInId];
    if (!outgoing || outgoing.teamId !== teamId || !outgoing.onField) return { valid: false, error: 'El jugador saliente no está en el campo' };
    if (!incoming || incoming.teamId !== teamId || incoming.onField || incoming.appeared || !teamState.bench.includes(playerInId)) {
      return { valid: false, error: 'El suplente no está disponible' };
    }
    const outgoingOwnedBall = this.state.ball.ownerId === playerOutId;
    const ballBeforeChange = { x: this.state.ball.x, y: this.state.ball.y };
    const benchX = teamState.side === 'home' ? 38 : 62;
    if (!this.state.animations.medical || this.state.animations.medical.playerId !== outgoing.id) {
      this.state.animations.substitutions.push({
        type: 'substitution',
        side: teamState.side,
        elapsedSeconds: 0,
        durationSeconds: 7,
        fromX: outgoing.x,
        fromY: outgoing.y,
        toX: benchX,
        toY: 70,
        player: { ...outgoing }
      });
    }
    outgoing.onField = false;
    outgoing.substitutedOut = true;
    outgoing.confidence = this.clamp(outgoing.confidence - (outgoing.injured || outgoing.fitness < 55 ? 0 : 3), 0, 100);
    incoming.onField = true;
    incoming.appeared = true;
    incoming.confidence = this.clamp(incoming.confidence + 3, 0, 100);
    incoming.fitness = Number(this.getPlayer(playerInId).fitness) || 100;
    incoming.x = benchX;
    incoming.y = 69;
    incoming.baseX = outgoing.baseX;
    incoming.baseY = outgoing.baseY;
    incoming.assignedPosition = outgoing.assignedPosition;
    incoming.formationLine = outgoing.formationLine;
    incoming.targetX = outgoing.baseX;
    incoming.targetY = outgoing.baseY;
    teamState.onField = teamState.onField.map(id => id === playerOutId ? playerInId : id);
    teamState.bench = teamState.bench.filter(id => id !== playerInId);
    teamState.bench.push(playerOutId);
    teamState.usedPlayers.push(playerInId);
    teamState.substitutions++;
    if (teamState.captainId === playerOutId) this.assignNewCaptain(teamState);
    if (this.state.requiredInjurySubstitution && this.state.requiredInjurySubstitution.playerId === playerOutId) {
      this.state.requiredInjurySubstitution = null;
    }
    // El suplente todavía está entrando desde el área técnica. Nunca puede
    // heredar allí el balón del jugador sustituido.
    if (outgoingOwnedBall) this.makeBallLoose(ballBeforeChange.x, ballBeforeChange.y);
    this.state.decisions.push({ minute: this.state.displayMinute, teamId, type: 'substitution', playerOutId, playerInId, isAI });
    this.addEvent('SUBSTITUTION', `Entra ${incoming.name} por ${outgoing.name}`, null, teamState.side);
    this.addStoppageTime(1);
    return { valid: true };
  }

  assignNewCaptain(teamState) {
    const candidates = teamState.onField.map(id => this.state.players[id]).filter(player => player && player.onField);
    const reason = teamState.captainReason === 'veteranía' ? 'age' : 'overall';
    const captain = candidates.sort((a, b) => {
      const playerA = this.getPlayer(a.id);
      const playerB = this.getPlayer(b.id);
      return (Number(playerB[reason]) || 0) - (Number(playerA[reason]) || 0);
    })[0];
    Object.values(this.state.players).filter(player => player.teamId === teamState.teamId)
      .forEach(player => { player.isCaptain = Boolean(captain && player.id === captain.id); });
    teamState.captainId = captain ? captain.id : null;
  }

  makeAutomaticSubstitution(side, playerOutId) {
    const teamState = this.state.teams[side];
    const outgoing = this.state.players[playerOutId];
    if (!outgoing || teamState.substitutions >= 5) return false;
    const bench = teamState.bench.map(id => this.state.players[id])
      .filter(player => player && !player.appeared)
      .sort((a, b) => {
        return this.getAutomaticSubstitutionScore(b, outgoing) - this.getAutomaticSubstitutionScore(a, outgoing);
      });
    if (!bench.length) return false;
    return this.makeSubstitution(teamState.teamId, playerOutId, bench[0].id, true).valid;
  }

  getAutomaticSubstitutionScore(candidate, outgoing) {
    const line = position => position === 'GK' ? 'GK' :
      ['CB', 'RB', 'LB'].includes(position) ? 'DEF' :
        ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position) ? 'MID' : 'ATK';
    const exactPosition = candidate.position === outgoing.position ? 1000 : 0;
    const sameLine = line(candidate.position) === line(outgoing.position) ? 420 : 0;
    const data = this.getPlayer(candidate.id);
    return exactPosition + sameLine + data.overall * 3 + candidate.fitness;
  }

  finishMatch() {
    if (this.state.complete) return this.getResult();
    const finalMinute = 90 + this.state.addedTime.secondHalf;
    this.state.minute = finalMinute;
    this.state.displayMinute = finalMinute;
    this.state.complete = true;
    this.state.status = 'complete';
    this.state.phase = 'FULL_TIME';
    this.state.ball.ownerId = null;
    this.addEvent('END_MATCH', 'Final del partido', finalMinute);
    return this.getResult();
  }

  commitPlayerStats() {
    if (this.committed) return false;
    Object.values(this.state.players).forEach(state => {
      if (!state.appeared) return;
      const player = this.getPlayer(state.id);
      player.matchesPlayed = (player.matchesPlayed || 0) + 1;
      player.goals = (player.goals || 0) + state.goals;
      player.assists = (player.assists || 0) + state.assists;
      player.yellowCards = (player.yellowCards || 0) + state.yellowCards;
      player.redCards = (player.redCards || 0) + state.redCards;
      player.fitness = Math.max(20, Math.round(state.fitness));
      player.morale = this.clamp(Math.round((Number(player.morale) || 75) + (state.confidence - 60) * 0.12), 20, 100);
      const injury = this.state.injuries.find(item => item.playerId === state.id && item.weeksRemaining > 0);
      if (injury) player.injury = {
        severity: injury.severity,
        diagnosis: injury.diagnosis,
        weeksRemaining: injury.weeksRemaining,
        matchesRemaining: injury.weeksRemaining
      };
    });
    this.committed = true;
    return true;
  }

  addEvent(type, narration, minute = null, side = null, requiresAttention = false) {
    this.state.events.push(this.makeEvent(type, narration, minute, side, requiresAttention));
  }

  makeEvent(type, narration, minute = null, side = null, requiresAttention = false) {
    return {
      id: `${type}-${this.seed}-${Math.floor((minute == null ? (this.state ? this.state.minute : 0) : minute) * 100)}-${Math.floor(this.random() * 100000)}`,
      type,
      narration: `${Math.ceil(minute == null ? (this.state ? this.state.minute : 0) : minute)}' ${narration}`,
      minute: Math.ceil(minute == null ? (this.state ? this.state.minute : 0) : minute),
      side,
      requiresAttention
    };
  }

  getLiveState() {
    return this.state;
  }

  getVisualSnapshot() {
    return {
      revision: Number(this.state.visualRevision) || 0,
      minute: this.state.displayMinute,
      phase: this.state.phase,
      players: Object.values(this.state.players).filter(player => player.onField),
      benches: ['home', 'away'].map(side => ({
        side,
        players: this.state.teams[side].bench.map(id => this.state.players[id]).filter(Boolean)
      })),
      coaches: Object.values(this.state.coaches),
      animations: this.state.animations,
      ball: { ...this.state.ball },
      referee: { ...this.state.referee }
    };
  }

  getResult() {
    return {
      homeGoals: this.state.score.home,
      awayGoals: this.state.score.away,
      matchState: this.state,
      events: this.state.events
    };
  }

  getNewEvents(cursor = 0) {
    return this.state.events.slice(cursor);
  }

  getPlayer(id) {
    const state = this.state && this.state.players ? this.state.players[id] : null;
    if (state) return this.teamManager.getPlayer(state.teamId, id);
    return this.homeTeam.players.find(player => player.id === id) || this.awayTeam.players.find(player => player.id === id);
  }

  getTeamState(teamId) {
    return Object.values(this.state.teams).find(team => team.teamId === teamId) || null;
  }

  onField(side) {
    return this.state.teams[side].onField.map(id => this.state.players[id]).filter(player => player && player.onField);
  }

  distance(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  random() {
    this.randomState = (this.randomState * 48271) % 2147483647;
    return this.randomState / 2147483647;
  }

  serialize() {
    return JSON.stringify({
      version: 2,
      homeTeamId: this.homeTeam.id,
      awayTeamId: this.awayTeam.id,
      userTeamId: this.userTeamId,
      halfDuration: this.halfDuration,
      seed: this.seed,
      randomState: this.randomState,
      committed: this.committed,
      state: this.state
    });
  }

  static deserialize(data, teamManager) {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const engine = new LiveMatchEngine(
      teamManager.getTeam(parsed.homeTeamId),
      teamManager.getTeam(parsed.awayTeamId),
      teamManager,
      {
        userTeamId: parsed.userTeamId,
        halfDuration: parsed.halfDuration,
        seed: parsed.seed,
        state: parsed.state
      }
    );
    engine.randomState = parsed.randomState || parsed.seed;
    engine.committed = !!parsed.committed;
    if (!engine.state.possessionSide) engine.state.possessionSide = engine.ownerSide();
    if (!Number.isFinite(engine.state.visualRevision)) engine.state.visualRevision = 0;
    if (!engine.state.firstHalfKickoffSide) engine.state.firstHalfKickoffSide = engine.state.possessionSide || 'home';
    if (!engine.state.secondHalfKickoffSide) {
      engine.state.secondHalfKickoffSide = engine.state.firstHalfKickoffSide === 'home' ? 'away' : 'home';
    }
    if (!engine.state.hasTrailed) engine.state.hasTrailed = { home: false, away: false };
    if (!Number.isFinite(engine.state.possessionChangedAt)) engine.state.possessionChangedAt = 0;
    if (!Number.isFinite(engine.state.transitionUntil)) engine.state.transitionUntil = 0;
    if (!engine.state.celebration) engine.state.celebration = null;
    else {
      const celebration = engine.state.celebration;
      if (!celebration.type) celebration.type = 'TEAM_CORNER';
      if (!Array.isArray(celebration.participantIds)) {
        celebration.participantIds = engine.onField(celebration.scoringSide)
          .filter(player => player.position !== 'GK').map(player => player.id);
      }
      if (!celebration.importance) celebration.importance = { late: false, equalizer: false, comeback: false, lateGoAhead: false };
    }
    if (!engine.state.goalBallReturn) engine.state.goalBallReturn = null;
    if (!engine.state.halfTimeTransition) engine.state.halfTimeTransition = null;
    if (!engine.state.animations) engine.state.animations = { substitutions: [], medical: null, captainProtest: null };
    if (typeof engine.state.animations.captainProtest === 'undefined') engine.state.animations.captainProtest = null;
    ['home', 'away'].forEach(side => {
      const teamState = engine.state.teams[side];
      const team = teamManager.getTeam(teamState.teamId);
      teamState.strategy = teamState.strategy || team.strategy;
      teamState.naturalStrategy = teamState.naturalStrategy || team.naturalStrategy;
      teamState.tacticalFamiliarity = Number(teamState.tacticalFamiliarity) || team.tacticalFamiliarity || 100;
      teamState.formationAssignments = teamManager.assignLineupToFormation(teamState.teamId, teamState.onField);
      teamState.formationAssignments.forEach(assignment => {
        const playerState = engine.state.players[assignment.playerId];
        const player = teamManager.getPlayer(teamState.teamId, assignment.playerId);
        if (!playerState || !player) return;
        playerState.assignedPosition = assignment.slotPosition;
        playerState.formationLine = assignment.line;
        const anchor = engine.getAnchor(player, teamState, teamState.onField);
        playerState.baseX = anchor.x;
        playerState.baseY = anchor.y;
      });
      if (!teamState.captainId || !engine.state.players[teamState.captainId]?.onField) {
        teamState.captainReason = teamState.captainReason || 'calidad';
        engine.assignNewCaptain(teamState);
      } else {
        engine.state.players[teamState.captainId].isCaptain = true;
      }
    });
    Object.values(engine.state.players).forEach(player => {
      if (!Number.isFinite(player.velocityX)) player.velocityX = 0;
      if (!Number.isFinite(player.velocityY)) player.velocityY = 0;
      if (!player.targetIntent) player.targetIntent = 'formation';
    });
    if (!engine.state.animations) engine.state.animations = { substitutions: [], medical: null };
    if (!Array.isArray(engine.state.animations.substitutions)) engine.state.animations.substitutions = [];
    if (typeof engine.state.requiredInjurySubstitution === 'undefined') engine.state.requiredInjurySubstitution = null;
    (engine.state.injuries || []).forEach(injury => {
      if (!Number.isFinite(injury.weeksRemaining)) injury.weeksRemaining = Number(injury.matchesRemaining) || 0;
      if (!Number.isFinite(injury.matchesRemaining)) injury.matchesRemaining = injury.weeksRemaining;
      if (!injury.diagnosis) injury.diagnosis = injury.severity === 'moderate' ? 'Lesión muscular moderada' : 'Contusión muscular leve';
    });
    if (!engine.state.coaches) {
      engine.state.coaches = {
        home: { side: 'home', x: 35, y: 73.5, targetX: 35, targetY: 73.5, location: 'bench', dismissed: false, nextMoveAt: engine.state.minute + 1 },
        away: { side: 'away', x: 65, y: 73.5, targetX: 65, targetY: 73.5, location: 'bench', dismissed: false, nextMoveAt: engine.state.minute + 1 }
      };
    }
    Object.values(engine.state.coaches).forEach(coach => {
      const center = coach.side === 'home' ? 35 : 65;
      if (!Number.isFinite(coach.y)) coach.y = 73.5;
      if (!Number.isFinite(coach.targetY)) coach.targetY = coach.y;
      if (!Number.isFinite(coach.targetX)) coach.targetX = center;
      if (!coach.location) coach.location = coach.y > 71 ? 'bench' : 'technical-area';
    });
    if (typeof engine.state.coachDismissal === 'undefined') engine.state.coachDismissal = null;
    if (!engine.state.addedTime) engine.state.addedTime = { firstHalf: 3, secondHalf: 5 };
    if (!Number.isFinite(engine.state.addedTime.firstHalf)) engine.state.addedTime.firstHalf = 3;
    if (!Number.isFinite(engine.state.addedTime.secondHalf)) engine.state.addedTime.secondHalf = 5;
    ['home', 'away'].forEach(side => {
      if (!Number.isFinite(engine.state.stats[side].throwIns)) engine.state.stats[side].throwIns = 0;
    });
    const migratedKits = engine.selectMatchKits();
    ['home', 'away'].forEach(side => {
      if (!engine.state.teams[side].kitColor) engine.state.teams[side].kitColor = migratedKits[side].color;
      if (!engine.state.teams[side].kitType) engine.state.teams[side].kitType = migratedKits[side].type;
    });
    if (!Number.isFinite(engine.state.ball.height)) engine.state.ball.height = 0;
    if (!Number.isFinite(engine.state.ball.arc)) engine.state.ball.arc = 0;
    if (!engine.state.ball.passType) engine.state.ball.passType = 'ground';
    if (!Number.isFinite(engine.state.referee.cardStrictness)) engine.state.referee.cardStrictness = 5;
    engine.state.referee.cardStrictness = engine.clamp(Math.round(engine.state.referee.cardStrictness), 1, 10);
    engine.state.referee.maxRedCards = engine.getMaxRedCards();
    Object.values(engine.state.players || {}).forEach(player => {
      if (!Number.isFinite(player.baseX)) player.baseX = player.x;
      if (!Number.isFinite(player.baseY)) player.baseY = player.y;
      if (!Number.isFinite(player.actionTargetUntil)) player.actionTargetUntil = 0;
      if (!Number.isFinite(player.lastDuelMinute)) player.lastDuelMinute = -1;
      if (!Number.isFinite(player.actionTargetX)) player.actionTargetX = player.x;
      if (!Number.isFinite(player.actionTargetY)) player.actionTargetY = player.y;
      if (typeof player.isPressing !== 'boolean') player.isPressing = false;
      if (typeof player.isCovering !== 'boolean') player.isCovering = false;
      const data = engine.getPlayer(player.id);
      player.role = player.role || (data && data.role) || 'Sin rol';
      if (!Number.isFinite(player.confidence)) player.confidence = engine.clamp(35 + (Number(data && data.morale) || 75) * .4, 35, 80);
    });
    // También normaliza partidas guardadas con la antigua equipación distinta.
    engine.assignGoalkeeperKits(engine.state.players);
    return engine;
  }
}

if (typeof module === 'undefined') window.LiveMatchEngine = LiveMatchEngine;
