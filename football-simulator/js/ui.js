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
    this.attachEventListeners();
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
      return `
        <article class="save-slot occupied ${activeSlot === save.slot ? 'active' : ''}">
          <div class="save-slot-heading">
            <span>Partida ${save.slot}</span>
            <small>${activeSlot === save.slot ? 'Última usada' : 'Guardada'}</small>
          </div>
          <div class="save-team-name">${save.teamName}</div>
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
          <h1>⚽ Football Simulator</h1>
          <p>Gestor de fútbol simplificado</p>
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
          <div class="team-name">${team.name}</div>
          <div class="team-short">${team.shortName}</div>
          <div class="team-overall">Overall: ${team.overall}</div>
          <div class="team-budget">Budget: $${(team.budget / 1000000).toFixed(1)}M</div>
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
        <div class="navbar-brand">${team.name}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Plantilla</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Próximo Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Estadísticas</button>
          <button class="nav-btn" data-screen="settings">Configuración</button>
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
              <div class="team-name">${isHome ? team.name : opponent.name}</div>
              <span class="vs">vs</span>
              <div class="team-name">${isHome ? opponent.name : team.name}</div>
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
      const highlight = isUserTeam ? ' class="user-team"' : '';
      standingsHtml += `
        <li${highlight}>
          <span class="pos">${standing.teamId === userTeamId ? '👤' : ''} ${standing.teamName}</span>
          <span class="points">${standing.points}pts</span>
        </li>
      `;
    });
    standingsHtml += '</ol></div>';

    content.innerHTML = `
      <div class="dashboard-container">
        <h2>Dashboard</h2>
        
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Tu Equipo</h3>
            <div class="team-info">
              <p><strong>${team.name}</strong></p>
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
    const trainingPlan = team.trainingPlan || { focus: 'balanced', intensity: 'medium' };

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${team.name}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn active" data-screen="squad">Plantilla</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Próximo Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Estadísticas</button>
          <button class="nav-btn" data-screen="settings">Configuración</button>
        </div>
      </nav>
    `;

    const startingXIIds = team.startingXI || [];
    const formationOptions = Object.keys(DATA.FORMATIONS)
      .map(f => `<option value="${f}" ${f === formation ? 'selected' : ''}>${f}</option>`)
      .join('');

    // Tabla de jugadores agrupada por línea
    const lines = {
      goalkeeper: players.filter(p => p.position === 'GK'),
      defense: players.filter(p => ['CB', 'RB', 'LB'].includes(p.position)),
      midfield: players.filter(p => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position)),
      attack: players.filter(p => ['RW', 'LW', 'ST'].includes(p.position))
    };

    const lineLabels = {
      goalkeeper: '🧤 PORTEROS',
      defense: '🛡️ DEFENSAS',
      midfield: '⚽ CENTROCAMPISTAS',
      attack: '⚡ DELANTEROS'
    };

    let playersHtml = '';
    for (const [line, lineLabel] of Object.entries(lineLabels)) {
      const linePlayers = lines[line];
      if (linePlayers.length === 0) continue;

      playersHtml += `<tbody><tr class="line-header"><td colspan="11">${lineLabel}</td></tr>`;

      linePlayers.forEach(player => {
        const availability = this.gameApp.teamManager.getPlayerAvailability(player);
        const isStarter = startingXIIds.includes(player.id) && availability.available;
        playersHtml += `
          <tr class="player-row ${isStarter ? 'starter' : ''} ${availability.available ? '' : 'unavailable'}">
            <td class="player-name">${player.name}${player.id === team.captainId ? ' <strong>(C)</strong>' : ''}</td>
            <td>${player.age}</td>
            <td class="position-badge">${player.position}</td>
            <td class="overall-cell">${player.overall}</td>
            <td class="fitness-cell">${player.fitness}%</td>
            <td class="morale-cell">${player.morale}%</td>
            <td>${player.matchesPlayed}</td>
            <td>${player.goals}</td>
            <td>${player.assists}</td>
            <td><span class="availability-badge ${availability.status}">${availability.reason}</span></td>
            <td><input type="checkbox" class="player-select" data-player-id="${player.id}" ${isStarter ? 'checked' : ''} ${availability.available ? '' : 'disabled'} data-position="${player.position}"></td>
          </tr>
        `;
      });
      playersHtml += '</tbody>';
    }

    content.innerHTML = `
      <div class="squad-container-v2">
        <h2>Plantilla - Alineación</h2>

        <div class="squad-section-v2 development-grid">
          <div>
            <h3>Plan semanal</h3>
            <div class="training-controls">
              <label>Enfoque
                <select id="training-focus" class="form-control">
                  ${[
                    ['recovery', 'Recuperación'], ['balanced', 'Equilibrado'], ['physical', 'Físico'],
                    ['tactical', 'Táctico'], ['technical', 'Técnico']
                  ].map(([value, label]) => `<option value="${value}" ${trainingPlan.focus === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
              </label>
              <label>Intensidad
                <select id="training-intensity" class="form-control">
                  ${[['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']]
                    .map(([value, label]) => `<option value="${value}" ${trainingPlan.intensity === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
              </label>
              <button id="btn-save-training" class="btn btn-primary">Guardar plan</button>
            </div>
            <p class="training-help">Se aplica una vez al completar cada jornada. Una intensidad alta mejora más, pero aumenta fatiga y riesgo.</p>
          </div>
          <div>
            <h3>Parte médico y sanciones</h3>
            <div class="medical-report">
              ${medicalReport.length ? medicalReport.map(item => `
                <div class="medical-item ${item.status}">
                  <strong>${item.player.name}</strong>
                  <span>${item.available ? `${item.player.yellowCardAccumulation} amarilla${item.player.yellowCardAccumulation === 1 ? '' : 's'} acumulada${item.player.yellowCardAccumulation === 1 ? '' : 's'}` : item.reason}</span>
                </div>
              `).join('') : '<p>Todos los jugadores están disponibles.</p>'}
            </div>
          </div>
        </div>
        
        <div class="squad-section-v2">
          <h3>Formación</h3>
          <div class="formation-selector">
            <select id="formation-select" class="form-control">
              ${formationOptions}
            </select>
            <button id="btn-apply-formation" class="btn btn-secondary">Aplicar Formación</button>
          </div>
        </div>

        <div class="squad-section-v2">
          <h3>Vista Previa de Alineación</h3>
          <div class="lineup-preview" id="lineup-preview">
            <p style="text-align: center; color: var(--text-muted);">Selecciona 11 jugadores para ver la alineación</p>
          </div>
        </div>

        <div class="squad-section-v2">
          <h3>Controles</h3>
          <div class="squad-controls-v2">
            <button id="btn-auto-select" class="btn btn-secondary">Auto-seleccionar para esta formación</button>
            <button id="btn-save-lineup" class="btn btn-primary">Guardar Alineación (${Array.from(document.querySelectorAll('.player-select:checked') || []).length}/11)</button>
            <button id="btn-clear-lineup" class="btn btn-secondary">Limpiar Selección</button>
          </div>
          
          <div class="squad-status-v2">
            <div class="status-item">
              <span class="label">Seleccionados:</span>
              <span class="value"><strong id="selected-count">0</strong>/11</span>
            </div>
            <div class="status-item">
              <span class="label">Porteros:</span>
              <span class="value"><strong id="count-gk">0</strong>/1</span>
            </div>
            <div class="status-item">
              <span class="label">Defensas:</span>
              <span class="value"><strong id="count-def">0</strong>/3+</span>
            </div>
            <div class="status-item">
              <span class="label">Mediocampistas:</span>
              <span class="value"><strong id="count-mid">0</strong>/2+</span>
            </div>
            <div class="status-item">
              <span class="label">Delanteros:</span>
              <span class="value"><strong id="count-atk">0</strong>/1+</span>
            </div>
          </div>
        </div>

        <div class="squad-section-v2">
          <h3>Plantilla Completa</h3>
          <div class="squad-controls-v2">
            <select id="sort-by" class="form-control">
              <option value="line">Agrupar por Línea</option>
              <option value="overall">Ordenar por Overall</option>
              <option value="position">Ordenar por Posición</option>
              <option value="age">Ordenar por Edad</option>
              <option value="fitness">Ordenar por Fitness</option>
              <option value="morale">Ordenar por Moral</option>
            </select>
          </div>

          <div class="table-scroll" role="region" aria-label="Plantilla completa" tabindex="0">
          <table class="squad-table-v2">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Edad</th>
                <th>Pos</th>
                <th>Overall</th>
                <th>Fitness</th>
                <th>Moral</th>
                <th>PJ</th>
                <th>G</th>
                <th>A</th>
                <th>Estado</th>
                <th>✓</th>
              </tr>
            </thead>
            ${playersHtml}
          </table>
          </div>
        </div>
      </div>
    `;

    this.currentScreen = 'squad';
    this.attachSquadListenersV2();
  }

  // Mostrar pantalla de tácticas
  showTactics() {
    const userTeamId = this.gameApp.userTeamId;
    const team = this.gameApp.teamManager.getTeam(userTeamId);
    const tactics = team.tactics;
    const strategies = Object.keys(DATA.TACTICAL_STRATEGIES);

    const navBar = document.getElementById('navigation');
    const content = document.getElementById('main-content');

    navBar.innerHTML = `
      <nav class="navbar">
        <div class="navbar-brand">${team.name}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Plantilla</button>
          <button class="nav-btn active" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Próximo Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Estadísticas</button>
          <button class="nav-btn" data-screen="settings">Configuración</button>
        </div>
      </nav>
    `;

    content.innerHTML = `
      <div class="tactics-container">
        <h2>Configuración Táctica</h2>

        <div class="formation-info">
          <h4>Identidad natural: ${team.naturalStrategy}</h4>
          <p>La plantilla parte con este estilo. Puedes cambiarlo, pero una estrategia menos adecuada reduce la adaptación del equipo.</p>
          <label>Estrategia activa</label>
          <select id="tactics-strategy" class="form-control">
            ${strategies.map(strategy => `<option value="${strategy}" ${team.strategy === strategy ? 'selected' : ''}>${strategy}${strategy === team.naturalStrategy ? ' · natural' : ''}</option>`).join('')}
          </select>
          <small>Adaptación actual: ${team.tacticalFamiliarity || 100}%</small>
        </div>

        <div class="tactics-grid">
          <div class="tactic-option">
            <label>Mentalidad</label>
            <select id="tactics-mentality" class="form-control">
              <option value="Muy Defensiva" ${tactics.mentality === 'Muy Defensiva' ? 'selected' : ''}>Muy Defensiva</option>
              <option value="Defensiva" ${tactics.mentality === 'Defensiva' ? 'selected' : ''}>Defensiva</option>
              <option value="Equilibrada" ${tactics.mentality === 'Equilibrada' ? 'selected' : ''}>Equilibrada</option>
              <option value="Ofensiva" ${tactics.mentality === 'Ofensiva' ? 'selected' : ''}>Ofensiva</option>
              <option value="Muy Ofensiva" ${tactics.mentality === 'Muy Ofensiva' ? 'selected' : ''}>Muy Ofensiva</option>
            </select>
          </div>

          <div class="tactic-option">
            <label>Presión</label>
            <select id="tactics-pressure" class="form-control">
              <option value="Baja" ${tactics.pressure === 'Baja' ? 'selected' : ''}>Baja</option>
              <option value="Media" ${tactics.pressure === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Alta" ${tactics.pressure === 'Alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>

          <div class="tactic-option">
            <label>Ritmo</label>
            <select id="tactics-tempo" class="form-control">
              <option value="Bajo" ${tactics.tempo === 'Bajo' ? 'selected' : ''}>Bajo</option>
              <option value="Medio" ${tactics.tempo === 'Medio' ? 'selected' : ''}>Medio</option>
              <option value="Alto" ${tactics.tempo === 'Alto' ? 'selected' : ''}>Alto</option>
            </select>
          </div>

          <div class="tactic-option">
            <label>Anchura</label>
            <select id="tactics-width" class="form-control">
              <option value="Estrecha" ${tactics.width === 'Estrecha' ? 'selected' : ''}>Estrecha</option>
              <option value="Equilibrada" ${tactics.width === 'Equilibrada' ? 'selected' : ''}>Equilibrada</option>
              <option value="Amplia" ${tactics.width === 'Amplia' ? 'selected' : ''}>Amplia</option>
            </select>
          </div>

          <div class="tactic-option">
            <label>Estilo de Pase</label>
            <select id="tactics-passStyle" class="form-control">
              <option value="Corto" ${tactics.passStyle === 'Corto' ? 'selected' : ''}>Corto</option>
              <option value="Mixto" ${tactics.passStyle === 'Mixto' ? 'selected' : ''}>Mixto</option>
              <option value="Directo" ${tactics.passStyle === 'Directo' ? 'selected' : ''}>Directo</option>
            </select>
          </div>

          <div class="tactic-option">
            <label>Línea Defensiva</label>
            <select id="tactics-defensiveLine" class="form-control">
              <option value="Baja" ${tactics.defensiveLine === 'Baja' ? 'selected' : ''}>Baja</option>
              <option value="Media" ${tactics.defensiveLine === 'Media' ? 'selected' : ''}>Media</option>
              <option value="Alta" ${tactics.defensiveLine === 'Alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>
        </div>

        <button id="btn-save-tactics" class="btn btn-primary">Guardar Tácticas</button>
      </div>
    `;

    this.currentScreen = 'tactics';
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
        <div class="navbar-brand">${team.name}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Plantilla</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Próximo Partido</button>
          <button class="nav-btn active" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Estadísticas</button>
          <button class="nav-btn" data-screen="settings">Configuración</button>
        </div>
      </nav>
    `;

    let standingsHtml = '';
    standings.forEach((standing, index) => {
      const isUserTeam = standing.teamId === userTeamId ? 'user-team' : '';
      standingsHtml += `
        <tr class="${isUserTeam}">
          <td class="pos">${index + 1}</td>
          <td class="team">${standing.teamName}</td>
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
          <span class="fixture-team home">${home.name}</span>
          <strong class="fixture-score">${score}</strong>
          <span class="fixture-team">${away.name}</span>
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
        <div class="navbar-brand">${team.name}</div>
        <div class="navbar-menu">
          <button class="nav-btn" data-screen="dashboard">Inicio</button>
          <button class="nav-btn" data-screen="squad">Plantilla</button>
          <button class="nav-btn" data-screen="tactics">Tácticas</button>
          <button class="nav-btn" data-screen="next-match">Próximo Partido</button>
          <button class="nav-btn" data-screen="league">Liga</button>
          <button class="nav-btn" data-screen="stats">Estadísticas</button>
          <button class="nav-btn active" data-screen="settings">Configuración</button>
        </div>
      </nav>
    `;

    content.innerHTML = `
      <div class="settings-container">
        <h2>Configuración</h2>
        
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
          <p>Football Simulator v1.2</p>
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
    const checkboxes = document.querySelectorAll('.player-select');
    const selectedIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.getAttribute('data-player-id'));

    const validation = this.gameApp.teamManager.validateLineup(userTeamId, selectedIds);

    if (!validation.valid) {
      alert('Error: ' + validation.error);
      return;
    }

    if (this.gameApp.teamManager.setStartingXI(userTeamId, selectedIds).valid) {
      this.showSuccess('✓ Alineación guardada correctamente');
      this.gameApp.saveGame();
      
      // Actualizar preview
      setTimeout(() => {
        this.updateLineupPreview();
      }, 100);
    } else {
      alert('Error al guardar la alineación');
    }
  }

  // Agregar listeners de plantilla (mejorado para Fase 2)
  attachSquadListenersV2() {
    const checkboxes = document.querySelectorAll('.player-select');
    
    // Listener para cada checkbox
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        this.updateSquadStatus();
        this.updateLineupPreview();
        this.updateSaveButtonStatus();
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

    // Selector de formación
    const formationSelect = document.getElementById('formation-select');
    if (formationSelect) {
      formationSelect.addEventListener('change', () => {
        const newFormation = formationSelect.value;
        if (this.gameApp) {
          this.gameApp.teamManager.setFormation(this.gameApp.userTeamId, newFormation);
          this.gameApp.saveGame();
        }
      });
    }

    // Botón aplicar formación
    const applyFormationBtn = document.getElementById('btn-apply-formation');
    if (applyFormationBtn) {
      applyFormationBtn.addEventListener('click', () => {
        const formation = document.getElementById('formation-select').value;
        if (this.gameApp) {
          this.gameApp.teamManager.setFormation(this.gameApp.userTeamId, formation);
          this.autoSelectLineupForFormation();
        }
      });
    }

    // Ordenar jugadores
    const sortBy = document.getElementById('sort-by');
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        const sortMethod = e.target.value;
        if (sortMethod === 'line') {
          this.showSquad();
        } else {
          this.gameApp.sortAndRefreshSquad(sortMethod);
        }
      });
    }

    const saveTraining = document.getElementById('btn-save-training');
    if (saveTraining) {
      saveTraining.addEventListener('click', () => {
        const focus = document.getElementById('training-focus').value;
        const intensity = document.getElementById('training-intensity').value;
        if (this.gameApp.teamManager.setTrainingPlan(this.gameApp.userTeamId, focus, intensity)) {
          this.gameApp.saveGame();
          this.showSuccess('Plan semanal guardado');
        }
      });
    }

    // Actualizar estado inicial
    this.updateSquadStatus();
    this.updateLineupPreview();
    this.updateSaveButtonStatus();
  }

  // Actualizar estado de la plantilla
  updateSquadStatus() {
    const checkboxes = document.querySelectorAll('.player-select');
    const selected = Array.from(checkboxes).filter(cb => cb.checked);
    
    const gkCount = selected.filter(cb => cb.getAttribute('data-position') === 'GK').length;
    const defCount = selected.filter(cb => {
      const pos = cb.getAttribute('data-position');
      return ['CB', 'RB', 'LB'].includes(pos);
    }).length;
    const midCount = selected.filter(cb => {
      const pos = cb.getAttribute('data-position');
      return ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(pos);
    }).length;
    const atkCount = selected.filter(cb => {
      const pos = cb.getAttribute('data-position');
      return ['RW', 'LW', 'ST'].includes(pos);
    }).length;

    const totalCount = document.getElementById('selected-count');
    if (totalCount) totalCount.textContent = selected.length;

    const gkEl = document.getElementById('count-gk');
    if (gkEl) gkEl.textContent = gkCount;

    const defEl = document.getElementById('count-def');
    if (defEl) defEl.textContent = defCount;

    const midEl = document.getElementById('count-mid');
    if (midEl) midEl.textContent = midCount;

    const atkEl = document.getElementById('count-atk');
    if (atkEl) atkEl.textContent = atkCount;
  }

  // Ver previa de alineación
  updateLineupPreview() {
    const preview = document.getElementById('lineup-preview');
    if (!preview) return;

    const checkboxes = document.querySelectorAll('.player-select:checked');
    const selectedCount = checkboxes.length;

    if (selectedCount !== 11) {
      preview.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Selecciona ${11 - selectedCount} jugador${11 - selectedCount !== 1 ? 'es' : ''} más</p>`;
      return;
    }

    const selectedPlayers = Array.from(checkboxes).map(cb => {
      const row = cb.closest('tr');
      return {
        name: row.querySelector('td:nth-child(1)').textContent,
        position: cb.getAttribute('data-position')
      };
    });

    const lineup = {
      GK: selectedPlayers.filter(p => p.position === 'GK'),
      DEF: selectedPlayers.filter(p => ['CB', 'RB', 'LB'].includes(p.position)),
      MID: selectedPlayers.filter(p => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position)),
      ATK: selectedPlayers.filter(p => ['RW', 'LW', 'ST'].includes(p.position))
    };

    let previewHtml = '<div class="lineup-display">';
    
    // GK
    previewHtml += '<div class="lineup-row"><div class="lineup-position">🧤</div>';
    lineup.GK.forEach(p => previewHtml += `<div class="player-badge">${p.name}</div>`);
    previewHtml += '</div>';

    // DEF
    previewHtml += '<div class="lineup-row"><div class="lineup-position">🛡️</div>';
    lineup.DEF.forEach(p => previewHtml += `<div class="player-badge">${p.name}</div>`);
    previewHtml += '</div>';

    // MID
    previewHtml += '<div class="lineup-row"><div class="lineup-position">⚽</div>';
    lineup.MID.forEach(p => previewHtml += `<div class="player-badge">${p.name}</div>`);
    previewHtml += '</div>';

    // ATK
    previewHtml += '<div class="lineup-row"><div class="lineup-position">⚡</div>';
    lineup.ATK.forEach(p => previewHtml += `<div class="player-badge">${p.name}</div>`);
    previewHtml += '</div>';

    previewHtml += '</div>';
    preview.innerHTML = previewHtml;
  }

  // Actualizar estado del botón guardar
  updateSaveButtonStatus() {
    const saveBtn = document.getElementById('btn-save-lineup');
    if (!saveBtn) return;

    const checkboxes = document.querySelectorAll('.player-select');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    saveBtn.textContent = `Guardar Alineación (${selected}/11)`;
    saveBtn.disabled = selected !== 11;
    
    if (selected !== 11) {
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    } else {
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    }
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

    // Marcar checkboxes
    const checkboxes = document.querySelectorAll('.player-select');
    checkboxes.forEach(cb => {
      const playerId = cb.getAttribute('data-player-id');
      cb.checked = selectedIds.has(playerId);
    });

    this.updateSquadStatus();
    this.updateLineupPreview();
    this.updateSaveButtonStatus();
  }

  // Limpiar selección
  clearLineup() {
    const checkboxes = document.querySelectorAll('.player-select');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });

    this.updateSquadStatus();
    this.updateLineupPreview();
    this.updateSaveButtonStatus();
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
      defensiveLine: document.getElementById('tactics-defensiveLine').value
    };

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
