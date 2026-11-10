// Boss 投射攻擊物
class BossProjectile {
  constructor(x, y, vx, vy, color = '#ef4444', radius = 6, damage = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.radius = radius;
    this.damage = damage;
    this.isDestroyed = false;
  }

  update(dt, canvasHeight) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > canvasHeight + 20 || this.x < -20 || this.x > 920) {
      this.isDestroyed = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  checkPaddleCollision(paddle) {
    return (
      this.y + this.radius >= paddle.y &&
      this.y - this.radius <= paddle.y + paddle.height &&
      this.x + this.radius >= paddle.x &&
      this.x - this.radius <= paddle.x + paddle.width
    );
  }
}

// Boss 基礎架構與三大主題 Boss
class Boss {
  constructor(type, canvasWidth) {
    this.type = type; // 'forest', 'desert', 'ocean'
    this.canvasWidth = canvasWidth;
    this.width = 160;
    this.height = 70;
    this.x = (canvasWidth - this.width) / 2;
    this.y = 75;
    this.vx = 70;

    this.projectiles = [];
    this.attackTimer = 0;
    this.skillTimer = 0;
    this.hurtTimer = 0;
    this.isDefeated = false;

    // 根據主題設定名稱與血量
    if (type === 'forest') {
      this.name = '遠古守護者：綠茵巨靈';
      this.maxHp = 60;
      this.themeColor = '#22c55e';
    } else if (type === 'desert') {
      this.name = '黃沙霸權：法老巨像';
      this.maxHp = 95;
      this.themeColor = '#eab308';
    } else {
      this.name = '蒼藍深淵：克拉肯巨獸';
      this.maxHp = 135;
      this.themeColor = '#06b6d4';
    }
    this.hp = this.maxHp;

    // 沙漠雷射蓄力技能
    this.laserWarning = false;
    this.laserWarningX = 0;
    this.laserTimer = 0;
    this.laserFiring = false;
  }

  takeDamage(amount = 1) {
    this.hp -= amount;
    this.hurtTimer = 0.15;
    if (window.soundEngine) window.soundEngine.playBossHurt();
    if (window.particleSystem) {
      window.particleSystem.shake(5, 0.18);
      window.particleSystem.createBrickShatter(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.themeColor,
        6
      );
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDefeated = true;
      if (window.soundEngine) window.soundEngine.playExplosion();
      if (window.particleSystem) {
        window.particleSystem.shake(14, 0.6);
        window.particleSystem.createShockwave(
          this.x + this.width / 2,
          this.y + this.height / 2,
          160,
          this.themeColor
        );
      }
    }
  }

