// ============================================
// APLICACIÓN PRINCIPAL
// ============================================

class FootballSimulator {
  constructor() {
    this.teamManager = null;
    this.leagueEngine = null;
    this.ui = null;
    this.userTeamId = null;
    this.currentMatch = null;
    this.liveMatchEngine = null;
    this.matchRenderer = null;
    this.matchTimer = null;
    this.matchLoopToken = 0;
    this.isMatchPaused = false;
    this.matchPlaybackSpeed = 1;
    this.matchEventCursor = 0;
    this.matchFinalized = false;
    this.gameState = {
      created: new Date().toISOString(),
      lastSaved: null
    };
  }

  // Inicializar la aplicación
  async init() {
    try {
      // Inicializar gestores
      this.teamManager = new TeamManager();
      this.leagueEngine = new LeagueEngine(this.teamManager);
      this.ui = new UIManager();
      this.ui.init(this);
      GameStorage.initialize();
      window.addEventListener('beforeunload', () => this.persistLiveMatch(true));
      // El selector de partidas es siempre la puerta de entrada, incluso si hay
      // una ranura activa o un encuentro guardado a medias.
      this.showWelcomeScreen();
    } catch (error) {
      console.error('Error inicializando la aplicación:', error);
      this.ui.showError('Error inicializando la aplicación');
    }
  }

  // Mostrar pantalla de bienvenida
  showWelcomeScreen() {
    this.ui.showWelcomeScreen();

    // Los eventos de esta vista se gestionan por delegación en UIManager.
  }

  // Iniciar nueva partida
  startNewGame(slot = GameStorage.getActiveSlot() || 1) {
    if (!GameStorage.setActiveSlot(slot)) {
      this.ui.showError('Ranura de guardado no válida');
      return;
    }
    this.stopLiveMatchLoop();
    if (this.matchRenderer) this.matchRenderer.stop();
    // Reinicializar gestores
    this.teamManager = new TeamManager();
    this.leagueEngine = new LeagueEngine(this.teamManager);
    this.userTeamId = null;
    this.currentMatch = null;
    this.liveMatchEngine = null;
    this.gameState = { created: new Date().toISOString(), lastSaved: null };
    GameStorage.saveCurrentMatch(null);

    // Mostrar selección de equipo
    this.showScreen('team-selection');
  }

  // Continuar partida guardada
  async continueGame(slot = GameStorage.getActiveSlot()) {
    if (!GameStorage.setActiveSlot(slot) || !GameStorage.hasSavedGame(slot)) {
      this.ui.showError('La ranura seleccionada está vacía');
      this.showWelcomeScreen();
      return;
    }
    const result = await this.loadSavedGame();
    if (result) {
      const interruptedMatch = GameStorage.loadCurrentMatch();
      // Una partida guardada siempre entra por el dashboard. Los encuentros
      // interrumpidos no se reanudan: el próximo partido comenzará desde cero.
      GameStorage.saveCurrentMatch(null);
      this.currentMatch = null;
      this.liveMatchEngine = null;
      this.showDashboard();
      if (interruptedMatch) {
        this.ui.showSuccess('Partido interrumpido descartado. El próximo partido comenzará desde cero.');
      }
    } else {
      this.ui.showError('Error cargando la partida guardada');
      this.showWelcomeScreen();
    }
  }

  // Mostrar pantalla
  showScreen(screenName) {
    switch (screenName) {
      case 'welcome':
        this.showWelcomeScreen();
        break;
      case 'team-selection':
        this.ui.showTeamSelection();
        break;
      case 'dashboard':
        this.showDashboard();
        break;
      case 'squad':
        this.ui.showSquad();
        break;
      case 'tactics':
        this.ui.showSquad();
        break;
      case 'next-match':
        this.showNextMatch();
        break;
      case 'league':
        this.ui.showLeague();
        break;
      case 'stats':
        this.showStats();
        break;
      case 'settings':
        this.ui.showSettings();
        break;
      default:
        this.showDashboard();
    }
    this.resetScreenViewport();
  }

  resetScreenViewport() {
    window.scrollTo(0, 0);
    const content = document.getElementById('main-content');
    if (content) {
      content.scrollTop = 0;
      content.scrollLeft = 0;
    }
    window.requestAnimationFrame(() => {
      const menu = document.querySelector('.navbar-menu');
      const active = menu?.querySelector('.nav-btn.active');
      if (!menu || !active || menu.scrollWidth <= menu.clientWidth) return;
      menu.scrollLeft = Math.max(0, active.offsetLeft - (menu.clientWidth - active.offsetWidth) / 2);
    });
  }

  // Mostrar dashboard principal
  showDashboard() {
    if (!this.userTeamId) {
      this.startNewGame();
      return;
    }
    this.ui.showDashboard();
  }

  // Seleccionar equipo
  selectTeam(teamId) {
    this.userTeamId = teamId;
    this.leagueEngine.controlledTeamId = teamId;
    GameStorage.saveUserTeam(teamId);

    // Generar calendario
    this.leagueEngine.generateSchedule();
    this.leagueEngine.updateStandings();

    // Todos los clubes empiezan la temporada con una alineación válida.
    this.teamManager.getAllTeams().forEach(team => {
      this.teamManager.autoSelectStartingXI(team.id);
    });

    // Guardar estado inicial
    this.saveGame();

    // Mostrar dashboard
    this.showScreen('dashboard');
  }

