// 粒子與視覺特效系統
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ambientParticles = [];
    this.shockwaves = [];
    this.screenShakeTime = 0;
    this.screenShakeIntensity = 0;
  }

  // 觸發震屏
  shake(intensity = 6, duration = 0.25) {
    this.screenShakeIntensity = intensity;
    this.screenShakeTime = duration;
  }

  // 初始化環境氛圍微粒
  initAmbient(theme, width, height) {
    this.ambientParticles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this.createAmbientParticle(theme, width, height, true));
    }
  }

  createAmbientParticle(theme, width, height, randomizeY = false) {
    const y = randomizeY ? Math.random() * height : (theme === 'ocean' ? height + 10 : -10);
    const x = Math.random() * width;

    if (theme === 'forest') {
      // 森林：飄落樹葉
      return {
        type: 'leaf',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.8 + 0.3,
        vy: 0.8 + Math.random() * 0.8,
        size: 3 + Math.random() * 4,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.05,
        color: Math.random() > 0.4 ? '#4ade80' : '#86efac'
      };
    } else if (theme === 'desert') {
      // 沙漠：飛揚黃沙
      return {
        type: 'sand',
        x: x,
        y: randomizeY ? y : Math.random() * height,
        vx: 2.5 + Math.random() * 2.5,
        vy: (Math.random() - 0.5) * 0.8,
        size: 1.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        color: '#fde047'
      };
    } else {
      // 海洋：上浮氣泡
      return {
        type: 'bubble',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(1.2 + Math.random() * 1.5),
        size: 2 + Math.random() * 4,
        wobble: Math.random() * Math.PI * 2,
        color: 'rgba(56, 189, 248, 0.4)'
      };
    }
  }

  // 磚塊破碎微粒
  createBrickShatter(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: color,
        gravity: 6.0
      });
    }
  }

  // 衝擊波環
  createShockwave(x, y, maxRadius = 40, color = '#38bdf8') {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: maxRadius,
      color: color,
      alpha: 1.0,
      life: 0.3,
      maxLife: 0.3
    });
  }

  // 魔法火花（技能、彈藥）
  createSpark(x, y, color = '#fbbf24', count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color: color,
        gravity: 0
      });
    }
  }

  update(dt, width, height, theme) {
    // 震屏更新
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
      if (this.screenShakeTime < 0) this.screenShakeTime = 0;
    }

    // 環境微粒更新
    for (let i = 0; i < this.ambientParticles.length; i++) {
      const p = this.ambientParticles[i];
      if (p.type === 'leaf') {
        p.x += p.vx + Math.sin(p.angle) * 0.5;
        p.y += p.vy;
        p.angle += p.vAngle;
        if (p.y > height + 10 || p.x > width + 10 || p.x < -10) {
          this.ambientParticles[i] = this.createAmbientParticle(theme, width, height);
        }
      } else if (p.type === 'sand') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > width + 10) {
          p.x = -10;
          p.y = Math.random() * height;
        }
      } else if (p.type === 'bubble') {
        p.wobble += dt * 3;
        p.x += Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        if (p.y < -10) {
          this.ambientParticles[i] = this.createAmbientParticle(theme, width, height);
        }
      }
    }

    // 常規微粒更新
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += (p.gravity || 0) * dt;
    }

    // 衝擊波更新
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - sw.life / sw.maxLife;
      sw.radius = 5 + (sw.maxRadius - 5) * progress;
      sw.alpha = 1 - progress;
    }
  }

  // 取得震屏偏移量
  getShakeOffset() {
    if (this.screenShakeTime <= 0) return { x: 0, y: 0 };
    const factor = this.screenShakeTime / 0.25;
    const mag = this.screenShakeIntensity * factor;
    return {
      x: (Math.random() * 2 - 1) * mag,
      y: (Math.random() * 2 - 1) * mag
    };
  }

  drawAmbient(ctx) {
    for (const p of this.ambientParticles) {
      if (p.type === 'leaf') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'sand') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'bubble') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  draw(ctx) {
    // 繪製微粒
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 繪製衝擊波
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

window.particleSystem = new ParticleSystem();