  update(dt, paddle, canvasHeight, spawnExtraBricksCallback) {
    if (this.isDefeated) return;

    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // 水平巡邏運動
    this.x += this.vx * dt;
    if (this.x < 40) {
      this.x = 40;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.width > this.canvasWidth - 40) {
      this.x = this.canvasWidth - 40 - this.width;
      this.vx = -Math.abs(this.vx);
    }

    // 常規攻擊邏輯
    this.attackTimer += dt;
    const attackInterval = this.hp < this.maxHp * 0.4 ? 1.8 : 2.6;
    if (this.attackTimer >= attackInterval) {
      this.attackTimer = 0;
      this.fireNormalAttack(paddle);
    }

    // 特殊技能邏輯
    this.skillTimer += dt;
    if (this.skillTimer >= 8.5) {
      this.skillTimer = 0;
      this.castBossSkill(paddle, spawnExtraBricksCallback);
    }

    // 沙漠 Boss 雷射更新
    if (this.laserWarning) {
      this.laserTimer += dt;
      if (this.laserTimer >= 1.0 && !this.laserFiring) {
        this.laserFiring = true;
        if (window.soundEngine) window.soundEngine.playSkillLaser();
        if (window.particleSystem) window.particleSystem.shake(8, 0.4);
      }
      if (this.laserTimer >= 1.7) {
        this.laserWarning = false;
        this.laserFiring = false;
        this.laserTimer = 0;
      }
    }

    // 投射物推進
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, canvasHeight);
      if (proj.isDestroyed) {
        this.projectiles.splice(i, 1);
        continue;
      }
      // 檢測是否擊中玩家板子
      if (proj.checkPaddleCollision(paddle)) {
        paddle.takeDamage(proj.damage);
        this.projectiles.splice(i, 1);
      }
    }

    // 沙漠雷射命中判定
    if (this.laserFiring) {
      if (
        paddle.x + paddle.width >= this.laserWarningX - 25 &&
        paddle.x <= this.laserWarningX + 25
      ) {
        paddle.takeDamage(1);
        this.laserFiring = false; // 命中一次即結算
      }
    }
  }

  // 常規彈幕射擊
  fireNormalAttack(paddle) {
    const originX = this.x + this.width / 2;
    const originY = this.y + this.height;

    if (this.type === 'forest') {
      // 投擲兩顆分裂堅果彈
      this.projectiles.push(new BossProjectile(originX - 20, originY, -30, 160, '#84cc16', 7));
      this.projectiles.push(new BossProjectile(originX + 20, originY, 30, 160, '#84cc16', 7));
    } else if (this.type === 'desert') {
      // 瞄準板子的灼熱烈日彈
      const dx = (paddle.x + paddle.width / 2) - originX;
      const dy = paddle.y - originY;
      const angle = Math.atan2(dy, dx);
      const speed = 190;
      this.projectiles.push(
        new BossProjectile(originX, originY, Math.cos(angle) * speed, Math.sin(angle) * speed, '#f59e0b', 8)
      );
    } else {
      // 深海散射水彈
      this.projectiles.push(new BossProjectile(originX - 30, originY, -60, 170, '#06b6d4', 6));
      this.projectiles.push(new BossProjectile(originX, originY, 0, 180, '#06b6d4', 6));
      this.projectiles.push(new BossProjectile(originX + 30, originY, 60, 170, '#06b6d4', 6));
    }

    if (window.soundEngine) window.soundEngine.playBossAttack();
  }

  // 大絕招施放
  castBossSkill(paddle, spawnExtraBricksCallback) {
    if (this.type === 'forest') {
      // 召喚藤蔓阻擋牆
      if (spawnExtraBricksCallback) {
        spawnExtraBricksCallback(this.x, this.y + this.height + 20);
      }
      if (window.particleSystem) {
        window.particleSystem.createShockwave(this.x + this.width / 2, this.y + this.height, 80, '#22c55e');
      }
    } else if (this.type === 'desert') {
      // 鎖定玩家當前位置預備天降烈日雷射
      this.laserWarning = true;
      this.laserWarningX = paddle.x + paddle.width / 2;
      this.laserTimer = 0;
      this.laserFiring = false;
    } else {
      // 召喚深海暗黑水流（大幅偏折球路並生成追蹤彈）
      const originX = this.x + this.width / 2;
      const originY = this.y + this.height;
      this.projectiles.push(new BossProjectile(originX, originY, 0, 130, '#1e1b4b', 12, 1));
      if (window.particleSystem) {
        window.particleSystem.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 120, '#0284c7');
      }
    }
  }

  // 檢測與彈珠碰撞
  checkBallCollision(ball) {
    if (this.isDefeated) return false;

    if (
      ball.x + ball.radius >= this.x &&
      ball.x - ball.radius <= this.x + this.width &&
      ball.y + ball.radius >= this.y &&
      ball.y - ball.radius <= this.y + this.height
    ) {
      this.takeDamage(ball.damage);

      // 判定反彈
      const overlapLeft = Math.abs(ball.x - this.x);
      const overlapRight = Math.abs(ball.x - (this.x + this.width));
      const overlapTop = Math.abs(ball.y - this.y);
      const overlapBottom = Math.abs(ball.y - (this.y + this.height));

      const minX = Math.min(overlapLeft, overlapRight);
      const minY = Math.min(overlapTop, overlapBottom);

      if (minX < minY) {
        ball.vx = -ball.vx;
        if (ball.vx > 0) {
          ball.x = this.x + this.width + ball.radius;
        } else {
          ball.x = this.x - ball.radius;
        }
      } else {
        ball.vy = -ball.vy;
        if (ball.vy > 0) {
          ball.y = this.y + this.height + ball.radius;
        } else {
          ball.y = this.y - ball.radius;
        }
      }

      return true;
    }
    return false;
  }

  // 繪製 Boss 外觀
  draw(ctx) {
    if (this.isDefeated) return;

    // 繪製沙漠預警雷射光束
    if (this.laserWarning) {
      ctx.save();
      if (this.laserFiring) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.fillRect(this.laserWarningX - 22, 0, 44, 650);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.laserWarningX - 7, 0, 14, 650);
      } else {
        // 預警紅線
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(this.laserWarningX, 0);
        ctx.lineTo(this.laserWarningX, 650);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 繪製 Boss 投射物
    for (const proj of this.projectiles) {
      proj.draw(ctx);
    }

    // Boss 軀體本體
    ctx.save();
    ctx.translate(this.x, this.y);

    // 受擊閃白
    if (this.hurtTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = this.themeColor;
      ctx.shadowColor = this.themeColor;
      ctx.shadowBlur = 12;
    }

    if (this.type === 'forest') {
      // 綠茵巨靈（巨樹造型）
      ctx.beginPath();
      ctx.roundRect(0, 0, this.width, this.height, 12);
      ctx.fill();

      // 樹紋與核心水晶
      ctx.fillStyle = '#15803d';
      ctx.fillRect(15, 15, this.width - 30, this.height - 30);

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'desert') {
      // 法老巨像（黃金面具與展翼）
      ctx.beginPath();
      ctx.moveTo(this.width / 2, 0);
      ctx.lineTo(this.width, this.height * 0.3);
      ctx.lineTo(this.width * 0.85, this.height);
      ctx.lineTo(this.width * 0.15, this.height);
      ctx.lineTo(0, this.height * 0.3);
      ctx.closePath();
      ctx.fill();

      // 聖甲蟲核心
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height * 0.55, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 深淵克拉肯（暗湧軀體與生化眼）
      ctx.beginPath();
      ctx.ellipse(this.width / 2, this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 巨獸雙眼
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(this.width * 0.35, this.height * 0.45, 8, 0, Math.PI * 2);
      ctx.arc(this.width * 0.65, this.height * 0.45, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Boss = Boss;
