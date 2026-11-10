// 掉落物與強化道具
class DropItem {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'gold', 'multiball', 'expand', 'heal', 'mana', 'fire'
    this.vy = 140;
    this.width = 20;
    this.height = 20;
    this.isCollected = false;
  }

  update(dt) {
    this.y += this.vy * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === 'gold') {
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.5);
    } else {
      ctx.beginPath();
      ctx.roundRect(-9, -9, 18, 18, 4);
      let color = '#3b82f6';
      let symbol = '+';

      if (this.type === 'multiball') {
        color = '#38bdf8';
        symbol = '3';
      } else if (this.type === 'expand') {
        color = '#a855f7';
        symbol = '<>';
      } else if (this.type === 'heal') {
        color = '#ef4444';
        symbol = 'H';
      } else if (this.type === 'mana') {
        color = '#3b82f6';
        symbol = 'M';
      } else if (this.type === 'fire') {
        color = '#f97316';
        symbol = 'F';
      }

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, 0, 0);
    }

    ctx.restore();
  }

  checkCollision(paddle) {
    return (
      this.x >= paddle.x &&
      this.x <= paddle.x + paddle.width &&
      this.y >= paddle.y &&
      this.y <= paddle.y + paddle.height
    );
  }
}

// 磚塊基礎類別與衍生特殊磚塊
class Brick {
  constructor(x, y, width, height, type = 'normal', theme = 'forest') {
    this.x = x;
    this.y = y;
    this.initialX = x;
    this.width = width;
    this.height = height;
    this.type = type; // normal, armored, vine, spore, quicksand, bomb, ice, bubble
    this.theme = theme;
    this.isDestroyed = false;

    // 耐久度設定
    this.maxHp = 1;
    if (this.type === 'armored') this.maxHp = 3;
    if (this.type === 'bubble') this.maxHp = 2;
    if (this.type === 'vine') this.maxHp = 2;
    this.hp = this.maxHp;

    // 藤蔓再生計時
    this.regenTimer = 0;

    // 流沙水平晃動
    this.movePhase = Math.random() * Math.PI * 2;

    // 磚塊基礎顏色定義
    this.baseColor = this.resolveColor();
  }

  resolveColor() {
    switch (this.type) {
      case 'armored':
        return '#94a3b8'; // 堅固金屬灰
      case 'vine':
        return '#15803d'; // 茂密深藤綠
      case 'spore':
        return '#84cc16'; // 毒孢螢光綠
      case 'quicksand':
        return '#ca8a04'; // 黃沙岩色
      case 'bomb':
        return '#dc2626'; // 炸彈赤紅
      case 'ice':
        return '#38bdf8'; // 冰晶淡藍
      case 'bubble':
        return '#0284c7'; // 氣泡海水藍
      default:
        // 普通磚依主題配色
        if (this.theme === 'forest') return '#22c55e';
        if (this.theme === 'desert') return '#eab308';
        return '#0ea5e9'; // ocean
    }
  }

  update(dt) {
    // 藤蔓自我再生邏輯
    if (this.type === 'vine' && this.hp < this.maxHp && !this.isDestroyed) {
      this.regenTimer += dt;
      if (this.regenTimer >= 7.0) {
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.regenTimer = 0;
        if (window.particleSystem) {
          window.particleSystem.createSpark(
            this.x + this.width / 2,
            this.y + this.height / 2,
            '#4ade80',
            5
          );
        }
      }
    }

    // 流沙磚緩慢水平橫移
    if (this.type === 'quicksand' && !this.isDestroyed) {
      this.movePhase += dt * 1.5;
      this.x = this.initialX + Math.sin(this.movePhase) * 16;
    }
  }

  // 承受傷害
  hit(damage = 1, isFireball = false) {
    const finalDamage = isFireball ? Math.max(damage, 2) : damage;
    this.hp -= finalDamage;

    if (this.hp <= 0) {
      this.isDestroyed = true;
      return true; // 擊毀
    }
    return false; // 僅受損
  }

  // 檢測與彈珠碰撞（返回 'none' / 'horizontal' / 'vertical'）
  checkBallCollision(ball) {
    if (this.isDestroyed) return null;

    // 尋找磚塊距離球心最近的點
    const closestX = Math.max(this.x, Math.min(ball.x, this.x + this.width));
    const closestY = Math.max(this.y, Math.min(ball.y, this.y + this.height));

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distanceSquared = distX * distX + distY * distY;

    if (distanceSquared < ball.radius * ball.radius) {
      // 發生碰撞，判定反彈方向
      const overlapLeft = Math.abs(ball.x - this.x);
      const overlapRight = Math.abs(ball.x - (this.x + this.width));
      const overlapTop = Math.abs(ball.y - this.y);
      const overlapBottom = Math.abs(ball.y - (this.y + this.height));

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        return 'horizontal';
      } else {
        return 'vertical';
      }
    }
    return null;
  }

  // 生成掉落物
  spawnDrops() {
    const drops = [];
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    // 70% 機率掉落金幣
    if (Math.random() < 0.7) {
      drops.push(new DropItem(centerX, centerY, 'gold'));
    }

    // 25% 機率掉落強化道具
    if (Math.random() < 0.25) {
      const types = ['multiball', 'expand', 'heal', 'mana', 'fire'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      drops.push(new DropItem(centerX, centerY, chosenType));
    }

    return drops;
  }

  draw(ctx) {
    if (this.isDestroyed) return;

    ctx.save();
    const corner = 3;

    // 根據殘餘生命值調整明暗
    ctx.fillStyle = this.baseColor;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, corner);
    ctx.fill();

    // 頂部高光質感
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height * 0.4, [corner, corner, 0, 0]);
    ctx.fill();

    // 邊框
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, corner);
    ctx.stroke();

    // 損壞裂紋繪製（生命值低於上限時）
    if (this.hp < this.maxHp) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.x + this.width * 0.3, this.y + 2);
      ctx.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.6);
      ctx.lineTo(this.x + this.width * 0.7, this.y + this.height - 2);
      ctx.stroke();
    }

    // 特殊標識繪製
    if (this.type === 'bomb') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', this.x + this.width / 2, this.y + this.height / 2);
    } else if (this.type === 'bubble') {
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
    } else if (this.type === 'spore') {
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

window.Brick = Brick;
window.DropItem = DropItem;
