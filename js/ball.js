// 彈珠類別與運動物理
class Ball {
  constructor(x = 400, y = 500, radius = 7) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.baseSpeed = 380;
    this.speed = this.baseSpeed;
    this.vx = 0;
    this.vy = 0;
    this.isAttached = true;
    this.damage = 1;

    // 特殊狀態
    this.isFireball = false;
    this.fireTimer = 0;

    // 軌跡歷史記錄
    this.trail = [];
    this.maxTrailLength = 8;
  }

  // 重置回板子上
  attachToPaddle(paddle) {
    this.isAttached = true;
    this.vx = 0;
    this.vy = 0;
    this.x = paddle.x + paddle.width / 2;
    this.y = paddle.y - this.radius - 1;
    this.trail = [];
  }

  // 發射彈珠
  launch(initialAngle = -Math.PI / 2) {
    if (!this.isAttached) return;
    this.isAttached = false;
    // 加入微幅隨機角度防止完全垂直
    const angle = initialAngle + (Math.random() - 0.5) * 0.2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    if (window.soundEngine) {
      window.soundEngine.playPaddleHit(0.5);
    }
  }

  // 啟用烈焰穿透狀態
  activateFireball(duration = 6.0) {
    this.isFireball = true;
    this.fireTimer = duration;
    if (window.particleSystem) {
      window.particleSystem.createShockwave(this.x, this.y, 50, '#f97316');
    }
  }

  update(dt, paddle, canvasWidth, canvasHeight) {
    if (this.isAttached) {
      this.x = paddle.x + paddle.width / 2;
      this.y = paddle.y - this.radius - 1;
      return;
    }

    // 烈焰計時
    if (this.isFireball) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.isFireball = false;
      }
      if (window.particleSystem) {
        window.particleSystem.createSpark(this.x, this.y, '#f97316', 2);
      }
    }

    // 記錄殘影
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    // 位置推進
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 左右牆壁反彈
    if (this.x - this.radius <= 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      if (window.soundEngine) window.soundEngine.playPaddleHit(0.2);
    } else if (this.x + this.radius >= canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
      if (window.soundEngine) window.soundEngine.playPaddleHit(0.8);
    }

    // 頂部邊界反彈
    if (this.y - this.radius <= 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      if (window.soundEngine) window.soundEngine.playPaddleHit(0.5);
    }

    // 規範速度向量大小，維持動能恆定或受控
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > 0.01) {
      const targetSpeed = this.speed * (this.isFireball ? 1.15 : 1.0);
      const ratio = targetSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
  }

  // 檢測與板子碰撞
  checkPaddleCollision(paddle) {
    if (this.isAttached) return false;

    // 簡化 AABB 檢測球體下沿與板子頂部
    if (
      this.y + this.radius >= paddle.y &&
      this.y - this.radius <= paddle.y + paddle.height &&
      this.x + this.radius >= paddle.x &&
      this.x - this.radius <= paddle.x + paddle.width
    ) {
      if (this.vy > 0) {
        // 確保球在板子上方
        this.y = paddle.y - this.radius;

        // 計算撞擊位置比例 (-1.0 至 +1.0)
        const hitOffset = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        const clampedOffset = Math.max(-0.95, Math.min(0.95, hitOffset));

        // 反彈角度：中間為 90 度，邊緣最大偏移至 75 度
        const maxBounceAngle = (75 * Math.PI) / 180;
        const bounceAngle = clampedOffset * maxBounceAngle;

        const currentSpeed = Math.hypot(this.vx, this.vy);
        this.vx = currentSpeed * Math.sin(bounceAngle);
        this.vy = -currentSpeed * Math.cos(bounceAngle);

        if (window.soundEngine) {
          window.soundEngine.playPaddleHit((clampedOffset + 1) / 2);
        }
        if (window.particleSystem) {
          window.particleSystem.createSpark(this.x, this.y, '#38bdf8', 6);
        }
        return true;
      }
    }
    return false;
  }

  draw(ctx) {
    // 繪製光流殘影
    for (let i = 0; i < this.trail.length; i++) {
      const pos = this.trail[i];
      const alpha = (i / this.trail.length) * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.isFireball ? '#f97316' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.radius * (i / this.trail.length), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 主體球
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    if (this.isFireball) {
      const grad = ctx.createRadialGradient(
        this.x - 2, this.y - 2, 1,
        this.x, this.y, this.radius + 3
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#fde047');
      grad.addColorStop(0.7, '#ea580c');
      grad.addColorStop(1, '#9a3412');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
    } else {
      const grad = ctx.createRadialGradient(
        this.x - 2, this.y - 2, 1,
        this.x, this.y, this.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#7dd3fc');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
    }

    ctx.fill();
    ctx.restore();
  }
}

window.Ball = Ball;
