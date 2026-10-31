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

if (ravenCanvas && !ravenCanvas.hidden) {
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
    scale = Math.max(0.65, Math.min(width / 1300, 1.4));
    ravenCanvas.width = width * ratio;
    ravenCanvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function spawn(raven, anywhere) {
    raven.size = 12 + Math.random() * 11;
    raven.heading = Math.random() < 0.5 ? 1 : -1;
    raven.x = anywhere ? Math.random() * width : raven.heading > 0 ? -40 : width + 40;
    raven.base = height * (0.14 + Math.random() * 0.3);
    raven.speed = 26 + raven.size * 3 + Math.random() * 14;
    raven.drift = Math.random() * Math.PI * 2;
    raven.flap = Math.random() * Math.PI * 2;
    raven.glide = Math.random() * 3;
  }

  function wing(size, side, lift) {
    context.beginPath();
    context.moveTo(side * size * 0.08, -size * 0.06);
    context.quadraticCurveTo(side * size * 0.62, -size * (lift * 0.95 + 0.12), side * size * 1.34, -size * lift * 0.62);
    context.quadraticCurveTo(side * size * 0.74, -size * (lift * 0.42 - 0.04), side * size * 0.1, size * 0.1);
    context.fill();
  }

  function draw(raven) {
    const y = raven.base + Math.sin(raven.drift) * 14;
    const size = raven.size * scale;
    const lift = raven.glide > 0 ? 0.3 : 0.15 + Math.sin(raven.flap) * 0.62;
    context.save();
    context.translate(raven.x, y);
    context.scale(raven.heading, 1);
    context.rotate(Math.sin(raven.drift * 1.3) * 0.08);
    context.fillStyle = "#07080c";
    wing(size, 1, lift);
    wing(size, -1, lift);
    context.beginPath();
    context.ellipse(0, 0, size * 0.36, size * 0.11, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(size * 0.36, -size * 0.03, size * 0.09, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(size * 0.42, -size * 0.08);
    context.lineTo(size * 0.6, -size * 0.01);
    context.lineTo(size * 0.42, size * 0.02);
    context.fill();
    context.beginPath();
    context.moveTo(-size * 0.28, -size * 0.07);
    context.lineTo(-size * 0.62, -size * 0.02);
    context.lineTo(-size * 0.6, size * 0.08);
    context.lineTo(-size * 0.28, size * 0.08);
    context.fill();
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

  function fit() {
    const unsized = width === 0;
    resize();
    if (unsized && width > 0) flock.forEach((raven) => spawn(raven, true));
    if (calm && width > 0) {
      context.clearRect(0, 0, width, height);
      flock.forEach(draw);
    }
  }

  resize();
  for (let i = 0; i < 8; i += 1) {
    const raven = { beats: 3 };
    spawn(raven, true);
    flock.push(raven);
  }
  new ResizeObserver(fit).observe(ravenCanvas);

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
