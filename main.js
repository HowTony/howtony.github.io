const buttons = [...document.querySelectorAll(".lands button")];
const tiers = [...document.querySelectorAll(".tier")];

function selectLand(land) {
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.land === land)));
  tiers.forEach((tier) => tier.classList.toggle("is-active", tier.dataset.land === land));
}

if (buttons.length) {
  buttons.forEach((button) => button.addEventListener("click", () => selectLand(button.dataset.land)));
  tiers.forEach((tier) => tier.addEventListener("click", () => selectLand(tier.dataset.land)));
  selectLand("crown");
}

document.querySelectorAll("img[data-optional]").forEach((image) => {
  const hide = () => image.closest("figure").classList.add("is-empty");
  if (image.complete && image.naturalWidth === 0) hide();
  image.addEventListener("error", hide);
});

const carousel = document.getElementById("carousel");

if (carousel) {
  const races = [...carousel.querySelectorAll(".race")];
  const tabs = [...document.querySelectorAll(".roster a")];
  const back = carousel.querySelector(".carousel__arrow--back");
  const next = carousel.querySelector(".carousel__arrow--next");
  let current = 0;

  function show(index, updateAddress) {
    current = (index + races.length) % races.length;
    races.forEach((race, i) => race.classList.toggle("is-shown", i === current));
    tabs.forEach((tab, i) => (i === current ? tab.setAttribute("aria-current", "true") : tab.removeAttribute("aria-current")));
    if (updateAddress) history.replaceState(null, "", `#${races[current].id}`);
  }

  function fromAddress() {
    const found = races.findIndex((race) => `#${race.id}` === location.hash);
    show(found === -1 ? 0 : found, false);
  }

  carousel.classList.add("is-live");
  back.hidden = false;
  next.hidden = false;
  back.addEventListener("click", () => show(current - 1, true));
  next.addEventListener("click", () => show(current + 1, true));
  tabs.forEach((tab, i) => tab.addEventListener("click", (event) => {
    event.preventDefault();
    show(i, true);
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1, true);
    if (event.key === "ArrowRight") show(current + 1, true);
  });

  let touchStart = null;
  carousel.addEventListener("touchstart", (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", (event) => {
    if (touchStart === null) return;
    const moved = event.changedTouches[0].clientX - touchStart;
    touchStart = null;
    if (Math.abs(moved) > 50) show(current + (moved < 0 ? 1 : -1), true);
  });

  window.addEventListener("hashchange", fromAddress);
  fromAddress();
}

const ravensBack = document.getElementById("ravens-back");
const ravensFront = document.getElementById("ravens-front");