  // Mostrar próximo partido
  showNextMatch() {
    const userTeamId = this.userTeamId;
    const nextMatch = this.leagueEngine.getNextUserMatch(userTeamId);
    const team = this.teamManager.getTeam(userTeamId);

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.ui.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Equipo</button>
          <button class="nav-btn active" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    if (!nextMatch) {
      content.innerHTML = `
        <div class="next-match-container">
          <h2>Próximo Partido</h2>
          <p>No hay más partidos en la temporada. ¡Liga completada!</p>
        </div>
      `;
      return;
    }

    const opponent = this.teamManager.getTeam(
      nextMatch.homeTeam === userTeamId ? nextMatch.awayTeam : nextMatch.homeTeam
    );
    const lineupStatus = this.teamManager.ensureValidStartingXI(userTeamId, false, nextMatch.matchday);
    if (lineupStatus.valid && (lineupStatus.repaired || lineupStatus.promoted.length)) this.saveGame();
    const isHome = nextMatch.homeTeam === userTeamId;
    const homePreviewTeam = isHome ? team : opponent;
    const awayPreviewTeam = isHome ? opponent : team;
    const startingXI = this.teamManager.getStartingXI(userTeamId);
    const savedHalfDuration = Number(GameStorage.getSetting('halfDuration', 3));
    const homeStyle = homePreviewTeam.strategy || 'Equilibrio';
    const awayStyle = awayPreviewTeam.strategy || 'Equilibrio';

    content.innerHTML = `
      <div class="next-match-container">
        <div class="match-page-heading"><span class="eyebrow">Jornada ${nextMatch.matchday}</span><h2>Próximo partido</h2></div>
        
        <div class="match-preview-large">
          <aside class="match-identity-glance" aria-label="Resumen de identidad del partido">
            <span>Claves del duelo</span>
            <strong>${homeStyle} vs ${awayStyle}</strong>
            <small>${homePreviewTeam.formation} frente a ${awayPreviewTeam.formation}</small>
          </aside>
          <section class="match-mode-selection match-mode-selection-top" aria-labelledby="match-mode-title">
            <div>
              <span class="season-kicker">Todo preparado</span>
              <h4 id="match-mode-title">Empezar el partido</h4>
              <p>Elige la duración y entra al campo, o resuelve directamente el resultado.</p>
            </div>
            <button id="btn-quick-result" class="btn btn-secondary btn-large">Ver resultado</button>
            <div class="simulator-choice">
              <span class="duration-label" id="match-duration-label">Duración por parte</span>
              <div class="match-duration-menu" role="radiogroup" aria-labelledby="match-duration-label">
                ${[1, 3, 5, 10].map(value => `<button type="button" class="match-duration-option ${savedHalfDuration === value ? 'active' : ''}" data-match-duration="${value}" role="radio" aria-checked="${savedHalfDuration === value}">${value}<small>min</small></button>`).join('')}
              </div>
              <button id="btn-play-match-large" class="btn btn-primary btn-large">Jugar partido</button>
            </div>
          </section>

          <div class="match-teams">
            <div class="team-section">
              ${this.ui.renderTeamCrest(homePreviewTeam, 'match-preview-crest')}
              <h3>${homePreviewTeam.name}</h3>
              <p class="team-label">${isHome ? 'LOCAL' : 'VISITANTE'}</p>
            </div>
            <div class="vs-container">vs</div>
            <div class="team-section">
              ${this.ui.renderTeamCrest(awayPreviewTeam, 'match-preview-crest')}
              <h3>${awayPreviewTeam.name}</h3>
              <p class="team-label">${isHome ? 'VISITANTE' : 'LOCAL'}</p>
            </div>
          </div>

          ${this.renderTeamIntroductions(homePreviewTeam, awayPreviewTeam)}

          ${this.renderMatchBriefing(homePreviewTeam, awayPreviewTeam)}

          <div class="formation-info pre-match-lineup">
            <div class="pre-match-lineup-heading">
              <div><span>Tu once</span><h4>Alineación titular</h4></div>
              <strong>${team.formation}</strong>
            </div>
            ${this.renderPreMatchLineup(team, startingXI)}
          </div>

          <section class="pre-match-preparation">
            <div>
              <h4>Preparación del partido</h4>
              <p>Estás en el descanso entre jornadas: todavía puedes ajustar jugadores y táctica antes de elegir cómo disputar el encuentro.</p>
            </div>
            <div class="pre-match-management">
              <button class="btn btn-secondary" data-screen="squad">Preparar equipo</button>
              <button id="btn-pre-match-best-xi" class="btn btn-secondary">Usar mejor XI</button>
            </div>
          </section>

        </div>
      </div>
    `;

    const playBtn = document.getElementById('btn-play-match-large');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.playMatch());
    }
    const quickResultBtn = document.getElementById('btn-quick-result');
    if (quickResultBtn) {
      quickResultBtn.addEventListener('click', () => this.playQuickResult());
    }
    document.getElementById('btn-pre-match-best-xi')?.addEventListener('click', () => {
      const lineup = this.teamManager.ensureValidStartingXI(this.userTeamId, true);
      if (!lineup.valid) return this.ui.showError(lineup.error);
      this.saveGame();
      this.showNextMatch();
      this.resetScreenViewport();
      this.ui.showSuccess('Mejor XI preparado para el partido');
    });
    document.querySelectorAll('.match-duration-option').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.match-duration-option').forEach(option => {
          const selected = option === button;
          option.classList.toggle('active', selected);
          option.setAttribute('aria-checked', String(selected));
        });
        GameStorage.setSetting('halfDuration', button.dataset.matchDuration);
      });
    });
    if (lineupStatus.promoted?.length) {
      const names = lineupStatus.promoted.map(player => player.name).join(', ');
      this.ui.showSuccess(`${names} ${lineupStatus.promoted.length === 1 ? 'sube' : 'suben'} del filial y entra en la convocatoria`);
    }
  }

  renderTeamIntroductions(homeTeam, awayTeam) {
    const strategyDescriptions = {
      'Posesión': 'quiere mandar mediante pases cortos, amplitud y paciencia',
      'Presión alta': 'busca recuperar arriba, acelerar el ritmo y encerrar al rival',
      'Juego directo': 'progresa pronto hacia campo contrario y ataca la segunda jugada',
      'Contraataque': 'protege espacios y sale con velocidad cuando recupera',
      'Bloque bajo': 'reduce espacios cerca de su área y prioriza la seguridad'
    };
    const describeTeam = (team, venue) => {
      const identity = DATA.PHILOSOPHICAL_IDENTITIES[team.id] || {};
      const strategy = team.strategy || 'Posesión';
      const tactic = team.tactics || DATA.DEFAULT_TACTICS;
      return `
        <article class="team-introduction">
          <header>${this.ui.renderTeamCrest(team, 'team-introduction-crest')}<div><span>${venue} · ${identity.current || team.current}</span><h4>${team.name}</h4></div></header>
          <p><strong>Qué representa.</strong> ${identity.principle || 'Una manera propia de comprender el juego y la competición.'}</p>
          <p><strong>Cómo lo lleva al campo.</strong> ${identity.footballMeaning || 'Su identidad se expresa mediante el funcionamiento colectivo.'}</p>
          <div class="team-game-model"><span>${team.formation}</span><span>${strategy}</span><span>Presión ${String(tactic.pressure || 'Media').toLowerCase()}</span><span>Ritmo ${String(tactic.tempo || 'Medio').toLowerCase()}</span></div>
          <small>Hoy ${strategyDescriptions[strategy] || 'buscará imponer su identidad con un plan equilibrado'}.</small>
        </article>`;
    };
    return `
      <section class="team-introductions" aria-labelledby="team-introductions-title">
        <div class="team-introductions-heading"><span class="season-kicker">Identidad del duelo</span><h3 id="team-introductions-title">Dos maneras de entender el fútbol</h3></div>
        <div class="team-introduction-grid">${describeTeam(homeTeam, 'Local')}${describeTeam(awayTeam, 'Visitante')}</div>
      </section>`;
  }

  renderMatchBriefing(homeTeam, awayTeam) {
    const standings = this.leagueEngine.getStandings();
    const standingFor = team => standings.find(item => item.teamId === team.id) || {
      played: 0, points: 0, goalsFor: 0, goalsAgainst: 0
    };
    const positionFor = team => Math.max(1, standings.findIndex(item => item.teamId === team.id) + 1);
    const average = (team, field) => Math.round(team.players.reduce(
      (sum, player) => sum + (Number(player[field]) || 0), 0
    ) / Math.max(1, team.players.length));
    const starFor = team => [...team.players].sort((a, b) =>
      (Number(b.overall) || 0) - (Number(a.overall) || 0) ||
      (Number(b.morale) || 0) - (Number(a.morale) || 0)
    )[0];
    const scorerFor = team => [...team.players].sort((a, b) =>
      (Number(b.goals) || 0) - (Number(a.goals) || 0) ||
      (Number(b.assists) || 0) - (Number(a.assists) || 0) ||
      (Number(b.shooting) || 0) - (Number(a.shooting) || 0)
    )[0];
    const formFor = team => Array.isArray(team.form) ? team.form.slice(-5) : [];
    const describeForm = team => {
      const form = formFor(team);
      if (!form.length) return `<strong>${team.shortName}</strong> llega sin resultados previos esta temporada`;
      const wins = form.filter(result => result === 'V').length;
      const losses = form.filter(result => result === 'D').length;
      const trend = wins >= 3 ? 'en una dinámica muy positiva' : losses >= 3
        ? 'necesitado de una reacción' : wins > losses ? 'con buenas sensaciones' : wins < losses
          ? 'en un momento irregular' : 'en una fase equilibrada';
      return `<strong>${team.shortName}</strong> llega ${trend} (<strong>${form.join(' · ')}</strong>)`;
    };
    const moraleLabel = value => value >= 82 ? 'muy alta' : value >= 74 ? 'positiva' : value >= 65
      ? 'estable' : value >= 55 ? 'delicada' : 'baja';
    const scorerSummary = team => {
      const scorer = scorerFor(team);
      const goals = Number(scorer?.goals) || 0;
      if (goals) return `<strong>${scorer.name}</strong> lidera a ${team.shortName} con <strong>${goals} gol${goals === 1 ? '' : 'es'}</strong>`;
      return `<strong>${scorer.name}</strong> aparece como principal amenaza de ${team.shortName} aunque todavía no se ha estrenado`;
    };

    const homeStanding = standingFor(homeTeam);
    const awayStanding = standingFor(awayTeam);
    const homeStar = starFor(homeTeam);
    const awayStar = starFor(awayTeam);
    const homeMorale = average(homeTeam, 'morale');
    const awayMorale = average(awayTeam, 'morale');
    const homeFitness = average(homeTeam, 'fitness');
    const awayFitness = average(awayTeam, 'fitness');
    const classification = homeStanding.played || awayStanding.played
      ? `<strong>${homeTeam.shortName}</strong> ocupa el <strong>${positionFor(homeTeam)}.º puesto</strong> con ${homeStanding.points} puntos; ` +
        `<strong>${awayTeam.shortName}</strong>, el <strong>${positionFor(awayTeam)}.º</strong> con ${awayStanding.points}`
      : `La <strong>clasificación todavía está por estrenarse</strong>: ambos equipos parten en igualdad antes de la jornada inaugural`;

    return `
      <section class="match-briefing" aria-labelledby="match-briefing-title">
        <div class="match-briefing-heading">
          <span class="season-kicker">Claves del partido</span>
          <h4 id="match-briefing-title">Lo que debes saber antes de jugar</h4>
        </div>
        <ul>
          <li>Los cracks del duelo son <strong>${homeStar.name}</strong> (${homeTeam.shortName}, ${homeStar.overall}) y <strong>${awayStar.name}</strong> (${awayTeam.shortName}, ${awayStar.overall}).</li>
          <li>${classification}.</li>
          <li>${describeForm(homeTeam)}; ${describeForm(awayTeam)}.</li>
          <li>La moral es <strong>${moraleLabel(homeMorale)}</strong> en ${homeTeam.shortName} (${homeMorale}/100) y <strong>${moraleLabel(awayMorale)}</strong> en ${awayTeam.shortName} (${awayMorale}/100), con un estado físico medio de <strong>${homeFitness}% · ${awayFitness}%</strong>.</li>
          <li>${scorerSummary(homeTeam)}; ${scorerSummary(awayTeam)}.</li>
        </ul>
      </section>`;
  }

  renderPreMatchLineup(team, players) {
    const assignments = this.teamManager.assignLineupToFormation(team.id, players.map(player => player.id));
    const yByLine = { gk: 87, def: 68, mid: 43, att: 18 };
    const playerById = Object.fromEntries(players.map(player => [player.id, player]));
    const lineup = assignments.map(assignment => {
      const player = playerById[assignment.playerId];
      if (!player) return '';
      const visualIndex = assignment.visualLineIndex ?? assignment.lineIndex;
      const visualCount = assignment.visualLineCount ?? assignment.lineCount;
      const x = ((visualIndex + 1) / (visualCount + 1)) * 100;
      const y = assignment.visualY ?? yByLine[assignment.line];
      const displayName = player.name.split(' ').slice(-1)[0];
      const goalkeeperClass = assignment.line === 'gk' ? 'goalkeeper' : '';
      const captain = player.id === team.captainId ? '<i aria-label="Capitán">C</i>' : '';
      const effectiveOverall = this.teamManager.getEffectiveOverall(player, assignment.slotPosition);
      const delta = effectiveOverall - player.overall;
      return `<div class="pitch-player preview-player ${goalkeeperClass} ${delta ? 'is-adapted' : ''}" style="--player-x:${x}%;--player-y:${y}%" title="${player.name} · media base ${player.overall} · media en ${DATA.getPositionLabel(assignment.slotPosition, true)} ${effectiveOverall}">
        <span class="pitch-shirt ${delta > 0 ? 'overall-up' : delta < 0 ? 'overall-down' : ''}">${effectiveOverall}${captain}</span><strong>${displayName}${this.ui.renderAcademyBadge(player, true)}</strong><small>${DATA.getPositionLabel(assignment.slotPosition)}${delta ? ` · ${delta > 0 ? '+' : ''}${delta}` : ''}</small>
      </div>`;
    }).join('');
    return `<div class="tactical-pitch pre-match-lineup-pitch" aria-label="Alineación ${team.formation} de ${team.name}">${lineup}</div>`;
  }

  validateMatchLineup() {
    const lineup = this.teamManager.ensureValidStartingXI(this.userTeamId);
    if (lineup.valid) {
      if (lineup.repaired) {
        this.saveGame();
        this.ui.showSuccess('La alineación estaba incompleta: se ha preparado automáticamente el mejor XI');
      }
      return true;
    }
    this.ui.showError(lineup.error || 'No se puede completar un once válido');
    this.showScreen('squad');
    return false;
  }

  // Jugar partido
  playMatch() {
    const userTeamId = this.userTeamId;
    const nextMatch = this.leagueEngine.getNextUserMatch(userTeamId);

    if (!nextMatch) {
      alert('No hay próximo partido');
      return;
    }

    // Validar que tenga alineación
    if (!this.validateMatchLineup()) return;

    // Mostrar pantalla de simulación
    const durationOption = document.querySelector('.match-duration-option.active');
    const halfDuration = Number(durationOption ? durationOption.dataset.matchDuration : GameStorage.getSetting('halfDuration', 3));
    GameStorage.setSetting('halfDuration', String(halfDuration));
    this.showMatchSimulation(nextMatch, null, halfDuration);
  }

  playQuickResult() {
    const match = this.leagueEngine.getNextUserMatch(this.userTeamId);
    if (!match) {
      alert('No hay próximo partido');
      return;
    }
    if (!this.validateMatchLineup()) return;

    const homeTeam = this.teamManager.getTeam(match.homeTeam);
    const awayTeam = this.teamManager.getTeam(match.awayTeam);
    const aiTeam = homeTeam.id === this.userTeamId ? awayTeam : homeTeam;
    const userTeam = homeTeam.id === this.userTeamId ? homeTeam : awayTeam;
    this.leagueEngine.prepareAITeam(aiTeam, userTeam);

    const matchEngine = new MatchEngine(homeTeam, awayTeam, this.teamManager);
    matchEngine.simulateFullMatch();
    const result = matchEngine.finalizeMatch();
    const playerReport = Object.entries(result.matchState.playerStats).map(([id, stats]) => {
      const homePlayer = homeTeam.players.find(player => player.id === id);
      const awayPlayer = awayTeam.players.find(player => player.id === id);
      const player = homePlayer || awayPlayer;
      return {
        id,
        teamId: homePlayer ? homeTeam.id : awayTeam.id,
        name: player ? player.name : 'Jugador',
        side: homePlayer ? 'home' : 'away',
        position: stats.position,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        yellowCards: stats.yellowCards || 0,
        redCards: stats.redCards || 0,
        injured: result.matchState.injuries.some(injury => injury.player === (player && player.name)),
        fitness: Math.round(player ? player.fitness : 0),
        rating: Number(stats.rating) || 6
      };
    });
    const consequenceState = {
      players: Object.fromEntries(playerReport.map(player => [player.id, { ...player, appeared: true }])),
      injuries: result.matchState.injuries.map(injury => {
        const team = injury.team === 'HOME' ? homeTeam : awayTeam;
        const player = team.players.find(candidate => candidate.name === injury.player);
        return {
          playerId: player ? player.id : null,
          teamId: team.id,
          severity: injury.duration > 2 ? 'moderate' : 'minor',
          matchesRemaining: injury.duration
        };
      }).filter(injury => injury.playerId)
    };
    [homeTeam.id, awayTeam.id].forEach(teamId => {
      this.teamManager.registerMatchConsequences(teamId, consequenceState, match.matchday);
    });
    this.leagueEngine.recordResult(match.id, result.homeGoals, result.awayGoals, {
      simulationType: 'quick-result',
      stats: result.matchState.stats,
      events: result.matchState.events.map(event => ({
        ...event,
        side: event.team === 'HOME' ? 'home' : 'away'
      })),
      injuries: consequenceState.injuries,
      players: playerReport
    });
    this.leagueEngine.simulateMatchday(match.matchday, this.userTeamId);
    matchEngine.recoveryAfterMatch(true, 2);
    matchEngine.recoveryAfterMatch(false, 2);
    GameStorage.saveCurrentMatch(null);
    this.saveGame();
    this.showMatchResult(match, homeTeam, awayTeam, result.homeGoals, result.awayGoals);
  }

  // Mostrar simulación de partido (mejorado Fase 3)
  showMatchSimulation(match, restoredEngine = null, halfDuration = 3) {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');

    navBar.innerHTML = '';

    const homeTeam = this.teamManager.getTeam(match.homeTeam);
    const awayTeam = this.teamManager.getTeam(match.awayTeam);
    this.currentMatch = match;
    this.liveMatchEngine = restoredEngine
      ? LiveMatchEngine.deserialize(restoredEngine, this.teamManager)
      : new LiveMatchEngine(homeTeam, awayTeam, this.teamManager, {
          userTeamId: this.userTeamId,
          halfDuration
        });
    this.matchEventCursor = 0;
    this.isMatchPaused = restoredEngine ? true : false;
    this.matchPlaybackSpeed = 1;
    this.matchFinalized = false;
    this.pendingSubstitutions = [];

    const userState = this.liveMatchEngine.getTeamState(this.userTeamId);
    const userTeam = this.teamManager.getTeam(this.userTeamId);
    const homeKit = this.liveMatchEngine.state.teams.home;
    const awayKit = this.liveMatchEngine.state.teams.away;

    content.innerHTML = `
      <div class="live-match-shell" style="--home-kit:${homeKit.kitColor};--away-kit:${awayKit.kitColor}">
        <header class="live-scoreboard">
          <div class="score-team home">${this.ui.renderTeamCrest(homeTeam, 'score-club-crest')}<span>${homeTeam.shortName}<small>local</small></span><strong id="home-score">0</strong></div>
          <div class="live-clock"><strong id="match-minute">0'</strong><small id="match-phase">Prepartido</small></div>
          <div class="score-team away"><strong id="away-score">0</strong><span>${awayTeam.shortName}<small>${awayKit.kitType}</small></span>${this.ui.renderTeamCrest(awayTeam, 'score-club-crest')}</div>
        </header>
        <div id="match-break-discipline" class="match-break-discipline" hidden></div>

        <div class="live-match-grid">
          <main class="live-pitch-column">
            <div class="match-controls live-controls live-controls-top">
              <button id="btn-pause" class="btn btn-secondary">${this.isMatchPaused ? 'Reanudar' : 'Pausa'}</button>
              <div class="speed-control" role="group" aria-label="Velocidad de reproducción">
                <span>Velocidad</span>
                <button id="btn-normal-speed" class="btn btn-secondary ${this.matchPlaybackSpeed === 1 ? 'active' : ''}" aria-pressed="${this.matchPlaybackSpeed === 1}">1×</button>
                <button id="btn-fast-speed" class="btn btn-secondary ${this.matchPlaybackSpeed === 3 ? 'active' : ''}" aria-pressed="${this.matchPlaybackSpeed === 3}">3×</button>
                <button id="btn-super-speed" class="btn btn-secondary ${this.matchPlaybackSpeed === 5 ? 'active' : ''}" aria-pressed="${this.matchPlaybackSpeed === 5}">5×</button>
              </div>
              <button id="btn-skip-first-half" class="btn btn-secondary">Hasta descanso</button>
              <button id="btn-skip-full-match" class="btn btn-secondary">Hasta final</button>
              <button id="btn-save-exit-match" class="btn btn-secondary">Salir al menú</button>
            </div>
            <div class="pitch-frame">
              <canvas id="match-canvas" aria-label="Representación táctica del partido"></canvas>
            </div>
            <div class="pitch-legend" aria-label="Leyenda táctica">
              <span><i class="legend-ring pressure"></i> Presión</span>
              <span><i class="legend-ring cover"></i> Cobertura</span>
              <span><i class="legend-line home"></i> Línea local</span>
              <span><i class="legend-line away"></i> Línea visitante</span>
              <span><i class="legend-flight"></i> Balón elevado</span>
            </div>
            <div class="live-stats-strip">
              <span>Posesión <strong id="possession">50% · 50%</strong></span>
              <span>Tiros <strong id="shots">0 - 0</strong></span>
              <span>A puerta <strong id="shots-on-target">0 - 0</strong></span>
              <span>Faltas <strong id="fouls">0 - 0</strong></span>
              <span>F. juego <strong id="offsides">0 - 0</strong></span>
            </div>
          </main>

          <aside class="coach-console" id="coach-console">
            <div class="coach-heading">
              <span>Partido en directo</span>
              <strong>${userTeam.name}</strong>
              <small><span id="subs-used">${userState.substitutions}</span>/5 cambios</small>
            </div>
            <div class="coach-primary-actions">
              <button class="coach-action" data-coach-tab="tactics"><span>◆</span><strong>Táctica</strong><small>Ajustar el plan</small></button>
              <button class="coach-action" data-coach-tab="changes"><span>⇄</span><strong>Hacer cambios</strong><small>Elegir jugador</small></button>
            </div>
            <div class="live-quick-access" aria-label="Órdenes rápidas">
              <div><strong>Órdenes rápidas</strong><small>Respuesta inmediata</small></div>
              ${DATA.QUICK_ORDERS.filter(order => ['Normal', 'Buscar el empate', 'Presionar rival', 'Mantener posesión', 'Contraatacar', 'Perder tiempo', 'Defender resultado'].includes(order.value)).map(order => `
                <button type="button" class="live-quick-chip ${userState.tactics.situationalInstruction === order.value ? 'active' : ''}" data-live-order="${order.value}" title="${order.description}" aria-pressed="${userState.tactics.situationalInstruction === order.value}">${order.label}</button>`).join('')}
            </div>
            <div class="coach-narrative-always">
              <section class="match-narrative live-narrative sidebar-narrative">
                <div class="coach-section-title"><h4>Narración</h4><span>En directo</span></div>
                <div id="narrative-log" aria-live="polite"></div>
              </section>
            </div>
            <div class="coach-drawer" id="coach-drawer" aria-hidden="true">
              <div class="coach-drawer-bar"><strong id="coach-drawer-title">Decisiones</strong><button type="button" id="btn-close-coach-drawer" aria-label="Cerrar panel">×</button></div>
              <div class="coach-panel" data-coach-panel="tactics">
                ${this.renderLiveTactics(userState.tactics, userState)}
              </div>
              <div class="coach-panel" data-coach-panel="changes">
                <p class="change-flow-help">Elige sobre el once quién debe salir. Te recomendaremos los mejores reemplazos.</p>
                <div id="live-team-list" class="live-change-team">${this.renderLiveTeamList()}</div>
                <input id="sub-player-out" type="hidden" value="">
                <input id="sub-player-in" type="hidden" value="">
                <div class="change-selection-summary">
                  <span>Sale<strong id="selected-player-out">Toca un titular</strong></span>
                  <i>→</i>
                  <span>Entra<strong id="selected-player-in">Elige un suplente</strong></span>
                </div>
                <div><div class="live-bench-heading"><strong>Banquillo</strong><small>Ordenado por encaje</small></div><div id="live-bench-list" class="live-bench-list">${this.renderSubstitutionCandidates()}</div></div>
                <button id="btn-queue-substitution" class="btn btn-secondary">Preparar cambio</button>
                <div id="queued-substitutions" class="queued-substitutions">${this.renderQueuedSubstitutions()}</div>
                <button id="btn-make-substitution" class="btn btn-primary" disabled>Confirmar cambios</button>
                <p id="substitution-feedback" class="coach-feedback"></p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    const canvas = document.getElementById('match-canvas');
    this.matchRenderer = new MatchRenderer(canvas, this.liveMatchEngine);
    this.attachLiveMatchControls();
    this.renderLiveMatchState();
    if (!restoredEngine) this.liveMatchEngine.startMatch();
    if (!this.isMatchPaused) this.startLiveMatchLoop();
    this.resetScreenViewport();
  }

  renderLiveTactics(tactics, teamState = null) {
    const recommendation = this.getLiveTacticalRecommendation();
    const formation = teamState?.formation || this.teamManager.getTeam(this.userTeamId).formation;
    const formationOptions = Object.values(DATA.FORMATIONS).map(item =>
      `<option value="${item.name}" ${item.name === formation ? 'selected' : ''}>${item.name} · ${item.description}</option>`
    ).join('');
    const planButtons = Object.values(DATA.MATCH_PLANS).map(plan => `
      <button type="button" class="live-plan-button ${this.teamManager.getTeam(this.userTeamId).activeMatchPlan === plan.id ? 'active' : ''}" data-live-plan="${plan.id}"><span>Plan ${plan.id}</span><strong>${plan.name}</strong><small>${plan.effects.join(' · ')}</small></button>`).join('');
    const orderButtons = DATA.QUICK_ORDERS.map(order => `
      <button type="button" class="live-order-button ${tactics.situationalInstruction === order.value ? 'active' : ''}" data-live-order="${order.value}"><strong>${order.label}</strong><small>${order.description}</small></button>`).join('');
    return `
      <div id="live-tactical-recommendation" class="live-tactical-recommendation" data-reading-key="${recommendation.key}" data-tone="${recommendation.tone}">${this.renderLiveRecommendation(recommendation)}</div>
      <label class="live-formation-control"><span><strong>Sistema</strong><small>Recoloca al equipo sin detener el partido</small></span><select id="live-formation-select" class="form-control" aria-label="Cambiar formación durante el partido">${formationOptions}</select></label>
      <div class="live-plan-grid">${planButtons}</div>
      <div class="live-order-heading"><strong>Órdenes rápidas</strong><small>Un toque, efecto inmediato</small></div>
      <div class="live-order-grid">${orderButtons}</div>
    `;
  }

  getLiveTacticalRecommendation() {
    if (!this.liveMatchEngine) return { planId: 'A', tone: 'neutral', key: 'pre', reason: 'Empieza controlando el partido.' };
    const state = this.liveMatchEngine.state;
    const userSide = state.teams.home.teamId === this.userTeamId ? 'home' : 'away';
    const rivalSide = userSide === 'home' ? 'away' : 'home';
    const difference = state.score[userSide] - state.score[rivalSide];
    const minute = Math.floor(state.displayMinute);
    const stats = state.stats[userSide];
    const rivalStats = state.stats[rivalSide];
    const userReds = this.liveMatchEngine.onField(userSide).length < this.liveMatchEngine.onField(rivalSide).length;
    const totalPossession = stats.possessionTicks + rivalStats.possessionTicks;
    const possession = totalPossession ? Math.round(stats.possessionTicks / totalPossession * 100) : 50;
    let planId = 'A';
    let tone = 'neutral';
    let reason = `Partido equilibrado (${possession}% de posesión): mantén la estructura y observa dónde aparece la ventaja.`;

    if (userReds) {
      planId = difference > 0 ? 'C' : difference < 0 && minute >= 70 ? 'B' : 'A';
      tone = 'warning';
      reason = difference > 0
        ? 'Estás en inferioridad y por delante: junta líneas y protege el carril central.'
        : 'Estás en inferioridad: conserva una salida y evita que el equipo se parta.';
    } else if (difference < 0 && minute >= 70) {
      planId = 'B'; tone = 'urgent';
      reason = `Vas ${Math.abs(difference)} gol${difference < -1 ? 'es' : ''} abajo en el tramo final: sube presión, ritmo y altura.`;
    } else if (difference < 0) {
      planId = 'B'; tone = 'warning';
      reason = `Vas por detrás en el ${minute}': aumenta la iniciativa sin romper todavía el equilibrio.`;
    } else if (difference > 0 && minute >= 65) {
      planId = 'C'; tone = 'protect';
      reason = `Defiendes ${difference} gol${difference > 1 ? 'es' : ''} de ventaja: cierra espacios interiores y amenaza al contraataque.`;
    } else if (stats.shotsOnTarget + 2 <= rivalStats.shotsOnTarget || possession < 40) {
      planId = 'A'; tone = 'warning';
      reason = `El rival está imponiendo el partido (${possession}% de posesión y ${stats.shotsOnTarget}-${rivalStats.shotsOnTarget} a puerta): recupera control antes de acelerar.`;
    } else if (stats.shots >= rivalStats.shots + 4 && difference === 0 && minute >= 45) {
      planId = 'B'; tone = 'warning';
      reason = 'Estás llegando más pero el empate sigue: convierte el dominio en presión y más presencia en área.';
    } else if (difference > 0) {
      reason = 'Vas por delante y aún queda partido: conserva el control sin hundirte demasiado pronto.';
    }
    return { planId, tone, key: [minute, difference, possession, stats.shots, rivalStats.shots, stats.shotsOnTarget, rivalStats.shotsOnTarget, userReds, planId].join('-'), reason };
  }

  renderLiveRecommendation(recommendation) {
    return `<span>Lectura del partido · ${this.liveMatchEngine ? this.liveMatchEngine.state.displayMinute : 0}'</span><p>${recommendation.reason}</p><button type="button" class="btn btn-secondary" data-live-plan="${recommendation.planId}">Aplicar Plan ${recommendation.planId}</button>`;
  }

  renderLiveTeamList() {
    if (!this.liveMatchEngine) return '';
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    return teamState.onField.map(id => {
      const state = this.liveMatchEngine.state.players[id];
      if (!state || !state.onField) return '';
      const fitness = Math.round(state.fitness);
      const data = this.teamManager.getPlayer(this.userTeamId, state.id);
      const effectiveOverall = this.teamManager.getEffectiveOverall(data, state.assignedPosition);
      const overallDelta = effectiveOverall - data.overall;
      const fitnessLevel = fitness < 40 ? 'critical' : fitness < 65 ? 'low' : fitness < 80 ? 'medium' : 'high';
      return `
        <button type="button" class="live-player-row" data-player-id="${state.id}" aria-pressed="false" title="Preparar cambio de ${state.name}">
          <span class="live-player-dot ${state.side}" style="background:${teamState.kitColor}">${state.number}</span>
          <span><strong>${state.name}${state.isCaptain ? ' (C)' : ''} ${this.ui.renderAcademyBadge(data)}</strong><small>${DATA.getPositionLabel(state.assignedPosition)} · MED ${effectiveOverall}${overallDelta ? ` (${overallDelta > 0 ? '+' : ''}${overallDelta})` : ''} · confianza ${Math.round(state.confidence || 50)}</small></span>
          <span class="fitness ${fitnessLevel}" aria-label="Cansancio: ${fitness}%">
            <span class="fitness-bar"><i style="width:${fitness}%"></i></span>
            <em>${fitness}%</em>
          </span>
          <span>${state.yellowCards ? '🟨' : ''}${state.redCards ? '🟥' : ''}${state.injured ? '✚' : ''}</span>
        </button>`;
    }).join('');
  }

  renderSubstitutionOptions(onField, suggestedForId = null) {
    if (!this.liveMatchEngine) return '';
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    const ids = onField ? teamState.onField : teamState.bench;
    const queuedOut = new Set((this.pendingSubstitutions || []).map(change => change.playerOutId));
    const queuedIn = new Set((this.pendingSubstitutions || []).map(change => change.playerInId));
    const outgoing = suggestedForId ? this.liveMatchEngine.state.players[suggestedForId] : null;
    const requiredChange = this.liveMatchEngine.getRequiredInjurySubstitution();
    const players = ids.map(id => this.liveMatchEngine.state.players[id])
      .filter(player => player && (onField
        ? player.onField && !queuedOut.has(player.id) && (!requiredChange || player.id === requiredChange.playerId)
        : !player.appeared && !queuedIn.has(player.id) &&
          (!outgoing || (player.position === 'GK') === (outgoing.position === 'GK'))));
    if (!onField && outgoing) {
      players.sort((a, b) => this.getSubstitutionFitScore(b, outgoing) - this.getSubstitutionFitScore(a, outgoing));
    }
    const options = players
      .map(player => {
        const data = this.teamManager.getPlayer(this.userTeamId, player.id);
        const fit = !onField && outgoing ? this.getSubstitutionFitLabel(player, outgoing) : '';
        return `<option value="${player.id}">${fit ? `${fit} · ` : ''}${player.name}${this.ui.isAcademyPlayer(data) ? ' · CAN' : ''} · ${DATA.getPositionLabel(player.position)} · ${Math.round(player.fitness)}% · ${data.overall}</option>`;
      }).join('');
    return `<option value="">Seleccionar…</option>${options}`;
  }

  renderSubstitutionCandidates(suggestedForId = null) {
    if (!this.liveMatchEngine) return '';
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    const outgoing = suggestedForId ? this.liveMatchEngine.state.players[suggestedForId] : null;
    const queuedIn = new Set((this.pendingSubstitutions || []).map(change => change.playerInId));
    const candidates = teamState.bench.map(id => this.liveMatchEngine.state.players[id])
      .filter(player => player && !player.appeared && !queuedIn.has(player.id) &&
        (!outgoing || (player.position === 'GK') === (outgoing.position === 'GK')))
      .sort((a, b) => outgoing ? this.getSubstitutionFitScore(b, outgoing) - this.getSubstitutionFitScore(a, outgoing) : 0);
    if (!candidates.length) return '<p class="queue-empty">Selecciona primero quién sale.</p>';
    return candidates.map((player, index) => {
      const data = this.teamManager.getPlayer(this.userTeamId, player.id);
      const fit = outgoing ? this.getSubstitutionFitLabel(player, outgoing) : 'Disponible';
      return `<button type="button" class="bench-choice ${index === 0 && outgoing ? 'recommended' : ''}" data-substitute-in="${player.id}" aria-pressed="false">
        <span><strong>${player.name} ${this.ui.renderAcademyBadge(data)}</strong><small>${fit} · ${DATA.getPositionLabel(player.position)}</small></span>
        <span><strong>${data.overall}</strong><small>${Math.round(player.fitness)}%</small></span>
      </button>`;
    }).join('');
  }

  getPositionLine(position) {
    if (position === 'GK') return 'GK';
    if (['CB', 'RB', 'LB'].includes(position)) return 'DEF';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position)) return 'MID';
    return 'ATK';
  }

  getSubstitutionFitScore(candidate, outgoing) {
    if ((candidate.position === 'GK') !== (outgoing.position === 'GK')) return -Infinity;
    const data = this.teamManager.getPlayer(this.userTeamId, candidate.id);
    const exact = candidate.position === outgoing.position ? 1000 : 0;
    const sameLine = this.getPositionLine(candidate.position) === this.getPositionLine(outgoing.position) ? 450 : 0;
    const versatilePairs = [
      ['RB', 'LB'], ['CB', 'CDM'], ['CM', 'CDM'], ['CM', 'CAM'],
      ['RW', 'LW'], ['RW', 'ST'], ['LW', 'ST'], ['RM', 'RW'], ['LM', 'LW']
    ];
    const adaptable = versatilePairs.some(pair => pair.includes(candidate.position) && pair.includes(outgoing.position)) ? 220 : 0;
    return exact + sameLine + adaptable + data.overall * 2 + candidate.fitness;
  }

  getSubstitutionFitLabel(candidate, outgoing) {
    if (candidate.position === outgoing.position) return 'Ideal';
    if (this.getPositionLine(candidate.position) === this.getPositionLine(outgoing.position)) return 'Buen encaje';
    return 'Adaptable';
  }

  renderQueuedSubstitutions() {
    if (!this.pendingSubstitutions || !this.pendingSubstitutions.length) {
      return '<p class="queue-empty">No hay cambios preparados.</p>';
    }
    return this.pendingSubstitutions.map((change, index) => {
      const outgoing = this.liveMatchEngine.state.players[change.playerOutId];
      const incoming = this.liveMatchEngine.state.players[change.playerInId];
      return `
        <div class="queued-change">
          <span><strong>${outgoing.name}</strong> → ${incoming.name}</span>
          <button type="button" data-remove-queued-sub="${index}" aria-label="Eliminar cambio">×</button>
        </div>`;
    }).join('');
  }

  attachLiveMatchControls() {
    const byId = id => document.getElementById(id);
    byId('btn-pause').addEventListener('click', () => {
      const requiredChange = this.liveMatchEngine.getRequiredInjurySubstitution();
      if (requiredChange && this.liveMatchEngine.state.phase !== 'HALF_TIME') {
        this.isMatchPaused = true;
        this.stopLiveMatchLoop();
        byId('btn-pause').textContent = 'Cambio obligatorio';
        this.selectPlayerForSubstitution(requiredChange.playerId);
        const feedback = document.getElementById('substitution-feedback');
        if (feedback) {
          feedback.textContent = 'Debes sustituir al jugador lesionado antes de continuar.';
          feedback.className = 'coach-feedback error';
        }
        return;
      }
      if (this.liveMatchEngine.state.phase === 'HALF_TIME') this.liveMatchEngine.resumeSecondHalf();
      this.isMatchPaused = !this.isMatchPaused;
      if (this.isMatchPaused) this.stopLiveMatchLoop();
      else this.startLiveMatchLoop();
      byId('btn-pause').textContent = this.isMatchPaused ? 'Reanudar' : 'Pausa';
      this.renderLiveMatchState();
    });
    const selectPlaybackSpeed = (speed, buttonId) => {
      this.matchPlaybackSpeed = speed;
      ['btn-normal-speed', 'btn-fast-speed', 'btn-super-speed'].forEach(id => {
        const button = byId(id);
        const active = id === buttonId;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (this.matchRenderer) this.matchRenderer.setPlaybackSpeed(speed, this.getLivePlaybackTiming(speed).logicStep);
      if (!this.isMatchPaused) this.startLiveMatchLoop();
    };
    byId('btn-normal-speed').addEventListener('click', () => {
      selectPlaybackSpeed(1, 'btn-normal-speed');
    });
    byId('btn-fast-speed').addEventListener('click', () => {
      selectPlaybackSpeed(3, 'btn-fast-speed');
    });
    byId('btn-super-speed').addEventListener('click', () => {
      selectPlaybackSpeed(5, 'btn-super-speed');
    });
    byId('btn-skip-first-half').addEventListener('click', () => this.skipLiveMatchTo(45));
    byId('btn-skip-full-match').addEventListener('click', () => this.skipLiveMatchTo(90));
    byId('btn-save-exit-match').addEventListener('click', () => this.saveAndExitLiveMatch());
    byId('btn-queue-substitution').addEventListener('click', () => this.queueLiveSubstitution());
    byId('btn-make-substitution').addEventListener('click', () => this.applyLiveSubstitution());
    byId('btn-close-coach-drawer').addEventListener('click', () => this.closeCoachDrawer());

    byId('coach-console').addEventListener('click', event => {
      const livePlan = event.target.closest('[data-live-plan]');
      if (livePlan) this.applyLiveMatchPlan(livePlan.dataset.livePlan);
      const liveOrder = event.target.closest('[data-live-order]');
      if (liveOrder) this.applyLiveQuickOrder(liveOrder.dataset.liveOrder);
      const playerRow = event.target.closest('.live-player-row[data-player-id]');
      if (playerRow) this.selectPlayerForSubstitution(playerRow.dataset.playerId);
      const benchChoice = event.target.closest('[data-substitute-in]');
      if (benchChoice) this.selectSubstitutionCandidate(benchChoice.dataset.substituteIn);
      const removeButton = event.target.closest('[data-remove-queued-sub]');
      if (removeButton) this.removeQueuedSubstitution(Number(removeButton.dataset.removeQueuedSub));
    });
    byId('live-formation-select')?.addEventListener('change', event => this.applyLiveFormation(event.target.value));

    document.querySelectorAll('.coach-action').forEach(button => {
      button.addEventListener('click', () => this.activateCoachTab(button.dataset.coachTab));
    });
  }

  saveAndExitLiveMatch() {
    if (!this.liveMatchEngine || !this.currentMatch) return;
    if (!confirm('El partido actual no se podrá reanudar y comenzará desde cero la próxima vez. ¿Salir al menú?')) return;
    this.stopLiveMatchLoop();
    this.isMatchPaused = true;
    GameStorage.saveCurrentMatch(null);
    this.saveGame();
    if (this.matchRenderer) this.matchRenderer.stop();
    this.matchRenderer = null;
    this.currentMatch = null;
    this.liveMatchEngine = null;
    this.showWelcomeScreen();
  }

  activateCoachTab(tabName) {
    const drawer = document.getElementById('coach-drawer');
    if (!drawer) return;
    document.querySelectorAll('.coach-action').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.coachTab === tabName);
    });
    document.querySelectorAll('.coach-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.coachPanel === tabName);
    });
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    const title = document.getElementById('coach-drawer-title');
    if (title) title.textContent = tabName === 'changes' ? 'Cambios' : 'Plan táctico';
  }

  closeCoachDrawer() {
    const drawer = document.getElementById('coach-drawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.coach-action').forEach(tab => tab.classList.remove('active'));
  }

  selectPlayerForSubstitution(playerId) {
    if ((this.pendingSubstitutions || []).some(change => change.playerOutId === playerId)) {
      const feedback = document.getElementById('substitution-feedback');
      feedback.textContent = 'Ese jugador ya tiene un cambio preparado.';
      feedback.className = 'coach-feedback error';
      this.activateCoachTab('changes');
      return;
    }
    if (!this.isMatchPaused) {
      this.isMatchPaused = true;
      this.stopLiveMatchLoop();
      document.getElementById('btn-pause').textContent = 'Reanudar';
    }
    this.activateCoachTab('changes');
    const outgoing = document.getElementById('sub-player-out');
    outgoing.value = playerId;
    document.querySelectorAll('.live-player-row').forEach(row => {
      const selected = row.dataset.playerId === playerId;
      row.classList.toggle('selected-for-change', selected);
      row.setAttribute('aria-pressed', String(selected));
    });
    this.updateSubstitutionRecommendations(true);
    if (window.matchMedia && window.matchMedia('(max-width: 700px)').matches) {
      window.setTimeout(() => {
        document.querySelector('.change-selection-summary')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  updateSubstitutionRecommendations(selectFirst = false) {
    const outgoing = document.getElementById('sub-player-out');
    const incoming = document.getElementById('sub-player-in');
    if (!outgoing || !incoming) return;
    incoming.value = '';
    const bench = document.getElementById('live-bench-list');
    if (bench) bench.innerHTML = this.renderSubstitutionCandidates(outgoing.value || null);
    const firstCandidate = bench?.querySelector('[data-substitute-in]');
    if (selectFirst && firstCandidate) this.selectSubstitutionCandidate(firstCandidate.dataset.substituteIn, false);
    document.querySelectorAll('.live-player-row').forEach(row => {
      const selected = Boolean(outgoing.value) && row.dataset.playerId === outgoing.value;
      row.classList.toggle('selected-for-change', selected);
      row.setAttribute('aria-pressed', String(selected));
    });
    const feedback = document.getElementById('substitution-feedback');
    const outgoingName = document.getElementById('selected-player-out');
    const incomingName = document.getElementById('selected-player-in');
    if (outgoingName) outgoingName.textContent = outgoing.value ? this.liveMatchEngine.state.players[outgoing.value].name : 'Toca un titular';
    if (incomingName && !incoming.value) incomingName.textContent = 'Elige un suplente';
    if (feedback && outgoing.value) {
      feedback.textContent = selectFirst && incoming.value
        ? 'Hemos seleccionado el suplente con mejor encaje. Puedes cambiarlo o añadir el cambio.'
        : 'Los suplentes están ordenados por encaje, nivel y fitness.';
      feedback.className = 'coach-feedback';
    }
  }

  selectSubstitutionCandidate(playerId, announce = true) {
    const incoming = document.getElementById('sub-player-in');
    if (!incoming || !this.liveMatchEngine.state.players[playerId]) return;
    incoming.value = playerId;
    document.querySelectorAll('[data-substitute-in]').forEach(button => {
      const active = button.dataset.substituteIn === playerId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const label = document.getElementById('selected-player-in');
    if (label) label.textContent = this.liveMatchEngine.state.players[playerId].name;
    if (announce) {
      const feedback = document.getElementById('substitution-feedback');
      feedback.textContent = 'Cambio listo para añadir.';
      feedback.className = 'coach-feedback success';
    }
  }

  queueLiveSubstitution() {
    const playerOutId = document.getElementById('sub-player-out').value;
    const playerInId = document.getElementById('sub-player-in').value;
    const feedback = document.getElementById('substitution-feedback');
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    const requiredChange = this.liveMatchEngine.getRequiredInjurySubstitution();
    if (!playerOutId || !playerInId) {
      feedback.textContent = 'Selecciona quién sale y quién entra.';
      feedback.className = 'coach-feedback error';
      return false;
    }
    if (requiredChange && playerOutId !== requiredChange.playerId) {
      feedback.textContent = 'Primero debes sustituir al jugador lesionado.';
      feedback.className = 'coach-feedback error';
      return false;
    }
    if (teamState.substitutions + this.pendingSubstitutions.length >= 5) {
      feedback.textContent = 'No puedes preparar más cambios.';
      feedback.className = 'coach-feedback error';
      return false;
    }
    if (this.pendingSubstitutions.some(change => change.playerOutId === playerOutId || change.playerInId === playerInId)) {
      feedback.textContent = 'Uno de esos jugadores ya está incluido en la lista.';
      feedback.className = 'coach-feedback error';
      return false;
    }
    this.pendingSubstitutions.push({ playerOutId, playerInId });
    feedback.textContent = 'Cambio añadido. Puedes preparar otro antes de confirmar.';
    feedback.className = 'coach-feedback success';
    this.refreshSubstitutionQueueUI();
    return true;
  }

  removeQueuedSubstitution(index) {
    if (index < 0 || index >= this.pendingSubstitutions.length) return;
    this.pendingSubstitutions.splice(index, 1);
    this.refreshSubstitutionQueueUI();
  }

  refreshSubstitutionQueueUI() {
    const queue = document.getElementById('queued-substitutions');
    const confirm = document.getElementById('btn-make-substitution');
    const outgoing = document.getElementById('sub-player-out');
    const incoming = document.getElementById('sub-player-in');
    if (queue) queue.innerHTML = this.renderQueuedSubstitutions();
    if (confirm) {
      confirm.disabled = this.pendingSubstitutions.length === 0;
      confirm.textContent = this.pendingSubstitutions.length
        ? `Confirmar ${this.pendingSubstitutions.length} cambio${this.pendingSubstitutions.length === 1 ? '' : 's'}`
        : 'Confirmar cambios';
    }
    if (outgoing) outgoing.value = '';
    if (incoming) incoming.value = '';
    const outgoingName = document.getElementById('selected-player-out');
    const incomingName = document.getElementById('selected-player-in');
    if (outgoingName) outgoingName.textContent = 'Toca un titular';
    if (incomingName) incomingName.textContent = 'Elige un suplente';
    const bench = document.getElementById('live-bench-list');
    if (bench) bench.innerHTML = this.renderSubstitutionCandidates();
  }

  getLivePlaybackTiming(speed = this.matchPlaybackSpeed, logicStep = 0.05) {
    if (this.liveMatchEngine?.getPlaybackTiming) return this.liveMatchEngine.getPlaybackTiming(speed, logicStep);
    return { speed: 1, logicStep, baseTickMs: 200, tickDelayMs: 200, animationSeconds: 0.2 };
  }

  startLiveMatchLoop() {
    this.stopLiveMatchLoop();
    this.isMatchPaused = false;
    const token = ++this.matchLoopToken;
    const logicStep = 0.05;
    let lastTimestamp = null;
    let accumulatorMs = 0;
    if (this.matchRenderer) this.matchRenderer.setPlaybackSpeed(this.matchPlaybackSpeed, logicStep);
    const frame = timestamp => {
      if (token !== this.matchLoopToken || this.isMatchPaused || !this.liveMatchEngine) return;
      const timing = this.getLivePlaybackTiming(this.matchPlaybackSpeed, logicStep);
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const elapsedMs = Math.min(250, Math.max(0, timestamp - lastTimestamp));
      lastTimestamp = timestamp;
      accumulatorMs += elapsedMs * timing.speed * timing.playbackBoost;
      let simulatedSteps = 0;
      while (accumulatorMs >= timing.baseTickMs && simulatedSteps < 6) {
        this.liveMatchEngine.simulateNextStep(logicStep, timing.animationSeconds);
        accumulatorMs -= timing.baseTickMs;
        simulatedSteps++;
        if (this.liveMatchEngine.state.complete || this.liveMatchEngine.state.status === 'paused') break;
      }
      // Una pestaña bloqueada no debe descargar después una ráfaga de lógica.
      if (simulatedSteps === 6) accumulatorMs = Math.min(accumulatorMs, timing.baseTickMs);
      if (simulatedSteps) {
        this.processLiveMatchEvents();
        this.renderLiveMatchState();
        this.persistLiveMatch();
      }
      if (this.liveMatchEngine.state.complete) {
        this.finalizeLiveMatch();
        return;
      }
      if (this.liveMatchEngine.state.status === 'paused') {
        this.isMatchPaused = true;
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) pauseBtn.textContent = this.liveMatchEngine.state.phase === 'HALF_TIME' ? 'Continuar' : 'Reanudar';
        return;
      }
      if (this.isMatchPaused) return;
      this.matchTimer = requestAnimationFrame(frame);
    };
    this.matchTimer = requestAnimationFrame(frame);
  }

  stopLiveMatchLoop() {
    this.matchLoopToken++;
    if (this.matchTimer) cancelAnimationFrame(this.matchTimer);
    this.matchTimer = null;
  }

  skipLiveMatchTo(targetMinute) {
    if (!this.liveMatchEngine || this.liveMatchEngine.state.complete) return;
    this.stopLiveMatchLoop();
    this.isMatchPaused = true;
    if (targetMinute > 45 && this.liveMatchEngine.state.phase === 'HALF_TIME') {
      this.liveMatchEngine.resumeSecondHalf();
    }
    let guard = 0;
    const reachedTarget = () => targetMinute === 45
      ? this.liveMatchEngine.state.phase === 'HALF_TIME'
      : targetMinute >= 90
        ? this.liveMatchEngine.state.complete
        : this.liveMatchEngine.state.minute >= targetMinute;
    while (!reachedTarget() && guard < 3000) {
      this.liveMatchEngine.simulateNextStep(0.1);
      if (this.liveMatchEngine.getRequiredInjurySubstitution()) break;
      if (targetMinute > 45 && this.liveMatchEngine.state.phase === 'HALF_TIME') {
        this.liveMatchEngine.resumeSecondHalf();
      } else if (targetMinute === 45 && this.liveMatchEngine.state.phase === 'HALF_TIME') {
        break;
      }
      guard++;
    }
    this.processLiveMatchEvents();
    this.renderLiveMatchState();
    this.persistLiveMatch(true);
    if (this.liveMatchEngine.state.complete) this.finalizeLiveMatch();
    else {
      const pauseBtn = document.getElementById('btn-pause');
      if (pauseBtn) pauseBtn.textContent = this.liveMatchEngine.state.phase === 'HALF_TIME' ? 'Continuar' : 'Reanudar';
    }
  }

  processLiveMatchEvents() {
    const events = this.liveMatchEngine.getNewEvents(this.matchEventCursor);
    this.matchEventCursor = this.liveMatchEngine.state.events.length;
    const narrative = document.getElementById('narrative-log');
    let requiresAttention = false;
    events.forEach(event => {
      if (narrative) {
        const eventKey = `${event.type}|${event.side || ''}|${event.narration}`;
        const previousKey = narrative.firstElementChild?.dataset.eventKey;
        if (eventKey !== previousKey) {
          const line = document.createElement('p');
          line.className = `event event-${event.type.toLowerCase()} ${event.side || ''}`;
          line.dataset.eventKey = eventKey;
          line.textContent = event.narration;
          narrative.prepend(line);
        }
      }
      if (event.requiresAttention) {
        this.isMatchPaused = true;
        requiresAttention = true;
      }
    });
    if (narrative) narrative.scrollTop = 0;
    if (requiresAttention) this.closeCoachDrawer();
    const requiredChange = this.liveMatchEngine.getRequiredInjurySubstitution();
    if (requiredChange) {
      this.selectPlayerForSubstitution(requiredChange.playerId);
      const feedback = document.getElementById('substitution-feedback');
      if (feedback) {
        feedback.textContent = 'Cambio obligatorio: el jugador lesionado no puede continuar.';
        feedback.className = 'coach-feedback error';
      }
    }
    if (this.isMatchPaused) {
      this.stopLiveMatchLoop();
      const pauseBtn = document.getElementById('btn-pause');
      if (pauseBtn) pauseBtn.textContent = requiredChange ? 'Cambio obligatorio' : requiresAttention ? 'Continuar' : 'Reanudar';
    }
  }

  renderLiveMatchState() {
    if (!this.liveMatchEngine) return;
    const state = this.liveMatchEngine.state;
    const set = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };
    set('home-score', state.score.home);
    set('away-score', state.score.away);
    set('match-minute', this.formatLiveMatchMinute(state));
    set('match-phase', `${this.livePhaseLabel(state.phase)} · Árbitro ${state.referee.cardStrictness}/10`);
    const totalPossession = state.stats.home.possessionTicks + state.stats.away.possessionTicks;
    const homePossession = totalPossession ? Math.round(state.stats.home.possessionTicks / totalPossession * 100) : 50;
    set('possession', `${homePossession}% · ${100 - homePossession}%`);
    set('shots', `${state.stats.home.shots} - ${state.stats.away.shots}`);
    set('shots-on-target', `${state.stats.home.shotsOnTarget} - ${state.stats.away.shotsOnTarget}`);
    set('fouls', `${state.stats.home.fouls} - ${state.stats.away.fouls}`);
    set('offsides', `${state.stats.home.offsides} - ${state.stats.away.offsides}`);
    const discipline = document.getElementById('match-break-discipline');
    if (discipline) {
      const atBreak = ['HALF_TIME_SETUP', 'HALF_TIME'].includes(state.phase);
      discipline.hidden = !atBreak;
      discipline.textContent = atBreak ? `Descanso · ${this.liveMatchEngine.getYellowCardSummary()}` : '';
    }
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    set('subs-used', teamState.substitutions);
    const teamList = document.getElementById('live-team-list');
    if (teamList) teamList.innerHTML = this.renderLiveTeamList();
    const recommendation = this.getLiveTacticalRecommendation();
    const reading = document.getElementById('live-tactical-recommendation');
    if (reading && reading.dataset.readingKey !== recommendation.key) {
      reading.dataset.readingKey = recommendation.key;
      reading.dataset.tone = recommendation.tone;
      reading.innerHTML = this.renderLiveRecommendation(recommendation);
    }
  }

  livePhaseLabel(phase) {
    return {
      KICK_OFF: 'Saque inicial', BUILD_UP: 'En juego', TRANSITION: 'Transición',
      ATTACK: 'Ataque', LOOSE_BALL: 'Balón dividido', SET_PIECE: 'Balón parado',
      GOAL_CELEBRATION: 'Celebración del gol', KICK_OFF_SETUP: 'Preparando el saque',
      HALF_TIME_SETUP: 'Jugadores al descanso',
      HALF_TIME: 'Descanso', FULL_TIME: 'Final'
    }[phase] || 'En juego';
  }

  formatLiveMatchMinute(state) {
    if (state.half === 1 && state.minute > 45) {
      return `45+${Math.min(state.addedTime.firstHalf, Math.ceil(state.minute - 45))}'`;
    }
    if (state.half === 2 && state.minute > 90) {
      return `90+${Math.min(state.addedTime.secondHalf, Math.ceil(state.minute - 90))}'`;
    }
    return `${state.displayMinute}'`;
  }

  applyLiveMatchPlan(planId) {
    const plan = DATA.MATCH_PLANS[planId];
    if (!plan || !this.liveMatchEngine) return false;
    const result = this.liveMatchEngine.applyTactics(this.userTeamId, plan.tactics);
    if (!result.valid) return false;
    this.teamManager.applyMatchPlan(this.userTeamId, planId);
    this.saveGame();
    this.persistLiveMatch(true);
    this.ui.showSuccess(`Plan ${planId} · ${plan.name} aplicado`);
    document.querySelectorAll('[data-live-plan]').forEach(button => button.classList.toggle('active', button.dataset.livePlan === planId));
    document.querySelectorAll('[data-live-order]').forEach(button => {
      const active = button.dataset.liveOrder === plan.tactics.situationalInstruction;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.processLiveMatchEvents();
    return true;
  }

  applyLiveQuickOrder(order) {
    if (!DATA.QUICK_ORDERS.some(item => item.value === order) || !this.liveMatchEngine) return false;
    const result = this.liveMatchEngine.applyTactics(this.userTeamId, { situationalInstruction: order });
    if (!result.valid) return false;
    this.teamManager.updateTactics(this.userTeamId, { situationalInstruction: order });
    this.saveGame();
    this.persistLiveMatch(true);
    document.querySelectorAll('[data-live-order]').forEach(button => {
      const active = button.dataset.liveOrder === order;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.ui.showSuccess(`Orden aplicada: ${DATA.QUICK_ORDERS.find(item => item.value === order).label}`);
    this.processLiveMatchEvents();
    return true;
  }

  applyLiveFormation(formationName) {
    if (!this.liveMatchEngine || !DATA.FORMATIONS[formationName]) return false;
    const result = this.liveMatchEngine.changeFormation(this.userTeamId, formationName);
    if (!result.valid) {
      this.ui.showError(result.error || 'No se pudo cambiar la formación');
      return false;
    }
    this.saveGame();
    this.persistLiveMatch(true);
    this.ui.showSuccess(`Sistema cambiado a ${formationName}`);
    this.processLiveMatchEvents();
    this.renderLiveMatchState();
    return true;
  }

  applyLiveSubstitution() {
    const feedback = document.getElementById('substitution-feedback');
    if (!this.pendingSubstitutions.length && !this.queueLiveSubstitution()) return;
    const queued = [...this.pendingSubstitutions];
    const errors = [];
    let completed = 0;
    queued.forEach(change => {
      const result = this.liveMatchEngine.makeSubstitution(
        this.userTeamId,
        change.playerOutId,
        change.playerInId
      );
      if (result.valid) completed++;
      else errors.push(result.error);
    });
    this.pendingSubstitutions = [];
    feedback.textContent = errors.length
      ? `${completed} cambios realizados. ${errors.join(' ')}`
      : `${completed} cambio${completed === 1 ? '' : 's'} realizado${completed === 1 ? '' : 's'}`;
    feedback.className = `coach-feedback ${errors.length ? 'error' : 'success'}`;
    this.refreshSubstitutionQueueUI();
    if (completed) {
      this.processLiveMatchEvents();
      this.renderLiveMatchState();
      this.persistLiveMatch(true);
      const requiredChange = this.liveMatchEngine.getRequiredInjurySubstitution();
      if (!requiredChange && !this.liveMatchEngine.state.complete) {
        if (this.liveMatchEngine.state.phase === 'HALF_TIME') this.liveMatchEngine.resumeSecondHalf();
        this.isMatchPaused = false;
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) pauseBtn.textContent = 'Pausa';
        this.closeCoachDrawer();
        feedback.textContent += ' · Partido reanudado';
        this.startLiveMatchLoop();
      }
    }
  }

  persistLiveMatch(force = false) {
    if (!this.liveMatchEngine || !this.currentMatch) return;
    const minute = Math.floor(this.liveMatchEngine.state.minute);
    if (!force && this.lastPersistedMatchMinute === minute) return;
    this.lastPersistedMatchMinute = minute;
    GameStorage.saveCurrentMatch({
      matchId: this.currentMatch.id,
      engine: JSON.parse(this.liveMatchEngine.serialize())
    });
  }

  finalizeLiveMatch() {
    if (this.matchFinalized || !this.liveMatchEngine) return;
    this.matchFinalized = true;
    this.stopLiveMatchLoop();
    const result = this.liveMatchEngine.finishMatch();
    this.liveMatchEngine.commitPlayerStats();
    ['home', 'away'].forEach(side => {
      const teamId = result.matchState.teams[side].teamId;
      this.teamManager.registerMatchConsequences(teamId, result.matchState, this.currentMatch.matchday);
    });
    const playerReport = Object.values(result.matchState.players)
      .filter(player => player.appeared)
      .map(player => ({
        id: player.id,
        name: player.name,
        side: player.side,
        position: player.position,
        goals: player.goals,
        assists: player.assists,
        yellowCards: player.yellowCards,
        redCards: player.redCards,
        injured: player.injured,
        fitness: Math.round(player.fitness),
        rating: Math.round(this.calculateLivePlayerRating(player) * 10) / 10
      }));
    this.leagueEngine.recordResult(this.currentMatch.id, result.homeGoals, result.awayGoals, {
      simulationType: 'live-user',
      stats: result.matchState.stats,
      decisions: result.matchState.decisions,
      injuries: result.matchState.injuries,
      events: result.matchState.events,
      players: playerReport
    });
    this.leagueEngine.simulateMatchday(this.currentMatch.matchday, this.userTeamId);
    GameStorage.saveCurrentMatch(null);
    this.saveGame();
    if (this.matchRenderer) this.matchRenderer.stop();
    const homeTeam = this.teamManager.getTeam(this.currentMatch.homeTeam);
    const awayTeam = this.teamManager.getTeam(this.currentMatch.awayTeam);
    setTimeout(() => this.showMatchResult(
      this.currentMatch, homeTeam, awayTeam, result.homeGoals, result.awayGoals
    ), 700);
  }

  calculateLivePlayerRating(player) {
    const value = 6.1 + player.goals * 1.35 + player.assists * 0.75 +
      (player.fitness - 50) / 180 - player.yellowCards * 0.2 -
      player.redCards * 1.4 - (player.injured ? 0.25 : 0);
    return Math.max(3, Math.min(10, value));
  }

  // Mostrar resultado del partido
  showMatchResult(match, homeTeam, awayTeam, homeGoals, awayGoals) {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');

    const userTeamId = this.userTeamId;
    const matchdayResults = this.leagueEngine.getMatchdayMatches(match.matchday);
    const summary = this.leagueEngine.getSeasonSummary();
    const report = match.data || {};
    const stats = report.stats || null;
    const totalPossession = stats ? (stats.home.possessionTicks || 0) + (stats.away.possessionTicks || 0) : 0;
    const homePossession = totalPossession ? Math.round((stats.home.possessionTicks || 0) / totalPossession * 100) : 50;
    const awayPossession = 100 - homePossession;
    const reportPlayers = Array.isArray(report.players) ? report.players : [];
    const mvp = reportPlayers.length ? [...reportPlayers].sort((a, b) => b.rating - a.rating)[0] : null;
    const keyEvents = Array.isArray(report.events)
      ? report.events.filter(event => ['GOAL', 'POST', 'SAVE', 'PENALTY_AWARDED', 'PENALTY', 'OFFSIDE', 'RED_CARD', 'INJURY', 'KEEPER_CLAIM'].includes(event.type)).slice(-18)
      : [];
    let result = '';

    if (homeTeam.id === userTeamId) {
      if (homeGoals > awayGoals) result = '¡VICTORIA!';
      else if (homeGoals < awayGoals) result = 'DERROTA';
      else result = 'EMPATE';
    } else {
      if (awayGoals > homeGoals) result = '¡VICTORIA!';
      else if (awayGoals < homeGoals) result = 'DERROTA';
      else result = 'EMPATE';
    }

    const otherResults = matchdayResults
      .filter(item => item.id !== match.id)
      .map(item => {
        const home = this.teamManager.getTeam(item.homeTeam);
        const away = this.teamManager.getTeam(item.awayTeam);
        return `<li class="matchday-result-row">
          <span class="matchday-result-team home"><small>Local</small><strong>${home.name}</strong></span>
          <strong class="matchday-result-score">${item.homeGoals} – ${item.awayGoals}</strong>
          <span class="matchday-result-team away"><small>Visitante</small><strong>${away.name}</strong></span>
        </li>`;
      }).join('');

    const seasonEndHtml = summary.complete ? `
      <div class="season-complete-banner">
        <span>Temporada completada</span>
        <strong>🏆 Campeón: ${summary.champion.teamName}</strong>
      </div>
    ` : '';
    const statsHtml = stats ? `
      <section class="post-match-card">
        <h3>Estadísticas del partido</h3>
        <div class="post-match-stats">
          <div class="post-match-stats-heading"><strong>${homeTeam.shortName}<small>Local</small></strong><span>Comparativa</span><strong>${awayTeam.shortName}<small>Visitante</small></strong></div>
          <div><strong>${homePossession}%</strong><span>Posesión</span><strong>${awayPossession}%</strong></div>
          ${[
            ['Tiros', 'shots'], ['A puerta', 'shotsOnTarget'], ['Pases', 'passes'],
            ['Entradas', 'tackles'], ['Faltas', 'fouls'], ['Penaltis', 'penalties'], ['Fueras de juego', 'offsides'],
            ['Saques de banda', 'throwIns']
          ].map(([label, key]) => `
            <div><strong>${stats.home[key] || 0}</strong><span>${label}</span><strong>${stats.away[key] || 0}</strong></div>
          `).join('')}
        </div>
      </section>
    ` : '';
    const renderPlayerRatings = (side, team) => reportPlayers
      .filter(player => player.side === side)
      .sort((a, b) => b.rating - a.rating)
      .map(player => `
        <div class="post-match-player ${player.side}">
          <span><strong>${player.name} ${this.ui.renderAcademyBadge(this.teamManager.getPlayer(team.id, player.id))}</strong><small>${DATA.getPositionLabel(player.position)} · ${player.fitness}%</small></span>
          <span>${player.goals ? `⚽ ${player.goals}` : ''}${player.yellowCards ? ' 🟨' : ''}${player.redCards ? ' 🟥' : ''}${player.injured ? ' ✚' : ''}</span>
          <strong>${player.rating}</strong>
        </div>`).join('');
    const mvpTeam = mvp ? (mvp.side === 'home' ? homeTeam : awayTeam) : null;
    const playersHtml = reportPlayers.length ? `
      <section class="post-match-card">
        <h3>Valoraciones ${mvp ? `· MVP ${mvp.name} · ${mvpTeam.shortName} (${mvp.rating})` : ''}</h3>
        <div class="post-match-rating-columns">
          <div class="post-match-team-ratings"><header>${this.ui.renderTeamCrest(homeTeam, 'rating-team-crest')}<span><small>Local</small><strong>${homeTeam.name}</strong></span></header>${renderPlayerRatings('home', homeTeam)}</div>
          <div class="post-match-team-ratings"><header>${this.ui.renderTeamCrest(awayTeam, 'rating-team-crest')}<span><small>Visitante</small><strong>${awayTeam.name}</strong></span></header>${renderPlayerRatings('away', awayTeam)}</div>
        </div>
      </section>
    ` : '';
    const timelineHtml = keyEvents.length ? `
      <section class="post-match-card">
        <h3>Cronología destacada</h3>
        <ol class="post-match-timeline">${keyEvents.map(event => {
          const eventTeam = event.side === 'home' ? homeTeam : event.side === 'away' ? awayTeam : null;
          return `<li class="${event.side || ''}">${eventTeam ? `<strong>${eventTeam.shortName}</strong>` : ''}<span>${event.narration}</span></li>`;
        }).join('')}</ol>
      </section>
    ` : '';

    navBar.innerHTML = '';
    content.innerHTML = `
      <div class="match-result-container">
        <h2>Resultado Final</h2>
        
        <div class="result-display">
          <div class="result-teams">
            <div class="team-result">
              <span class="result-team-side">Local</span>
              ${this.ui.renderTeamCrest(homeTeam, 'result-club-crest')}
              <h3>${homeTeam.name}</h3>
              <small>${homeTeam.shortName}</small>
              <p class="final-score">${homeGoals}</p>
            </div>
            <div class="result-status ${result.toLowerCase()}">${result}<small>para ${homeTeam.id === userTeamId ? homeTeam.shortName : awayTeam.shortName}</small></div>
            <div class="team-result">
              <span class="result-team-side">Visitante</span>
              ${this.ui.renderTeamCrest(awayTeam, 'result-club-crest')}
              <h3>${awayTeam.name}</h3>
              <small>${awayTeam.shortName}</small>
              <p class="final-score">${awayGoals}</p>
            </div>
          </div>
        </div>

        <div class="post-match-report">
          ${statsHtml}
          ${playersHtml}
          ${timelineHtml}
        </div>

        <div class="matchday-summary">
          <h3>Resultados de la jornada ${match.matchday}</h3>
          <ul>${otherResults || '<li>Sin otros partidos</li>'}</ul>
        </div>

        ${seasonEndHtml}

        <div class="result-actions">
          <button id="btn-continue-to-dashboard" class="btn btn-primary">
            ${summary.complete ? 'Ver resumen final' : 'Continuar'}
          </button>
        </div>
      </div>
    `;

    const continueBtn = document.getElementById('btn-continue-to-dashboard');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        this.saveGame();
        this.showScreen('dashboard');
      });
    }
    this.resetScreenViewport();
  }

  // Mostrar estadísticas
  showStats() {
    const userTeamId = this.userTeamId;
    const team = this.teamManager.getTeam(userTeamId);
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.ui.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Equipo</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn active" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    const leaguePlayers = this.teamManager.getAllTeams().flatMap(club =>
      club.players.map(player => ({ ...player, teamName: club.shortName }))
    );
    const sortedByGoals = [...leaguePlayers].sort((a, b) => b.goals - a.goals).slice(0, 5);
    const sortedByAssists = [...leaguePlayers].sort((a, b) => b.assists - a.assists).slice(0, 5);

    let topScorersHtml = '';
    sortedByGoals.forEach((player, i) => {
      topScorersHtml += `<li>${i + 1}. ${player.name} (${player.teamName}) - ${player.goals} goles</li>`;
    });

    let topAssistsHtml = '';
    sortedByAssists.forEach((player, i) => {
      topAssistsHtml += `<li>${i + 1}. ${player.name} (${player.teamName}) - ${player.assists} asistencias</li>`;
    });

    content.innerHTML = `
      <div class="stats-container">
        <h2>Estadísticas de la Liga</h2>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Top Goleadores</h3>
            <ol>${topScorersHtml || '<li>Sin datos</li>'}</ol>
          </div>

          <div class="stat-card">
            <h3>Top Asistentes</h3>
            <ol>${topAssistsHtml || '<li>Sin datos</li>'}</ol>
          </div>
        </div>
      </div>
    `;
  }

  // Guardar juego
  saveGame() {
    const activeSlot = GameStorage.getActiveSlot();
    if (!activeSlot || !this.userTeamId) return false;
    const gameState = {
      userTeamId: this.userTeamId,
      teams: this.teamManager.serialize(),
      leagueState: this.leagueEngine.serialize(),
      created: this.gameState.created || new Date().toISOString(),
      slot: activeSlot,
      lastSaved: new Date().toISOString()
    };

    const saved = GameStorage.saveGameState(gameState);
    if (saved) this.gameState = gameState;
    return saved;
  }

  exportSave(allSlots = false) {
    this.saveGame();
    const data = allSlots ? GameStorage.exportAllSlots() : GameStorage.exportSlot();
    if (!data || (!allSlots && !data.values)) {
      this.ui.showError('No hay una partida que exportar');
      return false;
    }
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const suffix = allSlots ? 'completo' : `partida-${GameStorage.getActiveSlot()}`;
      link.href = url;
      link.download = `football-simulator-${suffix}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.ui.showSuccess('Backup exportado');
      return true;
    } catch (error) {
      console.error('Error exportando backup:', error);
      this.ui.showError('No se pudo descargar el backup');
      return false;
    }
  }

  async importSave(file, targetSlot) {
    try {
      const data = JSON.parse(await file.text());
      const validation = GameStorage.validateImport(data);
      if (!validation.valid) {
        this.ui.showError(validation.error);
        return false;
      }
      const isFull = data.format === 'football-simulator-backup';
      const confirmed = confirm(isFull
        ? 'Este backup restaurará sus ranuras originales. ¿Continuar?'
        : `La partida ${targetSlot} será sobrescrita. ¿Continuar?`);
      if (!confirmed) return false;
      const result = isFull ? GameStorage.importBackup(data) : GameStorage.importIntoSlot(data, targetSlot);
      if (!result.valid) {
        this.ui.showError(result.error);
        return false;
      }
      this.ui.showSuccess('Backup importado correctamente');
      setTimeout(() => this.showWelcomeScreen(), 600);
      return true;
    } catch (error) {
      console.error('Error leyendo backup:', error);
      this.ui.showError('El archivo no contiene JSON válido');
      return false;
    }
  }

  // Cargar juego guardado
  async loadSavedGame() {
    try {
      const gameState = GameStorage.loadGameState();
      if (!gameState) return false;

      this.gameState = gameState;
      this.userTeamId = gameState.userTeamId;

      // Restaurar equipos
      this.teamManager = TeamManager.deserialize(gameState.teams);

      // Restaurar liga
      this.leagueEngine = LeagueEngine.deserialize(gameState.leagueState, this.teamManager);
      this.leagueEngine.controlledTeamId = this.userTeamId;

      // Compatibilidad con guardados de fases anteriores sin alineaciones de IA.
      this.teamManager.getAllTeams().forEach(team => {
        if (this.teamManager.getStartingXI(team.id).length !== 11) {
          this.teamManager.autoSelectStartingXI(team.id);
        }
      });

      return true;
    } catch (error) {
      console.error('Error cargando juego:', error);
      return false;
    }
  }

  // Nueva partida
  newGame() {
    const slot = GameStorage.getActiveSlot() || 1;
    GameStorage.deleteSavedGame(slot);
    this.teamManager = null;
    this.leagueEngine = null;
    this.userTeamId = null;
    this.startNewGame(slot);
  }

  returnToSaveMenu() {
    this.saveGame();
    this.stopLiveMatchLoop();
    if (this.matchRenderer) this.matchRenderer.stop();
    this.showWelcomeScreen();
  }

}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new FootballSimulator();
  app.init();
  window.footballApp = app; // Para acceso desde consola
});
