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
        this.ui.showTactics();
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
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
    const isHome = nextMatch.homeTeam === userTeamId;
    const homePreviewTeam = isHome ? team : opponent;
    const awayPreviewTeam = isHome ? opponent : team;
    const startingXI = this.teamManager.getStartingXI(userTeamId);

    let playersHtml = '';
    startingXI.forEach(player => {
      playersHtml += `<li>${player.name}${player.id === team.captainId ? ' (C)' : ''} (${player.position})</li>`;
    });

    content.innerHTML = `
      <div class="next-match-container">
        <h2>Próximo Partido - Jornada ${nextMatch.matchday}</h2>
        
        <div class="match-preview-large">
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

          <div class="formation-info">
            <h4>Formación: ${team.formation}</h4>
            <div class="starting-xi">
              <h5>Alineación:</h5>
              <ul>
                ${playersHtml}
              </ul>
            </div>
          </div>

          <section class="pre-match-preparation">
            <div>
              <h4>Preparación del partido</h4>
              <p>Estás en el descanso entre jornadas: todavía puedes ajustar jugadores y táctica antes de elegir cómo disputar el encuentro.</p>
            </div>
            <div class="pre-match-management">
              <button class="btn btn-secondary" data-screen="squad">Cambiar jugadores</button>
              <button class="btn btn-secondary" data-screen="tactics">Cambiar táctica</button>
            </div>
          </section>

          <section class="match-mode-selection" aria-labelledby="match-mode-title">
            <div>
              <h4 id="match-mode-title">¿Cómo quieres jugar?</h4>
              <p>Obtén directamente el resultado o entra al simulador táctico en directo.</p>
            </div>
            <button id="btn-quick-result" class="btn btn-secondary btn-large">Ver resultado</button>
            <div class="simulator-choice">
              <label for="match-half-duration">
                Duración por parte
                <select id="match-half-duration" class="form-control">
                  ${[1, 3, 5, 10].map(value => `<option value="${value}" ${Number(GameStorage.getSetting('halfDuration', 3)) === value ? 'selected' : ''}>${value} min</option>`).join('')}
                </select>
              </label>
              <button id="btn-play-match-large" class="btn btn-primary btn-large">Abrir simulador</button>
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
  }

  validateMatchLineup() {
    const startingXI = this.teamManager.getStartingXI(this.userTeamId);
    if (startingXI.length === 11) return true;
    alert('Debe tener 11 jugadores seleccionados antes de jugar');
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
    const durationSelect = document.getElementById('match-half-duration');
    const halfDuration = Number(durationSelect ? durationSelect.value : GameStorage.getSetting('halfDuration', 3));
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
              <span>Tarjetas <strong id="cards">0 - 0</strong></span>
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
                <button id="btn-apply-live-tactics" class="btn btn-primary">Aplicar instrucciones</button>
              </div>
              <div class="coach-panel" data-coach-panel="changes">
                <p class="change-flow-help">Elige sobre el once quién debe salir. Te recomendaremos los mejores reemplazos.</p>
                <div id="live-team-list" class="live-change-team">${this.renderLiveTeamList()}</div>
                <div class="change-selector-grid">
                  <label>Sale<select id="sub-player-out" class="form-control">${this.renderSubstitutionOptions(true)}</select></label>
                  <label>Entra<select id="sub-player-in" class="form-control">${this.renderSubstitutionOptions(false)}</select></label>
                </div>
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
  }

  renderLiveTactics(tactics, teamState = null) {
    const select = (id, label, values, value) => `
      <label>${label}<select id="${id}" class="form-control">
        ${values.map(option => `<option value="${option}" ${option === value ? 'selected' : ''}>${option}</option>`).join('')}
      </select></label>`;
    return `
      ${select('live-strategy', 'Estrategia', Object.keys(DATA.TACTICAL_STRATEGIES), teamState?.strategy)}
      <small>Estrategia natural: ${teamState?.naturalStrategy || 'Equilibrada'} · Adaptación ${teamState?.tacticalFamiliarity || 100}%</small>
      ${select('live-mentality', 'Mentalidad', ['Muy Defensiva', 'Defensiva', 'Equilibrada', 'Ofensiva', 'Muy Ofensiva'], tactics.mentality)}
      ${select('live-pressure', 'Presión', ['Baja', 'Media', 'Alta'], tactics.pressure)}
      ${select('live-tempo', 'Ritmo', ['Bajo', 'Medio', 'Alto'], tactics.tempo)}
      ${select('live-width', 'Anchura', ['Estrecha', 'Equilibrada', 'Amplia'], tactics.width)}
      ${select('live-pass-style', 'Pase', ['Corto', 'Mixto', 'Directo'], tactics.passStyle)}
      ${select('live-defensive-line', 'Línea defensiva', ['Baja', 'Media', 'Alta'], tactics.defensiveLine)}
      ${select('live-set-piece', 'Balón parado', ['Disparar', 'Centrar', 'Corto'], tactics.setPiecePreference || 'Centrar')}
      ${select('live-situational', 'Instrucción', ['Normal', 'Perder tiempo', 'Buscar el empate', 'Defender resultado', 'Atacar izquierda', 'Atacar derecha', 'Presionar rival'], tactics.situationalInstruction || 'Normal')}
      <label>Rival a presionar<select id="live-press-target" class="form-control">
        <option value="">Automático</option>
        ${this.liveMatchEngine.onField(teamState.side === 'home' ? 'away' : 'home').filter(player => player.position !== 'GK').map(player => `<option value="${player.id}" ${tactics.pressTargetId === player.id ? 'selected' : ''}>${player.name} · ${player.position}</option>`).join('')}
      </select></label>
    `;
  }

  renderLiveTeamList() {
    if (!this.liveMatchEngine) return '';
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    return teamState.onField.map(id => {
      const state = this.liveMatchEngine.state.players[id];
      if (!state || !state.onField) return '';
      const fitness = Math.round(state.fitness);
      const fitnessLevel = fitness < 40 ? 'critical' : fitness < 65 ? 'low' : fitness < 80 ? 'medium' : 'high';
      return `
        <button type="button" class="live-player-row" data-player-id="${state.id}" title="Preparar cambio de ${state.name}">
          <span class="live-player-dot ${state.side}" style="background:${teamState.kitColor}">${state.number}</span>
          <span><strong>${state.name}${state.isCaptain ? ' (C)' : ''}</strong><small>${state.position} · ${state.role || 'Sin rol'} · confianza ${Math.round(state.confidence || 50)}</small></span>
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
        : !player.appeared && !queuedIn.has(player.id)));
    if (!onField && outgoing) {
      players.sort((a, b) => this.getSubstitutionFitScore(b, outgoing) - this.getSubstitutionFitScore(a, outgoing));
    }
    const options = players
      .map(player => {
        const data = this.teamManager.getPlayer(this.userTeamId, player.id);
        const fit = !onField && outgoing ? this.getSubstitutionFitLabel(player, outgoing) : '';
        return `<option value="${player.id}">${fit ? `${fit} · ` : ''}${player.name} · ${player.position} · ${Math.round(player.fitness)}% · ${data.overall}</option>`;
      }).join('');
    return `<option value="">Seleccionar…</option>${options}`;
  }

  getPositionLine(position) {
    if (position === 'GK') return 'GK';
    if (['CB', 'RB', 'LB'].includes(position)) return 'DEF';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position)) return 'MID';
    return 'ATK';
  }

  getSubstitutionFitScore(candidate, outgoing) {
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
    byId('btn-apply-live-tactics').addEventListener('click', () => this.applyLiveTactics());
    byId('btn-queue-substitution').addEventListener('click', () => this.queueLiveSubstitution());
    byId('btn-make-substitution').addEventListener('click', () => this.applyLiveSubstitution());
    byId('sub-player-out').addEventListener('change', () => this.updateSubstitutionRecommendations());
    byId('btn-close-coach-drawer').addEventListener('click', () => this.closeCoachDrawer());

    byId('coach-console').addEventListener('click', event => {
      const playerRow = event.target.closest('.live-player-row[data-player-id]');
      if (playerRow) this.selectPlayerForSubstitution(playerRow.dataset.playerId);
      const removeButton = event.target.closest('[data-remove-queued-sub]');
      if (removeButton) this.removeQueuedSubstitution(Number(removeButton.dataset.removeQueuedSub));
    });

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
    outgoing.innerHTML = this.renderSubstitutionOptions(true);
    outgoing.value = playerId;
    this.updateSubstitutionRecommendations(true);
  }

  updateSubstitutionRecommendations(selectFirst = false) {
    const outgoing = document.getElementById('sub-player-out');
    const incoming = document.getElementById('sub-player-in');
    if (!outgoing || !incoming) return;
    incoming.innerHTML = this.renderSubstitutionOptions(false, outgoing.value || null);
    if (selectFirst && incoming.options.length > 1) incoming.selectedIndex = 1;
    const feedback = document.getElementById('substitution-feedback');
    if (feedback && outgoing.value) {
      feedback.textContent = 'Los suplentes están ordenados por encaje, nivel y fitness.';
      feedback.className = 'coach-feedback';
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
    if (outgoing) outgoing.innerHTML = this.renderSubstitutionOptions(true);
    if (incoming) incoming.innerHTML = this.renderSubstitutionOptions(false);
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
    set('cards', `${state.stats.home.yellowCards}🟨 ${state.stats.home.redCards}🟥 - ${state.stats.away.yellowCards}🟨 ${state.stats.away.redCards}🟥`);
    set('fouls', `${state.stats.home.fouls} - ${state.stats.away.fouls}`);
    set('offsides', `${state.stats.home.offsides} - ${state.stats.away.offsides}`);
    const teamState = this.liveMatchEngine.getTeamState(this.userTeamId);
    set('subs-used', teamState.substitutions);
    const teamList = document.getElementById('live-team-list');
    if (teamList) teamList.innerHTML = this.renderLiveTeamList();
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

  applyLiveTactics() {
    const changes = {
      strategy: document.getElementById('live-strategy').value,
      mentality: document.getElementById('live-mentality').value,
      pressure: document.getElementById('live-pressure').value,
      tempo: document.getElementById('live-tempo').value,
      width: document.getElementById('live-width').value,
      passStyle: document.getElementById('live-pass-style').value,
      defensiveLine: document.getElementById('live-defensive-line').value,
      setPiecePreference: document.getElementById('live-set-piece').value,
      situationalInstruction: document.getElementById('live-situational').value,
      pressTargetId: document.getElementById('live-press-target').value || null
    };
    const result = this.liveMatchEngine.applyTactics(this.userTeamId, changes);
    if (result.valid) {
      this.teamManager.updateTactics(this.userTeamId, changes);
      this.saveGame();
      this.ui.showSuccess('Instrucciones aplicadas');
      this.processLiveMatchEvents();
      this.persistLiveMatch(true);
    }
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
      ? report.events.filter(event => ['GOAL', 'POST', 'SAVE', 'PENALTY', 'OFFSIDE', 'RED_CARD', 'INJURY', 'KEEPER_CLAIM'].includes(event.type)).slice(-18)
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
        return `<li><span>${home.shortName} - ${away.shortName}</span><strong>${item.homeGoals} - ${item.awayGoals}</strong></li>`;
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
          <div><strong>${homePossession}%</strong><span>Posesión</span><strong>${awayPossession}%</strong></div>
          ${[
            ['Tiros', 'shots'], ['A puerta', 'shotsOnTarget'], ['Pases', 'passes'],
            ['Entradas', 'tackles'], ['Faltas', 'fouls'], ['Fueras de juego', 'offsides'],
            ['Saques de banda', 'throwIns']
          ].map(([label, key]) => `
            <div><strong>${stats.home[key] || 0}</strong><span>${label}</span><strong>${stats.away[key] || 0}</strong></div>
          `).join('')}
        </div>
      </section>
    ` : '';
    const playersHtml = reportPlayers.length ? `
      <section class="post-match-card">
        <h3>Valoraciones ${mvp ? `· MVP ${mvp.name} (${mvp.rating})` : ''}</h3>
        <div class="post-match-player-grid">
          ${reportPlayers.sort((a, b) => b.rating - a.rating).map(player => `
            <div class="post-match-player ${player.side}">
              <span><strong>${player.name}</strong><small>${player.position} · ${player.fitness}%</small></span>
              <span>${player.goals ? `⚽ ${player.goals}` : ''}${player.yellowCards ? ' 🟨' : ''}${player.redCards ? ' 🟥' : ''}${player.injured ? ' ✚' : ''}</span>
              <strong>${player.rating}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    ` : '';
    const timelineHtml = keyEvents.length ? `
      <section class="post-match-card">
        <h3>Cronología destacada</h3>
        <ol class="post-match-timeline">${keyEvents.map(event => `<li class="${event.side || ''}">${event.narration}</li>`).join('')}</ol>
      </section>
    ` : '';

    navBar.innerHTML = '';
    content.innerHTML = `
      <div class="match-result-container">
        <h2>Resultado Final</h2>
        
        <div class="result-display">
          <div class="result-teams">
            <div class="team-result">
              ${this.ui.renderTeamCrest(homeTeam, 'result-club-crest')}
              <h3>${homeTeam.name}</h3>
              <p class="final-score">${homeGoals}</p>
            </div>
            <div class="result-status ${result.toLowerCase()}">${result}</div>
            <div class="team-result">
              ${this.ui.renderTeamCrest(awayTeam, 'result-club-crest')}
              <h3>${awayTeam.name}</h3>
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
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
