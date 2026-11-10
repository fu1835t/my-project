// 玩家板子與技能管理
class PlayerPaddle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // 基礎屬性
    this.baseWidth = 110;
    this.width = this.baseWidth;
    this.height = 14;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - 45;
    this.speed = 520;

    // 生命與法力
    this.maxHp = 3;
    this.hp = this.maxHp;
    this.maxMp = 100;
    this.mp = 40;
    this.mpRegen = 2.5; // 每秒被動回魔
    this.gold = 0;

    // 狀態效果
    this.hasAegisShield = false;
    this.aegisTimer = 0;
    this.isSlowed = false;
    this.slowTimer = 0;

    // 技能冷卻（秒）
    this.skills = {
      q: { name: '聖光護盾', cost: 30, maxCd: 12, currentCd: 0 },
      w: { name: '烈焰貫穿', cost: 40, maxCd: 14, currentCd: 0 },
      e: { name: '雷霆雙極', cost: 50, maxCd: 16, currentCd: 0 }
    };

    // 雷電光束特效
    this.laserBeams = [];

    // 移動輸入標記
    this.moveLeft = false;
    this.moveRight = false;
  }

  // 受到傷害（來自 Boss 彈幕）
  takeDamage(amount = 1) {
    this.hp -= amount;
    if (window.soundEngine) window.soundEngine.playLoseLife();
    if (window.particleSystem) {
      window.particleSystem.shake(8, 0.3);
      window.particleSystem.createBrickShatter(
        this.x + this.width / 2,
        this.y + this.height / 2,
        '#ef4444',
        14
      );
    }
  }

  // 施加緩速（毒孢）
  applySlow(duration = 2.5) {
    this.isSlowed = true;
    this.slowTimer = duration;
  }

  // 施放 Q：聖光護盾
  castSkillQ() {
    const s = this.skills.q;
    if (s.currentCd <= 0 && this.mp >= s.cost) {
      this.mp -= s.cost;
      s.currentCd = s.maxCd;
      this.hasAegisShield = true;
      this.aegisTimer = 12.0; // 持續 12 秒或擋住 1 次掉球
      if (window.soundEngine) window.soundEngine.playSkillShield();
      if (window.particleSystem) {
        window.particleSystem.createShockwave(this.canvasWidth / 2, this.canvasHeight - 5, 200, '#38bdf8');
      }
      return true;
    }
    return false;
  }

  // 施放 W：烈焰貫穿
  castSkillW(balls) {
    const s = this.skills.w;
    if (s.currentCd <= 0 && this.mp >= s.cost) {
      this.mp -= s.cost;
      s.currentCd = s.maxCd;
      for (const b of balls) {
        b.activateFireball(7.0);
      }
      if (window.soundEngine) window.soundEngine.playSkillFire();
      return true;
    }
    return false;
  }

  // 施放 E：雷霆雙極
  castSkillE() {
    const s = this.skills.e;
    if (s.currentCd <= 0 && this.mp >= s.cost) {
      this.mp -= s.cost;
      s.currentCd = s.maxCd;
      // 左右兩側各射出一道雷霆
      const leftX = this.x + 12;
      const rightX = this.x + this.width - 12;
      this.laserBeams.push({ x: leftX, life: 0.35, maxLife: 0.35 });
      this.laserBeams.push({ x: rightX, life: 0.35, maxLife: 0.35 });

      if (window.soundEngine) window.soundEngine.playSkillLaser();
      if (window.particleSystem) {
        window.particleSystem.shake(6, 0.2);
        window.particleSystem.createShockwave(leftX, this.y, 40, '#a855f7');
        window.particleSystem.createShockwave(rightX, this.y, 40, '#a855f7');
      }
      return true;
    }
    return false;
  }

  update(dt) {
    // 回魔更新
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);

    // 緩速計時
    if (this.isSlowed) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.isSlowed = false;
      }
    }

    // 護盾計時
    if (this.hasAegisShield) {
      this.aegisTimer -= dt;
      if (this.aegisTimer <= 0) {
        this.hasAegisShield = false;
      }
    }

    // 技能冷卻更新
    for (const key in this.skills) {
      const s = this.skills[key];
      if (s.currentCd > 0) {
        s.currentCd -= dt;
        if (s.currentCd < 0) s.currentCd = 0;
      }
    }

    // 鍵盤移動處理
    const currentSpeed = this.isSlowed ? this.speed * 0.5 : this.speed;
    if (this.moveLeft) {
      this.x -= currentSpeed * dt;
    }
    if (this.moveRight) {
      this.x += currentSpeed * dt;
    }

    // 邊界限制
    if (this.x < 5) this.x = 5;
    if (this.x + this.width > this.canvasWidth - 5) {
      this.x = this.canvasWidth - 5 - this.width;
    }

    // 雷電光束生命週期
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.life -= dt;
      if (beam.life <= 0) {
        this.laserBeams.splice(i, 1);
      }
    }
  }

  // 滑鼠位置同步
  setTargetX(targetX) {
    const center = targetX - this.width / 2;
    this.x = Math.max(5, Math.min(this.canvasWidth - 5 - this.width, center));
  }

  draw(ctx) {
    // 繪製雷霆光束
    for (const beam of this.laserBeams) {
      const alpha = Math.max(0, beam.life / beam.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(beam.x, this.y);
      ctx.lineTo(beam.x, 0);
      ctx.stroke();

      // 核心高亮白光
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(beam.x, this.y);
      ctx.lineTo(beam.x, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 繪製聖光護盾底線
    if (this.hasAegisShield) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(0, this.canvasHeight - 6);
      ctx.lineTo(this.canvasWidth, this.canvasHeight - 6);
      ctx.stroke();
      ctx.restore();
    }

    // 繪製板子主體（勇者戰艦風）
    ctx.save();
    const cornerRadius = 6;

    // 底層陰影與霓虹發光
    ctx.shadowColor = this.isSlowed ? '#a3e635' : '#38bdf8';
    ctx.shadowBlur = 10;

    // 漸層上色
    const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    if (this.isSlowed) {
      grad.addColorStop(0, '#84cc16');
      grad.addColorStop(1, '#4d7c0f');
    } else {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#0284c7');
      grad.addColorStop(1, '#0369a1');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, cornerRadius);
    ctx.fill();

    // 邊框
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 核心寶石（板子正中央發光晶石）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.PlayerPaddle = PlayerPaddle;
