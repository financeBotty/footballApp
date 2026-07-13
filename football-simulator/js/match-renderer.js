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
    this.colors = { home: '#38bdf8', away: '#fb7185', referee: '#050505' };
    this.visualPlayers = {};
    this.visualBall = null;
    this.visualReferee = null;
    this.previousBallState = null;
    this.previousBallOwnerId = null;
    this.previousPhase = null;
    this.start();
  }

  start() {
    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }
    const draw = () => {
      this.render(this.engine.getVisualSnapshot());
      this.frameId = requestAnimationFrame(draw);
    };
    draw();
  }

  stop() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.frameId = null;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(320, rect.width || 900);
    const height = Math.max(210, width * 0.6);
    this.canvas.style.height = `${height}px`;
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

  render(snapshot) {
    if (!this.ctx || !this.width) return;
    this.drawPitch();
    this.drawBenches(snapshot.benches, snapshot.animations);
    this.drawDefensiveLines(snapshot.players);
    if (Number.isFinite(snapshot.ball.offsideLineX)) this.drawOffsideLine(snapshot.ball.offsideLineX);
    if (['passing', 'shooting'].includes(snapshot.ball.state)) this.drawBallTrajectory(snapshot.ball);
    const keeperHasJustSaved = snapshot.ball.heldByKeeper && this.previousBallState === 'shooting';
    const treatedPlayerId = snapshot.animations.medical ? snapshot.animations.medical.playerId : null;
    snapshot.players.filter(player => player.id !== treatedPlayerId).forEach(player => {
      const mustSnapToBall = keeperHasJustSaved && snapshot.ball.ownerId === player.id;
      const visual = mustSnapToBall
        ? { x: player.x, y: player.y }
        : this.visualPlayers[player.id] || { x: player.x, y: player.y };
      if (!mustSnapToBall) {
        visual.x += (player.x - visual.x) * 0.12;
        visual.y += (player.y - visual.y) * 0.12;
      }
      this.visualPlayers[player.id] = visual;
      this.drawPlayer({ ...player, x: visual.x, y: visual.y }, snapshot.ball.ownerId === player.id);
    });
    const snapBall =
      (snapshot.phase === 'KICK_OFF' && this.previousPhase !== 'KICK_OFF') ||
      (snapshot.ball.ownerId && this.previousBallState === 'shooting') ||
      (snapshot.ball.ownerId && snapshot.ball.ownerId !== this.previousBallOwnerId);
    if (snapBall) this.visualBall = { x: snapshot.ball.x, y: snapshot.ball.y };
    this.visualBall = this.visualBall || { x: snapshot.ball.x, y: snapshot.ball.y };
    const ballInterpolation = ['passing', 'shooting'].includes(snapshot.ball.state) ? 0.62 : 0.34;
    this.visualBall.x += (snapshot.ball.x - this.visualBall.x) * ballInterpolation;
    this.visualBall.y += (snapshot.ball.y - this.visualBall.y) * ballInterpolation;
    this.visualReferee = this.visualReferee || { x: snapshot.referee.x, y: snapshot.referee.y };
    this.visualReferee.x += (snapshot.referee.x - this.visualReferee.x) * 0.1;
    this.visualReferee.y += (snapshot.referee.y - this.visualReferee.y) * 0.1;
    snapshot.animations.substitutions.forEach(animation => this.drawPlayer(animation.player, false, true));
    if (snapshot.animations.medical) this.drawMedicalAnimation(snapshot.animations.medical);
    snapshot.coaches.forEach(coach => this.drawCoach(coach));
    this.drawReferee(this.visualReferee);
    this.drawBall({ ...snapshot.ball, x: this.visualBall.x, y: this.visualBall.y });
    if (snapshot.phase === 'SET_PIECE') this.drawSetPieceMarker(snapshot.ball);
    this.previousBallState = snapshot.ball.state;
    this.previousBallOwnerId = snapshot.ball.ownerId;
    this.previousPhase = snapshot.phase;
  }

  drawPitch() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, '#15803d');
    gradient.addColorStop(0.5, '#16a34a');
    gradient.addColorStop(1, '#15803d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const stripes = 10;
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,.035)';
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
      const defenders = players.filter(player => player.side === side && ['CB', 'RB', 'LB'].includes(player.position));
      if (!defenders.length) return;
      const lineX = defenders.reduce((sum, player) => sum + player.x, 0) / defenders.length;
      const top = this.point(lineX, 5);
      const bottom = this.point(lineX, 63);
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.strokeStyle = side === 'home' ? 'rgba(56, 189, 248, .42)' : 'rgba(251, 113, 133, .42)';
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
    ctx.fillStyle = player.position === 'GK' && player.goalkeeperColor
      ? player.goalkeeperColor
      : this.colors[player.side];
    ctx.fill();
    ctx.strokeStyle = player.yellowCards ? '#fde047' : player.redCards ? '#ef4444' : '#0f172a';
    ctx.lineWidth = player.yellowCards || player.redCards ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = '#07111f';
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
      ctx.fillStyle = 'rgba(15, 23, 42, .82)';
      ctx.strokeStyle = bench.side === 'home' ? this.colors.home : this.colors.away;
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
        ctx.fillStyle = player.position === 'GK' && player.goalkeeperColor
          ? player.goalkeeperColor
          : this.colors[bench.side];
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#07111f';
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
    ctx.strokeStyle = '#f8fafc';
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
