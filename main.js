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
  const SCOUTS = 3;
  const KEEP_X = 2130 / 2560;
  const KEEP_Y = 590 / 1439;
  const SKY_LIMIT = 0.66;
  const SCOUT_SPEED = 320;
  const BASE_WIDTH = 64;
  const plate = document.querySelector(".decree__plate");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    const shown = getComputedStyle(plate).objectPosition.split(" ").map(parseFloat);
    const fit = Math.max(box.width / 2560, box.height / 1439);
    width = hero.width;
    height = hero.height;
    unit = fit;
    centreX = ((box.width - 2560 * fit) * shown[0]) / 100 + 2560 * fit * KEEP_X;
    centreY = ((box.height - 1439 * fit) * shown[1]) / 100 + 1439 * fit * KEEP_Y;
  }

  function bird(state) {
    const element = document.createElement("div");
    element.className = "raven";
    ravensBack.append(element);
    return { ...state, element, layer: ravensBack, frame: -1, gliding: false };
  }

  function hatch(index) {
    return bird({
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
    });
  }

  function scout(index) {
    return bird({
      x: width * (0.2 + index * 0.18),
      y: height * (0.2 + index * 0.08),
      moveX: 0,
      moveY: 0,
      offset: Math.random() * Math.PI * 2,
      facing: 1,
      flap: Math.random() * FRAMES,
      beats: 2 + Math.random() * 3,
      glide: 0,
      sway: Math.random() * Math.PI * 2,
    });
  }

  function place(raven, layer, x, y, size, alpha, facing) {
    const { element } = raven;
    const gliding = raven.glide > 0;
    const frame = gliding ? 0 : Math.floor(raven.flap) % LOOP;
    if (raven.layer !== layer) {
      layer.append(element);
      raven.layer = layer;
    }
    if (gliding !== raven.gliding) {
      element.classList.toggle("raven--glide", gliding);
      raven.gliding = gliding;
      raven.frame = -1;
    }
    if (frame !== raven.frame) {
      element.style.backgroundPosition = gliding ? "0 0" : `${(frame / (FRAMES - 1)) * 100}% 0`;
      raven.frame = frame;
    }
    const scale = size / BASE_WIDTH;
    element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${facing * scale}, ${scale})`;
    element.style.opacity = alpha;
  }

  function orbit(raven) {
    const near = Math.sin(raven.angle);
    const x = centreX + Math.cos(raven.angle) * raven.reachX * unit;
    const y = centreY + (near * raven.reachY + raven.rise + Math.sin(raven.sway) * 16) * unit;
    const size = raven.size * unit * (0.66 + near * 0.34);
    const facing = -Math.sin(raven.angle) >= 0 ? 1 : -1;
    place(raven, near > 0 ? ravensFront : ravensBack, x, y, size, 0.58 + (near + 1) * 0.21, facing);
  }

  function advance(raven, step) {
    if (raven.glide > 0) {
      raven.glide -= step;
      if (raven.glide <= 0) raven.beats = 2 + Math.random() * 3;
    } else {
      raven.flap += step * 14;
      raven.beats -= step;
      if (raven.beats <= 0) raven.glide = 1.5 + Math.random() * 3;
    }
  }

  function steer(raven, step) {
    raven.sway += step * 0.5;
    const goalX = pointerX + Math.cos(raven.sway * 2 + raven.offset) * 46;
    const goalY = Math.min(pointerY, height * SKY_LIMIT) + Math.sin(raven.sway * 2.6 + raven.offset) * 28;
    raven.moveX += (goalX - raven.x) * step * 1.8;
    raven.moveY += (goalY - raven.y) * step * 1.8;
    const speed = Math.hypot(raven.moveX, raven.moveY);
    if (speed > SCOUT_SPEED) {
      raven.moveX *= SCOUT_SPEED / speed;
      raven.moveY *= SCOUT_SPEED / speed;
    }
    raven.moveX *= 1 - step * 1.4;
    raven.moveY *= 1 - step * 1.4;
    raven.x += raven.moveX * step;
    raven.y += raven.moveY * step;
    if (Math.abs(raven.moveX) > 3) raven.facing = raven.moveX > 0 ? 1 : -1;
  }

  function paint() {
    flock.forEach(orbit);
    scouts.forEach((raven) => place(raven, ravensBack, raven.x, raven.y, 18 + unit * 10, 0.8, raven.facing));
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const step = Math.min((now - last) / 1000, 0.1);
    last = now;
    flock.forEach((raven) => {
      raven.angle += raven.speed * step;
      raven.sway += step * 0.7;
      advance(raven, step);
    });
    scouts.forEach((raven) => {
      advance(raven, step);
      steer(raven, step);
    });
    paint();
  }

  measure();
  for (let i = 0; i < FLOCK; i += 1) flock.push(hatch(i));
  if (!calm && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    pointerX = width * 0.4;
    pointerY = height * 0.2;
    for (let i = 0; i < SCOUTS; i += 1) scouts.push(scout(i));
    addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY + scrollY;
    }, { passive: true });
  }
  new ResizeObserver(() => {
    measure();
    paint();
  }).observe(ravensBack);
  paint();
  if (!calm) {
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) {
        last = performance.now();
        requestAnimationFrame(frame);
      }
    }).observe(ravensBack);
  }
}
