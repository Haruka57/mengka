(() => {

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlayEl = document.getElementById('overlay');
  const overlayTitleEl = document.getElementById('overlayTitle');
  const overlayDescEl = document.getElementById('overlayDesc');

  const bgImg = new Image();
  bgImg.src = 'image/background.png';
  const cloudImg = new Image();
  cloudImg.src = 'image/cloud.png';
  const cactusImg = new Image();
  cactusImg.src = 'image/cacti-big.png';
  const roadImg = new Image();
  roadImg.src = 'image/road.jpg';
  // 你提供的图片名是 dino_ducking.png / dino_jump.png
  // 这里将 dino_ducking 当作“站立/奔跑”贴图使用。
  const dinoStandImg = new Image();
  dinoStandImg.src = 'image/dino_ducking.png';
  const dinoJumpImg = new Image();
  dinoJumpImg.src = 'image/dino_jump.png';

  // 逻辑坐标（与 canvas.width/height 一致）
  const W = canvas.width;
  const H = canvas.height;

  // 路面顶边（道路贴图从这里开始往下绘制，保持不变）
  const ROAD_Y = 190;
  // 人物脚底基准线（仅影响人物落地高度）
  const PLAYER_GROUND_Y = 215;
  const GRAVITY = 2400; // px/s^2
  const JUMP_VY = -820; // px/s

  const STATE = {
    running: 'running',
    gameover: 'gameover',
    idle: 'idle',
  };

  let bestScore = Number(localStorage.getItem('dino_best') || '0');
  bestEl.textContent = String(bestScore);

  const player = {
    x: 80,
    y: PLAYER_GROUND_Y,
    w: 34,
    h: 44,
    vy: 0,
    onGround: true,
    legT: 0,
  };

  const world = {
    state: STATE.idle,
    speed: 320, // px/s
    accel: 6,   // px/s^2
    score: 0,
    time: 0,
    lastTs: 0,
    obstacles: [],
    clouds: [],
    spawnTimer: 0,
    nextSpawn: 0.9,
    orientationBlocked: false,
  };

  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const prefersPortrait = () => window.matchMedia && window.matchMedia('(orientation: portrait)').matches;

  function handleOrientationUI() {
    if (!isCoarsePointer) return; // 主要针对手机/平板

    // 手机端：允许竖屏/横屏都能玩（不再阻塞竖屏）。
    // 之前“提示框只在死亡结束后出现”的需求仍然保留。
    world.orientationBlocked = false;

    if (world.state === STATE.gameover) return;

    // 按需求：提示框只在“死亡结束”后显示。
    // 因此无论横竖屏（且未 gameover），都保持隐藏。
    hideOverlay();
  }

  function reset() {
    world.state = STATE.idle;
    world.speed = 320;
    world.score = 0;
    world.time = 0;
    world.lastTs = 0;
    world.obstacles = [];
    world.clouds = [];
    world.spawnTimer = 0;
    world.nextSpawn = rand(0.8, 1.35);

    player.y = PLAYER_GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    player.legT = 0;

    scoreEl.textContent = '0';
    hideOverlay();
    draw(0);
    handleOrientationUI();
  }

  function start() {
    if (world.state === STATE.running) return;
    if (world.orientationBlocked) return;
    hideOverlay();
    world.state = STATE.running;
  }

  function gameOver() {
    world.state = STATE.gameover;
    showOverlay('游戏结束', { descText: '点击继续游戏' });

    if (world.score > bestScore) {
      bestScore = world.score;
      localStorage.setItem('dino_best', String(bestScore));
      bestEl.textContent = String(bestScore);
    }
  }

  function showOverlay(title, { descText = '' } = {}) {
    if (!overlayEl || !overlayTitleEl) return;
    overlayTitleEl.textContent = title;
    if (overlayDescEl) {
      overlayDescEl.textContent = descText;
      overlayDescEl.hidden = !descText;
    }
    overlayEl.hidden = false;
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.hidden = true;
  }

  function jump() {
    if (world.state === STATE.gameover) return;
    if (world.orientationBlocked) return;
    if (world.state === STATE.idle) start();

    if (!player.onGround) return;
    player.onGround = false;
    player.vy = JUMP_VY;
  }

  function spawnObstacle() {

    const tall = Math.random() < 0.35;
    const w = tall ? 18 : 14;
    const h = tall ? 40 : 25;
    const y = ROAD_Y + (player.h - h);

    world.obstacles.push({
      x: W + 20,
      y,
      w,
      h,
    });
  }

  function spawnCloud() {
    // 云走得更慢，位置在天空区域随机
    const scale = rand(0.7, 1.15);
    const w = 64 * scale;
    const h = 24 * scale;
    const y = rand(22, 95);
    world.clouds.push({
      x: W + 20,
      y,
      w,
      h,
      speedMul: rand(0.22, 0.38),
    });
  }

  function update(dt) {
    if (world.orientationBlocked) return;
    if (world.state !== STATE.running) return;

    world.time += dt;
    world.speed += world.accel * dt;

    // 分数：随时间增加
    world.score = Math.floor(world.time * 10);
    scoreEl.textContent = String(world.score);

    // 角色物理
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y >= PLAYER_GROUND_Y) {
      player.y = PLAYER_GROUND_Y;
      player.vy = 0;
      player.onGround = true;
    }

    // 动画：跑动腿部节奏
    player.legT += dt * (player.onGround ? 10 : 2);

    // 生成障碍
    world.spawnTimer += dt;
    if (world.spawnTimer >= world.nextSpawn) {
      world.spawnTimer = 0;
      world.nextSpawn = rand(0.75, 1.35) - Math.min(0.25, world.time * 0.01);
      spawnObstacle();
    }

    // 生成云（稀疏一点）
    if (world.clouds.length < 5 && Math.random() < dt * 0.6) {
      spawnCloud();
    }

    // 更新障碍位置
    for (const o of world.obstacles) {
      o.x -= world.speed * dt;
    }
    // 清理屏幕外障碍
    world.obstacles = world.obstacles.filter(o => o.x + o.w > -20);

    // 更新云位置
    for (const c of world.clouds) {
      c.x -= world.speed * c.speedMul * dt;
    }
    world.clouds = world.clouds.filter(c => c.x + c.w > -30);

    // 碰撞检测
    const px = player.x + 6;
    const py = player.y - player.h + 6;
    const pw = player.w - 12;
    const ph = player.h - 12;

    for (const o of world.obstacles) {
      if (rectsOverlap(px, py, pw, ph, o.x, o.y - o.h, o.w, o.h)) {
        gameOver();
        break;
      }
    }
  }

  function draw(dt) {
    // 背景
    ctx.clearRect(0, 0, W, H);

    // 背景图（未加载时回退到渐变）
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0f1426');
      g.addColorStop(1, '#0b0d10');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // 云层（背景图之上、障碍物之下）
    for (const c of world.clouds) {
      drawCloud(c);
    }

    // 道路贴图（道路高度保持不变）
    const roadTop = ROAD_Y;
    const roadH = H - roadTop;
    if (roadImg.complete && roadImg.naturalWidth > 0 && roadH > 0) {
      const scale = roadH / roadImg.naturalHeight;

      // 关键：把平铺宽度/偏移对齐到整数像素，并让相邻贴图重叠一点点，消除接缝空白
      const tileW = Math.max(1, Math.round(roadImg.naturalWidth * scale));
      const overlap = 3; // 贴图重叠的像素数：增大可更稳，但别太大（避免明显拉伸）
      const scrollX = Math.floor((world.time * world.speed) % tileW);

      for (let x = -scrollX; x < W; x += tileW) {
        const drawX = Math.floor(x);
        ctx.drawImage(roadImg, drawX, roadTop, tileW + overlap, roadH);
      }
    } else {
      // 回退地面：填充块 + 轻微滚动纹理（不画“地面线”）
      ctx.fillStyle = '#0f1320';
      ctx.fillRect(0, roadTop, W, roadH);

      const dashOffset = -((world.time * world.speed) % 40);
      ctx.strokeStyle = '#202739';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 30]);
      ctx.lineDashOffset = dashOffset;
      ctx.beginPath();
      ctx.moveTo(0, roadTop + 14);
      ctx.lineTo(W, roadTop + 14);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 障碍
    for (const o of world.obstacles) {
      drawObstacle(o);
    }

    // 角色
    drawDino(player);

    // Game over 视觉反馈：轻微暗角
    if (world.state === STATE.gameover) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawDino(p) {
    const topY = p.y - p.h;

    // 优先使用人物贴图
    const img = p.onGround ? dinoStandImg : dinoJumpImg;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, p.x, topY, p.w, p.h);
      return;
    }

    // 刚刷新/未开始（idle）时，如果贴图还没加载完，避免绘制回退“小恐龙”，防止慢加载时闪现。
    if (world.state === STATE.idle) {
      return;
    }

    // 回退：矢量人物
    ctx.fillStyle = '#e7eaf0';
    roundRect(ctx, p.x, topY, p.w, p.h, 6);
    ctx.fill();
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(p.x + p.w - 10, topY + 10, 3, 3);
    ctx.fillRect(p.x + p.w - 13, topY + 18, 6, 2);

    const phase = Math.sin(p.legT * Math.PI);
    const legY = p.y - 6;
    ctx.strokeStyle = '#0b0d10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + 10, legY);
    ctx.lineTo(p.x + 10 + phase * 4, legY + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + 22, legY);
    ctx.lineTo(p.x + 22 - phase * 4, legY + 10);
    ctx.stroke();
  }

  function drawCactus(o) {
    ctx.fillStyle = '#7ee787';
    // 主干
    roundRect(ctx, o.x, o.y - o.h, o.w, o.h, 4);
    ctx.fill();
    // 小刺（装饰）
    ctx.fillStyle = 'rgba(11,13,16,0.25)';
    for (let i = 0; i < Math.max(2, Math.floor(o.h / 14)); i++) {
      ctx.fillRect(o.x + 3, o.y - o.h + 6 + i * 12, o.w - 6, 2);
    }
  }

  function drawObstacle(o) {
    // 如果障碍物图片可用，优先绘制图片，否则回退到矢量仙人掌
    if (cactusImg.complete && cactusImg.naturalWidth > 0) {
      ctx.drawImage(cactusImg, o.x, o.y - o.h, o.w, o.h);
      return;
    }
    drawCactus(o);
  }

  function drawCloud(c) {
    if (cloudImg.complete && cloudImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(cloudImg, c.x, c.y, c.w, c.h);
      ctx.globalAlpha = 1;
      return;
    }
    // 回退：简单云
    ctx.fillStyle = 'rgba(231,234,240,0.25)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 10);
    ctx.fill();
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function roundRect(ctx2d, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx2d.beginPath();
    ctx2d.moveTo(x + rr, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, rr);
    ctx2d.arcTo(x + w, y + h, x, y + h, rr);
    ctx2d.arcTo(x, y + h, x, y, rr);
    ctx2d.arcTo(x, y, x + w, y, rr);
    ctx2d.closePath();
  }

  function tick(ts) {
    if (!world.lastTs) world.lastTs = ts;
    const dt = Math.min(0.033, (ts - world.lastTs) / 1000);
    world.lastTs = ts;

    update(dt);
    draw(dt);

    requestAnimationFrame(tick);
  }

  // 输入
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      jump();
      return;
    }

    if (e.code === 'KeyR') {
      e.preventDefault();
      reset();
      return;
    }
  });

  // 点击/触摸也能跳
  canvas.addEventListener('pointerdown', () => {
    jump();
  });

  // 死亡结束后：点击/触碰提示框继续下一局
  if (overlayEl) {
    overlayEl.addEventListener('pointerdown', (e) => {
      if (world.state !== STATE.gameover) return;
      e.preventDefault();
      e.stopPropagation();
      reset();
      start();
    });
  }

  window.addEventListener('resize', handleOrientationUI);
  window.addEventListener('orientationchange', handleOrientationUI);
  try {
    if (window.matchMedia) {
      const mq = window.matchMedia('(orientation: portrait)');
      if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', handleOrientationUI);
    }
  } catch {
    // 忽略旧浏览器差异
  }

  reset();
  requestAnimationFrame(tick);
})();
