const GRID_SIZE = 20;
const CELL = 20;
const TICK_MS = 120;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function equal(a, b) {
  return a.x === b.x && a.y === b.y;
}

function withinBounds(pos) {
  return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
}

function isOpposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

function randomInt(max, rng = Math.random) {
  return Math.floor(rng() * max);
}

function placeFood(snake, rng = Math.random) {
  const occupied = new Set(snake.map((seg) => `${seg.x},${seg.y}`));
  const free = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[randomInt(free.length, rng)];
}

export function createInitialState(rng = Math.random) {
  const snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  return {
    snake,
    direction: DIRS.right,
    pendingDirection: DIRS.right,
    food: placeFood(snake, rng),
    score: 0,
    alive: true,
    paused: false,
  };
}

export function stepState(state, rng = Math.random) {
  if (!state.alive || state.paused) return state;

  const direction = state.pendingDirection;
  const head = state.snake[0];
  const next = add(head, direction);
  const ate = state.food && equal(next, state.food);

  if (!withinBounds(next)) {
    return { ...state, alive: false };
  }

  const body = ate ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = body.some((seg) => equal(seg, next));
  if (hitsSelf) {
    return { ...state, alive: false };
  }

  const newSnake = [next, ...state.snake];
  if (!ate) newSnake.pop();

  const newFood = ate ? placeFood(newSnake, rng) : state.food;

  return {
    ...state,
    snake: newSnake,
    direction,
    food: newFood,
    score: ate ? state.score + 1 : state.score,
  };
}

function draw(ctx, state) {
  ctx.clearRect(0, 0, GRID_SIZE * CELL, GRID_SIZE * CELL);
  ctx.fillStyle = "#fefcf8";
  ctx.fillRect(0, 0, GRID_SIZE * CELL, GRID_SIZE * CELL);

  ctx.fillStyle = "#2c5f5d";
  state.snake.forEach((seg, index) => {
    ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL, CELL);
    if (index === 0) {
      ctx.fillStyle = "#214746";
      ctx.fillRect(seg.x * CELL + 4, seg.y * CELL + 4, CELL - 8, CELL - 8);
      ctx.fillStyle = "#2c5f5d";
    }
  });

  if (state.food) {
    ctx.fillStyle = "#c95f2a";
    ctx.fillRect(state.food.x * CELL + 4, state.food.y * CELL + 4, CELL - 8, CELL - 8);
  }
}

function setup() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const statusEl = document.getElementById("status");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const dpad = document.querySelector(".dpad");

  let state = createInitialState();
  let timer = null;

  function updateUI() {
    scoreEl.textContent = String(state.score);
    if (!state.alive) {
      statusEl.textContent = "Game Over";
    } else if (state.paused) {
      statusEl.textContent = "Paused";
    } else {
      statusEl.textContent = "";
    }
  }

  function tick() {
    state = stepState(state);
    draw(ctx, state);
    updateUI();
  }

  function start() {
    state = createInitialState();
    draw(ctx, state);
    updateUI();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
  }

  function togglePause() {
    state = { ...state, paused: !state.paused };
    updateUI();
  }

  function setDirection(nextDir) {
    if (!nextDir) return;
    if (isOpposite(state.direction, nextDir)) return;
    state = { ...state, pendingDirection: nextDir };
  }

  function handleKey(e) {
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) {
      e.preventDefault();
    }

    if (key === " " ) {
      togglePause();
      return;
    }

    if (key === "arrowup" || key === "w") setDirection(DIRS.up);
    if (key === "arrowdown" || key === "s") setDirection(DIRS.down);
    if (key === "arrowleft" || key === "a") setDirection(DIRS.left);
    if (key === "arrowright" || key === "d") setDirection(DIRS.right);
  }

  document.addEventListener("keydown", handleKey);
  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", togglePause);

  if (dpad) {
    dpad.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-dir]");
      if (!btn) return;
      setDirection(DIRS[btn.dataset.dir]);
    });
  }

  start();
}

setup();
