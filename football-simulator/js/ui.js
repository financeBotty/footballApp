// ============================================
// GESTOR DE INTERFAZ DE USUARIO
// ============================================

class UIManager {
  constructor() {
    this.currentScreen = null;
    this.gameApp = null; // Referencia a la aplicación principal
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
          
          <div class="welcome-info">
            <h3>Acerca del Juego</h3>
            <p>Gestiona tu equipo de fútbol, crea alineaciones, define tácticas y simula partidos en una liga de 8 equipos.</p>
            <ul>
              <li>8 equipos ficticios</li>
              <li>14 jornadas (todos contra todos)</li>
              <li>Simulación minuto a minuto</li>
              <li>Guardado automático</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    this.currentScreen = 'welcome';
  }

  // Mostrar selección de equipo
  showTeamSelection() {
    const content = document.getElementById('main-content');
    const navBar = document.getElementById('navigation');

    navBar.innerHTML = '';

    const teams = this.gameApp.teamManager.getAllTeams();
    let teamsHtml = '';

    teams.forEach(team => {
      teamsHtml += `
        <div class="team-card" data-team-id="${team.id}">
          <div class="team-crest-stage">${this.renderTeamCrest(team, 'team-card-crest')}</div>
          <div class="team-name">${team.name}</div>
          <div class="team-short">${team.shortName}</div>
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
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
              <p>Posición: <strong>#${userPosition}</strong></p>
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
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
          data-player-id="${player.id}" data-player-line="${line}"
          ${availability.available ? '' : 'disabled'} aria-pressed="${this.squadSelection.has(player.id)}">
          <span class="squad-player-main">
            <span class="position-pill ${line.toLowerCase()}">${player.position}</span>
            <span><strong>${player.name}${player.id === team.captainId ? ' · C' : ''}</strong><small>${player.age} años · ${availability.reason}</small><em class="replacement-suggestion" aria-live="polite"></em></span>
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
          <div><span class="eyebrow">Gestión del equipo</span><h2>Alineación</h2><p>Construye el once directamente sobre el campo.</p></div>
          <div class="availability-summary"><strong>${medicalReport.filter(item => !item.available).length}</strong><span>bajas</span></div>
        </header>

        <section class="lineup-workspace" aria-label="Editor de alineación">
          <div class="lineup-editor">
            <div class="lineup-toolbar">
              <div class="active-formation"><span>Formación</span><strong>${formation}</strong><button type="button" data-screen="tactics">Editar en Tácticas</button></div>
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
              ${[['ALL','Todos'],['GK','Porteros'],['DEF','Defensas'],['MID','Medios'],['ATK','Ataque']].map(([value, label]) => `<button type="button" class="filter-chip ${value === 'ALL' ? 'active' : ''}" data-squad-filter="${value}" aria-pressed="${value === 'ALL'}">${label}</button>`).join('')}
            </div>
            <div id="squad-player-list" class="squad-player-list">${playerCards}</div>
          </aside>
        </section>

      </div>
    `;

    this.currentScreen = 'squad';
    this.attachSquadListenersV2();
    this.updateLineupWorkspace();
  }

  // Mostrar pantalla de tácticas
  showTactics() {
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const tactics = team.tactics;
    const strategies = Object.keys(DATA.TACTICAL_STRATEGIES);
    const formationOptions = Object.keys(DATA.FORMATIONS)
      .map(formation => `<option value="${formation}" ${formation === team.formation ? 'selected' : ''}>${formation} · ${DATA.FORMATIONS[formation].description}</option>`)
      .join('');
    const trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };
    const medicalReport = this.gameApp.teamManager.getMedicalReport(userTeamId);
    const currentMatchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
    const promotionCount = team.reservePromotions.matchday === currentMatchday ? team.reservePromotions.count : 0;
    const roleRows = team.players.map(player => {
      const roles = this.gameApp.teamManager.getAvailableRoles(player.position)
        .map(role => ({ role, suitability: this.gameApp.teamManager.getRoleSuitability(player, role) }))
        .sort((a, b) => b.suitability - a.suitability);
      const currentSuitability = this.gameApp.teamManager.getRoleSuitability(player, player.role);
      return `
        <label class="role-card"><span>${player.name} · ${player.position}</span>
          <select class="form-control player-role-select" data-player-id="${player.id}">
            ${roles.map(item => `<option value="${item.role}" data-suitability="${item.suitability}" ${player.role === item.role ? 'selected' : ''}>${item.role} · ${item.suitability}%</option>`).join('')}
          </select>
          <small class="role-suitability" data-role-suitability="${player.id}">${this.roleSuitabilityLabel(currentSuitability)} · ${currentSuitability}%</small>
        </label>`;
    }).join('');

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${this.renderClubIdentity(team)}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Alineación</button>
          <button class="nav-btn active" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Datos</button>
          <button class="nav-btn" data-screen="settings">Ajustes</button>
        </div>
      </nav>
    `;

    content.innerHTML = `
      <div class="tactics-container tactics-command-center">
        <header class="tactics-page-header"><span class="eyebrow">Plan de juego</span><h2>Tácticas</h2><p>Define cómo se coloca y compite el equipo. La alineación solo se ocupa de elegir a los once.</p></header>

        <section class="tactical-identity-card">
          <div><span class="eyebrow">Estructura</span><h3>Formación e identidad</h3></div>
          <div class="tactical-identity-grid">
            <label>Formación
              <select id="tactics-formation" class="form-control">${formationOptions}</select>
              <small id="formation-description">${DATA.FORMATIONS[team.formation].description}</small>
            </label>
            <label>Estrategia activa
              <select id="tactics-strategy" class="form-control">
                ${strategies.map(strategy => `<option value="${strategy}" ${team.strategy === strategy ? 'selected' : ''}>${strategy}${strategy === team.naturalStrategy ? ' · natural' : ''}</option>`).join('')}
              </select>
              <small>Adaptación ${team.tacticalFamiliarity || 100}% · identidad natural: ${team.naturalStrategy}</small>
            </label>
          </div>
          <p>La plantilla parte con este estilo. Puedes cambiarlo, pero una estrategia menos adecuada reduce la adaptación del equipo.</p>
        </section>

        <div class="tactics-section-heading"><span class="eyebrow">Instrucciones colectivas</span><h3>Comportamiento del equipo</h3></div>
        <div class="tactics-grid tactics-options-menu" role="group" aria-label="Instrucciones colectivas">
          <div class="tactic-option">
            <label for="tactics-mentality">Mentalidad</label>
            <select id="tactics-mentality" class="form-control">
              <option value="Muy Defensiva" ${tactics.mentality === 'Muy Defensiva' ? 'selected' : ''}>Muy Defensiva</option>
              <option value="Defensiva" ${tactics.mentality === 'Defensiva' ? 'selected' : ''}>Defensiva</option>
              <option value="Equilibrada" ${tactics.mentality === 'Equilibrada' ? 'selected' : ''}>Equilibrada</option>
              <option value="Ofensiva" ${tactics.mentality === 'Ofensiva' ? 'selected' : ''}>Ofensiva</option>
              <option value="Muy Ofensiva" ${tactics.mentality === 'Muy Ofensiva' ? 'selected' : ''}>Muy Ofensiva</option>
            </select>
          </div>

          <div class="tactic-option">
            <label for="tactics-pressure">Presión</label>
            <select id="tactics-pressure" class="form-control">
              <option value="Baja" ${tactics.pressure === 'Baja' ? 'selected' : ''}>Baja</option>
              <option value="Media" ${tactics.pressure === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Alta" ${tactics.pressure === 'Alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>

          <div class="tactic-option">
            <label for="tactics-tempo">Ritmo</label>
            <select id="tactics-tempo" class="form-control">
              <option value="Bajo" ${tactics.tempo === 'Bajo' ? 'selected' : ''}>Bajo</option>
              <option value="Medio" ${tactics.tempo === 'Medio' ? 'selected' : ''}>Medio</option>
              <option value="Alto" ${tactics.tempo === 'Alto' ? 'selected' : ''}>Alto</option>
            </select>
          </div>

          <div class="tactic-option">
            <label for="tactics-width">Anchura</label>
            <select id="tactics-width" class="form-control">
              <option value="Estrecha" ${tactics.width === 'Estrecha' ? 'selected' : ''}>Estrecha</option>
              <option value="Equilibrada" ${tactics.width === 'Equilibrada' ? 'selected' : ''}>Equilibrada</option>
              <option value="Amplia" ${tactics.width === 'Amplia' ? 'selected' : ''}>Amplia</option>
            </select>
          </div>

          <div class="tactic-option">
            <label for="tactics-passStyle">Estilo de Pase</label>
            <select id="tactics-passStyle" class="form-control">
              <option value="Corto" ${tactics.passStyle === 'Corto' ? 'selected' : ''}>Corto</option>
              <option value="Mixto" ${tactics.passStyle === 'Mixto' ? 'selected' : ''}>Mixto</option>
              <option value="Directo" ${tactics.passStyle === 'Directo' ? 'selected' : ''}>Directo</option>
            </select>
          </div>

          <div class="tactic-option">
            <label for="tactics-defensiveLine">Línea Defensiva</label>
            <select id="tactics-defensiveLine" class="form-control">
              <option value="Baja" ${tactics.defensiveLine === 'Baja' ? 'selected' : ''}>Baja</option>
              <option value="Media" ${tactics.defensiveLine === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Alta" ${tactics.defensiveLine === 'Alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>
          <div class="tactic-option">
            <label for="tactics-situational">Instrucción situacional</label>
            <select id="tactics-situational" class="form-control">
              ${['Normal', 'Perder tiempo', 'Buscar el empate', 'Defender resultado', 'Atacar izquierda', 'Atacar derecha', 'Presionar rival'].map(value => `<option value="${value}" ${tactics.situationalInstruction === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select>
          </div>
        </div>

        <details class="tactics-detail-section">
          <summary><span><span class="eyebrow">Jugadores</span><strong>Roles individuales</strong></span><span>${team.players.length} jugadores</span></summary>
          <div class="tactics-grid role-grid">${roleRows}</div>
        </details>

        <details class="tactics-detail-section">
          <summary><span><span class="eyebrow">Semana</span><strong>Entrenamiento y disponibilidad</strong></span><span>${medicalReport.length ? `${medicalReport.length} avisos` : 'Todo disponible'}</span></summary>
          <div class="development-grid tactics-management-grid">
            <div>
              <h3>Plan semanal</h3>
              <div class="training-controls">
                <label>Enfoque<select id="training-focus" class="form-control">${[
                  ['recovery', 'Recuperación'], ['balanced', 'Equilibrado'], ['physical', 'Físico'],
                  ['tactical', 'Táctico'], ['technical', 'Técnico']
                ].map(([value, label]) => `<option value="${value}" ${trainingPlan.focus === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
                <label>Intensidad<select id="training-intensity" class="form-control">${[['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']]
                  .map(([value, label]) => `<option value="${value}" ${trainingPlan.intensity === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
                <button id="btn-save-training" class="btn btn-secondary">Guardar plan</button>
              </div>
              <p class="training-help">Se aplica al completar cada jornada. Una intensidad alta mejora más, pero aumenta fatiga y riesgo.</p>
            </div>
            <div><h3>Parte médico y sanciones</h3><div class="medical-report">
              ${medicalReport.length ? medicalReport.map(item => `<div class="medical-item ${item.status}"><strong>${item.player.name}</strong><span>${item.available ? `${item.player.yellowCardAccumulation} amarillas acumuladas` : item.reason}</span></div>`).join('') : '<p>Todos los jugadores están disponibles.</p>'}
            </div></div>
          </div>
        </details>

        <details class="tactics-detail-section">
          <summary><span><span class="eyebrow">Desarrollo · ${team.current || 'Cantera'}</span><strong>${team.reserveName || 'Filial'}</strong></span><span>${promotionCount}/3 promociones</span></summary>
          <div class="medical-report tactics-reserves">
            ${team.reservePlayers.length ? team.reservePlayers.map(player => `<div class="medical-item available"><strong>${player.name} · ${player.age} años · ${player.position} · ${player.overall}</strong><button class="btn btn-secondary btn-promote-reserve" data-player-id="${player.id}" ${promotionCount >= 3 ? 'disabled' : ''}>Subir</button></div>`).join('') : '<p>No quedan jugadores disponibles en el filial.</p>'}
          </div>
        </details>

        <div class="tactics-save-bar"><span>Los cambios se aplicarán al próximo partido.</span><button id="btn-save-tactics" class="btn btn-primary">Guardar tácticas</button></div>
      </div>
    `;

    this.currentScreen = 'tactics';
    this.attachTacticsManagementListeners();
  }

  attachTacticsManagementListeners() {
    const formation = document.getElementById('tactics-formation');
    if (formation) formation.addEventListener('change', () => {
      if (!this.gameApp.teamManager.setFormation(this.gameApp.userTeamId, formation.value)) {
        this.showError('La formación seleccionada no es válida.');
        return;
      }
      const description = document.getElementById('formation-description');
      if (description) description.textContent = DATA.FORMATIONS[formation.value].description;
      this.gameApp.saveGame();
      this.showSuccess(`Formación ${formation.value} aplicada`);
    });

    document.getElementById('btn-save-training')?.addEventListener('click', () => {
      const focus = document.getElementById('training-focus').value;
      const intensity = document.getElementById('training-intensity').value;
      if (this.gameApp.teamManager.setTrainingPlan(this.gameApp.userTeamId, focus, intensity)) {
        this.gameApp.saveGame();
        this.showSuccess('Plan semanal guardado');
      }
    });

    document.querySelectorAll('.btn-promote-reserve').forEach(button => {
      button.addEventListener('click', () => {
        const matchday = this.gameApp.leagueEngine.getCurrentMatchday() || 1;
        const result = this.gameApp.teamManager.promoteReservePlayer(this.gameApp.userTeamId, button.dataset.playerId, matchday);
        if (!result.valid) return this.showError(result.error);
        this.gameApp.saveGame();
        this.showSuccess(`${result.player.name} sube al primer equipo`);
        this.showTactics();
      });
    });

    document.querySelectorAll('.player-role-select').forEach(select => {
      select.addEventListener('change', () => this.updateRoleSuitability(select));
      this.updateRoleSuitability(select);
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
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
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
            ${[
              ['classic', 'Classic', 'Diseño original moderno', 'CL'],
              ['90s', '90s', 'Gestor de PC de 1996', '96'],
              ['snes', 'SNES', 'Estilo deportivo 16-bit', '16']
            ].map(([value, label, description, badge]) => `
              <label class="theme-choice theme-choice-${value}">
                <input type="radio" name="visual-theme" value="${value}" ${this.getVisualTheme() === value ? 'checked' : ''}>
                <span class="theme-preview" aria-hidden="true"><i>${badge}</i><b></b><b></b><b></b></span>
                <strong>${label}</strong>
                <small>${description}</small>
              </label>`).join('')}
          </fieldset>
        </section>
        
        <div class="settings-section">
          <h3>Partida ${GameStorage.getActiveSlot() || ''}</h3>
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
            <select id="backup-target-slot" class="form-control" aria-label="Ranura de destino">
              ${[1, 2, 3].map(slot => `<option value="${slot}" ${GameStorage.getActiveSlot() === slot ? 'selected' : ''}>Partida ${slot}</option>`).join('')}
            </select>
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
          <label for="settings-half-duration">Duración predeterminada por parte</label>
          <select id="settings-half-duration" class="form-control">
            ${[1, 3, 5, 10].map(value => `<option value="${value}" ${Number(GameStorage.getSetting('halfDuration', 3)) === value ? 'selected' : ''}>${value} minutos</option>`).join('')}
          </select>
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

      // Guardar tácticas
      if (e.target.id === 'btn-save-tactics') {
        this.saveTactics();
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

    });

    document.addEventListener('change', (e) => {
      if (e.target.name === 'visual-theme') {
        const labels = { classic: 'Classic', '90s': '90s', snes: 'SNES' };
        const selected = this.applyVisualTheme(e.target.value);
        this.showSuccess(`Estilo ${labels[selected]} aplicado`);
      }
      if (e.target.id === 'settings-half-duration') {
        GameStorage.setSetting('halfDuration', e.target.value);
        this.showSuccess('Duración predeterminada guardada');
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
      const replacementClass = this.lineupReplacementId === player.id ? 'is-replacing' : '';
      return `<button type="button" class="pitch-player ${condition} ${goalkeeperClass} ${replacementClass}" data-lineup-player-id="${player.id}" style="--player-x:${x}%;--player-y:${y}%" title="${replacementClass ? `Elige el sustituto de ${player.name}` : `Cambiar a ${player.name}`}">
        <span class="pitch-shirt">${player.overall}</span><strong>${lastName}</strong><small>${assignment.slotPosition} · ${Math.round(player.fitness)}%</small>
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
    saveBtn.textContent = this.lineupReplacementId
      ? 'Elige el sustituto'
      : selected === 11 ? 'Guardar alineación' : `Faltan ${11 - selected}`;
    saveBtn.disabled = selected !== 11 || Boolean(this.lineupReplacementId);
  }

  filterSquadPlayerCards() {
    const filter = document.querySelector('[data-squad-filter].active')?.dataset.squadFilter || 'ALL';
    document.querySelectorAll('.squad-player-card').forEach(card => {
      const filteredOut = filter !== 'ALL' && card.dataset.playerLine !== filter;
      card.hidden = filteredOut;
      card.classList.toggle('is-filtered-out', filteredOut);
    });
  }

  // Auto-seleccionar para la formación actual
  autoSelectLineupForFormation() {
    if (!this.gameApp) return;

    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const formation = team.formation;
    const formationObj = DATA.FORMATIONS[formation];

    if (!formationObj) {
      alert('Formación no válida');
      return;
    }

    // Obtener jugadores disponibles agrupados por posición
    const availablePlayers = {};
    team.players.filter(player => this.gameApp.teamManager.isPlayerAvailable(player)).forEach(player => {
      if (!availablePlayers[player.position]) {
        availablePlayers[player.position] = [];
      }
      availablePlayers[player.position].push(player);
    });

    // Ordenar cada posición por overall, fitness y morale
    for (const pos in availablePlayers) {
      availablePlayers[pos].sort((a, b) => {
        const scoreA = (a.overall * 0.6) + (a.fitness * 0.25) + (a.morale * 0.15);
        const scoreB = (b.overall * 0.6) + (b.fitness * 0.25) + (b.morale * 0.15);
        return scoreB - scoreA;
      });
    }

    // Seleccionar jugadores para cada posición de la formación
    const selectedIds = new Set();
    const positionMap = {
      'RM': 'RW', // Mappear a posición similar si no existe
      'LM': 'LW'
    };

    for (const formationPos of formationObj.positions) {
      const targetPos = positionMap[formationPos] || formationPos;
      
      if (availablePlayers[targetPos] && availablePlayers[targetPos].length > 0) {
        // Encontrar el mejor jugador disponible
        for (const player of availablePlayers[targetPos]) {
          if (!selectedIds.has(player.id)) {
            selectedIds.add(player.id);
            break;
          }
        }
      }
    }

    // Si no hay suficientes jugadores, rellenar con los mejores disponibles
    if (selectedIds.size < 11) {
      const allPlayers = team.players.filter(player => this.gameApp.teamManager.isPlayerAvailable(player)).sort((a, b) => {
        const scoreA = (a.overall * 0.6) + (a.fitness * 0.25) + (a.morale * 0.15);
        const scoreB = (b.overall * 0.6) + (b.fitness * 0.25) + (b.morale * 0.15);
        return scoreB - scoreA;
      });

      for (const player of allPlayers) {
        if (selectedIds.size >= 11) break;
        selectedIds.add(player.id);
      }
    }

    this.squadSelection = selectedIds;
    this.lineupReplacementId = null;
    this.updateLineupWorkspace();
  }

  // Limpiar selección
  clearLineup() {
    this.squadSelection = new Set();
    this.lineupReplacementId = null;
    this.updateLineupWorkspace();
  }

  // Guardar tácticas
  saveTactics() {
    if (!this.gameApp) return;

    const userTeamId = this.gameApp.userTeamId;
    const newTactics = {
      strategy: document.getElementById('tactics-strategy').value,
      mentality: document.getElementById('tactics-mentality').value,
      pressure: document.getElementById('tactics-pressure').value,
      tempo: document.getElementById('tactics-tempo').value,
      width: document.getElementById('tactics-width').value,
      passStyle: document.getElementById('tactics-passStyle').value,
      defensiveLine: document.getElementById('tactics-defensiveLine').value,
      situationalInstruction: document.getElementById('tactics-situational').value
    };

    document.querySelectorAll('.player-role-select').forEach(select => {
      this.gameApp.teamManager.setPlayerRole(userTeamId, select.dataset.playerId, select.value);
    });

    this.gameApp.teamManager.updateTactics(userTeamId, newTactics);
    alert('Tácticas guardadas correctamente');
    this.gameApp.saveGame();
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
