// ============================================
// GESTOR DE INTERFAZ DE USUARIO
// ============================================

class UIManager {
  constructor() {
    this.currentScreen = null;
    this.gameApp = null; // Referencia a la aplicación principal
    this.reservePromotionSelection = new Set();
    this.reservePromotionTeamId = null;
  }

  // Inicializar la interfaz
  init(gameApp) {
    this.gameApp = gameApp;
    this.ensureDOM();
    this.applyVisualTheme(GameStorage.getSetting('visualTheme', '90s'), false);
    this.attachEventListeners();
  }

  getVisualTheme() {
    const selected = GameStorage.getSetting('visualTheme', '90s');
    return ['classic', '90s', 'snes'].includes(selected) ? selected : '90s';
  }

  applyVisualTheme(theme, persist = true) {
    const selected = ['classic', '90s', 'snes'].includes(theme) ? theme : '90s';
    document.body.classList.remove('theme-classic', 'theme-retro-90s', 'theme-snes');
    document.body.classList.add({ classic: 'theme-classic', '90s': 'theme-retro-90s', snes: 'theme-snes' }[selected]);
    document.documentElement.dataset.visualTheme = selected;
    if (persist) GameStorage.setSetting('visualTheme', selected);
    return selected;
  }

  renderThemeChoices() {
    return [
      ['classic', 'Classic', 'Diseño original moderno', 'CL'],
      ['90s', '90s', 'Gestor de PC de 1996', '96'],
      ['snes', 'SNES', 'Estilo deportivo 16-bit', '16']
    ].map(([value, label, description, badge]) => `
      <label class="theme-choice theme-choice-${value}">
        <input type="radio" name="visual-theme" value="${value}" ${this.getVisualTheme() === value ? 'checked' : ''}>
        <span class="theme-preview" aria-hidden="true"><i>${badge}</i><b></b><b></b><b></b></span>
        <strong>${label}</strong>
        <small>${description}</small>
      </label>`).join('');
  }

  // Asegurar que el DOM está presente
  ensureDOM() {
    if (!document.body) {
      console.error('El DOM no está completamente cargado');
      return;
    }

    // Crear estructura principal si no existe
    if (!document.getElementById('app')) {
      document.body.innerHTML = `
        <div id="app">
          <div id="navigation"></div>
          <div id="main-content"></div>
        </div>
      `;
    }
  }

  renderTeamCrest(team, className = 'club-crest') {
    if (!team?.crest) return '';
    return `<img class="${className}" src="${team.crest}" alt="Escudo de ${team.name}" width="96" height="112">`;
  }

  renderClubIdentity(team, className = '') {
    if (!team) return '';
    return `<span class="club-identity ${className}">${this.renderTeamCrest(team)}<span>${team.name}</span></span>`;
  }

  isAcademyPlayer(player) {
    return Boolean(player && (player.isAcademyPlayer || player.emergencyPromotion || player.promotedMatchday));
  }

  renderAcademyBadge(player, compact = false) {
    if (!this.isAcademyPlayer(player)) return '';
    return `<span class="academy-badge ${compact ? 'compact' : ''}" title="Canterano formado en el club" aria-label="Canterano">${compact ? 'C' : 'CAN'}</span>`;
  }

  // Mostrar pantalla de bienvenida
  showWelcomeScreen() {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');
    const activeSlot = GameStorage.getActiveSlot();
    const slotsHtml = GameStorage.getSlotSummaries().map(save => {
      if (!save.occupied) {
        return `
          <article class="save-slot empty">
            <div class="save-slot-heading"><span>Partida ${save.slot}</span><small>Vacía</small></div>
            <div class="save-slot-empty">＋</div>
            <button class="btn btn-primary" data-save-action="new" data-save-slot="${save.slot}">Nueva partida</button>
          </article>
        `;
      }
      if (save.corrupted) {
        return `
          <article class="save-slot corrupted">
            <div class="save-slot-heading"><span>Partida ${save.slot}</span><small>No se puede leer</small></div>
            <p>Los datos de esta ranura están dañados.</p>
            <div class="save-slot-actions">
              <button class="btn btn-primary" data-save-action="new" data-save-slot="${save.slot}">Sobrescribir</button>
              <button class="btn btn-danger" data-save-action="delete" data-save-slot="${save.slot}">Borrar</button>
            </div>
          </article>
        `;
      }
      const savedDate = save.lastSaved
        ? new Date(save.lastSaved).toLocaleString('es-ES')
        : 'Sin fecha';
      const savedTeam = this.gameApp?.teamManager?.getTeam(save.teamId);
      return `
        <article class="save-slot occupied ${activeSlot === save.slot ? 'active' : ''}">
          <div class="save-slot-heading">
            <span>Partida ${save.slot}</span>
            <small>${activeSlot === save.slot ? 'Última usada' : 'Guardada'}</small>
          </div>
          <div class="save-team-name">${this.renderTeamCrest(savedTeam, 'save-club-crest')}<span>${save.teamName}</span></div>
          <dl class="save-slot-meta">
            <div><dt>Jornada</dt><dd>${save.matchday}/${save.totalMatchdays}</dd></div>
            <div><dt>Modo</dt><dd>${{ arcade: 'Arcade', manager: 'Manager', director: 'Director Deportivo' }[save.gameMode]}</dd></div>
            <div><dt>Guardada</dt><dd>${savedDate}</dd></div>
          </dl>
          ${save.matchInProgress ? '<p class="save-match-live">● Partido interrumpido · se reiniciará</p>' : ''}
          <div class="save-slot-actions">
            <button class="btn btn-primary" data-save-action="continue" data-save-slot="${save.slot}">Continuar</button>
            <button class="btn btn-secondary" data-save-action="new" data-save-slot="${save.slot}">Nueva</button>
            <button class="btn btn-danger btn-slot-delete" data-save-action="delete" data-save-slot="${save.slot}" aria-label="Borrar partida ${save.slot}">Borrar</button>
          </div>
        </article>
      `;
    }).join('');

    navBar.innerHTML = '';
    content.innerHTML = `
      <div class="welcome-container">
        <div class="welcome-header">
          <div class="retro-app-badge" aria-hidden="true"><span>FS/</span><span class="edition-mark">96</span></div>
          <h1>Football Cultureta</h1>
          <p>Gestor de fútbol · Edición 1996</p>
        </div>
        
        <div class="welcome-content">
          <section class="save-slots-section" aria-labelledby="save-slots-title">
            <h2 id="save-slots-title">Elige una partida</h2>
            <p>${GameStorage.isPersistentStorageWritable()
              ? 'Tu progreso se guarda automáticamente en este navegador.'
              : '⚠ El navegador ha bloqueado el almacenamiento. El progreso solo durará hasta cerrar esta pestaña.'}</p>
            <div class="save-slots-grid">${slotsHtml}</div>
          </section>
          
        </div>
      </div>
    `;

    this.currentScreen = 'welcome';
  }

  showNewGameSetup() {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');
    navBar.innerHTML = '';
    content.innerHTML = `
      <div class="new-game-setup-container">
        <header class="new-game-setup-header">
          <span class="season-kicker">Nueva partida · Ranura ${GameStorage.getActiveSlot()}</span>
          <h2>Configura tu experiencia</h2>
          <p>Elige la presentación y el nivel de gestión antes de seleccionar tu club.</p>
        </header>

        <section class="setup-section" aria-labelledby="setup-graphics-title">
          <div class="setup-section-heading"><span>1</span><div><h3 id="setup-graphics-title">Gráfica</h3><p>Podrás cambiarla después desde Ajustes.</p></div></div>
          <fieldset class="theme-picker">
            <legend class="sr-only">Gráfica de la interfaz</legend>
            ${this.renderThemeChoices()}
          </fieldset>
        </section>

        <section class="setup-section" aria-labelledby="setup-mode-title">
          <div class="setup-section-heading"><span>2</span><div><h3 id="setup-mode-title">Modo de juego</h3><p>Define qué responsabilidades quieres asumir.</p></div></div>
          <fieldset class="game-mode-picker">
            <legend class="sr-only">Modo de juego</legend>
            <label class="game-mode-choice">
              <input type="radio" name="game-mode" value="arcade">
              <span class="game-mode-icon" aria-hidden="true">▶</span>
              <strong>Arcade</strong>
              <small>Solo simulador. Entra al partido sin gestionar el equipo desde el banquillo.</small>
            </label>
            <label class="game-mode-choice">
              <input type="radio" name="game-mode" value="manager" checked>
              <span class="game-mode-icon" aria-hidden="true">◆</span>
              <strong>Manager</strong>
              <small>Simulador y entrenador: alineaciones, tácticas y decisiones durante el partido.</small>
            </label>
            <label class="game-mode-choice">
              <input type="radio" name="game-mode" value="director">
              <span class="game-mode-icon" aria-hidden="true">★</span>
              <strong>Director Deportivo <em>En desarrollo</em></strong>
              <small>Todo lo anterior, más fichajes y gestión integral cuando estén disponibles.</small>
            </label>
          </fieldset>
        </section>

        <div class="new-game-setup-actions">
          <button type="button" id="btn-cancel-new-game" class="btn btn-secondary">Volver</button>
          <button type="button" id="btn-confirm-new-game" class="btn btn-primary">Elegir equipo</button>
        </div>
      </div>
    `;
    this.currentScreen = 'new-game-setup';
  }

