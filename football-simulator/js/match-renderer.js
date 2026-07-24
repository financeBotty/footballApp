// ============================================
// FASE 7 - RENDERIZADOR TÁCTICO CANVAS 2D
// ============================================

class MatchRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.ctx = canvas.getContext('2d');
    this.frameId = null;
    this.resizeObserver = null;
    this.monochrome = document.body.classList.contains('theme-minimal-bw');
    this.colors = {
      home: this.monochrome ? '#ffffff' : (engine.state?.teams?.home?.kitColor || '#0ea5e9'),
      away: this.monochrome ? '#050505' : (engine.state?.teams?.away?.kitColor || '#f43f5e'),
      referee: this.monochrome ? '#8a8a8a' : '#050505'
    };
    this.visualPlayers = {};
    this.visualBall = null;
    this.visualReferee = null;
    this.previousBallState = null;
    this.previousBallOwnerId = null;
    this.previousPhase = null;
    this.playbackSpeed = 1;
    this.logicStep = 0.05;
    this.lastFrameTime = null;
    this.start();
  }

  start() {
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }
    const draw = timestamp => {
      const deltaMs = this.lastFrameTime === null ? 16.7 : Math.min(80, Math.max(4, timestamp - this.lastFrameTime));
      this.lastFrameTime = timestamp;
      this.render(this.engine.getVisualSnapshot(), deltaMs);
      this.frameId = requestAnimationFrame(draw);
    };
    this.frameId = requestAnimationFrame(draw);
  }

  stop() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.frameId = null;
    this.lastFrameTime = null;
  }

  setPlaybackSpeed(speed, logicStep = this.logicStep) {
    this.playbackSpeed = [1, 3, 5].includes(Number(speed)) ? Number(speed) : 1;
    this.logicStep = Number(logicStep) > 0 ? Number(logicStep) : 0.05;
  }

  interpolationAlpha(deltaMs, smoothingRatio = 0.65) {
    const timing = this.engine.getPlaybackTiming(this.playbackSpeed, this.logicStep);
    const visibleTickMs = timing.tickDelayMs;
    const smoothingMs = Math.max(18, visibleTickMs * smoothingRatio);
    return 1 - Math.exp(-deltaMs / smoothingMs);
  }

  controlledBallPosition(snapshot) {
    if (snapshot.ball.state !== 'controlled' || !snapshot.ball.ownerId) return null;
    const owner = snapshot.players.find(player => player.id === snapshot.ball.ownerId);
    const visualOwner = owner ? this.visualPlayers[owner.id] : null;
    if (!owner || !visualOwner) return null;
    return {
      x: Math.max(2, Math.min(98, visualOwner.x + (owner.side === 'home' ? 0.8 : -0.8))),
      y: Math.max(2, Math.min(66, visualOwner.y))
    };
  }

  moveVisualTowards(current, target, alpha, maxStep) {
    const dx = target.x - current.x;
    const dy = target.y - current.y;
    const distance = Math.hypot(dx, dy);
    if (!distance) return { x: target.x, y: target.y };
    const factor = Math.min(alpha, maxStep / distance, 1);
    return {
      x: current.x + dx * factor,
      y: current.y + dy * factor
    };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(320, rect.width || 900);
    const fitToViewport = getComputedStyle(this.canvas).getPropertyValue('--match-canvas-fit').trim() === '1';
    const height = Math.max(210, fitToViewport && rect.height ? rect.height : width * 0.6);
    if (fitToViewport) this.canvas.style.removeProperty('height');
    else this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = width;
    this.height = height;
  }

  point(x, y) {
    const paddingX = 16;
    const paddingTop = 14;
    const paddingBottom = 54;
    return {
      x: paddingX + (x / 100) * (this.width - paddingX * 2),
      y: paddingTop + (y / 68) * (this.height - paddingTop - paddingBottom)
    };
  }

  render(snapshot, deltaMs = 16.7) {
    if (!this.ctx || !this.width) return;
    const snapshotAlpha = this.interpolationAlpha(deltaMs);
    const frameRatio = Math.max(.25, Math.min(4, deltaMs / 16.7));
    // El motor puede resolver más de una acción entre dos frames a 3×/5×.
    // Limitar el recorrido visual por frame evita que un cambio de dueño, un
    // saque o una recolocación táctica se conviertan en un teletransporte.
    const playerMaxStep = (.8 + this.playbackSpeed * .22) * frameRatio;
    const ballMaxStep = (snapshot.ball.state === 'controlled'
      ? 1.8 + this.playbackSpeed * .35
      : 2.4 + this.playbackSpeed * .4) * frameRatio;
    const treatedPlayerId = snapshot.animations.medical ? snapshot.animations.medical.playerId : null;
    const activePlayerIds = new Set(snapshot.players.map(player => player.id));
    Object.keys(this.visualPlayers).forEach(id => {
      if (!activePlayerIds.has(id)) delete this.visualPlayers[id];
    });
    const renderedPlayers = snapshot.players.filter(player => player.id !== treatedPlayerId).map(player => {
      const visual = this.visualPlayers[player.id] || { x: player.x, y: player.y };
      const next = this.moveVisualTowards(visual, player, snapshotAlpha, playerMaxStep);
      visual.x = next.x;
      visual.y = next.y;
      this.visualPlayers[player.id] = visual;
      return { ...player, x: visual.x, y: visual.y };
    });
    this.visualBall = this.visualBall || { x: snapshot.ball.x, y: snapshot.ball.y, height: Number(snapshot.ball.height) || 0 };
    const controlledPosition = this.controlledBallPosition(snapshot);
    if (controlledPosition) {
      // Mientras está controlado, jugador y balón deben pertenecer al mismo
      // fotograma visual. Si el motor resolvió un pase entre frames, el límite
      // de recorrido conserva visualmente el trayecto hasta el nuevo dueño.
      const next = this.moveVisualTowards(this.visualBall, controlledPosition, snapshotAlpha, ballMaxStep);
      this.visualBall.x = next.x;
      this.visualBall.y = next.y;
      this.visualBall.height += (0 - this.visualBall.height) * snapshotAlpha;
    } else {
      const next = this.moveVisualTowards(this.visualBall, snapshot.ball, snapshotAlpha, ballMaxStep);
      this.visualBall.x = next.x;
      this.visualBall.y = next.y;
      this.visualBall.height += ((Number(snapshot.ball.height) || 0) - this.visualBall.height) * snapshotAlpha;
    }
    this.visualReferee = this.visualReferee || { x: snapshot.referee.x, y: snapshot.referee.y };
    const refereeNext = this.moveVisualTowards(this.visualReferee, snapshot.referee, snapshotAlpha, playerMaxStep * 1.15);
    this.visualReferee.x = refereeNext.x;
    this.visualReferee.y = refereeNext.y;

    // Todas las capas se dibujan a partir del mismo estado visual interpolado.
    // A velocidades altas un pase entero puede resolverse entre dos frames. Si
    // el balón visual aún está llegando, se conserva como pase y no se pinta
    // posesión anticipada sobre el receptor.
    const renderedBall = { ...snapshot.ball, ...this.visualBall };
    let visualBallOwnerId = snapshot.ball.ownerId;
    if (snapshot.ball.state === 'controlled' && snapshot.ball.ownerId) {
      const visualOwner = renderedPlayers.find(player => player.id === snapshot.ball.ownerId);
      if (visualOwner) {
        const ownerBallX = Math.max(2, Math.min(98, visualOwner.x + (visualOwner.side === 'home' ? .8 : -.8)));
        const ownerBallY = Math.max(2, Math.min(66, visualOwner.y));
        if (Math.hypot(renderedBall.x - ownerBallX, renderedBall.y - ownerBallY) > 3) {
          renderedBall.state = 'passing';
          renderedBall.passType = 'ground';
          renderedBall.targetX = ownerBallX;
          renderedBall.targetY = ownerBallY;
          visualBallOwnerId = null;
        }
      }
    }
    this.drawPitch();
    this.drawBenches(snapshot.benches, snapshot.animations);
    this.drawDefensiveLines(renderedPlayers);
    if (Number.isFinite(snapshot.ball.offsideLineX)) this.drawOffsideLine(snapshot.ball.offsideLineX);
    if (['passing', 'shooting'].includes(renderedBall.state)) this.drawBallTrajectory(renderedBall);
    renderedPlayers.forEach(player => {
      this.drawPlayer(player, visualBallOwnerId === player.id);
    });
    snapshot.animations.substitutions.forEach(animation => this.drawPlayer(animation.player, false, true));
    if (snapshot.animations.medical) this.drawMedicalAnimation(snapshot.animations.medical);
    snapshot.coaches.forEach(coach => this.drawCoach(coach));
    this.drawReferee(this.visualReferee);
    this.drawBall(renderedBall);
    if (snapshot.phase === 'SET_PIECE') this.drawSetPieceMarker(renderedBall);
    this.previousBallState = snapshot.ball.state;
    this.previousBallOwnerId = snapshot.ball.ownerId;
    this.previousPhase = snapshot.phase;
  }

  drawPitch() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    // Verde plano y franjas discretas: lectura de gestor táctico clásico sin
    // introducir efectos que puedan confundirse con el movimiento del balón.
    ctx.fillStyle = '#14733b';
    ctx.fillRect(0, 0, this.width, this.height);

    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,210,.045)';
        ctx.fillRect((this.width / stripes) * i, 0, this.width / stripes, this.height);
      }
    }

    const p0 = this.point(0, 0);
    const p1 = this.point(100, 68);
    ctx.fillStyle = '#243244';
    ctx.fillRect(0, p1.y + 3, this.width, this.height - p1.y - 3);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    ctx.beginPath();
    const center = this.point(50, 34);
    ctx.moveTo(center.x, p0.y);
    ctx.lineTo(center.x, p1.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center.x, center.y, (this.width - 32) * 0.09, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    this.drawPenaltyArea('home');
    this.drawPenaltyArea('away');
  }

  drawOffsideLine(lineX) {
    const ctx = this.ctx;
    const top = this.point(lineX, 0);
    const bottom = this.point(lineX, 68);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.strokeStyle = 'rgba(250, 204, 21, .9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.restore();
  }

  drawDefensiveLines(players) {
    ['home', 'away'].forEach(side => {
      const defenders = players.filter(player => player.side === side &&
        (player.formationLine === 'def' || (!player.formationLine && ['CB', 'RB', 'LB'].includes(player.position))));
      if (!defenders.length) return;
      const lineX = defenders.reduce((sum, player) => sum + player.x, 0) / defenders.length;
      const top = this.point(lineX, 5);
      const bottom = this.point(lineX, 63);
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.strokeStyle = this.monochrome
        ? (side === 'home' ? 'rgba(255, 255, 255, .72)' : 'rgba(0, 0, 0, .72)')
        : (side === 'home' ? 'rgba(56, 189, 248, .42)' : 'rgba(251, 113, 133, .42)');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 7]);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawBallTrajectory(ball) {
    const from = this.point(ball.x, ball.y);
    const target = this.point(ball.targetX, ball.targetY);
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = ball.state === 'shooting' ? 'rgba(254, 240, 138, .8)' : 'rgba(255, 255, 255, .5)';
    ctx.lineWidth = ball.passType === 'cross' || ball.passType === 'lofted' ? 2 : 1.5;
    ctx.setLineDash(ball.passType === 'cross' || ball.passType === 'lofted' ? [8, 5] : [4, 5]);
    ctx.stroke();
    ctx.restore();
  }

  drawPenaltyArea(side) {
    const ctx = this.ctx;
    const x1 = side === 'home' ? 0 : 84;
    const x2 = side === 'home' ? 16 : 100;
    const smallX1 = side === 'home' ? 0 : 94;
    const smallX2 = side === 'home' ? 6 : 100;
    const a = this.point(x1, 14);
    const b = this.point(x2, 54);
    const c = this.point(smallX1, 25);
    const d = this.point(smallX2, 43);
    ctx.strokeRect(Math.min(a.x, b.x), a.y, Math.abs(b.x - a.x), b.y - a.y);
    ctx.strokeRect(Math.min(c.x, d.x), c.y, Math.abs(d.x - c.x), d.y - c.y);
    const penalty = this.point(side === 'home' ? 11 : 89, 34);
    ctx.beginPath();
    ctx.arc(penalty.x, penalty.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    const goalTop = this.point(side === 'home' ? 0 : 100, 29);
    const goalBottom = this.point(side === 'home' ? 0 : 100, 39);
    const netBackTop = this.point(side === 'home' ? -2 : 102, 29);
    const netBackBottom = this.point(side === 'home' ? -2 : 102, 39);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(goalTop.x, goalTop.y);
    ctx.lineTo(netBackTop.x, netBackTop.y);
    ctx.lineTo(netBackBottom.x, netBackBottom.y);
    ctx.lineTo(goalBottom.x, goalBottom.y);
    ctx.stroke();
    [31.5, 34, 36.5].forEach(y => {
      const front = this.point(side === 'home' ? 0 : 100, y);
      const back = this.point(side === 'home' ? -2 : 102, y);
      ctx.beginPath();
      ctx.moveTo(front.x, front.y);
      ctx.lineTo(back.x, back.y);
      ctx.stroke();
    });
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(goalTop.x, goalTop.y);
    ctx.lineTo(goalBottom.x, goalBottom.y);
    ctx.stroke();
    ctx.lineWidth = 2;
  }

  drawPlayer(player, ownsBall, sideline = false) {
    const ctx = this.ctx;
    const p = this.point(player.x, player.y);
    const radius = this.width < 550 ? 5.5 : 7;
    ctx.save();
    if (player.isPressing || player.isCovering) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = player.isPressing ? 'rgba(250, 204, 21, .9)' : 'rgba(255, 255, 255, .5)';
      ctx.lineWidth = player.isPressing ? 2 : 1.5;
      ctx.setLineDash(player.isCovering ? [3, 3] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (ownsBall) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = !this.monochrome && player.position === 'GK' && player.goalkeeperColor
      ? player.goalkeeperColor
      : this.colors[player.side];
    ctx.fill();
    ctx.strokeStyle = this.monochrome
      ? (player.side === 'home' ? '#050505' : '#ffffff')
      : (player.yellowCards ? '#fde047' : player.redCards ? '#ef4444' : '#0f172a');
    ctx.lineWidth = player.yellowCards || player.redCards ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = this.monochrome && player.side === 'away' ? '#ffffff' : '#07111f';
    ctx.font = `800 ${this.width < 550 ? 6 : 8}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(player.number), p.x, p.y + 0.5);
    if (player.isCaptain) {
      ctx.fillStyle = '#fff';
      ctx.font = `900 ${this.width < 550 ? 6 : 7}px system-ui`;
      ctx.fillText('C', p.x + radius + 2, p.y + radius + 1);
    }
    if (player.injured) {
      ctx.fillStyle = '#fff';
      ctx.font = '700 12px system-ui';
      ctx.fillText('+', p.x + radius, p.y - radius);
    }
    ctx.restore();
  }

  drawBenches(benches = [], animations = { substitutions: [] }) {
    const ctx = this.ctx;
    const pitchBottom = this.point(50, 68).y;
    const walkingOff = new Set(animations.substitutions.map(animation => animation.player.id));
    benches.forEach(bench => {
      const centerX = bench.side === 'home' ? 35 : 65;
      const left = this.point(centerX - 11, 68).x;
      const right = this.point(centerX + 11, 68).x;
      ctx.save();
      ctx.fillStyle = this.monochrome ? '#d6d6d6' : 'rgba(15, 23, 42, .82)';
      ctx.strokeStyle = this.monochrome ? '#111111' : this.colors[bench.side];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(left, pitchBottom + 9, right - left, 28);
      ctx.fill();
      ctx.stroke();
      const visible = bench.players.filter(player => !walkingOff.has(player.id)).slice(0, 9);
      visible.forEach((player, index) => {
        const x = left + 10 + index * ((right - left - 20) / Math.max(1, visible.length - 1));
        const y = pitchBottom + 24;
        const radius = this.width < 550 ? 5.5 : 7;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = !this.monochrome && player.position === 'GK' && player.goalkeeperColor
          ? player.goalkeeperColor
          : this.colors[bench.side];
        ctx.fill();
        ctx.strokeStyle = this.monochrome && bench.side === 'away' ? '#ffffff' : '#111111';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = this.monochrome && bench.side === 'away' ? '#ffffff' : '#111111';
        ctx.font = `800 ${this.width < 550 ? 6 : 8}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(player.number), x, y);
      });
      ctx.restore();
    });
  }

  drawCoach(coach) {
    if (coach.dismissed) return;
    const ctx = this.ctx;
    const p = this.point(coach.x, coach.y);
    const radius = this.width < 550 ? 5.5 : 7;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = this.colors[coach.side];
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 ${this.width < 550 ? 6 : 8}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', p.x, p.y);
    ctx.restore();
  }

  drawMedicalAnimation(animation) {
    this.drawPlayer(animation.player, false, true);
    animation.medics.forEach(medic => {
      const ctx = this.ctx;
      const p = this.point(medic.x, medic.y);
      const radius = this.width < 550 ? 4.5 : 6;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = `900 ${this.width < 550 ? 9 : 12}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', p.x, p.y);
      ctx.restore();
    });
  }

  drawReferee(referee) {
    const ctx = this.ctx;
    const p = this.point(referee.x, referee.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.width < 550 ? 5.5 : 7, 0, Math.PI * 2);
    ctx.fillStyle = this.colors.referee;
    ctx.fill();
    ctx.strokeStyle = this.monochrome ? '#222222' : '#f8fafc';
    ctx.lineWidth = 1.75;
    ctx.stroke();
  }

  drawBall(ball) {
    const ctx = this.ctx;
    const ground = this.point(ball.x, ball.y);
    const height = Number(ball.height) || 0;
    const p = { x: ground.x, y: ground.y - height * (this.height / 250) };
    const radius = (this.width < 550 ? 3.5 : 4.5) + Math.min(2.5, height * 0.12);
    ctx.save();
    if (height > 0.3) {
      ctx.beginPath();
      ctx.ellipse(ground.x, ground.y + 2, radius * 1.15, radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(.12, .38 - height * .02)})`;
      ctx.fill();
    }
    ctx.shadowColor = 'rgba(0,0,0,.45)';
    ctx.shadowBlur = 3 + height * 0.15;
    ctx.shadowOffsetY = 2 + height * 0.08;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawSetPieceMarker(ball) {
    const ctx = this.ctx;
    const p = this.point(ball.x, ball.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

if (typeof module === 'undefined') window.MatchRenderer = MatchRenderer;