if (ravensBack && ravensFront) {
  const FRAMES = 8;
  const LOOP = 7;
  const FLOCK = 7;
  const KEEP_X = 2130 / 2560;
  const KEEP_Y = 590 / 1439;
  const SKY_LIMIT = 0.42;
  const FRAME_MS = 33;
  const SCOUT_SPEED = 62;
  const layers = [ravensBack, ravensFront].map((canvas) => ({ canvas, context: canvas.getContext("2d") }));
  const plate = document.querySelector(".decree__plate");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sheet = new Image();
  const glide = new Image();
  const flock = [];
  const scouts = [];
  let pointerX = 0;
  let pointerY = 0;
  let centreX = 0;
  let centreY = 0;
  let unit = 1;
  let width = 0;
  let height = 0;
  let last = 0;
  let running = false;

  function measure() {
    const box = plate.getBoundingClientRect();
    const hero = ravensBack.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.25);
    const shown = getComputedStyle(plate).objectPosition.split(" ").map(parseFloat);
    const fit = Math.max(box.width / 2560, box.height / 1439);
    const spareX = box.width - 2560 * fit;
    const spareY = box.height - 1439 * fit;
    width = hero.width;
    height = hero.height;
    unit = fit;
    centreX = (spareX * shown[0]) / 100 + 2560 * fit * KEEP_X;
    centreY = (spareY * shown[1]) / 100 + 1439 * fit * KEEP_Y;
    layers.forEach(({ canvas, context }) => {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    });
  }

  function hatch(index) {
    return {
      angle: (index / FLOCK) * Math.PI * 2 + Math.random() * 0.5,
      speed: 0.17 + Math.random() * 0.12,
      reachX: 200 + Math.random() * 300,
      reachY: 60 + Math.random() * 90,
      rise: -80 + Math.random() * 150,
      size: 32 + Math.random() * 12,
      flap: Math.random() * FRAMES,
      beats: 2 + Math.random() * 3,
      glide: 0,
      sway: Math.random() * Math.PI * 2,
    };
  }

  function sprite(raven, layer, x, y, size, alpha, facing) {
    const { context } = layers[layer];
    const source = raven.glide > 0 ? glide : sheet;
    const cell = source === sheet ? sheet.naturalWidth / FRAMES : glide.naturalWidth;
    const frame = source === sheet ? Math.floor(raven.flap) % LOOP : 0;
    const tall = source.naturalHeight / cell;
    const drawn = source === glide ? size * 1.5 : size;
    context.save();
    context.globalAlpha = alpha;
    context.translate(x, y);
    context.scale(facing, 1);
    context.drawImage(source, frame * cell, 0, cell, source.naturalHeight, -drawn / 2, (-drawn * tall) / 2, drawn, drawn * tall);
    context.restore();
  }

  function draw(raven) {
    const near = Math.sin(raven.angle);
    const x = centreX + Math.cos(raven.angle) * raven.reachX * unit;
    const y = centreY + (near * raven.reachY + raven.rise + Math.sin(raven.sway) * 16) * unit;
    const size = raven.size * unit * (0.66 + near * 0.34);
    const facing = -Math.sin(raven.angle) >= 0 ? 1 : -1;
    sprite(raven, near > 0 ? 1 : 0, x, y, size, 0.58 + (near + 1) * 0.21, facing);
  }

  function scout(index) {
    return {
      x: width * (0.2 + index * 0.18),
      y: height * (0.14 + index * 0.05),
      moveX: 0,
      moveY: 0,
      offset: Math.random() * Math.PI * 2,
      facing: 1,
      flap: Math.random() * FRAMES,
      beats: 2 + Math.random() * 3,
      glide: 0,
      sway: Math.random() * Math.PI * 2,
    };
  }

  function steer(raven, step) {
    raven.sway += step * 0.5;
    const goalX = pointerX + Math.cos(raven.sway + raven.offset) * width * 0.09;
    const goalY = Math.min(pointerY, height * SKY_LIMIT) + Math.sin(raven.sway * 1.3 + raven.offset) * height * 0.05;
    raven.moveX += (goalX - raven.x) * step * 0.14;
    raven.moveY += (goalY - raven.y) * step * 0.14;
    const speed = Math.hypot(raven.moveX, raven.moveY);
    if (speed > SCOUT_SPEED) {
      raven.moveX *= SCOUT_SPEED / speed;
      raven.moveY *= SCOUT_SPEED / speed;
    }
    raven.moveX *= 1 - step * 0.35;
    raven.moveY *= 1 - step * 0.35;
    raven.x += raven.moveX * step;
    raven.y += raven.moveY * step;
    if (Math.abs(raven.moveX) > 3) raven.facing = raven.moveX > 0 ? 1 : -1;
  }

  function advance(raven, step) {
    if (raven.angle !== undefined) raven.angle += raven.speed * step;
    if (raven.angle !== undefined) raven.sway += step * 0.7;
    if (raven.glide > 0) {
      raven.glide -= step;
      if (raven.glide <= 0) raven.beats = 2 + Math.random() * 3;
    } else {
      raven.flap += step * 14;
      raven.beats -= step;
      if (raven.beats <= 0) raven.glide = 1.5 + Math.random() * 3;
    }
  }

  function paint() {
    layers.forEach(({ context }) => context.clearRect(0, 0, width, height));
    flock.forEach(draw);
    scouts.forEach((raven) => sprite(raven, 0, raven.x, raven.y, 15 + unit * 8, 0.55, raven.facing));
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - last < FRAME_MS) return;
    const step = Math.min((now - last) / 1000, 0.1);
    last = now;
    flock.forEach((raven) => advance(raven, step));
    scouts.forEach((raven) => {
      advance(raven, step);
      steer(raven, step);
    });
    paint();
  }

  function start() {
    for (let i = 0; i < FLOCK; i += 1) flock.push(hatch(i));
    measure();
    if (!calm && matchMedia("(hover: hover) and (pointer: fine)").matches) {
      pointerX = width * 0.4;
      pointerY = height * 0.2;
      for (let i = 0; i < 3; i += 1) scouts.push(scout(i));
      document.querySelector(".decree").addEventListener("pointermove", (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY + scrollY;
      }, { passive: true });
    }
    new ResizeObserver(() => {
      measure();
      paint();
    }).observe(ravensBack);
    if (calm) {
      paint();
      return;
    }
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) {
        last = performance.now();
        requestAnimationFrame(frame);
      }
    }).observe(ravensBack);
  }

  Promise.all([sheet, glide].map((image) => new Promise((resolve) => image.addEventListener("load", resolve, { once: true })))).then(start);
  sheet.src = "assets/art/ravens/raven_sheet.webp?v=2";
  glide.src = "assets/art/ravens/raven_glide.webp?v=2";
}
