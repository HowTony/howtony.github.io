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

const ravenCanvas = document.getElementById("ravens");

if (ravenCanvas) {
  const context = ravenCanvas.getContext("2d");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flock = [];
  let width = 0;
  let height = 0;
  let scale = 1;
  let last = 0;
  let running = false;

  function resize() {
    const box = ravenCanvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    scale = Math.max(0.7, Math.min(width / 1400, 1.3));
    ravenCanvas.width = width * ratio;
    ravenCanvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function spawn(raven, anywhere) {
    raven.size = 10 + Math.random() * 9;
    raven.heading = Math.random() < 0.5 ? 1 : -1;
    raven.x = anywhere ? Math.random() * width : raven.heading > 0 ? -40 : width + 40;
    raven.base = height * (0.12 + Math.random() * 0.34);
    raven.speed = 26 + raven.size * 3 + Math.random() * 14;
    raven.drift = Math.random() * Math.PI * 2;
    raven.flap = Math.random() * Math.PI * 2;
    raven.glide = Math.random() * 3;
  }

  function draw(raven) {
    const y = raven.base + Math.sin(raven.drift) * 14;
    const size = raven.size * scale;
    const gliding = raven.glide > 0;
    const lift = gliding ? 0.32 : Math.sin(raven.flap) * 0.85;
    context.save();
    context.translate(raven.x, y);
    context.scale(raven.heading, 1);
    context.fillStyle = "#0c0e13";
    context.beginPath();
    context.ellipse(0, 0, size * 0.62, size * 0.15, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(size * 0.62, 0);
    context.lineTo(size * 0.86, size * 0.05);
    context.lineTo(size * 0.6, size * 0.09);
    context.fill();
    context.beginPath();
    context.moveTo(-size * 0.5, 0);
    context.lineTo(-size * 0.98, -size * 0.1);
    context.lineTo(-size * 0.98, size * 0.12);
    context.fill();
    for (const side of [1, -0.82]) {
      context.beginPath();
      context.moveTo(size * 0.2, 0);
      context.quadraticCurveTo(size * 0.05, -size * lift * side * 0.7, -size * 0.45, -size * lift * side * 1.55 - size * 0.02);
      context.quadraticCurveTo(-size * 0.28, -size * lift * side * 0.45, -size * 0.22, size * 0.04);
      context.fill();
    }
    context.restore();
  }

  function frame(now) {
    if (!running) return;
    const step = Math.min((now - last) / 1000, 0.05);
    last = now;
    context.clearRect(0, 0, width, height);
    for (const raven of flock) {
      raven.x += raven.heading * raven.speed * scale * step;
      raven.drift += step * 0.5;
      if (raven.glide > 0) {
        raven.glide -= step;
        if (raven.glide <= 0) raven.beats = 3 + Math.random() * 4;
      } else {
        raven.flap += step * 8;
        raven.beats -= step * 1.3;
        if (raven.beats <= 0) raven.glide = 1 + Math.random() * 3.5;
      }
      if (raven.x < -60 || raven.x > width + 60) spawn(raven, false);
      draw(raven);
    }
    requestAnimationFrame(frame);
  }

  resize();
  for (let i = 0; i < 6; i += 1) {
    const raven = { beats: 3 };
    spawn(raven, true);
    flock.push(raven);
  }
  addEventListener("resize", resize);

  if (calm) {
    flock.forEach(draw);
  } else {
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) {
        last = performance.now();
        requestAnimationFrame(frame);
      }
    }).observe(ravenCanvas);
  }
}
