// ============================================
// ALMACENAMIENTO - LOCAL STORAGE
// ============================================

const STORAGE_KEYS = {
  GAME_STATE: 'fs_gameState',
  USER_TEAM: 'fs_userTeam',
  TEAMS: 'fs_teams',
  LEAGUE_STATE: 'fs_leagueState',
  CURRENT_MATCH: 'fs_currentMatch'
};

class GameStorage {
  static get MAX_SLOTS() { return 3; }

  static isPersistentStorageAvailable() {
    if (typeof this._persistentAvailable === 'boolean') return this._persistentAvailable;
    try {
      const key = 'fs_storage_test';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      this._persistentAvailable = true;
      this._persistentWritable = true;
    } catch (error) {
      this._persistentAvailable = false;
      this._memoryStorage = this._memoryStorage || {};
    }
    return this._persistentAvailable;
  }

  static isPersistentStorageWritable() {
    return this.isPersistentStorageAvailable() && this._persistentWritable !== false;
  }

  static rawGet(key) {
    this._memoryStorage = this._memoryStorage || {};
    if (Object.prototype.hasOwnProperty.call(this._memoryStorage, key)) return this._memoryStorage[key];
    if (this.isPersistentStorageAvailable()) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        this._persistentAvailable = false;
        this._memoryStorage = this._memoryStorage || {};
      }
    }
    return Object.prototype.hasOwnProperty.call(this._memoryStorage, key) ? this._memoryStorage[key] : null;
  }

  static rawSet(key, value) {
    this._memoryStorage = this._memoryStorage || {};
    if (this.isPersistentStorageAvailable() && this._persistentWritable !== false) {
      try {
        localStorage.setItem(key, String(value));
        return;
      } catch (error) {
        this._persistentWritable = false;
      }
    }
    this._memoryStorage[key] = String(value);
  }

  static rawRemove(key) {
    this._memoryStorage = this._memoryStorage || {};
    delete this._memoryStorage[key];
    if (this.isPersistentStorageAvailable()) {
      try {
        localStorage.removeItem(key);
        return;
      } catch (error) {
        this._persistentAvailable = false;
      }
    }
  }

  static getSetting(name, fallback = null) {
    const value = this.rawGet(`fs_setting_${name}`) ?? this.rawGet(`fs_${name}`);
    return value === null ? fallback : value;
  }

  static setSetting(name, value) {
    this.rawSet(`fs_setting_${name}`, value);
  }

  static initialize() {
    this.migrateLegacySave();
  }

  static normalizeSlot(slot) {
    const value = Number(slot);
    return Number.isInteger(value) && value >= 1 && value <= this.MAX_SLOTS ? value : null;
  }

  static getActiveSlot() {
    return this.normalizeSlot(this.rawGet('fs_activeSlot'));
  }

  static setActiveSlot(slot) {
    const validSlot = this.normalizeSlot(slot);
    if (!validSlot) return false;
    this.rawSet('fs_activeSlot', String(validSlot));
    return true;
  }

  static slotKey(key, slot = this.getActiveSlot()) {
    const validSlot = this.normalizeSlot(slot);
    return validSlot ? `fs_slot_${validSlot}_${key.replace(/^fs_/, '')}` : null;
  }

  static read(key, slot = this.getActiveSlot()) {
    const scopedKey = this.slotKey(key, slot);
    return scopedKey ? this.rawGet(scopedKey) : null;
  }

  static write(key, value, slot = this.getActiveSlot()) {
    const scopedKey = this.slotKey(key, slot);
    if (!scopedKey) throw new Error('No hay una ranura de guardado activa');
    this.rawSet(scopedKey, value);
  }

  static migrateLegacySave() {
    try {
      const legacyState = this.rawGet(STORAGE_KEYS.GAME_STATE);
      const hasSlots = Array.from({ length: this.MAX_SLOTS }, (_, index) => index + 1)
        .some(slot => !!this.read(STORAGE_KEYS.GAME_STATE, slot));
      if (!legacyState || hasSlots) return false;
      Object.values(STORAGE_KEYS).forEach(key => {
        const value = this.rawGet(key);
        if (value !== null) this.write(key, value, 1);
      });
      this.setActiveSlot(1);
      return true;
    } catch (error) {
      console.error('Error migrando la partida anterior:', error);
      return false;
    }
  }

  static getSlotSummary(slot) {
    const validSlot = this.normalizeSlot(slot);
    if (!validSlot) return null;
    try {
      const rawState = this.read(STORAGE_KEYS.GAME_STATE, validSlot);
      if (!rawState) return { slot: validSlot, occupied: false };
      const gameState = JSON.parse(rawState);
      const teams = typeof gameState.teams === 'string' ? JSON.parse(gameState.teams) : gameState.teams;
      const league = typeof gameState.leagueState === 'string' ? JSON.parse(gameState.leagueState) : gameState.leagueState;
      const team = Array.isArray(teams) ? teams.find(item => item.id === gameState.userTeamId) : null;
      const currentMatch = this.read(STORAGE_KEYS.CURRENT_MATCH, validSlot);
      return {
        slot: validSlot,
        occupied: true,
        teamId: gameState.userTeamId,
        teamName: team ? team.name : 'Equipo desconocido',
        teamShortName: team ? team.shortName : '',
        matchday: league && Number(league.currentMatchday) ? Number(league.currentMatchday) : 1,
        totalMatchdays: league && Number(league.totalMatchdays) ? Number(league.totalMatchdays) : 14,
        lastSaved: gameState.lastSaved || gameState.created || null,
        matchInProgress: !!(currentMatch && currentMatch !== 'null' && JSON.parse(currentMatch))
      };
    } catch (error) {
      console.error(`Error leyendo la ranura ${validSlot}:`, error);
      return { slot: validSlot, occupied: true, corrupted: true };
    }
  }

  static getSlotSummaries() {
    return Array.from({ length: this.MAX_SLOTS }, (_, index) => this.getSlotSummary(index + 1));
  }

  static exportSlot(slot = this.getActiveSlot()) {
    const validSlot = this.normalizeSlot(slot);
    if (!validSlot || !this.hasSavedGame(validSlot)) return null;
    const values = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      values[name] = this.read(key, validSlot);
    });
    return {
      format: 'football-simulator-save',
      version: 2,
      exportedAt: new Date().toISOString(),
      sourceSlot: validSlot,
      values
    };
  }

  static exportAllSlots() {
    return {
      format: 'football-simulator-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      slots: Array.from({ length: this.MAX_SLOTS }, (_, index) => this.exportSlot(index + 1))
        .filter(Boolean)
    };
  }

  static validateImport(data) {
    if (!data || !['football-simulator-save', 'football-simulator-backup'].includes(data.format)) {
      return { valid: false, error: 'El archivo no es un backup de Football Simulator' };
    }
    const saves = data.format === 'football-simulator-save' ? [data] : data.slots;
    if (!Array.isArray(saves) || !saves.length) return { valid: false, error: 'El backup no contiene partidas' };
    const invalid = saves.some(save => {
      if (!save || !save.values || typeof save.values.GAME_STATE !== 'string') return true;
      try {
        const state = JSON.parse(save.values.GAME_STATE);
        return !state.userTeamId || !state.teams || !state.leagueState;
      } catch (error) {
        return true;
      }
    });
    return invalid ? { valid: false, error: 'El backup contiene una partida dañada' } : { valid: true, saves };
  }

  static importIntoSlot(data, targetSlot) {
    const validation = this.validateImport(data);
    const validSlot = this.normalizeSlot(targetSlot);
    if (!validation.valid || !validSlot) return { valid: false, error: validation.error || 'Ranura no válida' };
    const save = validation.saves[0];
    try {
      this.deleteSavedGame(validSlot);
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const value = save.values[name];
        if (value !== null && value !== undefined) this.write(key, value, validSlot);
      });
      return { valid: true };
    } catch (error) {
      console.error('Error importando la partida:', error);
      return { valid: false, error: 'No se pudo escribir la partida en el navegador' };
    }
  }

  static importBackup(data) {
    const validation = this.validateImport(data);
    if (!validation.valid) return validation;
    if (data.format === 'football-simulator-save') {
      return this.importIntoSlot(data, this.normalizeSlot(data.sourceSlot) || 1);
    }
    try {
      Array.from({ length: this.MAX_SLOTS }, (_, index) => index + 1)
        .forEach(slot => this.deleteSavedGame(slot));
      validation.saves.forEach((save, index) => {
        const slot = this.normalizeSlot(save.sourceSlot) || (index + 1);
        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
          const value = save.values[name];
          if (value !== null && value !== undefined) this.write(key, value, slot);
        });
      });
      return { valid: true };
    } catch (error) {
      console.error('Error restaurando el backup:', error);
      return { valid: false, error: 'No se pudo restaurar el backup completo' };
    }
  }

  // Guardar el estado completo del juego
  static saveGameState(gameState) {
    try {
      this.write(STORAGE_KEYS.GAME_STATE, JSON.stringify(gameState));
      return true;
    } catch (error) {
      console.error('Error guardando estado del juego:', error);
      return false;
    }
  }

  // Cargar el estado del juego
  static loadGameState() {
    try {
      const data = this.read(STORAGE_KEYS.GAME_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando estado del juego:', error);
      return null;
    }
  }

  // Guardar equipo seleccionado
  static saveUserTeam(teamId) {
    try {
      this.write(STORAGE_KEYS.USER_TEAM, teamId);
      return true;
    } catch (error) {
      console.error('Error guardando equipo:', error);
      return false;
    }
  }

  // Cargar equipo del usuario
  static loadUserTeam() {
    return this.read(STORAGE_KEYS.USER_TEAM);
  }

  // Guardar datos de todos los equipos
  static saveTeams(teams) {
    try {
      this.write(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      return true;
    } catch (error) {
      console.error('Error guardando equipos:', error);
      return false;
    }
  }

  // Cargar datos de equipos
  static loadTeams() {
    try {
      const data = this.read(STORAGE_KEYS.TEAMS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando equipos:', error);
      return null;
    }
  }

  // Guardar estado de la liga
  static saveLeagueState(leagueState) {
    try {
      this.write(STORAGE_KEYS.LEAGUE_STATE, JSON.stringify(leagueState));
      return true;
    } catch (error) {
      console.error('Error guardando estado de liga:', error);
      return false;
    }
  }

  // Cargar estado de la liga
  static loadLeagueState() {
    try {
      const data = this.read(STORAGE_KEYS.LEAGUE_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando estado de liga:', error);
      return null;
    }
  }

  // Guardar partido actual en progreso
  static saveCurrentMatch(matchData) {
    try {
      this.write(STORAGE_KEYS.CURRENT_MATCH, JSON.stringify(matchData));
      return true;
    } catch (error) {
      console.error('Error guardando partido actual:', error);
      return false;
    }
  }

  // Cargar partido actual
  static loadCurrentMatch() {
    try {
      const data = this.read(STORAGE_KEYS.CURRENT_MATCH);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error cargando partido actual:', error);
      return null;
    }
  }

  // Verificar si existe partida guardada
  static hasSavedGame(slot = this.getActiveSlot()) {
    return !!this.read(STORAGE_KEYS.GAME_STATE, slot);
  }

  // Limpiar una ranura sin afectar a las demás
  static deleteSavedGame(slot = this.getActiveSlot()) {
    try {
      const validSlot = this.normalizeSlot(slot);
      if (!validSlot) return false;
      Object.values(STORAGE_KEYS).forEach(key => this.rawRemove(this.slotKey(key, validSlot)));
      if (this.getActiveSlot() === validSlot) this.rawRemove('fs_activeSlot');
      return true;
    } catch (error) {
      console.error('Error borrando partida guardada:', error);
      return false;
    }
  }

}

// Exportar para uso en navegador
if (typeof module === 'undefined') {
  window.GameStorage = GameStorage;
}
