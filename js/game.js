// Canvas roundRect 相容性補丁
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    if (!radii) radii = 0;
    if (typeof radii === 'number') radii = [radii, radii, radii, radii];
    const r = Math.min(radii[0] || 0, w / 2, h / 2);
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

// 核心遊戲控制器與主迴圈
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 900;
    this.height = 650;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // 系統實例
    this.levelManager = new LevelManager();
    this.paddle = new PlayerPaddle(this.width, this.height);
    this.balls = [new Ball(this.width / 2, this.height - 55)];
    this.bricks = [];
    this.dropItems = [];
    this.currentBoss = null;

    // 遊戲狀態機: 'TITLE', 'PLAYING', 'BOSS_WARNING', 'SHOP', 'GAMEOVER', 'VICTORY'
    this.state = 'TITLE';
    this.score = 0;
    this.combo = 0;
    this.warningTimer = 0;

    // 升級項目等級記錄
    this.upgradeLevels = {
      maxHp: 0,
      width: 0,
      damage: 0,
      manaRegen: 0,
      cooldown: 0
    };

    // 商店價格配置
    this.upgradeCosts = {
      maxHp: 60,
      width: 45,
      damage: 75,
      manaRegen: 40,
      cooldown: 50
    };

    this.lastTime = 0;
    this.initEvents();
    this.bindUI();
  }

  // 綁定輸入與畫布事件
  initEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'PLAYING') {
        if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.paddle.moveLeft = true;
        }
        if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.paddle.moveRight = true;
        }
        if (e.code === 'Space') {
          this.launchAttachedBalls();
        }
        if (e.key === 'q' || e.key === 'Q') {
          this.paddle.castSkillQ();
        }
        if (e.key === 'w' || e.key === 'W') {
          this.paddle.castSkillW(this.balls);
        }
        if (e.key === 'e' || e.key === 'E') {
          this.triggerSkillE();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.paddle.moveLeft = false;
      }
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.paddle.moveRight = false;
      }
    });

    // 滑鼠跟隨板子
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        this.paddle.setTargetX(mouseX);
      }
    });

    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'PLAYING') {
        this.launchAttachedBalls();
      }
    });
  }

  // 發射仍吸附在板子上的球
  launchAttachedBalls() {
    for (const b of this.balls) {
      if (b.isAttached) {
        b.launch();
      }
    }
  }

  // 施放 E 技能雷霆雙極
  triggerSkillE() {
    if (this.paddle.castSkillE()) {
      const leftX = this.paddle.x + 12;
      const rightX = this.paddle.x + this.paddle.width - 12;
      this.destroyBricksInColumn(leftX);
      this.destroyBricksInColumn(rightX);

      // 若有 Boss 且在雷電路徑上，造成額外巨量傷害
      if (this.currentBoss && !this.currentBoss.isDefeated) {
        const b = this.currentBoss;
        if ((leftX >= b.x && leftX <= b.x + b.width) || (rightX >= b.x && rightX <= b.x + b.width)) {
          b.takeDamage(12);
        }
      }
    }
  }

  // 垂直雷電貫穿銷毀磚塊
  destroyBricksInColumn(colX) {
    for (const brick of this.bricks) {
      if (!brick.isDestroyed && colX >= brick.x && colX <= brick.x + brick.width) {
        brick.hit(99);
        this.score += 50;
        const drops = brick.spawnDrops();
        this.dropItems.push(...drops);
        if (window.particleSystem) {
          window.particleSystem.createBrickShatter(
            brick.x + brick.width / 2,
            brick.y + brick.height / 2,
            brick.baseColor,
            10
          );
        }
      }
    }
  }

  // 綁定 UI 按鈕
  bindUI() {
    const startBtn = document.getElementById('btn-start-game');
    const resumeBtn = document.getElementById('btn-shop-continue');
    const restartBtn = document.getElementById('btn-restart');
    const victoryRestartBtn = document.getElementById('btn-victory-restart');
    const muteBtn = document.getElementById('btn-mute');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        window.soundEngine.init();
        this.startGame();
      });
    }

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.closeShopAndContinue();
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.restartGame();
      });
    }

    if (victoryRestartBtn) {
      victoryRestartBtn.addEventListener('click', () => {
        this.restartGame();
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = window.soundEngine.toggleMute();
        muteBtn.innerText = isMuted ? '靜音中' : '音效開';
      });
    }

    // 技能點擊快捷觸發
    const skillQEl = document.getElementById('skill-q');
    const skillWEl = document.getElementById('skill-w');
    const skillEEl = document.getElementById('skill-e');

    if (skillQEl) skillQEl.addEventListener('click', () => this.paddle.castSkillQ());
    if (skillWEl) skillWEl.addEventListener('click', () => this.paddle.castSkillW(this.balls));
    if (skillEEl) skillEEl.addEventListener('click', () => this.triggerSkillE());

    // 商店升級購買按鈕綁定
    this.bindShopButtons();
  }

  bindShopButtons() {
    const upgradeTypes = ['maxHp', 'width', 'damage', 'manaRegen', 'cooldown'];
    upgradeTypes.forEach((type) => {
      const btn = document.getElementById(`btn-buy-${type}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.buyUpgrade(type);
        });
      }
    });
  }

  // 購買升級邏輯
  buyUpgrade(type) {
    const cost = this.upgradeCosts[type];
    if (this.paddle.gold >= cost) {
      this.paddle.gold -= cost;
      this.upgradeLevels[type]++;
      this.upgradeCosts[type] = Math.floor(cost * 1.55);

      // 套用升級效果
      if (type === 'maxHp') {
        this.paddle.maxHp += 1;
        this.paddle.hp += 1;
      } else if (type === 'width') {
        this.paddle.width += 15;
      } else if (type === 'damage') {
        for (const b of this.balls) b.damage += 1;
      } else if (type === 'manaRegen') {
        this.paddle.mpRegen += 2.0;
      } else if (type === 'cooldown') {
        for (const k in this.paddle.skills) {
          this.paddle.skills[k].maxCd = Math.max(5, this.paddle.skills[k].maxCd * 0.85);
        }
      }

      if (window.soundEngine) window.soundEngine.playPowerup();
      this.updateShopUI();
      this.updateHUD();
    }
  }

  updateShopUI() {
    document.getElementById('shop-gold-display').innerText = this.paddle.gold;
    const upgradeTypes = ['maxHp', 'width', 'damage', 'manaRegen', 'cooldown'];
    upgradeTypes.forEach((type) => {
      const costEl = document.getElementById(`cost-${type}`);
      const btn = document.getElementById(`btn-buy-${type}`);
      const levelEl = document.getElementById(`level-${type}`);
      const cost = this.upgradeCosts[type];

      if (costEl) costEl.innerText = `${cost} 金幣`;
      if (levelEl) levelEl.innerText = `Lv.${this.upgradeLevels[type]}`;
      if (btn) {
        btn.disabled = this.paddle.gold < cost;
      }
    });
  }

  // 開始遊戲
  startGame() {
    document.getElementById('overlay-title').classList.add('hidden');
    this.levelManager = new LevelManager();
    this.paddle = new PlayerPaddle(this.width, this.height);
    this.score = 0;
    this.loadCurrentStage();
  }

  // 重啟遊戲
  restartGame() {
    document.getElementById('overlay-gameover').classList.add('hidden');
    document.getElementById('overlay-victory').classList.add('hidden');
    this.startGame();
  }

  // 載入當前關卡
  loadCurrentStage() {
    const world = this.levelManager.getCurrentWorld();
    const stage = this.levelManager.getCurrentStage();

    // 更新背景微粒與音樂
    window.particleSystem.initAmbient(world.id, this.width, this.height);
    window.soundEngine.startBGM(stage.isBoss ? 'boss' : world.id);

    // 建立磚塊陣列
    this.bricks = this.levelManager.generateBricks(this.width);
    this.dropItems = [];

    // 重設球與板子吸附
    this.balls = [new Ball(this.width / 2, this.height - 55)];
    this.balls[0].damage = 1 + this.upgradeLevels.damage;
    this.balls[0].attachToPaddle(this.paddle);

    // 檢查是否為 Boss 關卡
    if (stage.isBoss) {
      this.currentBoss = new Boss(world.id, this.width);
      this.state = 'BOSS_WARNING';
      this.warningTimer = 2.2;
      document.getElementById('boss-warning-banner').classList.remove('hidden');
      document.getElementById('boss-warning-text').innerText = `警告：${this.currentBoss.name} 現身！`;
      if (window.soundEngine) window.soundEngine.playExplosion();
      if (window.particleSystem) window.particleSystem.shake(12, 0.5);
    } else {
      this.currentBoss = null;
      this.state = 'PLAYING';
      document.getElementById('boss-warning-banner').classList.add('hidden');
      document.getElementById('boss-bar-wrapper').classList.add('hidden');
    }

    this.updateHUD();
  }

  // Boss 生成藤蔓防護磚塊回呼
  spawnBossVineWall(originX, originY) {
    const w = 55;
    const h = 20;
    for (let i = -1; i <= 1; i++) {
      const bx = originX + (this.currentBoss.width / 2) + i * 65 - w / 2;
      this.bricks.push(new Brick(bx, originY, w, h, 'vine', 'forest'));
    }
  }

  // 進入營地商店
  openShop() {
    this.state = 'SHOP';
    this.updateShopUI();
    document.getElementById('overlay-shop').classList.remove('hidden');
  }

  closeShopAndContinue() {
    document.getElementById('overlay-shop').classList.add('hidden');
    const nextResult = this.levelManager.nextStage();
    if (nextResult.type === 'VICTORY') {
      this.showVictory();
    } else {
      this.loadCurrentStage();
    }
  }

  showVictory() {
    this.state = 'VICTORY';
    document.getElementById('final-victory-score').innerText = this.score;
    document.getElementById('final-victory-gold').innerText = this.paddle.gold;
    document.getElementById('overlay-victory').classList.remove('hidden');
    if (window.soundEngine) {
      window.soundEngine.stopBGM();
      window.soundEngine.playPowerup();
    }
  }

  showGameOver() {
    this.state = 'GAMEOVER';
    document.getElementById('final-score').innerText = this.score;
    document.getElementById('overlay-gameover').classList.remove('hidden');
    if (window.soundEngine) {
      window.soundEngine.stopBGM();
      window.soundEngine.playLoseLife();
    }
  }

  // 核心主迴圈更新
  update(dt) {
    const world = this.levelManager.getCurrentWorld();
    window.particleSystem.update(dt, this.width, this.height, world.id);

    if (this.state === 'BOSS_WARNING') {
      this.warningTimer -= dt;
      if (this.warningTimer <= 0) {
        this.state = 'PLAYING';
        document.getElementById('boss-warning-banner').classList.add('hidden');
        document.getElementById('boss-bar-wrapper').classList.remove('hidden');
        document.getElementById('boss-name').innerText = this.currentBoss.name;
      }
      return;
    }

    if (this.state !== 'PLAYING') return;

    // 板子更新
    this.paddle.update(dt);
    if (this.paddle.hp <= 0) {
      this.showGameOver();
      return;
    }

    // 球更新與邊界
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.update(dt, this.paddle, this.width, this.height);
      ball.checkPaddleCollision(this.paddle);

      // 球落出底端判定
      if (ball.y - ball.radius > this.height) {
        // 聖光護盾檢測
        if (this.paddle.hasAegisShield) {
          this.paddle.hasAegisShield = false;
          ball.y = this.height - 15;
          ball.vy = -Math.abs(ball.vy);
          if (window.soundEngine) window.soundEngine.playSkillShield();
          if (window.particleSystem) {
            window.particleSystem.createShockwave(ball.x, this.height - 15, 60, '#38bdf8');
          }
        } else {
          // 移除該球
          this.balls.splice(i, 1);
        }
      }
    }

    // 若所有球遺失，扣除生命並重新吸附新球
    if (this.balls.length === 0) {
      this.paddle.hp -= 1;
      if (window.soundEngine) window.soundEngine.playLoseLife();
      if (window.particleSystem) window.particleSystem.shake(8, 0.3);

      if (this.paddle.hp <= 0) {
        this.showGameOver();
        return;
      } else {
        const newBall = new Ball(this.width / 2, this.height - 55);
        newBall.damage = 1 + this.upgradeLevels.damage;
        newBall.attachToPaddle(this.paddle);
        this.balls.push(newBall);
      }
    }

    // 磚塊更新與碰撞
    this.updateBricksAndBallCollisions(dt);

    // 掉落物更新與拾取
    this.updateDropItems(dt);

    // Boss 更新與碰撞
    if (this.currentBoss && !this.currentBoss.isDefeated) {
      this.currentBoss.update(
        dt,
        this.paddle,
        this.height,
        (ox, oy) => this.spawnBossVineWall(ox, oy)
      );

      for (const ball of this.balls) {
        if (!ball.isAttached) {
          this.currentBoss.checkBallCollision(ball);
        }
      }

      // 更新 Boss 血條
      const bossHpPercent = Math.max(0, (this.currentBoss.hp / this.currentBoss.maxHp) * 100);
      document.getElementById('boss-hp-fill').style.width = `${bossHpPercent}%`;

      // 擊殺 Boss 判斷
      if (this.currentBoss.isDefeated) {
        this.score += 2000;
        // 爆出大量金幣
        for (let i = 0; i < 12; i++) {
          const dropX = this.currentBoss.x + Math.random() * this.currentBoss.width;
          const dropY = this.currentBoss.y + Math.random() * this.currentBoss.height;
          this.dropItems.push(new DropItem(dropX, dropY, 'gold'));
        }
        setTimeout(() => {
          this.openShop();
        }, 1200);
      }
    }

    // 關卡磚塊清空檢驗（非 Boss 關卡）
    if (!this.currentBoss) {
      const remainingBricks = this.bricks.filter((b) => !b.isDestroyed).length;
      if (remainingBricks === 0) {
        this.openShop();
      }
    }

    this.updateHUD();
  }

  // 磚塊碰撞處理
  updateBricksAndBallCollisions(dt) {
    for (const brick of this.bricks) {
      if (brick.isDestroyed) continue;
      brick.update(dt);

      for (const ball of this.balls) {
        if (ball.isAttached) continue;

        const collision = brick.checkBallCollision(ball);
        if (collision) {
          // 烈焰穿透狀態不反彈，直接爆破
          if (!ball.isFireball) {
            if (collision === 'horizontal') {
              if (ball.vx > 0) {
                ball.x = brick.x - ball.radius;
              } else {
                ball.x = brick.x + brick.width + ball.radius;
              }
              ball.vx = -ball.vx;
            } else {
              if (ball.vy > 0) {
                ball.y = brick.y - ball.radius;
              } else {
                ball.y = brick.y + brick.height + ball.radius;
              }
              ball.vy = -ball.vy;
            }
          }

          const destroyed = brick.hit(ball.damage, ball.isFireball);
          if (destroyed) {
            this.score += 100;
            if (window.soundEngine) window.soundEngine.playBrickDestroy();
            if (window.particleSystem) {
              window.particleSystem.createBrickShatter(
                brick.x + brick.width / 2,
                brick.y + brick.height / 2,
                brick.baseColor,
                10
              );
            }

            // 特殊磚效果發動
            this.handleSpecialBrickBreak(brick);

            // 生成掉落物
            const drops = brick.spawnDrops();
            this.dropItems.push(...drops);
          } else {
            if (window.soundEngine) window.soundEngine.playBrickHit();
            if (window.particleSystem) {
              window.particleSystem.createSpark(
                brick.x + brick.width / 2,
                brick.y + brick.height / 2,
                brick.baseColor,
                4
              );
            }
          }
        }
      }
    }
  }

  // 觸發特殊磚塊被擊破效果
  handleSpecialBrickBreak(brick) {
    if (brick.type === 'bomb') {
      // 炸彈磚引爆周圍 3x3
      if (window.soundEngine) window.soundEngine.playExplosion();
      if (window.particleSystem) {
        window.particleSystem.shake(10, 0.4);
        window.particleSystem.createShockwave(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          90,
          '#ef4444'
        );
      }
      for (const neighbor of this.bricks) {
        if (!neighbor.isDestroyed) {
          const dist = Math.hypot(
            neighbor.x - brick.x,
            neighbor.y - brick.y
          );
          if (dist < 110) {
            neighbor.hit(99);
            this.score += 80;
            this.dropItems.push(...neighbor.spawnDrops());
          }
        }
      }
    } else if (brick.type === 'spore') {
      // 毒孢磚釋放減速
      this.paddle.applySlow(3.5);
      if (window.particleSystem) {
        window.particleSystem.createBrickShatter(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          '#84cc16',
          16
        );
      }
    } else if (brick.type === 'ice') {
      // 冰晶微爆
      for (const neighbor of this.bricks) {
        if (!neighbor.isDestroyed) {
          const dist = Math.hypot(neighbor.x - brick.x, neighbor.y - brick.y);
          if (dist < 75) {
            neighbor.hit(1);
          }
        }
      }
    }
  }

  // 掉落物更新
  updateDropItems(dt) {
    for (let i = this.dropItems.length - 1; i >= 0; i--) {
      const item = this.dropItems[i];
      item.update(dt);

      if (item.checkCollision(this.paddle)) {
        this.applyItemEffect(item);
        this.dropItems.splice(i, 1);
        continue;
      }

      if (item.y > this.height + 20) {
        this.dropItems.splice(i, 1);
      }
    }
  }

  // 拾取道具效果套用
  applyItemEffect(item) {
    if (item.type === 'gold') {
      this.paddle.gold += 10;
      this.score += 50;
      if (window.soundEngine) window.soundEngine.playGold();
    } else if (item.type === 'multiball') {
      // 分裂新球
      if (this.balls.length < 5) {
        const sourceBall = this.balls[0] || new Ball(this.paddle.x, this.paddle.y);
        const b1 = new Ball(sourceBall.x, sourceBall.y);
        const b2 = new Ball(sourceBall.x, sourceBall.y);
        b1.isAttached = false;
        b2.isAttached = false;
        b1.vx = sourceBall.vx * 0.8 + 80;
        b1.vy = sourceBall.vy;
        b2.vx = sourceBall.vx * 0.8 - 80;
        b2.vy = sourceBall.vy;
        b1.damage = sourceBall.damage;
        b2.damage = sourceBall.damage;
        this.balls.push(b1, b2);
      }
      if (window.soundEngine) window.soundEngine.playPowerup();
    } else if (item.type === 'expand') {
      this.paddle.width = Math.min(220, this.paddle.width + 30);
      if (window.soundEngine) window.soundEngine.playPowerup();
    } else if (item.type === 'heal') {
      this.paddle.hp = Math.min(this.paddle.maxHp, this.paddle.hp + 1);
      if (window.soundEngine) window.soundEngine.playPowerup();
    } else if (item.type === 'mana') {
      this.paddle.mp = Math.min(this.paddle.maxMp, this.paddle.mp + 35);
      if (window.soundEngine) window.soundEngine.playPowerup();
    } else if (item.type === 'fire') {
      for (const b of this.balls) b.activateFireball(7.0);
      if (window.soundEngine) window.soundEngine.playSkillFire();
    }
  }

  // 更新頂部 HUD 與技能狀態
  updateHUD() {
    const stage = this.levelManager.getCurrentStage();
    const world = this.levelManager.getCurrentWorld();

    document.getElementById('hud-world-stage').innerText = `${world.name} · ${stage.name}`;
    document.getElementById('hud-score').innerText = this.score;
    document.getElementById('hud-gold').innerText = this.paddle.gold;

    // HP / MP 數值與長度
    const hpPercent = (this.paddle.hp / this.paddle.maxHp) * 100;
    const mpPercent = (this.paddle.mp / this.paddle.maxMp) * 100;
    document.getElementById('hp-bar-fill').style.width = `${Math.max(0, hpPercent)}%`;
    document.getElementById('mp-bar-fill').style.width = `${Math.max(0, mpPercent)}%`;
    document.getElementById('hp-text').innerText = `${Math.max(0, this.paddle.hp)} / ${this.paddle.maxHp}`;
    document.getElementById('mp-text').innerText = `${Math.floor(this.paddle.mp)} / ${this.paddle.maxMp}`;

    // 技能槽冷卻高度與可用性更新
    const skills = ['q', 'w', 'e'];
    skills.forEach((k) => {
      const s = this.paddle.skills[k];
      const slotEl = document.getElementById(`skill-${k}`);
      const overlayEl = document.getElementById(`cd-${k}`);
      if (slotEl && overlayEl) {
        const cdPercent = s.currentCd > 0 ? (s.currentCd / s.maxCd) * 100 : 0;
        overlayEl.style.height = `${cdPercent}%`;

        if (this.paddle.mp < s.cost || s.currentCd > 0) {
          slotEl.classList.add('disabled');
          slotEl.classList.remove('ready');
        } else {
          slotEl.classList.remove('disabled');
          slotEl.classList.add('ready');
        }
      }
    });
  }

  // 繪製背景與物件
  render() {
    const world = this.levelManager.getCurrentWorld();
    const shake = window.particleSystem.getShakeOffset();

    this.ctx.save();
    this.ctx.translate(shake.x, shake.y);

    // 繪製動態背景漸層
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, world.bgGradient[0]);
    bgGrad.addColorStop(1, world.bgGradient[1]);
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 繪製環境微粒
    window.particleSystem.drawAmbient(this.ctx);

    // 繪製磚塊
    for (const brick of this.bricks) {
      brick.draw(this.ctx);
    }

    // 繪製掉落物
    for (const item of this.dropItems) {
      item.draw(this.ctx);
    }

    // 繪製 Boss
    if (this.currentBoss) {
      this.currentBoss.draw(this.ctx);
    }

    // 繪製板子與技能光束
    this.paddle.draw(this.ctx);

    // 繪製球
    for (const ball of this.balls) {
      ball.draw(this.ctx);
    }

    // 繪製一般微粒與衝擊波
    window.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }

  // 迴圈驅動器
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  start() {
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  window.game.start();
});