  // Mostrar selección de equipo
  showTeamSelection() {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');

    navBar.innerHTML = '';

    const teams = this.gameApp.teamManager.getAllTeams();
    let teamsHtml = '';

    teams.forEach(team => {
      const identity = DATA.PHILOSOPHICAL_IDENTITIES[team.id] || {};
      teamsHtml += `
        <div class="team-card" data-team-id="${team.id}">
          <div class="team-crest-stage">${this.renderTeamCrest(team, 'team-card-crest')}</div>
          <div class="team-name">${team.name}</div>
          <div class="team-short">${team.shortName}</div>
          <div class="team-definition">
            <strong>${identity.current || 'Identidad propia'}</strong>
            <p>${identity.footballMeaning || 'Un club preparado para competir con una idea reconocible.'}</p>
          </div>
          <div class="team-kits" aria-label="Equipaciones local y alternativa">
            <span style="background:${team.primaryColor}" title="Equipación local"></span>
            <span style="background:${team.alternateColor}" title="Equipación alternativa"></span>
          </div>
          <div class="team-overall">Media: ${team.overall}</div>
          <div class="team-budget">Presupuesto: $${(team.budget / 1000000).toFixed(1)}M</div>
          <button class="btn btn-select" data-team-id="${team.id}">Seleccionar</button>
        </div>
      `;
    });

    content.innerHTML = `
      <div class="team-selection-container">
        <h2>Elige tu Equipo</h2>
        <p>Selecciona el equipo que deseas gestionar en la liga</p>
        <div class="teams-grid">
          ${teamsHtml}
        </div>
      </div>
    `;

    this.currentScreen = 'team-selection';
  }

