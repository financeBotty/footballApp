// ============================================
// RETRATOS GENERATIVOS DE PENSADORES
// Cada jugador conserva un SVG propio y determinista según su id y tradición.
// ============================================

const ThinkerPortraits = (() => {
  const SKINS = [
    ['#f0c79a', '#c98f63'],
    ['#dca779', '#a96f4c'],
    ['#c88d62', '#8d573d'],
    ['#f1d0ad', '#c79a76']
  ];
  const HAIRS = ['#30261f', '#69513a', '#a47e50', '#d9d0b9', '#17181d'];

  function hash(value) {
    return [...String(value)].reduce((total, character) =>
      ((total << 5) - total + character.charCodeAt(0)) | 0, 17) >>> 0;
  }

  function playerIndex(player) {
    const match = String(player?.id || '').match(/(\d+)$/);
    return match ? Math.max(0, Number(match[1]) - 1) : 0;
  }

  function getEra(team, player) {
    const index = playerIndex(player);
    if (['club-atletico', 'sport-juvenil'].includes(team.id)) {
      return { id: 'classical', label: 'Antigüedad clásica' };
    }
    if (team.id === 'noble-lions') {
      return { id: 'renaissance', label: 'Renacimiento · siglos XV–XVI' };
    }
    if (team.id === 'real-victoria') {
      return { id: 'enlightenment', label: 'Racionalismo · siglos XVII–XVIII' };
    }
    if (team.id === 'phoenix-power') {
      return index >= 14
        ? { id: 'modern', label: 'Filosofía contemporánea · siglo XX' }
        : { id: 'enlightenment', label: 'Empirismo · siglos XVII–XIX' };
    }
    if (team.id === 'dynamo-central') {
      return { id: 'modern', label: 'Existencialismo · siglos XIX–XX' };
    }
    if (team.id === 'titan-forces') {
      return index < 2
        ? { id: 'classical', label: 'Antigüedad clásica' }
        : { id: 'industrial', label: 'Pensamiento social · siglos XIX–XX' };
    }
    if (team.id === 'elite-united') {
      return index < 8
        ? { id: 'classical', label: 'Tradición clásica y medieval' }
        : { id: 'academic', label: 'Idealismo · siglos XVIII–XX' };
    }
    return { id: 'academic', label: 'Tradición filosófica' };
  }

  function hairMarkup(era, hair, shadow, variant) {
    if (era === 'classical') {
      return `<g fill="${hair}">
        <rect x="16" y="8" width="8" height="8"/><rect x="24" y="4" width="8" height="8"/>
        <rect x="36" y="4" width="8" height="8"/><rect x="44" y="8" width="8" height="8"/>
        <rect x="12" y="16" width="8" height="8"/><rect x="44" y="16" width="8" height="8"/>
        <rect x="16" y="28" width="4" height="8"/><rect x="44" y="28" width="4" height="8"/>
      </g>`;
    }
    if (era === 'renaissance') {
      return `<path fill="${hair}" d="M16 8h32v4h8v8H8v-8h8z"/>
        <rect x="${variant ? 12 : 44}" y="4" width="8" height="8" fill="#c9a227"/>
        <rect x="16" y="20" width="6" height="16" fill="${hair}"/><rect x="42" y="20" width="6" height="16" fill="${hair}"/>`;
    }
    if (era === 'enlightenment') {
      return `<g fill="#e5dfcf">
        <rect x="16" y="8" width="32" height="8"/><rect x="12" y="16" width="12" height="12"/>
        <rect x="40" y="16" width="12" height="12"/><rect x="12" y="28" width="8" height="12"/>
        <rect x="44" y="28" width="8" height="12"/>
      </g><g fill="${shadow}"><rect x="16" y="12" width="8" height="4"/><rect x="40" y="12" width="8" height="4"/></g>`;
    }
    if (era === 'industrial') {
      return `<path fill="${hair}" d="M16 8h28v4h8v12h-8v-8H20v8h-8V12h4z"/>
        <rect x="16" y="24" width="5" height="16" fill="${hair}"/><rect x="43" y="24" width="5" height="16" fill="${hair}"/>`;
    }
    if (era === 'modern') {
      return `<path fill="${hair}" d="${variant
        ? 'M12 12h8V8h28v4h4v12h-8v-8H20v8h-8z'
        : 'M16 8h32v4h4v12h-8v-8H16v12h-4V12h4z'}"/>`;
    }
    return `<path fill="${hair}" d="M16 8h32v4h4v12h-8v-8H20v8h-8V12h4z"/>
      <rect x="12" y="20" width="6" height="16" fill="${hair}"/><rect x="46" y="20" width="6" height="16" fill="${hair}"/>`;
  }

  function beardMarkup(era, hair, shadow, hasBeard, variant) {
    if (!hasBeard) {
      return `<rect x="28" y="40" width="8" height="3" fill="${shadow}"/>`;
    }
    const longBeard = ['classical', 'industrial', 'academic'].includes(era);
    return `<path fill="${hair}" d="${longBeard
      ? 'M16 32h8v4h4v4h8v-4h4v-4h8v12h-4v8h-8v8h-8v-4h-8v-8h-4z'
      : 'M20 36h8v4h8v-4h8v8h-4v8H24v-4h-4z'}"/>
      <g fill="${shadow}">
        <rect x="${variant ? 20 : 36}" y="40" width="8" height="4"/>
        ${longBeard ? '<rect x="28" y="52" width="8" height="4"/>' : ''}
      </g>`;
  }

  function clothingMarkup(era, primary, secondary) {
    if (era === 'classical') {
      return `<path fill="#e8e0cf" d="M8 52h16v4h16v-4h16v4h4v8H4v-8h4z"/>
        <path fill="${primary}" d="M8 56h16v4h16v-4h12v8H8z"/><rect x="28" y="56" width="8" height="8" fill="${secondary}"/>`;
    }
    if (era === 'renaissance') {
      return `<path fill="${primary}" d="M8 52h16v4h16v-4h16v4h4v8H4v-8h4z"/>
        <rect x="24" y="52" width="16" height="8" fill="#efe4cb"/><rect x="28" y="56" width="8" height="8" fill="${secondary}"/>`;
    }
    return `<path fill="${primary}" d="M8 52h16v4h16v-4h16v4h4v8H4v-8h4z"/>
      <path fill="#f2ede1" d="M24 52h16l-4 8h-8z"/>
      <rect x="30" y="56" width="4" height="8" fill="${era === 'modern' ? '#111827' : secondary}"/>`;
  }

  function render(team, player, className = 'thinker-portrait') {
    const seed = hash(`${team.id}:${player.id}:${player.name}`);
    const era = getEra(team, player);
    const [skin, skinShadow] = SKINS[seed % SKINS.length];
    const hair = HAIRS[(seed >>> 3) % HAIRS.length];
    const hairShadow = HAIRS[(seed >>> 7) % HAIRS.length];
    const variant = Boolean(seed & 1);
    const hasBeard = era.id === 'classical' || era.id === 'industrial' || seed % 4 !== 0;
    const glasses = ['modern', 'academic'].includes(era.id) && seed % 3 !== 0;
    const primary = team.primaryColor || '#1d64c8';
    const secondary = team.alternateColor || '#facc15';
    const eyebrowY = variant ? 21 : 20;
    const title = `Retrato inventado de ${player.name} · ${era.label}`;

    return `<svg class="${className}" viewBox="0 0 64 64" shape-rendering="crispEdges" role="img" aria-label="${title}">
      <rect width="64" height="64" fill="#08162b"/>
      <path fill="${primary}" opacity=".42" d="M0 0h20v4h20v4h24v8H48v4H24v-4H0z"/>
      <rect x="4" y="4" width="56" height="56" fill="none" stroke="${secondary}" stroke-width="2"/>
      ${clothingMarkup(era.id, primary, secondary)}
      <rect x="26" y="44" width="12" height="12" fill="${skinShadow}"/>
      <path fill="${skin}" d="M20 16h24v4h4v16h-4v8h-8v4h-8v-4h-8v-8h-4V20h4z"/>
      <rect x="12" y="24" width="4" height="8" fill="${skinShadow}"/>
      <rect x="48" y="24" width="4" height="8" fill="${skinShadow}"/>
      ${hairMarkup(era.id, hair, hairShadow, variant)}
      <rect x="20" y="${eyebrowY}" width="8" height="3" fill="${hairShadow}"/>
      <rect x="36" y="${eyebrowY}" width="8" height="3" fill="${hairShadow}"/>
      <rect x="24" y="25" width="4" height="4" fill="#07162c"/>
      <rect x="36" y="25" width="4" height="4" fill="#07162c"/>
      ${glasses ? '<path fill="none" stroke="#60a5fa" stroke-width="2" d="M20 23h10v8H20zm14 0h10v8H34zm-4 3h4"/>' : ''}
      <path fill="${skinShadow}" d="M30 25h4v8h4v4h-8z"/>
      <rect x="28" y="37" width="8" height="3" fill="#844a3e"/>
      ${beardMarkup(era.id, hair, hairShadow, hasBeard, variant)}
    </svg>`;
  }

  return { render, getEra };
})();
