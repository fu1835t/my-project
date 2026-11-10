// 關卡配置與磚塊佈局
class LevelManager {
  constructor() {
    this.currentWorldIndex = 0;
    this.currentStageIndex = 0;

    // 關卡世界定義
    this.worlds = [
      {
        id: 'forest',
        name: '翡翠森林',
        description: '生機盎然的古老林地，藤蔓具備自癒再生能力，小心毒孢減速。',
        bgGradient: ['#062316', '#020e09'],
        stages: [
          { name: '1-1 森林外緣', isBoss: false },
          { name: '1-2 孢子密林', isBoss: false },
          { name: '1-Boss 遠古神木靈', isBoss: true }
        ]
      },
      {
        id: 'desert',
        name: '灼熱沙漠',
        description: '黃沙翻騰的荒漠遺蹟，流沙磚會水平漂移，TNT 磚可引發大範圍連鎖殉爆。',
        bgGradient: ['#2e1906', '#120a02'],
        stages: [
          { name: '2-1 荒漠哨站', isBoss: false },
          { name: '2-2 炸藥古蹟', isBoss: false },
          { name: '2-Boss 法老神殿', isBoss: true }
        ]
      },
      {
        id: 'ocean',
        name: '蒼藍深淵',
        description: '暗潮湧動的水下帝國，具備氣泡護盾與引爆周圍冰晶的冰霜磚塊。',
        bgGradient: ['#041e30', '#010a12'],
        stages: [
          { name: '3-1 珊瑚礁潮', isBoss: false },
          { name: '3-2 冰晶深溝', isBoss: false },
          { name: '3-Boss 克拉肯巢穴', isBoss: true }
        ]
      }
    ];
  }

  getCurrentWorld() {
    return this.worlds[this.currentWorldIndex];
  }

  getCurrentStage() {
    return this.getCurrentWorld().stages[this.currentStageIndex];
  }

  // 推進到下一關
  nextStage() {
    const currentWorld = this.getCurrentWorld();
    if (this.currentStageIndex < currentWorld.stages.length - 1) {
      this.currentStageIndex++;
      return { type: 'STAGE_ADVANCE' };
    } else {
      if (this.currentWorldIndex < this.worlds.length - 1) {
        this.currentWorldIndex++;
        this.currentStageIndex = 0;
        return { type: 'WORLD_ADVANCE' };
      } else {
        return { type: 'VICTORY' };
      }
    }
  }

  // 生成當前關卡的磚塊集合
  generateBricks(canvasWidth) {
    const world = this.getCurrentWorld();
    const stage = this.getCurrentStage();
    const bricks = [];

    const brickWidth = 62;
    const brickHeight = 22;
    const paddingX = 8;
    const paddingY = 8;
    const cols = 11;
    const startX = (canvasWidth - (cols * (brickWidth + paddingX) - paddingX)) / 2;
    const startY = 80;

    // Boss 關卡磚塊數量較少且置於下方防護
    if (stage.isBoss) {
      const bossRows = 2;
      for (let r = 0; r < bossRows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c % 2 === 0 || r === 1) {
            const bx = startX + c * (brickWidth + paddingX);
            const by = 190 + r * (brickHeight + paddingY);
            let bType = 'normal';
            if (world.id === 'forest' && c % 3 === 0) bType = 'vine';
            if (world.id === 'desert' && c % 4 === 0) bType = 'quicksand';
            if (world.id === 'ocean' && c % 3 === 0) bType = 'bubble';
            bricks.push(new Brick(bx, by, brickWidth, brickHeight, bType, world.id));
          }
        }
      }
      return bricks;
    }

    // 一般關卡依據世界與小關配置
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = startX + c * (brickWidth + paddingX);
        const by = startY + r * (brickHeight + paddingY);

        let type = 'normal';

        if (world.id === 'forest') {
          if (this.currentStageIndex === 0) {
            if ((r + c) % 4 === 0) type = 'vine';
            else if (r === 0) type = 'armored';
          } else {
            // 1-2 孢子密林
            if ((r + c) % 5 === 0) type = 'spore';
            else if ((r + c) % 3 === 0) type = 'vine';
            else if (r === 0 || r === 1) type = 'armored';
          }
        } else if (world.id === 'desert') {
          if (this.currentStageIndex === 0) {
            if (r === 2) type = 'quicksand';
            else if ((r + c) % 3 === 0) type = 'armored';
          } else {
            // 2-2 炸藥古蹟
            if ((r === 1 && c === 2) || (r === 1 && c === 8) || (r === 3 && c === 5)) {
              type = 'bomb';
            } else if (r === 2) {
              type = 'quicksand';
            } else {
              type = 'armored';
            }
          }
        } else {
          // ocean
          if (this.currentStageIndex === 0) {
            if (r % 2 === 0) type = 'bubble';
            else if ((r + c) % 4 === 0) type = 'ice';
          } else {
            // 3-2 冰晶深溝
            if ((r + c) % 3 === 0) type = 'ice';
            else if ((r + c) % 2 === 0) type = 'bubble';
            else type = 'armored';
          }
        }

        bricks.push(new Brick(bx, by, brickWidth, brickHeight, type, world.id));
      }
    }

    return bricks;
  }
}

window.LevelManager = LevelManager;