  // Mostrar dashboard principal
  showDashboard() {
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const nextMatch = this.gameApp.leagueEngine.getNextUserMatch(userTeamId);
    const standings = this.gameApp.leagueEngine.getStandings();
    const userPosition = this.gameApp.leagueEngine.getTeamPosition(userTeamId);

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    // Barra de navegación
    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn active" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    // Contenido principal
    let nextMatchHtml = '';
    if (nextMatch) {
      const opponent = this.gameApp.teamManager.getTeam(
        nextMatch.homeTeam === userTeamId ? nextMatch.awayTeam : nextMatch.homeTeam
      );
      const isHome = nextMatch.homeTeam === userTeamId;
      nextMatchHtml = `
        <div class="next-match-info">
          <h3>Próximo Partido - Jornada ${nextMatch.matchday}</h3>
          <div class="match-preview">
            <div class="team-vs">
              <div class="team-name">${this.renderClubIdentity(isHome ? team : opponent, 'match-club')}</div>
              <span class="vs">vs</span>
              <div class="team-name">${this.renderClubIdentity(isHome ? opponent : team, 'match-club')}</div>
            </div>
            <button class="btn btn-primary" data-screen="next-match">Preparar partido</button>
          </div>
        </div>
      `;
    } else {
      const champion = standings[0];
      nextMatchHtml = `
        <div class="season-finished-card">
          <span class="season-kicker">Temporada finalizada</span>
          <h3>🏆 ${champion ? champion.teamName : 'Liga completada'}</h3>
          <p>${champion && champion.teamId === userTeamId ? '¡Has ganado la liga!' : 'Consulta la clasificación y el resumen final.'}</p>
          <button class="btn btn-primary" data-screen="league">Ver temporada</button>
        </div>
      `;
    }

    // Top 5 de la clasificación
    let standingsHtml = '<div class="standings-preview"><h3>Clasificación (Top 5)</h3><ol>';
    standings.slice(0, 5).forEach(standing => {
      const isUserTeam = standing.teamId === userTeamId;
      const standingTeam = this.gameApp.teamManager.getTeam(standing.teamId);
      const highlight = isUserTeam ? ' class="user-team"' : '';
      standingsHtml += `
        <li${highlight}>
          <span class="pos">${this.renderTeamCrest(standingTeam, 'table-club-crest')}<span>${standing.teamName}</span></span>
          <span class="points">${standing.points}pts</span>
        </li>
      `;
    });
    standingsHtml += '</ol></div>';

    const players = team.players || [];
    const rankedPlayers = (value, secondary = player => player.overall) => [...players]
      .sort((a, b) => value(b) - value(a) || secondary(b) - secondary(a) || a.name.localeCompare(b.name))
      .slice(0, 3);
    const topScorers = rankedPlayers(player => Number(player.goals) || 0, player => Number(player.assists) || 0);
    const topAssists = rankedPlayers(player => Number(player.assists) || 0, player => Number(player.goals) || 0);
    const mostUsed = rankedPlayers(player => Number(player.matchesPlayed) || 0);
    const discipline = rankedPlayers(player => (Number(player.redCards) || 0) * 3 + (Number(player.yellowCards) || 0))
      .filter(player => (Number(player.yellowCards) || 0) + (Number(player.redCards) || 0) > 0);
    const average = field => players.length
      ? Math.round(players.reduce((sum, player) => sum + (Number(player[field]) || 0), 0) / players.length)
      : 0;
    const available = players.filter(player => this.gameApp.teamManager.isPlayerAvailable(player)).length;
    const userStanding = standings.find(standing => standing.teamId === userTeamId) || team.stats;
    const played = Number(userStanding.played) || 0;
    const goalsPerMatch = played ? (Number(userStanding.goalsFor || 0) / played).toFixed(2) : '0.00';
    const winRate = played ? Math.round(Number(userStanding.wins || 0) / played * 100) : 0;
    const goalDifference = Number(userStanding.goalDifference ??
      (Number(userStanding.goalsFor || 0) - Number(userStanding.goalsAgainst || 0)));
    const leaderList = (title, entries, value) => `
      <div class="dashboard-leaderboard">
        <h4>${title}</h4>
        <ol>${entries.length ? entries.map((player, index) => `
          <li><span><b>${index + 1}</b><span>${player.name}</span></span><strong>${value(player)}</strong></li>`).join('') : '<li class="empty"><span>Sin registros todavía</span></li>'}</ol>
      </div>`;
    const performanceHtml = `
      <div class="dashboard-kpi-strip" aria-label="Indicadores del equipo">
        <div class="dashboard-kpi"><span>Goles / partido</span><strong>${goalsPerMatch}</strong></div>
        <div class="dashboard-kpi"><span>Victorias</span><strong>${winRate}%</strong></div>
        <div class="dashboard-kpi"><span>Diferencia</span><strong>${goalDifference > 0 ? '+' : ''}${goalDifference}</strong></div>
        <div class="dashboard-kpi"><span>Fitness medio</span><strong>${average('fitness')}%</strong></div>
        <div class="dashboard-kpi"><span>Moral media</span><strong>${average('morale')}%</strong></div>
        <div class="dashboard-kpi"><span>Disponibles</span><strong>${available}/${players.length}</strong></div>
      </div>
      <div class="dashboard-leaders">
        ${leaderList('⚽ Goleadores', topScorers, player => Number(player.goals) || 0)}
        ${leaderList('↗ Asistencias', topAssists, player => Number(player.assists) || 0)}
        ${leaderList('▦ Más utilizados', mostUsed, player => `${Number(player.matchesPlayed) || 0} PJ`)}
        ${leaderList('🟨 Disciplina', discipline, player => `${Number(player.yellowCards) || 0}A · ${Number(player.redCards) || 0}R`)}
      </div>`;

    content.innerHTML = `
      <div class="dashboard-container">
        <h2>Dashboard</h2>
        
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Tu Equipo</h3>
            <div class="team-info">
              <div class="dashboard-club">${this.renderTeamCrest(team, 'dashboard-club-crest')}<strong>${team.name}</strong></div>
              <p>Posición: <strong>${Number.isFinite(userPosition) ? `#${userPosition}` : 'Pretemporada'}</strong></p>
              <p>Jugadores: <strong>${team.players.length}</strong></p>
              <p>Formación: <strong>${team.formation}</strong></p>
            </div>
          </div>

          <div class="dashboard-card">
            ${nextMatchHtml}
          </div>

          <div class="dashboard-card">
            ${standingsHtml}
          </div>

          <div class="dashboard-card">
            <h3>Progreso de Temporada</h3>
            <div id="season-progress"></div>
          </div>

          <div class="dashboard-card dashboard-performance-card">
            <h3>Rendimiento del equipo</h3>
            ${performanceHtml}
          </div>
        </div>
      </div>
    `;

    // Actualizar barra de progreso
    const summary = this.gameApp.leagueEngine.getSeasonSummary();
    const progressBar = document.getElementById('season-progress');
    if (progressBar) {
      progressBar.innerHTML = `
        <div class="progress-stat">
          <p>${summary.completedMatches} / ${summary.totalMatches} partidos</p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${summary.progress}%"></div>
          </div>
        </div>
      `;
    }

    this.currentScreen = 'dashboard';
  }

  // Mostrar pantalla de plantilla mejorada (Fase 2)
  showSquad() {
    const userTeamId = this.gameApp.userTeamId;
    const currentMatchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const lineupStatus = this.gameApp.teamManager.ensureValidStartingXI(userTeamId, false, currentMatchday);
    if (lineupStatus.valid && (lineupStatus.repaired || lineupStatus.promoted.length)) this.gameApp.saveGame();
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const players = team.players;
    const formation = team.formation;
    const medicalReport = this.gameApp.teamManager.getMedicalReport(userTeamId);

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn active" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>

      </nav>
    `;

    const startingXIIds = team.startingXI || [];
    this.squadSelection = new Set(startingXIIds.filter(id => {
      const player = players.find(item => item.id === id);
      return player && this.gameApp.teamManager.isPlayerAvailable(player);
    }));
    this.lineupReplacementId = null;

    const playerCards = players.map(player => {
      const availability = this.gameApp.teamManager.getPlayerAvailability(player);
      const line = this.getSquadPlayerLine(player.position);
      return `
        <button type="button" class="squad-player-card ${this.squadSelection.has(player.id) ? 'is-selected' : ''} ${availability.available ? '' : 'is-unavailable'}"
          data-player-id="${player.id}" data-player-line="${line}" data-player-academy="${this.isAcademyPlayer(player)}"
          ${availability.available ? '' : 'disabled'} aria-pressed="${this.squadSelection.has(player.id)}">
          <span class="squad-player-main">
            <span class="position-pill ${line.toLowerCase()}" title="${DATA.getPositionLabel(player.position, true)}">${DATA.getPositionLabel(player.position)}</span>
            <span><strong>${player.name}${player.id === team.captainId ? ' · C' : ''} ${this.renderAcademyBadge(player)}</strong><small>${player.age} años · ${availability.reason}</small><em class="replacement-suggestion" aria-live="polite"></em></span>
          </span>
          <span class="squad-player-metrics">
            <span><strong>${player.overall}</strong><small>MED</small></span>
            <span class="metric-fitness ${player.fitness < 60 ? 'warning' : ''}"><strong>${Math.round(player.fitness)}</strong><small>FÍS</small></span>
            <span><strong>${Math.round(player.morale)}</strong><small>MOR</small></span>
          </span>
          <span class="selection-mark" aria-hidden="true">✓</span>
        </button>`;
    }).join('');

    content.innerHTML = `
      <div class="squad-container-v2 team-hub">
        <header class="team-page-header">
          <div><span class="eyebrow">Gestión de la alineación</span><h2>Alineación</h2><p>Elige el once y define cómo jugará, todo en el mismo lugar.</p></div>
          <div class="availability-summary"><strong>${medicalReport.filter(item => !item.available).length}</strong><span>bajas</span><small>${team.players.filter(player => this.isAcademyPlayer(player)).length} cantera</small></div>
        </header>

        <nav class="team-section-nav" aria-label="Secciones de la alineación">
          <button type="button" class="active" data-team-anchor="team-lineup-section">Once</button>
          <button type="button" data-team-anchor="team-tactics-section">Plan</button>
          <button type="button" data-team-anchor="team-roles-section">Roles</button>
          <button type="button" data-team-anchor="academy-development-section">Cantera</button>
        </nav>

        <section class="lineup-workspace" id="team-lineup-section" aria-label="Editor de alineación">
          <div class="lineup-editor">
            <div class="lineup-toolbar">
              <div class="active-formation"><span>Formación</span><strong id="active-formation-value">${formation}</strong><button type="button" id="btn-scroll-team-tactics">Cambiar sistema</button></div>
              <span id="lineup-selection-status" class="lineup-count">${this.squadSelection.size}/11</span>
            </div>
            <div class="tactical-pitch" id="lineup-pitch"></div>
            <div class="lineup-actions">
              <button id="btn-clear-lineup" class="btn btn-secondary">Limpiar</button>
              <button id="btn-auto-select" class="btn btn-secondary">Mejor XI</button>
              <button id="btn-save-lineup" class="btn btn-primary">Guardar alineación</button>
            </div>
          </div>

          <aside class="player-picker" aria-label="Jugadores disponibles">
            <div class="player-picker-heading"><div><span class="eyebrow">Primer equipo</span><h3>Elige jugadores</h3></div><span id="lineup-replacement-help" class="picker-hint">Pulsa para añadir o retirar</span></div>
            <div class="player-filter-chips" role="group" aria-label="Filtrar por línea">
              ${[['ALL','Todos'],['ACADEMY','Cantera'],['GK','Porteros'],['DEF','Defensas'],['MID','Medios'],['ATK','Ataque']].map(([value, label]) => `<button type="button" class="filter-chip ${value === 'ALL' ? 'active' : ''}" data-squad-filter="${value}" aria-pressed="${value === 'ALL'}">${label}</button>`).join('')}
            </div>
            <div id="squad-player-list" class="squad-player-list">${playerCards}</div>
          </aside>
        </section>

        ${this.showTactics(true)}

      </div>
    `;

    this.currentScreen = 'squad';
    this.attachSquadListenersV2();
    this.attachTacticsManagementListeners();
    this.updateLineupWorkspace();
    document.getElementById('btn-scroll-team-tactics')?.addEventListener('click', () => {
      document.getElementById('team-tactics-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.querySelectorAll('[data-team-anchor]').forEach(button => button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.teamAnchor);
      if (!target) return;
      if (target.tagName === 'DETAILS') target.open = true;
      document.querySelectorAll('[data-team-anchor]').forEach(item => item.classList.toggle('active', item === button));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    if (lineupStatus.promoted?.length) {
      const names = lineupStatus.promoted.map(player => player.name).join(', ');
      this.showSuccess(`${names} ${lineupStatus.promoted.length === 1 ? 'sube' : 'suben'} del filial para completar el once`);
    }
  }

  // Mostrar pantalla de tácticas
  showTactics(embedded = false) {
    if (!embedded) return this.showSquad();
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const tactics = team.tactics;
    const strategies = Object.keys(DATA.TACTICAL_STRATEGIES);
    const formationButtons = Object.keys(DATA.FORMATIONS).map(formation => `
      <button type="button" class="visual-choice formation-choice ${formation === team.formation ? 'active' : ''}" data-tactics-formation="${formation}" aria-pressed="${formation === team.formation}">
        <strong>${formation}</strong><small>${DATA.FORMATIONS[formation].description}</small>
      </button>`).join('');
    const strategyButtons = strategies.map(strategy => `
      <button type="button" class="visual-choice strategy-choice ${team.strategy === strategy ? 'active' : ''}" data-tactics-strategy="${strategy}" aria-pressed="${team.strategy === strategy}">
        <strong>${strategy}${strategy === team.naturalStrategy ? ' · Natural' : ''}</strong><small>${strategy === team.naturalStrategy ? 'Adaptación máxima' : 'Requiere adaptación'}</small>
      </button>`).join('');
    const trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
    const medicalReport = this.gameApp.teamManager.getMedicalReport(userTeamId);
    const currentMatchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const promotionCount = team.reservePromotions.matchday === currentMatchday ? team.reservePromotions.count : 0;
    if (this.reservePromotionTeamId !== team.id) {
      this.reservePromotionSelection = new Set();
      this.reservePromotionTeamId = team.id;
    }
    const reserveIds = new Set(team.reservePlayers.map(player => player.id));
    this.reservePromotionSelection = new Set([...this.reservePromotionSelection].filter(id => reserveIds.has(id)));
    const remainingPromotions = Math.max(0, 3 - promotionCount);
    const nextMatch = this.gameApp.leagueEngine.getNextUserMatch(userTeamId);
    const opponentId = nextMatch ? (nextMatch.homeTeam === userTeamId ? nextMatch.awayTeam : nextMatch.homeTeam) : null;
    const recommendation = this.gameApp.teamManager.getTacticalRecommendation(userTeamId, opponentId);
    const planButtons = Object.values(DATA.MATCH_PLANS).map(plan => `
      <button type="button" class="match-plan-card ${team.activeMatchPlan === plan.id ? 'active' : ''}" data-tactical-plan="${plan.id}" aria-pressed="${team.activeMatchPlan === plan.id}">
        <span class="plan-code">Plan ${plan.id}</span><strong><i>${plan.symbol}</i>${plan.name}</strong><small>${plan.description}</small>
        <span class="plan-effects">${plan.effects.map(effect => `<em>${effect}</em>`).join('')}</span>
      </button>`).join('');
    const decisionGroups = [
      { label: 'Actitud', help: 'Cuánto riesgo asumir', options: [
        ['Defender', { mentality: 'Defensiva' }, '+ seguridad · - presencia arriba'],
        ['Equilibrar', { mentality: 'Equilibrada' }, 'riesgo y apoyo equilibrados'],
        ['Atacar', { mentality: 'Ofensiva' }, '+ llegadas · + espacios atrás']
      ] },
      { label: 'Presión', help: 'Dónde recuperar el balón', options: [
        ['Esperar', { pressure: 'Baja' }, '+ orden · - recuperación alta'],
        ['Presionar', { pressure: 'Media' }, 'esfuerzo controlado'],
        ['Asfixiar', { pressure: 'Alta' }, '+ robos · - energía']
      ] },
      { label: 'Construcción', help: 'Cómo avanzar', options: [
        ['Posesión', { passStyle: 'Corto', tempo: 'Medio' }, '+ control · avance paciente'],
        ['Mixta', { passStyle: 'Mixto', tempo: 'Medio' }, 'variedad y equilibrio'],
        ['Directa', { passStyle: 'Directo', tempo: 'Alto' }, '+ verticalidad · - precisión']
      ] },
      { label: 'Anchura', help: 'Dónde ocupar el campo', options: [
        ['Cerrar centro', { width: 'Estrecha' }, '+ densidad interior'],
        ['Equilibrada', { width: 'Equilibrada' }, 'ocupación compensada'],
        ['Abrir campo', { width: 'Amplia' }, '+ espacio por bandas']
      ] }
    ];
    const decisionHtml = decisionGroups.map(group => `
      <div class="tactical-decision-group"><div><strong>${group.label}</strong><small>${group.help}</small></div>
        <div class="decision-options">${group.options.map(([label, values, effect]) => {
          const active = Object.entries(values).every(([key, value]) => tactics[key] === value);
          return `<button type="button" class="decision-option ${active ? 'active' : ''}" data-tactical-values="${encodeURIComponent(JSON.stringify(values))}" aria-pressed="${active}"><strong>${label}</strong><small>${effect}</small></button>`;
        }).join('')}</div>
      </div>`).join('');
    const quickOrders = DATA.QUICK_ORDERS.map(order => `
      <button type="button" class="quick-order ${tactics.situationalInstruction === order.value ? 'active' : ''}" data-quick-order="${order.value}" aria-pressed="${tactics.situationalInstruction === order.value}"><strong>${order.label}</strong><small>${order.description}</small></button>`).join('');
    const roleRows = team.players.map(player => {
      const roles = this.gameApp.teamManager.getAvailableRoles(player.position)
        .map(role => ({ role, suitability: this.gameApp.teamManager.getRoleSuitability(player, role) }))
        .sort((a, b) => b.suitability - a.suitability);
      const currentSuitability = this.gameApp.teamManager.getRoleSuitability(player, player.role);
      return `
        <div class="role-card"><span>${player.name} ${this.renderAcademyBadge(player)} · ${DATA.getPositionLabel(player.position)}</span>
          <div class="role-choice-grid">${roles.map(item => `<button type="button" class="role-choice ${player.role === item.role ? 'active' : ''}" data-player-role="${item.role}" data-player-id="${player.id}" data-suitability="${item.suitability}" aria-pressed="${player.role === item.role}"><strong>${item.role}</strong><small>${item.suitability}%</small></button>`).join('')}</div>
          <small class="role-suitability" data-role-suitability="${player.id}">${this.roleSuitabilityLabel(currentSuitability)} · ${currentSuitability}%</small>
        </div>`;
    }).join('');

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    if (!embedded) navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn active" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    const tacticsMarkup = `
      <div class="tactics-container tactics-command-center" id="team-tactics-section">
        <header class="tactics-page-header"><span class="eyebrow">Plan de juego</span><h2>Cómo juega el equipo</h2><p>El once, la formación y las instrucciones forman una única preparación para el próximo partido.</p></header>

        <section class="tactical-identity-card">
          <div><span class="eyebrow">Estructura</span><h3>Formación e identidad</h3></div>
          <div class="visual-tactics-block">
            <div class="visual-choice-heading"><strong>Formación</strong><small id="formation-description">${DATA.FORMATIONS[team.formation].description}</small></div>
            <div class="formation-choice-grid">${formationButtons}</div>
          </div>
          <div class="visual-tactics-block">
            <div class="visual-choice-heading"><strong>Identidad</strong><small id="strategy-familiarity">Adaptación ${team.tacticalFamiliarity || 100}% · natural: ${team.naturalStrategy}</small></div>
            <div class="strategy-choice-grid">${strategyButtons}</div>
          </div>
          <p>La plantilla parte con este estilo. Puedes cambiarlo, pero una estrategia menos adecuada reduce la adaptación del equipo.</p>
        </section>

        <section class="match-plan-center">
          <div class="section-heading"><div><span class="eyebrow">Una decisión, todo el equipo</span><h3>Planes de partido</h3></div><small>Se aplican al instante</small></div>
          <div class="match-plan-grid">${planButtons}</div>
          <aside class="tactical-recommendation"><span>Ayudante táctico</span><p>${recommendation.reason}</p><button type="button" class="btn btn-secondary" data-recommended-plan="${recommendation.planId}">Aplicar Plan ${recommendation.planId}</button></aside>
        </section>

        <section class="tactical-decision-center">
          <div class="section-heading"><div><span class="eyebrow">Ajuste directo</span><h3>Cuatro decisiones</h3></div><small>Sin menús desplegables</small></div>
          <div class="tactical-decisions">${decisionHtml}</div>
        </section>

        <section class="quick-order-center">
          <div class="section-heading"><div><span class="eyebrow">Orden para el próximo partido</span><h3>Consigna rápida</h3></div></div>
          <div class="quick-order-grid">${quickOrders}</div>
        </section>

        <details class="tactics-detail-section" id="team-roles-section">
          <summary><span><span class="eyebrow">Jugadores</span><strong>Roles individuales</strong></span><span>${team.players.length} jugadores</span></summary>
          <div class="tactics-grid role-grid">${roleRows}</div>
        </details>

        <details class="tactics-detail-section">
          <summary><span><span class="eyebrow">Semana</span><strong>Entrenamiento y disponibilidad</strong></span><span>${medicalReport.length ? `${medicalReport.length} avisos` : 'Todo disponible'}</span></summary>
          <div class="development-grid tactics-management-grid">
            <div>
              <h3>Plan semanal</h3>
              <div class="training-controls">
                <div><strong>Enfoque</strong><div class="training-choice-grid">${[
                  ['recovery', 'Recuperación'], ['balanced', 'Equilibrado'], ['physical', 'Físico'],
                  ['tactical', 'Táctico'], ['technical', 'Técnico']
                ].map(([value, label]) => `<button type="button" class="training-choice ${trainingPlan.focus === value ? 'active' : ''}" data-training-focus="${value}" aria-pressed="${trainingPlan.focus === value}">${label}</button>`).join('')}</div></div>
                <div><strong>Intensidad</strong><div class="training-choice-grid compact">${[['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']]
                  .map(([value, label]) => `<button type="button" class="training-choice ${trainingPlan.intensity === value ? 'active' : ''}" data-training-intensity="${value}" aria-pressed="${trainingPlan.intensity === value}">${label}</button>`).join('')}</div></div>
              </div>
              <p class="training-help">Se aplica al completar cada jornada. Una intensidad alta mejora más, pero aumenta fatiga y riesgo.</p>
            </div>
            <div><h3>Parte médico y sanciones</h3><div class="medical-report">
              ${medicalReport.length ? medicalReport.map(item => `<div class="medical-item ${item.status}"><strong>${item.player.name} ${this.renderAcademyBadge(item.player)}</strong><span>${item.available ? `${item.player.yellowCardAccumulation} amarillas acumuladas` : item.reason}</span></div>`).join('') : '<p>Todos los jugadores están disponibles.</p>'}
            </div></div>
          </div>
        </details>

        <details class="tactics-detail-section" id="academy-development-section">
          <summary><span><span class="eyebrow">Desarrollo · ${team.current || 'Cantera'}</span><strong>${team.reserveName || 'Filial'}</strong></span><span id="reserve-promotion-count">${promotionCount}/3 promociones</span></summary>
          <div class="medical-report tactics-reserves">
            <div class="reserve-batch-bar"><span id="reserve-selection-status">Elige hasta ${remainingPromotions} canterano${remainingPromotions === 1 ? '' : 's'}</span><button type="button" id="btn-promote-selected-reserves" class="btn btn-primary" disabled>Subir seleccionados</button></div>
            ${team.reservePlayers.length ? team.reservePlayers.map(player => {
              const selected = this.reservePromotionSelection.has(player.id);
              return `<div class="medical-item available reserve-candidate ${selected ? 'selected' : ''}"><strong>${player.name} ${this.renderAcademyBadge(player)} · ${player.age} años · ${DATA.getPositionLabel(player.position)} · ${player.overall}</strong><button type="button" class="btn btn-secondary btn-select-reserve" data-player-id="${player.id}" aria-pressed="${selected}" ${remainingPromotions <= 0 ? 'disabled' : ''}>${selected ? 'Elegido' : 'Elegir'}</button></div>`;
            }).join('') : '<p>No quedan jugadores disponibles en el filial.</p>'}
          </div>
        </details>

        <div class="tactics-save-bar"><span>Todos los cambios se aplican al instante.</span><div class="tactics-save-actions"><button id="btn-best-xi-tactics" class="btn btn-primary">Aplicar mejor XI</button></div></div>
      </div>
    `;

    if (embedded) return tacticsMarkup;
    content.innerHTML = tacticsMarkup;

    this.currentScreen = 'squad';
    this.attachTacticsManagementListeners();
  }

  attachTacticsManagementListeners() {
    document.querySelectorAll('[data-tactics-formation]').forEach(button => button.addEventListener('click', () => {
      const team = this.gameApp.teamManager.getTeam(this.gameApp.userTeamId);
      const previousFormation = team.formation;
      const selectedFormation = button.dataset.tacticsFormation;
      if (!this.gameApp.teamManager.setFormation(this.gameApp.userTeamId, selectedFormation)) {
        this.showError('La formación seleccionada no es válida.');
        return;
      }
      const lineup = this.gameApp.teamManager.ensureValidStartingXI(this.gameApp.userTeamId, true);
      if (!lineup.valid) {
        this.gameApp.teamManager.setFormation(this.gameApp.userTeamId, previousFormation);
        this.gameApp.teamManager.ensureValidStartingXI(this.gameApp.userTeamId, true);
        this.showError(lineup.error);
        return;
      }
      const description = document.getElementById('formation-description');
      if (description) description.textContent = DATA.FORMATIONS[selectedFormation].description;
      const activeFormation = document.getElementById('active-formation-value');
      if (activeFormation) activeFormation.textContent = selectedFormation;
      this.squadSelection = new Set(team.startingXI);
      this.lineupReplacementId = null;
      this.updateLineupWorkspace();
      document.querySelectorAll('[data-tactics-formation]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      this.gameApp.saveGame();
      this.showSuccess(`Formación ${selectedFormation} y mejor XI aplicados`);
    }));

    document.querySelectorAll('[data-tactics-strategy]').forEach(button => button.addEventListener('click', () => {
      const strategy = button.dataset.tacticsStrategy;
      if (!this.gameApp.teamManager.applyStrategy(this.gameApp.userTeamId, strategy)) return;
      const team = this.gameApp.teamManager.getTeam(this.gameApp.userTeamId);
      document.querySelectorAll('[data-tactics-strategy]').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const familiarity = document.getElementById('strategy-familiarity');
      if (familiarity) familiarity.textContent = `Adaptación ${team.tacticalFamiliarity}% · natural: ${team.naturalStrategy}`;
      this.gameApp.saveGame();
      this.showSuccess(`Identidad ${strategy} aplicada`);
    }));

    document.getElementById('btn-best-xi-tactics')?.addEventListener('click', () => {
      const lineup = this.gameApp.teamManager.ensureValidStartingXI(this.gameApp.userTeamId, true);
      if (!lineup.valid) return this.showError(lineup.error);
      const team = this.gameApp.teamManager.getTeam(this.gameApp.userTeamId);
      this.squadSelection = new Set(team.startingXI);
      this.lineupReplacementId = null;
      this.updateLineupWorkspace();
      this.gameApp.saveGame();
      this.showSuccess('Mejor XI aplicado para el próximo partido');
    });

    document.querySelectorAll('[data-tactical-plan]').forEach(button => {
      button.addEventListener('click', () => this.applyTacticalQuickPreset(
        DATA.MATCH_PLANS[button.dataset.tacticalPlan].tactics,
        `Plan ${button.dataset.tacticalPlan} · ${DATA.MATCH_PLANS[button.dataset.tacticalPlan].name}`,
        button.dataset.tacticalPlan
      ));
    });
    document.querySelector('[data-recommended-plan]')?.addEventListener('click', event => {
      const planId = event.currentTarget.dataset.recommendedPlan;
      this.applyTacticalQuickPreset(DATA.MATCH_PLANS[planId].tactics, `Recomendación aplicada: Plan ${planId}`, planId);
    });
    document.querySelectorAll('[data-tactical-values]').forEach(button => {
      button.addEventListener('click', () => this.applyTacticalQuickPreset(
        JSON.parse(decodeURIComponent(button.dataset.tacticalValues)),
        'Ajuste táctico aplicado'
      ));
    });
    document.querySelectorAll('[data-quick-order]').forEach(button => {
      button.addEventListener('click', () => this.applyTacticalQuickPreset(
        { situationalInstruction: button.dataset.quickOrder },
        `Orden aplicada: ${button.querySelector('strong').textContent}`,
        null,
        true
      ));
    });

    const saveTrainingChoice = () => {
      const focus = document.querySelector('[data-training-focus].active')?.dataset.trainingFocus;
      const intensity = document.querySelector('[data-training-intensity].active')?.dataset.trainingIntensity;
      if (this.gameApp.teamManager.setTrainingPlan(this.gameApp.userTeamId, focus, intensity)) {
        this.gameApp.saveGame();
        this.showSuccess('Plan semanal actualizado');
      }
    };
    document.querySelectorAll('[data-training-focus], [data-training-intensity]').forEach(button => {
      button.addEventListener('click', () => {
        const selector = button.hasAttribute('data-training-focus') ? '[data-training-focus]' : '[data-training-intensity]';
        document.querySelectorAll(selector).forEach(item => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        saveTrainingChoice();
      });
    });

    document.querySelectorAll('.btn-select-reserve').forEach(button => {
      button.addEventListener('click', () => this.toggleReservePromotion(button.dataset.playerId));
    });
    document.getElementById('btn-promote-selected-reserves')?.addEventListener('click', () => this.promoteSelectedReserves());
    this.updateReservePromotionSelection();

    document.querySelectorAll('[data-player-role]').forEach(button => button.addEventListener('click', () => {
      const playerId = button.dataset.playerId;
      if (!this.gameApp.teamManager.setPlayerRole(this.gameApp.userTeamId, playerId, button.dataset.playerRole)) return;
      document.querySelectorAll(`[data-player-role][data-player-id="${playerId}"]`).forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      const score = Number(button.dataset.suitability) || 0;
      const output = document.querySelector(`[data-role-suitability="${playerId}"]`);
      if (output) output.textContent = `${this.roleSuitabilityLabel(score)} · ${score}%`;
      this.gameApp.saveGame();
    }));
  }

  getRemainingReservePromotions() {
    if (!this.gameApp) return 0;
    const team = this.gameApp.teamManager.getTeam(this.gameApp.userTeamId);
    const matchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const used = team.reservePromotions.matchday === matchday ? team.reservePromotions.count : 0;
    return Math.max(0, 3 - used);
  }

  toggleReservePromotion(playerId) {
    const remaining = this.getRemainingReservePromotions();
    if (!remaining) return this.showError('Ya has subido tres jugadores esta jornada');
    if (this.reservePromotionSelection.has(playerId)) this.reservePromotionSelection.delete(playerId);
    else if (this.reservePromotionSelection.size < remaining) this.reservePromotionSelection.add(playerId);
    else return this.showError(`Solo quedan ${remaining} plaza${remaining === 1 ? '' : 's'} de promoción`);
    this.updateReservePromotionSelection();
    // Con tres plazas libres, tres clics completan el lote y lo confirman sin
    // obligar al usuario a ascender y volver al filial uno por uno.
    if (this.reservePromotionSelection.size === remaining) this.promoteSelectedReserves();
  }

  updateReservePromotionSelection() {
    const remaining = this.getRemainingReservePromotions();
    const selected = this.reservePromotionSelection.size;
    document.querySelectorAll('.btn-select-reserve').forEach(button => {
      const active = this.reservePromotionSelection.has(button.dataset.playerId);
      button.classList.toggle('active', active);
      button.closest('.reserve-candidate')?.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? 'Elegido' : 'Elegir';
      button.disabled = !remaining || (!active && selected >= remaining);
    });
    const status = document.getElementById('reserve-selection-status');
    if (status) status.textContent = remaining
      ? `${selected}/${remaining} elegidos · al completar el cupo subirán juntos`
      : 'Cupo de tres promociones completado';
    const confirm = document.getElementById('btn-promote-selected-reserves');
    if (confirm) {
      confirm.disabled = selected === 0;
      confirm.textContent = selected ? `Subir ${selected} seleccionado${selected === 1 ? '' : 's'}` : 'Subir seleccionados';
    }
  }

  promoteSelectedReserves() {
    if (!this.gameApp || !this.reservePromotionSelection.size) return false;
    const matchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const selectedIds = [...this.reservePromotionSelection];
    const promoted = [];
    for (const playerId of selectedIds) {
      const result = this.gameApp.teamManager.promoteReservePlayer(this.gameApp.userTeamId, playerId, matchday);
      if (!result.valid) {
        this.showError(result.error);
        break;
      }
      promoted.push(result.player);
    }
    if (!promoted.length) return false;
    this.reservePromotionSelection.clear();
    this.gameApp.saveGame();
    this.showSquad();
    const section = document.getElementById('academy-development-section');
    if (section) {
      section.open = true;
      requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    this.showSuccess(`${promoted.map(player => player.name).join(', ')} ${promoted.length === 1 ? 'sube' : 'suben'} al primer equipo`);
    return true;
  }

  applyTacticalQuickPreset(values, message, planId = null, keepPlan = false) {
    if (!this.gameApp) return;
    const teamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(teamId);
    if (planId) this.gameApp.teamManager.applyMatchPlan(teamId, planId);
    else {
      this.gameApp.teamManager.updateTactics(teamId, values);
      if (!keepPlan) team.activeMatchPlan = 'CUSTOM';
    }
    this.gameApp.saveGame();
    this.refreshTacticalQuickControls();
    this.showSuccess(message);
  }

  refreshTacticalQuickControls() {
    if (!this.gameApp) return;
    const team = this.gameApp.teamManager.getTeam(this.gameApp.userTeamId);
    document.querySelectorAll('[data-tactical-plan]').forEach(button => {
      const active = team.activeMatchPlan === button.dataset.tacticalPlan;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-tactical-values]').forEach(button => {
      const values = JSON.parse(decodeURIComponent(button.dataset.tacticalValues));
      const active = Object.entries(values).every(([key, value]) => team.tactics[key] === value);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-quick-order]').forEach(button => {
      const active = team.tactics.situationalInstruction === button.dataset.quickOrder;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  roleSuitabilityLabel(score) {
    const value = Number(score) || 0;
    if (value >= 85) return 'Muy natural';
    if (value >= 75) return 'Natural';
    if (value >= 65) return 'Adaptable';
    return 'Exigente';
  }

  updateRoleSuitability(select) {
    if (!select) return;
    const option = select.options[select.selectedIndex];
    const score = Number(option?.dataset.suitability) || 0;
    const output = document.querySelector(`[data-role-suitability="${select.dataset.playerId}"]`);
    if (!output) return;
    output.textContent = `${this.roleSuitabilityLabel(score)} · ${score}%`;
    output.classList.toggle('high', score >= 80);
    output.classList.toggle('medium', score >= 65 && score < 80);
    output.classList.toggle('low', score < 65);
  }

  // Mostrar pantalla de liga
  showLeague(selectedMatchday = null) {
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const standings = this.gameApp.leagueEngine.getStandings();
    const league = this.gameApp.leagueEngine;
    const summary = league.getSeasonSummary();
    const matchday = Number(selectedMatchday) || league.getCurrentMatchday() || 1;

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn active" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    let standingsHtml = '';
    standings.forEach((standing, index) => {
      const isUserTeam = standing.teamId === userTeamId ? 'user-team' : '';
      standingsHtml += `
        <tr class="${isUserTeam}">
          <td class="pos">${index + 1}</td>
          <td class="team">${this.renderTeamCrest(this.gameApp.teamManager.getTeam(standing.teamId), 'table-club-crest')}${standing.teamName}</td>
          <td>${standing.played}</td>
          <td>${standing.wins}</td>
          <td>${standing.draws}</td>
          <td>${standing.losses}</td>
          <td>${standing.goalsFor}</td>
          <td>${standing.goalsAgainst}</td>
          <td>${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}</td>
          <td class="points"><strong>${standing.points}</strong></td>
        </tr>
      `;
    });

    const matchdayButtons = Array.from({ length: league.totalMatchdays }, (_, index) => {
      const day = index + 1;
      return `<button class="matchday-btn ${day === matchday ? 'active' : ''}" data-matchday="${day}" aria-label="Ver jornada ${day}">${day}</button>`;
    }).join('');

    const fixturesHtml = league.getMatchdayMatches(matchday).map(match => {
      const home = this.gameApp.teamManager.getTeam(match.homeTeam);
      const away = this.gameApp.teamManager.getTeam(match.awayTeam);
      const score = match.played ? `${match.homeGoals} - ${match.awayGoals}` : 'Pendiente';
      return `
        <li class="fixture-row ${match.played ? 'played' : ''}">
          <span class="fixture-team home">${this.renderTeamCrest(home, 'fixture-club-crest')}${home.name}</span>
          <strong class="fixture-score">${score}</strong>
          <span class="fixture-team">${this.renderTeamCrest(away, 'fixture-club-crest')}${away.name}</span>
        </li>
      `;
    }).join('');

    const finalBanner = summary.complete && summary.champion ? `
      <div class="champion-banner">
        <span>Temporada completada</span>
        <strong>🏆 ${summary.champion.teamName}</strong>
        <small>${summary.champion.points} puntos · ${summary.champion.wins} victorias</small>
      </div>
    ` : '';

    content.innerHTML = `
      <div class="league-container">
        <h2>Clasificación</h2>
        ${finalBanner}
        <div class="table-scroll" role="region" aria-label="Clasificación de liga" tabindex="0">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th>PJ</th>
                <th>V</th>
                <th>E</th>
                <th>D</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>${standingsHtml}</tbody>
          </table>
        </div>

        <section class="fixtures-panel">
          <div class="fixtures-heading">
            <div>
              <span class="season-kicker">Calendario completo</span>
              <h3>Jornada ${matchday}</h3>
            </div>
            <span>${summary.completedMatches}/${summary.totalMatches} partidos</span>
          </div>
          <div class="matchday-selector" aria-label="Seleccionar jornada">${matchdayButtons}</div>
          <ul class="fixtures-list">${fixturesHtml || '<li>No hay encuentros.</li>'}</ul>
        </section>
      </div>
    `;

    const matchdaySelector = content.querySelector('.matchday-selector');
    const activeMatchday = matchdaySelector?.querySelector('.matchday-btn.active');
    if (matchdaySelector && activeMatchday) {
      window.requestAnimationFrame(() => {
        matchdaySelector.scrollLeft = Math.max(
          0,
          activeMatchday.offsetLeft - (matchdaySelector.clientWidth - activeMatchday.offsetWidth) / 2
        );
      });
    }

    this.currentScreen = 'league';
  }

  // Mostrar pantalla de configuración
  showSettings() {
    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn active" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    content.innerHTML = `
      <div class="settings-container">
        <h2>Configuración</h2>

        <section class="settings-section appearance-settings">
          <h3>Estilo visual</h3>
          <p>Elige la apariencia del juego. El cambio se aplica al instante y no afecta a la partida.</p>
          <fieldset class="theme-picker">
            <legend class="sr-only">Tema de la interfaz</legend>
            ${this.renderThemeChoices()}
          </fieldset>
        </section>
        
        <div class="settings-section">
          <h3>Partida ${GameStorage.getActiveSlot() || ''}</h3>
          <p>Modo: ${{ arcade: 'Arcade', manager: 'Manager', director: 'Director Deportivo' }[this.gameApp.gameMode || 'manager']}</p>
          <button id="btn-save-game" class="btn btn-primary">Guardar Partida</button>
          <button id="btn-save-menu" class="btn btn-secondary">Guardar y volver al menú</button>
          <button id="btn-new-game" class="btn btn-danger">Nueva Partida</button>
        </div>

        <div class="settings-section">
          <h3>Copias de seguridad</h3>
          <p>Descarga tus partidas para conservarlas fuera de este navegador.</p>
          <div class="backup-actions">
            <button id="btn-export-slot" class="btn btn-secondary">Exportar partida actual</button>
            <button id="btn-export-all" class="btn btn-secondary">Exportar las tres partidas</button>
          </div>
          <div class="backup-import">
            <input id="backup-file" class="form-control" type="file" accept="application/json,.json">
            <input id="backup-target-slot" type="hidden" value="${GameStorage.getActiveSlot() || 1}">
            <div class="settings-choice-row" aria-label="Ranura de destino">
              ${[1, 2, 3].map(slot => `<button type="button" class="settings-choice ${GameStorage.getActiveSlot() === slot ? 'active' : ''}" data-backup-slot="${slot}" aria-pressed="${GameStorage.getActiveSlot() === slot}">Partida ${slot}</button>`).join('')}
            </div>
            <button id="btn-import-backup" class="btn btn-primary">Importar backup</button>
          </div>
          <p class="settings-help">Un backup completo restaura sus ranuras originales. Una partida individual se importa en la ranura seleccionada.</p>
        </div>

        <div class="settings-section">
          <h3>Información</h3>
          <p>Football Cultureta v1.2</p>
          <p>Simulador de fútbol tipo manager simplificado.</p>
        </div>

        <div class="settings-section">
          <h3>Partidos</h3>
          <span>Duración predeterminada por parte</span>
          <div class="settings-choice-row" aria-label="Duración predeterminada por parte">
            ${[1, 3, 5, 10].map(value => `<button type="button" class="settings-choice ${Number(GameStorage.getSetting('halfDuration', 3)) === value ? 'active' : ''}" data-settings-duration="${value}" aria-pressed="${Number(GameStorage.getSetting('halfDuration', 3)) === value}">${value} min</button>`).join('')}
          </div>
        </div>
      </div>
    `;

    this.currentScreen = 'settings';
  }

  // Adjuntar event listeners globales
  attachEventListeners() {
    document.addEventListener('click', (e) => {
      const saveAction = e.target.closest('[data-save-action]');
      if (saveAction && this.currentScreen === 'welcome' && this.gameApp) {
        const action = saveAction.getAttribute('data-save-action');
        const slot = Number(saveAction.getAttribute('data-save-slot'));
        const summary = GameStorage.getSlotSummary(slot);
        if (action === 'continue') this.gameApp.continueGame(slot);
        if (action === 'new') {
          const canOverwrite = !summary.occupied || confirm(`La partida ${slot} ya contiene progreso. ¿Quieres sobrescribirla?`);
          if (canOverwrite) {
            GameStorage.deleteSavedGame(slot);
            this.gameApp.startNewGame(slot);
          }
        }
        if (action === 'delete' && confirm(`¿Borrar definitivamente la partida ${slot}?`)) {
          GameStorage.deleteSavedGame(slot);
          this.gameApp.showWelcomeScreen();
        }
        return;
      }

      // Navegación principal
      if (e.target.hasAttribute('data-screen')) {
        const screen = e.target.getAttribute('data-screen');
        if (this.gameApp) {
          this.gameApp.showScreen(screen);
        }
      }

      if (e.target.id === 'btn-confirm-new-game' && this.currentScreen === 'new-game-setup' && this.gameApp) {
        const theme = document.querySelector('input[name="visual-theme"]:checked')?.value || '90s';
        const mode = document.querySelector('input[name="game-mode"]:checked')?.value || 'manager';
        this.gameApp.configureNewGame(theme, mode);
        return;
      }

      if (e.target.id === 'btn-cancel-new-game' && this.currentScreen === 'new-game-setup' && this.gameApp) {
        this.gameApp.showWelcomeScreen();
        return;
      }

      if (e.target.classList.contains('matchday-btn')) {
        this.showLeague(Number(e.target.getAttribute('data-matchday')));
      }

      // Botón nueva partida
      if (e.target.id === 'btn-new-game' && this.currentScreen === 'welcome') {
        if (this.gameApp) {
          this.gameApp.startNewGame();
        }
      }

      // Botón continuar partida
      if (e.target.id === 'btn-continue-game') {
        if (this.gameApp) {
          this.gameApp.continueGame();
        }
      }

      // Selección de equipo
      if (e.target.classList.contains('btn-select')) {
        const teamId = e.target.getAttribute('data-team-id');
        if (this.gameApp) {
          this.gameApp.selectTeam(teamId);
        }
      }

      // Jugar partido
      if (e.target.id === 'btn-play-match') {
        if (this.gameApp) {
          this.gameApp.playMatch();
        }
      }

      // Guardar partida
      if (e.target.id === 'btn-save-game' && this.currentScreen === 'settings') {
        if (this.gameApp) {
          const saved = this.gameApp.saveGame();
          if (saved) this.showSuccess(`Partida ${GameStorage.getActiveSlot()} guardada`);
        }
      }

      if (e.target.id === 'btn-save-menu' && this.currentScreen === 'settings' && this.gameApp) {
        this.gameApp.returnToSaveMenu();
      }

      if (e.target.id === 'btn-export-slot' && this.currentScreen === 'settings' && this.gameApp) {
        this.gameApp.exportSave(false);
      }

      if (e.target.id === 'btn-export-all' && this.currentScreen === 'settings' && this.gameApp) {
        this.gameApp.exportSave(true);
      }

      if (e.target.id === 'btn-import-backup' && this.currentScreen === 'settings' && this.gameApp) {
        const file = document.getElementById('backup-file').files[0];
        const slot = Number(document.getElementById('backup-target-slot').value);
        if (!file) this.showError('Selecciona un archivo JSON');
        else this.gameApp.importSave(file, slot);
      }

      // Nueva partida desde settings
      if (e.target.id === 'btn-new-game' && this.currentScreen === 'settings') {
        const confirmed = confirm('¿Reiniciar la ranura actual? Se perderá su progreso, pero las otras partidas no cambiarán.');
        if (confirmed && this.gameApp) {
          this.gameApp.newGame();
        }
      }

      const backupSlot = e.target.closest('[data-backup-slot]');
      if (backupSlot && this.currentScreen === 'settings') {
        document.getElementById('backup-target-slot').value = backupSlot.dataset.backupSlot;
        document.querySelectorAll('[data-backup-slot]').forEach(button => {
          const active = button === backupSlot;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
      }

      const duration = e.target.closest('[data-settings-duration]');
      if (duration && this.currentScreen === 'settings') {
        GameStorage.setSetting('halfDuration', duration.dataset.settingsDuration);
        document.querySelectorAll('[data-settings-duration]').forEach(button => {
          const active = button === duration;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        this.showSuccess('Duración predeterminada guardada');
      }

    });

    document.addEventListener('change', (e) => {
      if (e.target.name === 'visual-theme') {
        const labels = { classic: 'Classic', '90s': '90s', snes: 'SNES' };
        const selected = this.applyVisualTheme(e.target.value);
        this.showSuccess(`Estilo ${labels[selected]} aplicado`);
      }
    });

  }

  // Guardar alineación (Fase 2 mejorada)
  saveLineupV2() {
    if (!this.gameApp) return;

    const userTeamId = this.gameApp.userTeamId;
    const selectedIds = Array.from(this.squadSelection || []);

    const validation = this.gameApp.teamManager.validateLineup(userTeamId, selectedIds);

    if (!validation.valid) {
      alert('Error: ' + validation.error);
      return;
    }

    if (this.gameApp.teamManager.setStartingXI(userTeamId, selectedIds).valid) {
      this.showSuccess('✓ Alineación guardada correctamente');
      this.gameApp.saveGame();
      
      this.updateLineupWorkspace();
    } else {
      alert('Error al guardar la alineación');
    }
  }

  // Agregar listeners de plantilla (mejorado para Fase 2)
  attachSquadListenersV2() {
    document.querySelectorAll('.squad-player-card').forEach(card => {
      card.addEventListener('click', () => this.toggleSquadPlayer(card.dataset.playerId));
    });

    const pitch = document.getElementById('lineup-pitch');
    if (pitch) pitch.addEventListener('click', event => {
      const player = event.target.closest('[data-lineup-player-id]');
      if (player) this.toggleSquadPlayer(player.dataset.lineupPlayerId);
    });

    document.querySelectorAll('[data-squad-filter]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-squad-filter]').forEach(item => item.classList.toggle('active', item === button));
        document.querySelectorAll('[data-squad-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        this.filterSquadPlayerCards();
      });
    });

    // Botón Auto-seleccionar mejorado
    const autoSelectBtn = document.getElementById('btn-auto-select');
    if (autoSelectBtn) {
      autoSelectBtn.addEventListener('click', () => this.autoSelectLineupForFormation());
    }

    // Botón Guardar alineación
    const saveBtn = document.getElementById('btn-save-lineup');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveLineupV2());
    }

    // Botón Limpiar selección
    const clearBtn = document.getElementById('btn-clear-lineup');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearLineup());
    }

    this.updateSaveButtonStatus();
  }

  getSquadPlayerLine(position) {
    if (position === 'GK') return 'GK';
    if (['CB', 'RB', 'LB'].includes(position)) return 'DEF';
    if (['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(position)) return 'MID';
    return 'ATK';
  }

  toggleSquadPlayer(playerId) {
    if (!this.squadSelection) this.squadSelection = new Set();
    const team = this.gameApp?.teamManager.getTeam(this.gameApp.userTeamId);
    const playerToAdd = team?.players.find(player => player.id === playerId);
    if (this.squadSelection.has(playerId)) {
      if (this.squadSelection.size === 11 && this.lineupReplacementId !== playerId) {
        this.lineupReplacementId = playerId;
        document.querySelectorAll('[data-squad-filter]').forEach(button => {
          const active = button.dataset.squadFilter === 'ALL';
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', String(active));
        });
      } else {
        this.squadSelection.delete(playerId);
        this.lineupReplacementId = null;
      }
    } else if (this.lineupReplacementId && this.squadSelection.has(this.lineupReplacementId)) {
      const nextSelection = Array.from(this.squadSelection).filter(id => id !== this.lineupReplacementId);
      nextSelection.push(playerId);
      if (this.gameApp) {
        const validation = this.gameApp.teamManager.validateLineup(this.gameApp.userTeamId, nextSelection);
        if (!validation.valid) {
          this.showError(validation.error);
          return;
        }
      }
      this.squadSelection = new Set(nextSelection);
      this.lineupReplacementId = null;
    } else {
      if (this.squadSelection.size >= 11) {
        this.showError('Selecciona primero en el campo al jugador que quieres cambiar.');
        return;
      }
      if (playerToAdd?.position === 'GK') {
        const selectedKeeper = Array.from(this.squadSelection)
          .map(id => team.players.find(player => player.id === id))
          .find(player => player?.position === 'GK');
        if (selectedKeeper) {
          this.squadSelection.delete(selectedKeeper.id);
          this.showSuccess(`${playerToAdd.name} sustituye a ${selectedKeeper.name} en la portería`);
        }
      } else if (this.squadSelection.size === 10) {
        const hasKeeper = Array.from(this.squadSelection)
          .some(id => team.players.find(player => player.id === id)?.position === 'GK');
        if (!hasKeeper) {
          this.showError('El once necesita un portero. Selecciónalo antes de completar la alineación.');
          return;
        }
      }
      this.squadSelection.add(playerId);
    }
    this.updateLineupWorkspace();
  }

  updateLineupWorkspace() {
    const pitch = document.getElementById('lineup-pitch');
    if (!pitch || !this.gameApp) return;
    const teamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(teamId);
    const ids = Array.from(this.squadSelection || []);
    const assignments = this.gameApp.teamManager.assignLineupToFormation(teamId, ids);
    const yByLine = { gk: 87, def: 68, mid: 43, att: 18 };
    pitch.innerHTML = assignments.map(assignment => {
      const player = team.players.find(item => item.id === assignment.playerId);
      const visualIndex = assignment.visualLineIndex ?? assignment.lineIndex;
      const visualCount = assignment.visualLineCount ?? assignment.lineCount;
      const x = ((visualIndex + 1) / (visualCount + 1)) * 100;
      const y = assignment.visualY ?? yByLine[assignment.line];
      const lastName = player.name.split(' ').slice(-1)[0];
      const condition = player.fitness < 60 ? 'warning' : '';
      const goalkeeperClass = assignment.line === 'gk' ? 'goalkeeper' : '';
      const adaptedClass = assignment.line !== 'gk' && player.position !== assignment.slotPosition ? 'is-adapted' : '';
      const effectiveOverall = this.gameApp.teamManager.getEffectiveOverall(player, assignment.slotPosition);
      const overallDelta = effectiveOverall - player.overall;
      const overallChange = overallDelta ? ` · ${overallDelta > 0 ? '+' : ''}${overallDelta} MED` : '';
      const replacementClass = this.lineupReplacementId === player.id ? 'is-replacing' : '';
      return `<button type="button" class="pitch-player ${condition} ${goalkeeperClass} ${adaptedClass} ${replacementClass}" data-lineup-player-id="${player.id}" style="--player-x:${x}%;--player-y:${y}%" title="${player.name}: media base ${player.overall}, media como ${DATA.getPositionLabel(assignment.slotPosition)} ${effectiveOverall}">
        <span class="pitch-shirt ${overallDelta > 0 ? 'overall-up' : overallDelta < 0 ? 'overall-down' : ''}">${effectiveOverall}</span><strong>${lastName}${this.renderAcademyBadge(player, true)}</strong><small>${DATA.getPositionLabel(assignment.slotPosition)}${adaptedClass ? ' · ADAPT.' : ''}${overallChange} · ${Math.round(player.fitness)}%</small>
      </button>`;
    }).join('');

    if (!assignments.length) pitch.innerHTML = '<p class="empty-lineup">Elige jugadores de la lista para construir tu once</p>';

    document.querySelectorAll('.squad-player-card').forEach(card => {
      const selected = this.squadSelection.has(card.dataset.playerId);
      card.classList.toggle('is-selected', selected);
      card.classList.toggle('is-replacing', this.lineupReplacementId === card.dataset.playerId);
      card.setAttribute('aria-pressed', String(selected));
    });
    this.updateLineupReplacementSuggestions(team, assignments);
    const status = document.getElementById('lineup-selection-status');
    if (status) {
      const outgoing = this.lineupReplacementId ? team.players.find(player => player.id === this.lineupReplacementId) : null;
      status.textContent = outgoing ? `Cambia a ${outgoing.name.split(' ').slice(-1)[0]} · elige sustituto` : `${ids.length}/11`;
      status.classList.toggle('complete', ids.length === 11);
      status.classList.toggle('replacing', Boolean(outgoing));
    }
    this.updateSaveButtonStatus();
    this.filterSquadPlayerCards();
  }

  updateLineupReplacementSuggestions(team, assignments = []) {
    const cards = Array.from(document.querySelectorAll('.squad-player-card'));
    const help = document.getElementById('lineup-replacement-help');
    cards.forEach(card => {
      card.classList.remove('is-suggestion-best', 'is-suggestion-good', 'is-suggestion-option');
      card.style.order = '';
      delete card.dataset.replacementScore;
      card.removeAttribute('aria-label');
      const badge = card.querySelector('.replacement-suggestion');
      if (badge) badge.textContent = '';
    });
    const outgoing = this.lineupReplacementId
      ? team.players.find(player => player.id === this.lineupReplacementId)
      : null;
    if (!outgoing) {
      if (help) help.textContent = 'Pulsa para añadir o retirar';
      return;
    }
    const lineupIds = Array.from(this.squadSelection || []);
    const suggestions = team.players
      .filter(player => !this.squadSelection.has(player.id) && this.gameApp.teamManager.isPlayerAvailable(player))
      .map(player => ({
        player,
        score: this.gameApp.teamManager.getReplacementSuitability(team.id, outgoing.id, player.id, lineupIds)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || b.player.overall - a.player.overall)
      .slice(0, 3);
    suggestions.forEach((item, index) => {
      const card = cards.find(candidate => candidate.dataset.playerId === item.player.id);
      if (!card) return;
      const level = index === 0 ? 'is-suggestion-best' : index === 1 ? 'is-suggestion-good' : 'is-suggestion-option';
      card.classList.add(level);
      card.style.order = String(-30 + index);
      card.dataset.replacementScore = String(item.score);
      const badge = card.querySelector('.replacement-suggestion');
      if (badge) badge.textContent = `${index + 1}.º cambio recomendado · ${item.score}%`;
      card.setAttribute('aria-label', `${item.player.name}, opción ${index + 1}, ${item.score}% de encaje para sustituir a ${outgoing.name}`);
    });
    if (help) help.textContent = suggestions.length
      ? `Mejores cambios para ${outgoing.name.split(' ').slice(-1)[0]} · verde, azul y ámbar`
      : `No hay sustitutos compatibles para ${outgoing.name.split(' ').slice(-1)[0]}`;
  }

  // Actualizar estado del botón guardar
  updateSaveButtonStatus() {
    const saveBtn = document.getElementById('btn-save-lineup');
    if (!saveBtn) return;

    const selected = (this.squadSelection || new Set()).size;
    let validation = null;
    if (selected === 11 && this.gameApp) {
      validation = this.gameApp.teamManager.validateLineup(
        this.gameApp.userTeamId,
        Array.from(this.squadSelection)
      );
    }
    saveBtn.textContent = this.lineupReplacementId
      ? 'Elige el sustituto'
      : selected === 11 && validation?.valid ? 'Guardar alineación'
        : selected === 11 ? 'Once no válido' : `Faltan ${11 - selected}`;
    saveBtn.title = validation && !validation.valid ? validation.error : '';
    saveBtn.disabled = selected !== 11 || Boolean(this.lineupReplacementId) || Boolean(validation && !validation.valid);
  }

  filterSquadPlayerCards() {
    const filter = document.querySelector('[data-squad-filter].active')?.dataset.squadFilter || 'ALL';
    document.querySelectorAll('.squad-player-card').forEach(card => {
      const filteredOut = filter === 'ACADEMY'
        ? card.dataset.playerAcademy !== 'true'
        : filter !== 'ALL' && card.dataset.playerLine !== filter;
      card.hidden = filteredOut;
      card.classList.toggle('is-filtered-out', filteredOut);
    });
  }

  // Auto-seleccionar para la formación actual
  autoSelectLineupForFormation() {
    if (!this.gameApp) return;

    const userTeamId = this.gameApp.userTeamId;
    const matchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const result = this.gameApp.teamManager.ensureValidStartingXI(userTeamId, true, matchday);
    if (!result.valid) {
      this.showError(result.error || 'No se ha podido completar un once válido');
      return;
    }
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    this.squadSelection = new Set(team.startingXI);
    this.lineupReplacementId = null;
    this.gameApp.saveGame();
    this.updateLineupWorkspace();
    const promoted = result.promoted?.length ? ` · ${result.promoted.length} juvenil${result.promoted.length === 1 ? '' : 'es'} incorporado${result.promoted.length === 1 ? '' : 's'}` : '';
    this.showSuccess(`Mejor XI guardado: 11 jugadores y un portero${promoted}`);
  }

  // Limpiar selección
  clearLineup() {
    this.squadSelection = new Set();
    this.lineupReplacementId = null;
    this.updateLineupWorkspace();
  }

  // Mostrar mensaje de error
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  // Mostrar mensaje de éxito
  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  }
}

// Exportar para uso en navegador
if (typeof module === 'undefined') {
  window.UIManager = UIManager;
}
