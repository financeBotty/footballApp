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
    const home = this.createTeamState(this.homeTeam, 'home');
    const away = this.createTeamState(this.awayTeam, 'away');
    const firstOwner = this.random() < 0.5 ? home.onField[8] : away.onField[8];
    const owner = firstOwner || home.onField.find(Boolean) || away.onField.find(Boolean);
    const players = this.createPlayerStates(home, away);
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
        passType: 'ground', height: 0, arc: 0
      },
      referee: { x: 48, y: 42, targetX: 48, targetY: 42 },
      restart: null,
      events: [this.makeEvent('START_MATCH', 'Comienza el partido', 0)],
      eventCursor: 0,
      injuries: [],
      decisions: [],
      lastActionMinute: 0,
      possessionSide: home.onField.includes(owner) ? 'home' : 'away',
      possessionChangedAt: 0,
      transitionUntil: 0,
      aiCheckpoints: []
    };
  }

  emptyTeamStats() {
    return {
      shots: 0, shotsOnTarget: 0, saves: 0, fouls: 0,
      yellowCards: 0, redCards: 0, corners: 0, offsides: 0,
      passes: 0, tackles: 0, possessionTicks: 0
    };
  }

  createTeamState(team, side) {
    if (this.teamManager.getStartingXI(team.id).length !== 11) {
      this.teamManager.autoSelectStartingXI(team.id);
    }
    const onField = this.teamManager.getStartingXI(team.id).map(player => player.id);
    const bench = team.players
      .filter(player => !onField.includes(player.id) && this.teamManager.isPlayerAvailable(player))
      .map(player => player.id);
    return {
      teamId: team.id,
      side,
      onField,
      bench,
      usedPlayers: [...onField],
      substitutions: 0,
      tactics: { ...team.tactics },
      formation: team.formation
    };
  }

  createPlayerStates(home, away) {
    const states = {};
    [home, away].forEach(teamState => {
      const team = this.teamManager.getTeam(teamState.teamId);
      team.players.forEach(player => {
        const onField = teamState.onField.includes(player.id);
        const anchor = this.getAnchor(player, teamState, teamState.onField);
        states[player.id] = {
          id: player.id,
          teamId: team.id,
          side: teamState.side,
          name: player.name,
          number: team.players.indexOf(player) + 1,
          position: player.position,
          x: anchor.x,
          y: anchor.y,
          baseX: anchor.x,
          baseY: anchor.y,
          targetX: anchor.x,
          targetY: anchor.y,
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
          isCovering: false
        };
      });
    });
    return states;
  }

  getAnchor(player, teamState, lineupIds) {
    const side = teamState.side;
    const direction = side === 'home' ? 1 : -1;
    const line = player.position === 'GK' ? 'gk' :
      ['CB', 'RB', 'LB'].includes(player.position) ? 'def' :
      ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(player.position) ? 'mid' : 'att';
    const lineX = { gk: 6, def: 23, mid: 46, att: 70 }[line];
    const x = side === 'home' ? lineX : 100 - lineX;
    const team = this.teamManager.getTeam(teamState.teamId);
    const peers = lineupIds.map(id => team.players.find(p => p.id === id))
      .filter(p => p && (p.position === 'GK' ? 'gk' :
        ['CB', 'RB', 'LB'].includes(p.position) ? 'def' :
        ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position) ? 'mid' : 'att') === line);
    const index = Math.max(0, peers.findIndex(peer => peer.id === player.id));
    const y = line === 'gk' ? 34 : (68 / (peers.length + 1)) * (index + 1);
    return { x: x + (direction * (this.random() - 0.5) * 2), y };
  }

  startMatch() {
    if (this.state.status === 'ready') {
      this.state.status = 'playing';
      this.state.phase = 'BUILD_UP';
    }
    return this.getLiveState();
  }

  simulateNextStep(step = 0.25) {
    if (this.state.complete) return this.getLiveState();
    if (this.state.status === 'ready') this.startMatch();
    this.state.status = 'playing';
    this.state.pausedReason = null;

    this.state.minute = Math.min(90, this.state.minute + step);
    this.state.displayMinute = Math.ceil(this.state.minute);
    this.state.half = this.state.minute <= 45 ? 1 : 2;
    this.updateFitness(step);
    this.updateTacticalTargets();
    this.moveEntities(step);
    this.advanceBall(step);
    this.runAI();

    if (this.state.minute >= 45 && !this.state.events.some(event => event.type === 'HALF_TIME')) {
      this.addEvent('HALF_TIME', 'Descanso', 45, null, true);
      this.state.phase = 'HALF_TIME';
      this.state.pausedReason = 'half-time';
      this.state.status = 'paused';
    }

    if (this.state.minute >= 90) this.finishMatch();
    return this.getLiveState();
  }

  resumeSecondHalf() {
    if (this.state.phase !== 'HALF_TIME') return false;
    this.state.minute = Math.max(45.01, this.state.minute);
    this.state.phase = 'BUILD_UP';
    this.state.status = 'playing';
    this.state.pausedReason = null;
    this.addEvent('SECOND_HALF', 'Comienza la segunda parte', 46);
    return true;
  }

  updateFitness(step) {
    Object.values(this.state.players).forEach(state => {
      if (!state.onField) return;
      const player = this.getPlayer(state.id);
      const teamState = this.getTeamState(state.teamId);
      const pressureCost = teamState.tactics.pressure === 'Alta' ? 1.25 :
        teamState.tactics.pressure === 'Baja' ? 0.8 : 1;
      const tempoCost = teamState.tactics.tempo === 'Alto' ? 1.2 :
        teamState.tactics.tempo === 'Bajo' ? 0.85 : 1;
      state.fitness = Math.max(5, state.fitness - ((105 - player.stamina) / 850) * step * pressureCost * tempoCost);
      state.minutesPlayed += step;
    });
  }

  updateTacticalTargets() {
    const ball = this.state.ball;
    ['home', 'away'].forEach(side => {
      const teamState = this.state.teams[side];
      const hasBall = this.ownerSide() === side;
      const direction = side === 'home' ? 1 : -1;
      const mentality = teamState.tactics.mentality || 'Equilibrada';
      const mentalShift = { 'Muy Defensiva': -8, 'Defensiva': -4, 'Equilibrada': 0, 'Ofensiva': 5, 'Muy Ofensiva': 9 }[mentality] || 0;
      const width = teamState.tactics.width === 'Amplia' ? 1.2 : teamState.tactics.width === 'Estrecha' ? 0.75 : 1;
      teamState.onField.forEach(id => {
        const state = this.state.players[id];
        if (!state || !state.onField) return;
        state.isPressing = false;
        state.isCovering = false;
        const player = this.getPlayer(id);
        const anchor = { x: state.baseX, y: state.baseY };
        const ballInfluence = (ball.x - 50) * 0.32;
        const defensiveLineShift = ['CB', 'RB', 'LB'].includes(player.position)
          ? teamState.tactics.defensiveLine === 'Alta' ? 6 : teamState.tactics.defensiveLine === 'Baja' ? -5 : 0
          : 0;
        state.targetX = this.clamp(anchor.x + ballInfluence + direction * (mentalShift + defensiveLineShift) + (hasBall ? direction * 6 : 0), 3, 97);
        state.targetY = this.clamp(34 + (anchor.y - 34) * width + (ball.y - 34) * 0.2, 3, 65);
        if (player.position === 'GK') {
          const sweeperBonus = teamState.tactics.defensiveLine === 'Alta' ? 5 : teamState.tactics.defensiveLine === 'Baja' ? -1 : 1;
          state.targetX = side === 'home'
            ? this.clamp(5 + ball.x * 0.08 + sweeperBonus, 4, 20)
            : this.clamp(95 - (100 - ball.x) * 0.08 - sweeperBonus, 80, 96);
          state.targetY = this.clamp(34 + (ball.y - 34) * 0.35, 22, 46);
          const ballApproachingBox = ball.state === 'passing' &&
            (side === 'home' ? ball.targetX < 20 : ball.targetX > 80);
          if (ballApproachingBox) {
            state.targetX = this.clamp(ball.targetX, side === 'home' ? 3 : 82, side === 'home' ? 18 : 97);
            state.targetY = this.clamp(ball.targetY, 18, 50);
          }
        }
        if (state.actionTargetUntil > this.state.minute) {
          state.targetX = state.actionTargetX;
          state.targetY = state.actionTargetY;
        }
        if (this.state.transitionUntil > this.state.minute && player.position !== 'GK') {
          const wonBall = this.state.possessionSide === side;
          state.targetX = this.clamp(state.targetX + direction * (wonBall ? 7 : -6), 3, 97);
        }
      });

      if (hasBall && ball.ownerId) {
        const owner = this.state.players[ball.ownerId];
        const support = teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && player.id !== ball.ownerId && player.position !== 'GK' && !player.mustLeave)
          .sort((a, b) => this.distance(a, owner) - this.distance(b, owner));
        support.slice(0, 3).forEach((player, index) => {
          const forwardRun = index === 2 && this.state.transitionUntil > this.state.minute ? 7 : 0;
          player.targetX = this.clamp(owner.x - direction * (3 + index * 2) + direction * forwardRun, 4, 96);
          player.targetY = this.clamp(owner.y + (index - 1) * 9, 4, 64);
        });
      }

      if (!hasBall && ball.ownerId) {
        const pressers = teamState.onField.map(id => this.state.players[id])
          .filter(player => player && player.onField && !player.mustLeave && player.position !== 'GK')
          .sort((a, b) => this.distance(a, ball) - this.distance(b, ball));
        const count = teamState.tactics.pressure === 'Alta' ? 2 : 1;
        pressers.slice(0, count).forEach((player, index) => {
          player.targetX = ball.x + (side === 'home' ? -1 : 1) * (index + 1);
          player.targetY = ball.y + (index ? 2 : 0);
          player.isPressing = true;
        });
        const owner = this.state.players[ball.ownerId];
        const cover = pressers.find(player => !player.isPressing && ['CB', 'RB', 'LB', 'CDM', 'CM'].includes(player.position));
        if (cover && owner) {
          cover.targetX = this.clamp(owner.x - direction * 9, 5, 95);
          cover.targetY = this.clamp(owner.y, 6, 62);
          cover.isCovering = true;
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
    });

    this.state.referee.targetX = this.clamp(ball.x + (ball.x < 50 ? 7 : -7), 12, 88);
    this.state.referee.targetY = this.clamp(ball.y + (ball.y < 34 ? 8 : -8), 8, 60);

    if (this.state.restart) {
      const restart = this.state.restart;
      const defendingSide = restart.teamSide === 'home' ? 'away' : 'home';
      const wallDirection = restart.teamSide === 'home' ? 1 : -1;
      this.onField(defendingSide).filter(player => player.position !== 'GK')
        .sort((a, b) => this.distance(a, ball) - this.distance(b, ball))
        .slice(0, restart.type === 'penalty' ? 0 : 4)
        .forEach((player, index) => {
          player.targetX = this.clamp(restart.x + wallDirection * 9, 4, 96);
          player.targetY = this.clamp(restart.y + (index - 1.5) * 2.2, 4, 64);
        });
    }
  }

  moveEntities(step) {
    Object.values(this.state.players).forEach(state => {
      if (!state.onField) return;
      const player = this.getPlayer(state.id);
      const speed = (0.35 + player.pace / 180) * (state.fitness / 100) * step;
      state.x += (state.targetX - state.x) * Math.min(0.32, speed);
      state.y += (state.targetY - state.y) * Math.min(0.32, speed);
    });
    this.applySpatialSeparation();
    const referee = this.state.referee;
    referee.x += (referee.targetX - referee.x) * 0.14;
    referee.y += (referee.targetY - referee.y) * 0.14;
    if (this.state.ball.ownerId) {
      const owner = this.state.players[this.state.ball.ownerId];
      if (owner) {
        this.state.ball.x = owner.x + (owner.side === 'home' ? 0.8 : -0.8);
        this.state.ball.y = owner.y;
      }
    }
  }

  applySpatialSeparation() {
    const players = [...this.onField('home'), ...this.onField('away')].filter(player => !player.mustLeave);
    for (let firstIndex = 0; firstIndex < players.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < players.length; secondIndex++) {
        const first = players[firstIndex];
        const second = players[secondIndex];
        if (first.position === 'GK' || second.position === 'GK') continue;
        const sameTeam = first.side === second.side;
        const ownsBall = this.state.ball.ownerId === first.id || this.state.ball.ownerId === second.id;
        const minimum = sameTeam ? 3.1 : ownsBall ? 0 : 1.35;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimum) continue;
        const angle = distance > 0.05 ? Math.atan2(dy, dx) : ((firstIndex + secondIndex) * 1.7);
        const push = (minimum - distance) * 0.52;
        const pushX = Math.cos(angle) * push;
        const pushY = Math.sin(angle) * push;
        first.x = this.clamp(first.x - pushX, 2, 98);
        first.y = this.clamp(first.y - pushY, 2, 66);
        second.x = this.clamp(second.x + pushX, 2, 98);
        second.y = this.clamp(second.y + pushY, 2, 66);
      }
    }
  }

  advanceBall(step) {
    const ball = this.state.ball;
    if (this.state.phase === 'HALF_TIME') return;
    if (this.state.restart) {
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
      }
      if (ball.state === 'passing' && ball.action === 'pass' && (ball.passType === 'ground' || ball.progress > 0.82)) {
        const passer = this.state.players[ball.passerId];
        const defendingSide = passer && passer.side === 'home' ? 'away' : 'home';
        const collision = this.onField(defendingSide)
          .filter(player => !player.mustLeave)
          .sort((a, b) => this.distance(a, ball) - this.distance(b, ball))[0];
        if (collision && this.distance(collision, ball) < 2.2) {
          this.takeControlAtBall(collision, 2.2);
          this.addEvent('INTERCEPTION', `${collision.name} corta la trayectoria del balón`, null, collision.side);
          return;
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
      collisionOpponent && this.distance(collisionOpponent, owner) <= 4.2 &&
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
    const tempoMultiplier = ownerTactics.tempo === 'Alto' ? 1.25 : ownerTactics.tempo === 'Bajo' ? 0.78 : 1;
    if (this.random() > this.clamp(step * 2.2 * tempoMultiplier, 0.01, 0.7)) return;

    const opponents = this.onField(owner.side === 'home' ? 'away' : 'home').filter(player => !player.mustLeave);
    const nearest = opponents.sort((a, b) => this.distance(a, owner) - this.distance(b, owner))[0];
    if (nearest && this.distance(nearest, owner) < 3.4 && this.random() < 0.32) {
      this.resolveTackle(nearest, owner);
      return;
    }

    const attackingDistance = owner.side === 'home' ? 100 - owner.x : owner.x;
    if (attackingDistance < 36 && this.random() < 0.22) {
      this.startShot(owner, false);
      return;
    }
    if (this.random() < 0.5) this.startPass(owner);
    else this.startDribble(owner);
  }

  hasClearScoringChance(owner) {
    if (!owner || owner.position === 'GK') return false;
    const goalDistance = owner.side === 'home' ? 100 - owner.x : owner.x;
    const centralDistance = Math.abs(owner.y - 34);
    if (goalDistance > 18 || centralDistance > 14) return false;
    const defendingSide = owner.side === 'home' ? 'away' : 'home';
    const nearestOutfield = this.onField(defendingSide)
      .filter(player => player.position !== 'GK' && !player.mustLeave)
      .sort((a, b) => this.distance(a, owner) - this.distance(b, owner))[0];
    return !nearestOutfield || this.distance(nearestOutfield, owner) > 6;
  }

  startDribble(owner) {
    const direction = owner.side === 'home' ? 1 : -1;
    owner.actionTargetX = this.clamp(owner.x + direction * (6 + this.random() * 8), 3, 97);
    owner.actionTargetY = this.clamp(owner.y + (this.random() - 0.5) * 12, 3, 65);
    owner.actionTargetUntil = this.state.minute + 1.2;
    owner.targetX = owner.actionTargetX;
    owner.targetY = owner.actionTargetY;
    this.state.phase = 'TRANSITION';
  }

  startPass(owner, forcedReceiverId = null) {
    const mates = this.onField(owner.side).filter(player => player.id !== owner.id && !player.mustLeave);
    if (!mates.length) return;
    const direction = owner.side === 'home' ? 1 : -1;
    const passStyle = this.state.teams[owner.side].tactics.passStyle;
    const candidates = mates.sort((a, b) => {
      if (passStyle === 'Corto') return this.distance(owner, a) - this.distance(owner, b);
      if (passStyle === 'Directo') return direction * (b.x - a.x);
      return (direction * b.x + this.random() * 20) - (direction * a.x + this.random() * 20);
    });
    let receiver = forcedReceiverId ? this.state.players[forcedReceiverId] : candidates[Math.floor(this.random() * Math.min(4, candidates.length))];
    if (!receiver) return;
    const player = this.getPlayer(owner.id);
    const inAttackingThird = owner.side === 'home' ? owner.x > 67 : owner.x < 33;
    const isWide = owner.y < 15 || owner.y > 53;
    const shouldCross = !forcedReceiverId && inAttackingThird && isWide;
    if (shouldCross) {
      const targets = mates.filter(mate => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(mate.position))
        .sort((a, b) => direction * (b.x - a.x));
      if (targets[0]) receiver = targets[Math.floor(this.random() * Math.min(2, targets.length))];
    }
    const distance = this.distance(owner, receiver);
    const progressiveDistance = direction * (receiver.x - owner.x);
    const passType = shouldCross ? 'cross' :
      (passStyle === 'Directo' && distance > 19) || (distance > 27 && this.random() < 0.42) ? 'lofted' :
        progressiveDistance > 13 && this.random() < 0.32 ? 'through' : 'ground';
    const runDx = receiver.targetX - receiver.x;
    const runDy = receiver.targetY - receiver.y;
    const runDistance = Math.hypot(runDx, runDy) || 1;
    const naturalLead = Math.min(passType === 'through' ? 5 : 2.4, distance * 0.1);
    const throughLead = passType === 'through' ? direction * Math.min(5, Math.max(1.5, progressiveDistance * 0.18)) : 0;
    const passTargetX = shouldCross
      ? (owner.side === 'home' ? 90 + this.random() * 6 : 10 - this.random() * 6)
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
    const offside = this.getOffsideDecision(owner, receiver);
    this.state.ball = {
      ...this.state.ball,
      ownerId: null,
      state: 'passing',
      fromX: kickX, fromY: kickY,
      x: kickX, y: kickY,
      targetX: passTargetX,
      targetY: passTargetY,
      progress: 0,
      duration: this.clamp(Math.hypot(passTargetX - kickX, passTargetY - kickY) / (35 + player.passing * 0.35), 0.25, 0.9),
      receiverId: receiver.id,
      passerId: owner.id,
      action: offside.isOffside ? 'offside-pass' : 'pass',
      passType,
      height: 0,
      arc: passType === 'cross' ? 10 : passType === 'lofted' ? 7 : passType === 'through' ? 1.5 : 0,
      claimChecked: false,
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
    const interceptionChance = interceptor && interceptorDistance <= 5
      ? this.clamp(0.08 + pressure * 0.025 + this.getPlayer(interceptor.id).defending / 500 - passer.passing / 550, 0.03, 0.55)
      : 0;
    if (interceptor && this.random() < interceptionChance) {
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
    if (this.random() >= claimChance) return false;
    this.state.ball.x = ball.x;
    this.state.ball.y = ball.y;
    if (!this.takeControlAtBall(keeper, 8)) return false;
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
      this.alignPlayerToBall(receiver);
      this.startShot(receiver, false, 'header');
      return;
    }
    if (!this.takeControlAtBall(winner, 5.5)) this.makeBallLoose(ball.x, ball.y);
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
    return { isOffside: inOpposingHalf && aheadOfBall && beyondLine, lineX };
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
    const winChance = this.clamp(0.35 + defenderData.defending / 220 + defenderData.physical / 500 - attackerData.dribbling / 260, 0.18, 0.82);
    if (this.random() < winChance) {
      this.state.stats[defender.side].tackles++;
      if (!this.takeControlAtBall(defender, 3.8)) {
        this.makeBallLoose((defender.x + attacker.x) / 2, (defender.y + attacker.y) / 2);
        return;
      }
      if (this.random() < 0.3) this.addEvent('TACKLE', `${defender.name} roba el balón`, null, defender.side);
    } else if (forcedCollision) {
      this.makeBallLoose((defender.x + attacker.x) / 2, (defender.y + attacker.y) / 2);
      this.addEvent('DUEL', `${defender.name} y ${attacker.name} dejan el balón dividido`, null, null);
    } else {
      attacker.targetX += attacker.side === 'home' ? 3 : -3;
    }
  }

  commitFoul(defender, victim) {
    this.state.stats[defender.side].fouls++;
    const severity = this.random();
    let card = null;
    if (severity > 0.992) card = 'red';
    else if (severity > 0.77) card = 'yellow';
    if (card) this.giveCard(defender, card);
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
    this.state.restart = { type: restartType, teamSide: victim.side, x: victim.x, y: victim.y, wait: 0.75 };
    this.state.referee.targetX = victim.x;
    this.state.referee.targetY = victim.y + 3;
  }

  giveCard(playerState, card) {
    const stats = this.state.stats[playerState.side];
    if (card === 'yellow') {
      playerState.yellowCards++;
      stats.yellowCards++;
      if (playerState.yellowCards >= 2) this.giveCard(playerState, 'red');
    } else if (!playerState.redCards) {
      playerState.redCards = 1;
      stats.redCards++;
      playerState.onField = false;
      const teamState = this.state.teams[playerState.side];
      teamState.onField = teamState.onField.filter(id => id !== playerState.id);
      if (this.state.ball.ownerId === playerState.id) this.state.ball.ownerId = null;
      this.addEvent('RED_CARD', `Expulsado ${playerState.name}`, null, playerState.side, true);
    }
  }

  injurePlayer(victim, offender = null) {
    if (victim.injured) return;
    const severe = this.random() < 0.45 || victim.fitness < 35;
    victim.injured = true;
    victim.mustLeave = severe;
    victim.fitness = Math.max(5, victim.fitness - (severe ? 30 : 12));
    const injury = {
      playerId: victim.id,
      teamId: victim.teamId,
      minute: this.state.displayMinute,
      severity: severe ? 'moderate' : 'minor',
      matchesRemaining: severe ? 1 + Math.floor(this.random() * 4) : 0,
      causedBy: offender ? offender.id : null
    };
    this.state.injuries.push(injury);
    this.addEvent('INJURY', `${victim.name} ${severe ? 'no puede continuar' : 'queda dolorido'}`, null, victim.side, true);
    if (severe && victim.teamId !== this.userTeamId) this.makeAutomaticSubstitution(victim.side, victim.id);
  }

  executeRestart() {
    const restart = this.state.restart;
    if (!restart) return;
    const taker = this.bestSetPieceTaker(restart.teamSide);
    this.state.restart = null;
    if (!taker) return this.resetPossession();
    const attackingDistance = restart.teamSide === 'home' ? 100 - restart.x : restart.x;
    if (restart.type === 'indirect-free-kick') {
      this.addEvent('INDIRECT_FREE_KICK', `${taker.name} reanuda tras el fuera de juego`, null, restart.teamSide);
      this.alignPlayerToBall(taker);
      this.givePossession(taker.id);
      this.startPass(taker);
    } else if (restart.type === 'penalty') {
      this.addEvent('PENALTY', `${taker.name} lanza el penalti`, null, restart.teamSide);
      this.alignPlayerToBall(taker);
      this.startShot(taker, true, 'penalty');
    } else if (
      (this.state.teams[restart.teamSide].tactics.setPiecePreference === 'Disparar' && attackingDistance < 42) ||
      (attackingDistance < 32 && this.state.teams[restart.teamSide].tactics.setPiecePreference !== 'Corto' && this.random() < 0.64)
    ) {
      this.addEvent('FREE_KICK', `${taker.name} dispara la falta`, null, restart.teamSide);
      this.alignPlayerToBall(taker);
      this.startShot(taker, true, 'free-kick');
    } else {
      this.addEvent('FREE_KICK', `${taker.name} pone el balón en juego`, null, restart.teamSide);
      this.alignPlayerToBall(taker);
      this.givePossession(taker.id);
      this.startPass(taker);
    }
  }

  bestSetPieceTaker(side) {
    return this.onField(side).filter(player => !player.mustLeave)
      .sort((a, b) => {
        const pa = this.getPlayer(a.id);
        const pb = this.getPlayer(b.id);
        return (pb.shooting + pb.passing) - (pa.shooting + pa.passing);
      })[0];
  }

  startShot(shooter, setPiece = false, action = 'shot') {
    const side = shooter.side;
    const goalX = side === 'home' ? 96.5 : 3.5;
    this.state.stats[side].shots++;
    const player = this.getPlayer(shooter.id);
    const kickX = this.state.ball.x;
    const kickY = this.state.ball.y;
    const shotQuality = this.clamp(
      0.35 + player.shooting / 160 + (action === 'penalty' ? 0.25 : 0) +
        (action === 'header' ? player.physical / 500 - 0.13 : 0) - (setPiece && action !== 'penalty' ? 0.04 : 0),
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
      duration: 0.28,
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
    const goalChance = this.clamp(
      0.2 + (ball.shotQuality || shooterData.shooting / 100) * 0.48 - (keeperData ? keeperData.goalkeeping / 360 : 0) + (ball.action === 'penalty' ? 0.2 : 0),
      ball.action === 'penalty' ? 0.58 : 0.13,
      ball.action === 'penalty' ? 0.86 : 0.7
    );
    const roll = this.random();
    const postChance = ball.action === 'penalty' ? 0.07 : 0.12;
    const isHeader = ball.action === 'header';
    if (roll < goalChance) {
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.score[shooter.side]++;
      shooter.goals++;
      this.addEvent('GOAL', `⚽ ${isHeader ? 'Gol de cabeza' : 'Gol'} de ${shooter.name}`, null, shooter.side, shooter.teamId === this.userTeamId ? false : this.state.minute > 60);
      this.resetAfterGoal(defendingSide);
    } else if (roll < goalChance + postChance) {
      const postName = this.random() < 0.5 ? 'poste izquierdo' : 'poste derecho';
      this.addEvent('POST', `¡Al palo! El ${isHeader ? 'remate de cabeza' : 'disparo'} de ${shooter.name} golpea el ${postName}`, null, shooter.side);
      const reboundX = shooter.side === 'home' ? 96 : 4;
      const reboundY = this.random() < 0.5 ? 28 : 40;
      this.makeBallLoose(reboundX, reboundY);
    } else if (keeper) {
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.stats[defendingSide].saves++;
      this.addEvent('SAVE', `${keeper.name} detiene el ${isHeader ? 'remate de cabeza' : 'disparo'}`, null, defendingSide);
      this.alignPlayerToBall(keeper);
      this.givePossession(keeper.id);
    } else {
      this.state.stats[shooter.side].shotsOnTarget++;
      this.state.score[shooter.side]++;
      shooter.goals++;
      this.addEvent('GOAL', `⚽ ${isHeader ? 'Gol de cabeza' : 'Gol'} de ${shooter.name}`, null, shooter.side);
      this.resetAfterGoal(defendingSide);
    }
  }

  resetAfterGoal(kickoffSide) {
    Object.values(this.state.players).forEach(player => {
      if (!player.onField) return;
      player.x = player.baseX;
      player.y = player.baseY;
    });
    this.state.ball.x = 50;
    this.state.ball.y = 34;
    this.resetPossession(kickoffSide);
    this.state.phase = 'KICK_OFF';
  }

  makeBallLoose(x, y) {
    this.state.ball = { ...this.state.ball, x, y, ownerId: null, state: 'loose', action: null, height: 0, arc: 0 };
    this.state.phase = 'LOOSE_BALL';
  }

  resolveLooseBall() {
    const candidates = [...this.onField('home'), ...this.onField('away')]
      .filter(player => !player.mustLeave)
      .sort((a, b) => this.looseBallDistance(a) - this.looseBallDistance(b));
    const winner = candidates[0];
    if (!winner) return this.resetPossession();
    candidates.slice(0, 3).forEach(player => {
      player.actionTargetX = this.state.ball.x;
      player.actionTargetY = this.state.ball.y;
      player.actionTargetUntil = this.state.minute + 0.8;
      player.targetX = this.state.ball.x;
      player.targetY = this.state.ball.y;
    });
    if (this.distance(winner, this.state.ball) < 2.8) this.takeControlAtBall(winner, 2.8);
  }

  looseBallDistance(player) {
    const inOwnBox = player.side === 'home'
      ? this.state.ball.x < 17 && this.state.ball.y > 13 && this.state.ball.y < 55
      : this.state.ball.x > 83 && this.state.ball.y > 13 && this.state.ball.y < 55;
    const keeperBonus = player.position === 'GK' && inOwnBox ? 5.5 : 0;
    return this.distance(player, this.state.ball) - keeperBonus;
  }

  givePossession(playerId) {
    const player = this.state.players[playerId];
    if (!player || !player.onField) return false;
    const previousSide = this.state.possessionSide || this.ownerSide();
    if (previousSide && previousSide !== player.side) {
      this.state.possessionChangedAt = this.state.minute;
      this.state.transitionUntil = this.state.minute + 1.4;
      this.state.phase = 'TRANSITION';
    }
    this.state.possessionSide = player.side;
    this.state.ball.ownerId = playerId;
    this.state.ball.state = 'controlled';
    this.state.ball.action = null;
    this.state.ball.height = 0;
    this.state.ball.arc = 0;
    this.state.ball.receiverId = null;
    this.state.ball.offsideLineX = null;
    this.state.ball.offsidePlayerId = null;
    if (this.state.transitionUntil <= this.state.minute) this.state.phase = 'BUILD_UP';
    return true;
  }

  alignPlayerToBall(player) {
    if (!player) return false;
    const offset = player.side === 'home' ? 0.8 : -0.8;
    player.x = this.clamp(this.state.ball.x - offset, 2, 98);
    player.y = this.clamp(this.state.ball.y, 2, 66);
    player.targetX = player.x;
    player.targetY = player.y;
    return true;
  }

  takeControlAtBall(player, maxDistance = 4) {
    if (!player || !player.onField || this.distance(player, this.state.ball) > maxDistance) return false;
    const ballX = this.state.ball.x;
    const ballY = this.state.ball.y;
    this.alignPlayerToBall(player);
    this.state.ball.x = ballX;
    this.state.ball.y = ballY;
    return this.givePossession(player.id);
  }

  resetPossession(preferredSide = null) {
    const side = preferredSide || (this.random() < 0.5 ? 'home' : 'away');
    const candidates = this.onField(side).filter(player => !player.mustLeave)
      .sort((a, b) => this.distance(a, this.state.ball) - this.distance(b, this.state.ball));
    const owner = candidates[0];
    if (owner) {
      this.alignPlayerToBall(owner);
      this.givePossession(owner.id);
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
    const allowed = ['mentality', 'pressure', 'tempo', 'width', 'passStyle', 'defensiveLine', 'setPiecePreference'];
    allowed.forEach(key => {
      if (changes[key]) teamState.tactics[key] = changes[key];
    });
    this.state.decisions.push({ minute: this.state.displayMinute, teamId, type: 'tactics', changes: { ...changes }, isAI });
    const team = this.teamManager.getTeam(teamId);
    this.addEvent('TACTICS', `${team.name} modifica sus instrucciones`, null, teamState.side);
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
    outgoing.onField = false;
    outgoing.substitutedOut = true;
    incoming.onField = true;
    incoming.appeared = true;
    incoming.fitness = Number(this.getPlayer(playerInId).fitness) || 100;
    incoming.x = outgoing.x;
    incoming.y = outgoing.y;
    incoming.baseX = outgoing.baseX;
    incoming.baseY = outgoing.baseY;
    teamState.onField = teamState.onField.map(id => id === playerOutId ? playerInId : id);
    teamState.bench = teamState.bench.filter(id => id !== playerInId);
    teamState.usedPlayers.push(playerInId);
    teamState.substitutions++;
    if (this.state.ball.ownerId === playerOutId) this.givePossession(playerInId);
    this.state.decisions.push({ minute: this.state.displayMinute, teamId, type: 'substitution', playerOutId, playerInId, isAI });
    this.addEvent('SUBSTITUTION', `Entra ${incoming.name} por ${outgoing.name}`, null, teamState.side);
    return { valid: true };
  }

  makeAutomaticSubstitution(side, playerOutId) {
    const teamState = this.state.teams[side];
    const outgoing = this.state.players[playerOutId];
    if (!outgoing || teamState.substitutions >= 5) return false;
    const bench = teamState.bench.map(id => this.state.players[id])
      .filter(player => player && !player.appeared)
      .sort((a, b) => {
        const posA = a.position === outgoing.position ? 100 : 0;
        const posB = b.position === outgoing.position ? 100 : 0;
        return (posB + this.getPlayer(b.id).overall) - (posA + this.getPlayer(a.id).overall);
      });
    if (!bench.length) return false;
    return this.makeSubstitution(teamState.teamId, playerOutId, bench[0].id, true).valid;
  }

  finishMatch() {
    if (this.state.complete) return this.getResult();
    this.state.minute = 90;
    this.state.displayMinute = 90;
    this.state.complete = true;
    this.state.status = 'complete';
    this.state.phase = 'FULL_TIME';
    this.state.ball.ownerId = null;
    this.addEvent('END_MATCH', 'Final del partido', 90);
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
      const injury = this.state.injuries.find(item => item.playerId === state.id && item.matchesRemaining > 0);
      if (injury) player.injury = { severity: injury.severity, matchesRemaining: injury.matchesRemaining };
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
      minute: this.state.displayMinute,
      phase: this.state.phase,
      players: Object.values(this.state.players).filter(player => player.onField),
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
    if (!Number.isFinite(engine.state.possessionChangedAt)) engine.state.possessionChangedAt = 0;
    if (!Number.isFinite(engine.state.transitionUntil)) engine.state.transitionUntil = 0;
    if (!Number.isFinite(engine.state.ball.height)) engine.state.ball.height = 0;
    if (!Number.isFinite(engine.state.ball.arc)) engine.state.ball.arc = 0;
    if (!engine.state.ball.passType) engine.state.ball.passType = 'ground';
    Object.values(engine.state.players || {}).forEach(player => {
      if (!Number.isFinite(player.baseX)) player.baseX = player.x;
      if (!Number.isFinite(player.baseY)) player.baseY = player.y;
      if (!Number.isFinite(player.actionTargetUntil)) player.actionTargetUntil = 0;
      if (!Number.isFinite(player.lastDuelMinute)) player.lastDuelMinute = -1;
      if (!Number.isFinite(player.actionTargetX)) player.actionTargetX = player.x;
      if (!Number.isFinite(player.actionTargetY)) player.actionTargetY = player.y;
      if (typeof player.isPressing !== 'boolean') player.isPressing = false;
      if (typeof player.isCovering !== 'boolean') player.isCovering = false;
    });
    return engine;
  }
}

if (typeof module === 'undefined') window.LiveMatchEngine = LiveMatchEngine;
