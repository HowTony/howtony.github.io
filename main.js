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
