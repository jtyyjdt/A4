
/* =========================================================
   K & K — OUR FIRST ANNIVERSARY
   SCRIPT.JS — PART 1/4
   FOUNDATION & PAGE NAVIGATION
   ========================================================= */

"use strict";

/* ---------- CORE CONFIGURATION ---------- */

const KK_APP = {
  totalPages: 12,
  currentPage: 1,
  isTransitioning: false,
  initialized: false,
  reducedMotion: window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches
};

/* ---------- DOM REFERENCES ---------- */

const KK_DOM = {
  app: document.querySelector(".app"),
  pages: Array.from(document.querySelectorAll(".page")),

  navigation: document.querySelector(".site-navigation"),
  previousButton: document.querySelector(".nav-prev"),
  nextButton: document.querySelector(".nav-next"),
  chapterIndicator: document.querySelector(".chapter-indicator"),

  transitionLayer: document.querySelector(".transition-layer"),
  transitionGlow: document.querySelector(".transition-glow"),

  musicControl: document.querySelector(".music-control"),
  toast: document.querySelector(".toast")
};

/* ---------- GENERAL HELPERS ---------- */

function kkGetElement(selector, parent = document) {
  return parent.querySelector(selector);
}

function kkGetElements(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

function kkClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function kkWait(duration) {
  return new Promise(resolve => {
    window.setTimeout(resolve, duration);
  });
}

function kkSetText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function kkIsValidPage(pageNumber) {
  return (
    Number.isInteger(pageNumber) &&
    pageNumber >= 1 &&
    pageNumber <= KK_APP.totalPages
  );
}

/* ---------- PAGE VALIDATION ---------- */

function kkValidatePages() {
  if (KK_DOM.pages.length !== KK_APP.totalPages) {
    console.error(
      "[K&K] Expected 12 pages but found:",
      KK_DOM.pages.length
    );
    return false;
  }

  const expectedIds = Array.from(
    { length: KK_APP.totalPages },
    (_, index) => `page-${index + 1}`
  );

  const actualIds = KK_DOM.pages.map(page => page.id);

  for (const id of expectedIds) {
    if (!actualIds.includes(id)) {
      console.error("[K&K] Missing page:", id);
      return false;
    }
  }

  return true;
}

/* ---------- CHAPTER INDICATOR ---------- */

function kkUpdateChapterIndicator(pageNumber) {
  if (!KK_DOM.chapterIndicator) return;

  const current = KK_DOM.chapterIndicator.querySelector(
    "#currentChapter"
  );

  kkSetText(
    current,
    String(pageNumber).padStart(2, "0")
  );
}

/* ---------- NAVIGATION BUTTONS ---------- */

function kkUpdateNavigation(pageNumber) {
  const isFirst = pageNumber === 1;
  const isLast = pageNumber === KK_APP.totalPages;

  if (KK_DOM.previousButton) {
    KK_DOM.previousButton.disabled = isFirst;
    KK_DOM.previousButton.setAttribute(
      "aria-disabled",
      String(isFirst)
    );
  }

  if (KK_DOM.nextButton) {
    KK_DOM.nextButton.disabled = isLast;
    KK_DOM.nextButton.setAttribute(
      "aria-disabled",
      String(isLast)
    );
  }

  kkUpdateChapterIndicator(pageNumber);
}

/* ---------- PAGE ACTIVATION ---------- */

function kkActivatePage(pageNumber, options = {}) {
  if (!kkIsValidPage(pageNumber)) return false;

  const { updateHistory = false } = options;

  KK_DOM.pages.forEach((page, index) => {
    const isActive = index === pageNumber - 1;

    page.classList.toggle("active", isActive);

    page.setAttribute(
      "aria-hidden",
      String(!isActive)
    );

    if (isActive) {
      page.scrollTop = 0;

      const scrollable = page.querySelector(
        ".cinematic-content, .letter-content, " +
        ".promises-content, .future-content, " +
        ".capsule-content"
      );

      if (scrollable) scrollable.scrollTop = 0;
    }
  });

  KK_APP.currentPage = pageNumber;
  kkUpdateNavigation(pageNumber);

  if (updateHistory) {
    try {
      window.history.pushState(
        { kkPage: pageNumber },
        "",
        `#page-${pageNumber}`
      );
    } catch (error) {
      console.warn("[K&K] History update failed.", error);
    }
  }

  document.dispatchEvent(
    new CustomEvent("kk:pagechange", {
      detail: {
        page: pageNumber,
        pageId: `page-${pageNumber}`
      }
    })
  );

  return true;
}

/* ---------- PAGE TRANSITIONS ---------- */

async function kkGoToPage(pageNumber, options = {}) {
  if (!kkIsValidPage(pageNumber)) return false;
  if (KK_APP.isTransitioning) return false;

  if (pageNumber === KK_APP.currentPage) return true;

  const {
    updateHistory = true,
    instant = false
  } = options;

  if (
    instant ||
    KK_APP.reducedMotion ||
    !KK_DOM.transitionLayer
  ) {
    return kkActivatePage(pageNumber, {
      updateHistory
    });
  }

  KK_APP.isTransitioning = true;

  KK_DOM.transitionLayer.classList.add("active");

  if (KK_DOM.transitionGlow) {
    KK_DOM.transitionGlow.classList.add("active");
  }

  await kkWait(220);

  const activated = kkActivatePage(pageNumber, {
    updateHistory
  });

  if (!activated) {
    KK_APP.isTransitioning = false;
    KK_DOM.transitionLayer.classList.remove("active");

    if (KK_DOM.transitionGlow) {
      KK_DOM.transitionGlow.classList.remove("active");
    }

    return false;
  }

  await kkWait(180);

  KK_DOM.transitionLayer.classList.remove("active");

  if (KK_DOM.transitionGlow) {
    KK_DOM.transitionGlow.classList.remove("active");
  }

  await kkWait(250);

  KK_APP.isTransitioning = false;

  return true;
}

/* ---------- NEXT / PREVIOUS ---------- */

function kkNextPage() {
  if (KK_APP.currentPage < KK_APP.totalPages) {
    return kkGoToPage(KK_APP.currentPage + 1);
  }

  return Promise.resolve(false);
}

function kkPreviousPage() {
  if (KK_APP.currentPage > 1) {
    return kkGoToPage(KK_APP.currentPage - 1);
  }

  return Promise.resolve(false);
}

/* ---------- NAVIGATION EVENTS ---------- */

function kkBindNavigation() {
  KK_DOM.previousButton?.addEventListener(
    "click",
    kkPreviousPage
  );

  KK_DOM.nextButton?.addEventListener(
    "click",
    kkNextPage
  );

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-go-page]");
    if (!trigger) return;

    const pageNumber = Number(trigger.dataset.goPage);

    if (kkIsValidPage(pageNumber)) {
      kkGoToPage(pageNumber);
    }
  });
}

/* ---------- BROWSER HISTORY ---------- */

function kkBindBrowserHistory() {
  window.addEventListener("popstate", event => {
    const historyPage = event.state?.kkPage;

    if (kkIsValidPage(historyPage)) {
      kkGoToPage(historyPage, {
        updateHistory: false
      });
      return;
    }

    const match = window.location.hash.match(
      /^#page-(\d+)$/
    );

    if (match) {
      const pageNumber = Number(match[1]);

      if (kkIsValidPage(pageNumber)) {
        kkGoToPage(pageNumber, {
          updateHistory: false
        });
      }
    }
  });
}

/* ---------- FOUNDATION INITIALIZATION ---------- */

function kkInitializeFoundation() {
  if (KK_APP.initialized) return;

  if (!KK_DOM.app) {
    console.error("[K&K] .app container not found.");
    return;
  }

  if (!kkValidatePages()) {
    console.error("[K&K] Initialization stopped.");
    return;
  }

  kkBindNavigation();
  kkBindBrowserHistory();

  const match = window.location.hash.match(
    /^#page-(\d+)$/
  );

  const initialPage = match
    ? Number(match[1])
    : 1;

  kkActivatePage(
    kkIsValidPage(initialPage) ? initialPage : 1
  );

  KK_APP.initialized = true;

  console.info("[K&K] Foundation initialized.");
}

/* ---------- START FOUNDATION ---------- */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    kkInitializeFoundation,
    { once: true }
  );
} else {
  kkInitializeFoundation();
}

/* =========================================================
   END OF PART 1/4
   NEXT: MUSIC ENGINE
   ========================================================= */
   
/* =========================================================
   PART 2 — BACKGROUND MUSIC ENGINE
   ========================================================= */

const KK_MUSIC = {
  audio: null,
  started: false,
  muted: false,
  volume: 0.42,
  fadeTimer: null,
  listenersBound: false
};


/* 1. CREATE ONE AUDIO INSTANCE */

function kkCreateMusic() {
  if (KK_MUSIC.audio) {
    return KK_MUSIC.audio;
  }

  const audio = new Audio("music.mp3");

  audio.loop = true;
  audio.preload = "auto";
  audio.volume = KK_MUSIC.volume;

  KK_MUSIC.audio = audio;

  audio.addEventListener("error", () => {
    console.warn("[K&K] Music could not be loaded. Check music.mp3.");
  });

  audio.addEventListener("playing", () => {
    KK_MUSIC.started = true;
    kkUpdateMusicControl();
  });

  audio.addEventListener("pause", () => {
    kkUpdateMusicControl();
  });

  return audio;
}


/* 2. UPDATE MUSIC BUTTON */

function kkUpdateMusicControl() {
  const button = KK_DOM.musicControl;

  if (!button) return;

  const audio = KK_MUSIC.audio;

  const isPlaying = Boolean(
    audio && !audio.paused && !audio.ended
  );

  button.classList.toggle("playing", isPlaying);
  button.classList.toggle("muted", KK_MUSIC.muted);

  button.setAttribute(
    "aria-label",
    KK_MUSIC.muted
      ? "Unmute music"
      : isPlaying
        ? "Pause music"
        : "Play music"
  );

  button.setAttribute(
    "aria-pressed",
    String(isPlaying && !KK_MUSIC.muted)
  );
}


/* 3. FADE MUSIC VOLUME */

function kkFadeMusic(targetVolume, duration = 900) {
  const audio = KK_MUSIC.audio;

  if (!audio) return Promise.resolve();

  if (KK_MUSIC.fadeTimer !== null) {
    window.clearInterval(KK_MUSIC.fadeTimer);
    KK_MUSIC.fadeTimer = null;
  }

  const target = kkClamp(targetVolume, 0, 1);

  if (KK_APP.reducedMotion || duration <= 0) {
    audio.volume = target;
    return Promise.resolve();
  }

  const startVolume = audio.volume;
  const difference = target - startVolume;
  const steps = Math.max(1, Math.round(duration / 50));
  const stepDuration = duration / steps;

  let currentStep = 0;

  return new Promise(resolve => {
    KK_MUSIC.fadeTimer = window.setInterval(() => {
      currentStep += 1;

      const progress = Math.min(currentStep / steps, 1);

      audio.volume = kkClamp(
        startVolume + difference * progress,
        0,
        1
      );

      if (progress >= 1) {
        window.clearInterval(KK_MUSIC.fadeTimer);
        KK_MUSIC.fadeTimer = null;
        resolve();
      }
    }, stepDuration);
  });
}


/* 4. START MUSIC */

async function kkStartMusic() {
  const audio = kkCreateMusic();
  if (!audio) return false;

  if (!audio.paused) return true;

  try {
    await audio.play();

    KK_MUSIC.started = true;

    if (KK_MUSIC.muted) {
      audio.volume = 0;
    } else {
      audio.volume = 0;
      await kkFadeMusic(KK_MUSIC.volume, 1000);
    }

    kkUpdateMusicControl();
    return true;

  } catch (error) {
    console.info(
      "[K&K] Autoplay was blocked. A user interaction is needed."
    );

    kkUpdateMusicControl();
    return false;
  }
}


/* 5. PAUSE MUSIC */

async function kkPauseMusic() {
  const audio = KK_MUSIC.audio;

  if (!audio || audio.paused) return;

  await kkFadeMusic(0, 500);

  audio.pause();

  if (!KK_MUSIC.muted) {
    audio.volume = KK_MUSIC.volume;
  }

  kkUpdateMusicControl();
}


/* 6. TOGGLE MUTE */

function kkToggleMute() {
  const audio = kkCreateMusic();

  KK_MUSIC.muted = !KK_MUSIC.muted;

  audio.volume = KK_MUSIC.muted
    ? 0
    : KK_MUSIC.volume;

  kkUpdateMusicControl();
}


/* 7. MUSIC BUTTON */

function kkBindMusicControl() {
  if (KK_MUSIC.listenersBound) return;

  const button = KK_DOM.musicControl;

  if (button) {
    button.addEventListener("click", async () => {
      const audio = kkCreateMusic();

      if (audio.paused) {
        await kkStartMusic();
      } else {
        await kkPauseMusic();
      }
    });
  }

  KK_MUSIC.listenersBound = true;
}


/* 8. AUTOPLAY FALLBACK */

function kkBindMusicFallback() {
  const startOnInteraction = async () => {
    if (!KK_MUSIC.audio || KK_MUSIC.audio.paused) {
      await kkStartMusic();
    }

    if (KK_MUSIC.audio && !KK_MUSIC.audio.paused) {
      document.removeEventListener(
        "pointerdown",
        startOnInteraction
      );

      document.removeEventListener(
        "keydown",
        startOnInteraction
      );

      document.removeEventListener(
        "touchstart",
        startOnInteraction
      );
    }
  };

  document.addEventListener(
    "pointerdown",
    startOnInteraction
  );

  document.addEventListener(
    "keydown",
    startOnInteraction
  );

  document.addEventListener(
    "touchstart",
    startOnInteraction,
    { passive: true }
  );
}


/* 9. INITIALIZE MUSIC */

function kkInitializeMusic() {
  kkCreateMusic();
  kkBindMusicControl();
  kkBindMusicFallback();

  // Browser may block autoplay until the first interaction.
  kkStartMusic();
}


/* 10. START MUSIC ENGINE */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    kkInitializeMusic,
    { once: true }
  );
} else {
  kkInitializeMusic();
}


/* =========================================================
   END OF PART 2
   NEXT: STORY & PAGE ANIMATIONS
   ========================================================= */
   
/* =========================================================
   PART 3 — STORY & PAGE INTERACTIONS
   PAGES 1–7
   ========================================================= */


/* ---------------------------------------------------------
   SHARED HELPERS
   --------------------------------------------------------- */

function kkPart3Reveal(elements, delay = 100) {
  const items = Array.from(elements || []).filter(Boolean);

  items.forEach((element, index) => {
    const reveal = () => element.classList.add("visible");

    if (KK_APP.reducedMotion) {
      reveal();
    } else {
      window.setTimeout(reveal, index * delay);
    }
  });
}


function kkPart3Observe(elements, className = "visible") {
  const items = Array.from(elements || []).filter(Boolean);

  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach(item => item.classList.add(className));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(className);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  items.forEach(item => observer.observe(item));
}


function kkPart3AnimateCounter(element, target, duration = 1400) {
  if (!element) return;

  const end = Math.max(0, Number(target) || 0);

  if (KK_APP.reducedMotion) {
    element.textContent = String(end).padStart(3, "0");
    return;
  }

  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    element.textContent = String(
      Math.round(end * eased)
    ).padStart(3, "0");

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}


/* ---------------------------------------------------------
   PAGE 1 — OPENING
   --------------------------------------------------------- */

function kkPart3InitOpening() {
  const page = kkGetElement("#page-1");
  if (!page) return;

  const button = kkGetElement("#beginStoryBtn", page);

  if (button && !button.dataset.kkBound) {
    button.dataset.kkBound = "true";

    button.addEventListener("click", async () => {
      await kkStartMusic();
      await kkGoToPage(2);
    });
  }

  const content = kkGetElement(".opening-content", page);

  if (content) {
    content.classList.add("opening-ready");
  }
}


/* ---------------------------------------------------------
   PAGE 2 — OUR UNIVERSE
   --------------------------------------------------------- */

function kkPart3InitUniverse() {
  const page = kkGetElement("#page-2");
  if (!page || page.dataset.kkUniverseReady) return;

  page.dataset.kkUniverseReady = "true";

  const cards = kkGetElements(".discovery-card", page);

  cards.forEach(card => {
    card.addEventListener("click", () => {
      const wasOpen = card.classList.contains("revealed");

      cards.forEach(other => {
        other.classList.remove("revealed");
        other.setAttribute("aria-expanded", "false");
      });

      if (!wasOpen) {
        card.classList.add("revealed");
        card.setAttribute("aria-expanded", "true");
      }
    });

    card.setAttribute("aria-expanded", "false");
  });

  const reveal = kkGetElement(".universe-reveal", page);

  if (reveal) {
    reveal.classList.add("universe-ready");
  }
}


/* ---------------------------------------------------------
   PAGE 3 — OUR BEGINNING
   --------------------------------------------------------- */

function kkPart3InitBeginning() {
  const page = kkGetElement("#page-3");
  if (!page || page.dataset.kkBeginningReady) return;

  page.dataset.kkBeginningReady = "true";

  const scenes = kkGetElements(".story-scene", page);
  kkPart3Observe(scenes);

  const confession = kkGetElement(".confession-scene", page);
  const messages = confession
    ? kkGetElements(".chat-message", confession)
    : [];

  messages.forEach(message => {
    message.classList.add("chat-pending");
  });

  if (confession && messages.length) {
    const revealMessages = () => {
      messages.forEach((message, index) => {
        const show = () => {
          message.classList.remove("chat-pending");
          message.classList.add("chat-visible");
        };

        if (KK_APP.reducedMotion) {
          show();
        } else {
          window.setTimeout(show, index * 420);
        }
      });
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealMessages();
            observer.disconnect();
          }
        });
      }, { threshold: 0.15 });

      observer.observe(confession);
    } else {
      revealMessages();
    }
  }

  const finalScene = kkGetElement(".final-beginning-scene", page);

  if (finalScene) {
    kkPart3Observe([finalScene]);
  }
}


/* ---------------------------------------------------------
   PAGE 4 — OUR JOURNEY
   --------------------------------------------------------- */

function kkPart3InitJourney() {
  const page = kkGetElement("#page-4");
  if (!page || page.dataset.kkJourneyReady) return;

  page.dataset.kkJourneyReady = "true";

  const cards = kkGetElements(".journey-card", page);
  kkPart3Observe(cards);

  const ending = kkGetElement(".journey-ending", page);

  if (ending) {
    kkPart3Observe([ending]);
  }
}


/* ---------------------------------------------------------
   PAGE 5 — 365 DAYS
   --------------------------------------------------------- */

function kkPart3Init365Days() {
  const page = kkGetElement("#page-5");
  if (!page || page.dataset.kk365Ready) return;

  page.dataset.kk365Ready = "true";

  const counter = kkGetElement("#dayCounter", page);

  if (counter) {
    kkPart3AnimateCounter(counter, 365, 1500);
  }

  const lights = kkGetElement("#dayLights", page);

  if (lights && !lights.children.length) {
    const fragment = document.createDocumentFragment();
    const totalLights = KK_APP.reducedMotion ? 90 : 180;

    for (let i = 1; i <= totalLights; i++) {
      const light = document.createElement("span");

      light.className = "day-light";
      light.style.setProperty("--light-index", String(i));
      light.setAttribute("aria-hidden", "true");

      fragment.appendChild(light);
    }

    lights.appendChild(fragment);
  }

  const content = kkGetElement(".days-content", page);

  if (content) {
    content.classList.add("days-ready");
  }
}


/* ---------------------------------------------------------
   PAGE 6 — LITTLE THINGS
   --------------------------------------------------------- */

function kkPart3InitLittleThings() {
  const page = kkGetElement("#page-6");
  if (!page || page.dataset.kkLittleThingsReady) return;

  page.dataset.kkLittleThingsReady = "true";

  const cards = kkGetElements(".memory-card", page);

  cards.forEach(card => {
    card.setAttribute("aria-expanded", "false");

    card.addEventListener("click", () => {
      const isOpen = card.classList.contains("revealed");

      card.classList.toggle("revealed", !isOpen);
      card.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  const secretHeart = kkGetElement("#secretHeart", page);
  const secretMessage = kkGetElement("#secretHeartMessage", page);

  if (secretHeart && secretMessage) {
    secretHeart.setAttribute("aria-expanded", "false");

    secretHeart.addEventListener("click", () => {
      const isVisible = secretMessage.classList.toggle("visible");

      secretHeart.setAttribute(
        "aria-expanded",
        String(isVisible)
      );
    });
  }

  const points = kkGetElements(".love-points p", page);
  kkPart3Observe(points);
}


/* ---------------------------------------------------------
   PAGE 7 — LOVE LETTER / ENVELOPE
   --------------------------------------------------------- */

function kkPart3InitLoveLetter() {
  const page = kkGetElement("#page-7");
  if (!page || page.dataset.kkLetterReady) return;

  page.dataset.kkLetterReady = "true";

  const envelope = kkGetElement("#envelope", page);
  const letter = kkGetElement("#loveLetter", page);
  const hint = kkGetElement("#letterHint", page);

  if (!envelope || !letter) return;

  const openLetter = () => {
    if (envelope.classList.contains("opened")) return;

    envelope.classList.add("opened");
    letter.classList.add("show");

    letter.setAttribute("aria-hidden", "false");

    if (hint) {
      hint.textContent = "A little letter, written just for you.";
      hint.classList.add("letter-opened-hint");
    }

    envelope.setAttribute("aria-expanded", "true");
  };

  envelope.setAttribute("aria-expanded", "false");

  envelope.addEventListener("click", openLetter);

  envelope.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLetter();
    }
  });
}


/* ---------------------------------------------------------
   INITIALIZE ALL FEATURES IN PAGES 1–7
   --------------------------------------------------------- */

function kkPart3InitializeAll() {
  kkPart3InitOpening();
  kkPart3InitUniverse();
  kkPart3InitBeginning();
  kkPart3InitJourney();
  kkPart3Init365Days();
  kkPart3InitLittleThings();
  kkPart3InitLoveLetter();
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    kkPart3InitializeAll,
    { once: true }
  );
} else {
  kkPart3InitializeAll();
}


/* =========================================================
   END OF PART 3
   NEXT: PAGES 8–12 & GRAND FINALE
   ========================================================= */
   
/* =========================================================
   PART 4 — FINAL PAGES & GRAND FINALE
   PAGES 8–12
   ========================================================= */


/* ---------------------------------------------------------
   MUSIC CORRECTION — USE EXISTING HTML AUDIO ELEMENT
   --------------------------------------------------------- */

function kkCreateMusic() {
  if (KK_MUSIC.audio) return KK_MUSIC.audio;

  const audio = document.getElementById("backgroundMusic");

  if (!audio) {
    console.warn("[K&K] Background music element not found.");
    return null;
  }

  audio.loop = true;
  audio.preload = "auto";
  audio.volume = KK_MUSIC.muted ? 0 : KK_MUSIC.volume;

  KK_MUSIC.audio = audio;

  audio.addEventListener("playing", () => {
    KK_MUSIC.started = true;
    kkUpdateMusicControl();
  });

  audio.addEventListener("pause", kkUpdateMusicControl);

  audio.addEventListener("error", () => {
    console.warn("[K&K] Could not load music.mp3.");
  });

  return audio;
}


/* ---------------------------------------------------------
   PAGE 8 — PROMISES
   --------------------------------------------------------- */

function kkPart4InitPromises() {
  const page = kkGetElement("#page-8");
  if (!page || page.dataset.kkPromisesReady) return;

  page.dataset.kkPromisesReady = "true";

  const cards = kkGetElements(".promise-card", page);

  cards.forEach((card, index) => {
    card.style.setProperty("--card-index", String(index));

    card.addEventListener("click", () => {
      card.classList.toggle("revealed");
    });
  });

  const special = kkGetElements(".special-promise", page);

  special.forEach(item => {
    item.addEventListener("click", () => {
      item.classList.toggle("revealed");
    });
  });
}


/* ---------------------------------------------------------
   PAGE 9 — OUR FUTURE
   --------------------------------------------------------- */

function kkPart4InitFuture() {
  const page = kkGetElement("#page-9");
  if (!page || page.dataset.kkFutureReady) return;

  page.dataset.kkFutureReady = "true";

  const cards = kkGetElements(".future-card", page);
  const steps = kkGetElements(".future-step", page);

  cards.forEach((card, index) => {
    card.style.setProperty("--card-index", String(index));

    card.addEventListener("click", () => {
      card.classList.toggle("revealed");
    });
  });

  steps.forEach((step, index) => {
    step.addEventListener("click", () => {
      steps.forEach(item => item.classList.remove("active"));
      step.classList.add("active");

      const cardsToHighlight = cards.slice(0, index + 1);

      cards.forEach(card => card.classList.remove("timeline-highlight"));

      cardsToHighlight.forEach(card => {
        card.classList.add("timeline-highlight");
      });
    });
  });
}


/* ---------------------------------------------------------
   PAGE 10 — MEMORY CAPSULE
   --------------------------------------------------------- */

function kkPart4InitCapsule() {
  const page = kkGetElement("#page-10");
  if (!page || page.dataset.kkCapsuleReady) return;

  page.dataset.kkCapsuleReady = "true";

  const capsule = kkGetElement("#memoryCapsule", page);
  const hint = kkGetElement("#capsuleHint", page);
  const fragments = kkGetElement("#capsuleFragments", page);
  const sealButton = kkGetElement("#sealCapsuleBtn", page);
  const secret = kkGetElement("#capsuleSecret", page);

  if (!capsule || !fragments) return;

  let isOpen = false;
  let isSealed = false;

  const openCapsule = () => {
    if (isOpen || isSealed) return;

    isOpen = true;

    capsule.classList.add("opened");
    fragments.classList.add("show");
    fragments.setAttribute("aria-hidden", "false");

    const pieces = kkGetElements(".capsule-fragment", fragments);

    pieces.forEach((piece, index) => {
      window.setTimeout(() => {
        piece.classList.add("revealed");
      }, KK_APP.reducedMotion ? 0 : index * 180);
    });

    if (hint) {
      hint.textContent = "A few moments from our first year.";
    }
  };

  const sealCapsule = () => {
    if (!isOpen || isSealed) return;

    isSealed = true;

    capsule.classList.add("sealed");
    fragments.classList.add("sealed");
    fragments.setAttribute("aria-hidden", "true");

    if (hint) {
      hint.textContent = "Our first year, safely kept.";
    }

    if (secret) {
      secret.classList.add("show");
      secret.setAttribute("aria-hidden", "false");
    }

    if (sealButton) {
      sealButton.disabled = true;
      sealButton.classList.add("completed");
      const label = sealButton.querySelector("span");
      if (label) label.textContent = "Our Memories Are Sealed";
    }
  };

  capsule.setAttribute("aria-expanded", "false");

  capsule.addEventListener("click", () => {
    openCapsule();
    capsule.setAttribute("aria-expanded", String(isOpen));
  });

  capsule.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCapsule();
      capsule.setAttribute("aria-expanded", String(isOpen));
    }
  });

  if (sealButton) {
    sealButton.addEventListener("click", sealCapsule);
  }
}


/* ---------------------------------------------------------
   PAGE 11 — ONE LAST MESSAGE
   --------------------------------------------------------- */

function kkPart4InitFinalMessage() {
  const page = kkGetElement("#page-11");
  if (!page || page.dataset.kkFinalMessageReady) return;

  page.dataset.kkFinalMessageReady = "true";

  const sequence = kkGetElement("#finalMessageSequence", page);
  const button = kkGetElement("#lightSkyBtn", page);

  if (!sequence) return;

  const lines = kkGetElements("[data-message-line]", sequence);

  let started = false;

  const revealSequence = () => {
    if (started) return;

    started = true;

    lines.forEach((line, index) => {
      window.setTimeout(() => {
        line.classList.add("visible");
        line.classList.add("show");
      }, KK_APP.reducedMotion ? 0 : index * 650);
    });

    if (button) {
      window.setTimeout(() => {
        button.classList.add("visible");
        button.classList.add("show");
      }, KK_APP.reducedMotion ? 0 : lines.length * 650);
    }
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealSequence();
          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });

    observer.observe(sequence);
  } else {
    revealSequence();
  }

  if (button) {
    button.addEventListener("click", async () => {
      await kkGoToPage(12);
      kkPart4StartFinale();
    });
  }
}


/* ---------------------------------------------------------
   FIREWORKS ENGINE
   --------------------------------------------------------- */

const KK_FIREWORKS = {
  canvas: null,
  context: null,
  particles: [],
  animationFrame: null,
  running: false,
  lastBurst: 0,
  resizeBound: false
};


function kkFireworksResize() {
  const canvas = KK_FIREWORKS.canvas;
  if (!canvas) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  KK_FIREWORKS.context.setTransform(ratio, 0, 0, ratio, 0, 0);
}


function kkFireworksBurst(x, y) {
  const count = KK_APP.reducedMotion ? 12 : 42;
  const hue = Math.floor(Math.random() * 360);

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 1.2 + Math.random() * 4;

    KK_FIREWORKS.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.009 + Math.random() * 0.012,
      hue,
      size: 1.5 + Math.random() * 2
    });
  }
}


function kkFireworksAnimate(timestamp) {
  if (!KK_FIREWORKS.running) return;

  const canvas = KK_FIREWORKS.canvas;
  const context = KK_FIREWORKS.context;

  if (!canvas || !context) return;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  if (
    !KK_APP.reducedMotion &&
    timestamp - KK_FIREWORKS.lastBurst > 950
  ) {
    kkFireworksBurst(
      Math.random() * window.innerWidth,
      90 + Math.random() * window.innerHeight * 0.48
    );

    KK_FIREWORKS.lastBurst = timestamp;
  }

  KK_FIREWORKS.particles = KK_FIREWORKS.particles.filter(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    particle.vy += 0.025;
    particle.life -= particle.decay;

    if (particle.life <= 0) return false;

    context.beginPath();

    context.fillStyle =
      `hsla(${particle.hue}, 100%, 72%, ${particle.life})`;

    context.arc(
      particle.x,
      particle.y,
      particle.size,
      0,
      Math.PI * 2
    );

    context.fill();

    return true;
  });

  KK_FIREWORKS.animationFrame =
    requestAnimationFrame(kkFireworksAnimate);
}


function kkFireworksStart() {
  const canvas = kkGetElement("#fireworksCanvas");
  if (!canvas || KK_FIREWORKS.running) return;

  KK_FIREWORKS.canvas = canvas;
  KK_FIREWORKS.context = canvas.getContext("2d");

  if (!KK_FIREWORKS.context) return;

  kkFireworksResize();

  if (!KK_FIREWORKS.resizeBound) {
    window.addEventListener("resize", kkFireworksResize);
    KK_FIREWORKS.resizeBound = true;
  }

  KK_FIREWORKS.running = true;
  KK_FIREWORKS.lastBurst = performance.now();

  kkFireworksBurst(
    window.innerWidth * 0.5,
    window.innerHeight * 0.35
  );

  KK_FIREWORKS.animationFrame =
    requestAnimationFrame(kkFireworksAnimate);
}


function kkFireworksStop() {
  KK_FIREWORKS.running = false;

  if (KK_FIREWORKS.animationFrame !== null) {
    cancelAnimationFrame(KK_FIREWORKS.animationFrame);
    KK_FIREWORKS.animationFrame = null;
  }

  if (KK_FIREWORKS.context && KK_FIREWORKS.canvas) {
    KK_FIREWORKS.context.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }

  KK_FIREWORKS.particles = [];
}


/* ---------------------------------------------------------
   PAGE 12 — GRAND FINALE
   --------------------------------------------------------- */

function kkPart4StartFinale() {
  const page = kkGetElement("#page-12");
  if (!page) return;

  page.classList.add("finale-started");

  const ready = kkGetElement("#finaleReady", page);
  const text = kkGetElement("#finaleText", page);
  const finalKK = kkGetElement("#finalKK", page);
  const finalEnd = kkGetElement("#finalEnd", page);

  const lines = [
    "#finalLineOne",
    "#finalLineTwo",
    "#finalLineThree",
    "#finalLineFour",
    "#finalLineFive",
    "#finalDate",
    "#finalChoice",
    "#finalChoiceAnswer"
  ].map(selector => kkGetElement(selector, page)).filter(Boolean);

  kkFireworksStart();

  if (ready) {
    ready.classList.add("show");
    ready.textContent = "Here we go…";
  }

  lines.forEach((line, index) => {
    line.classList.remove("show", "visible");

    window.setTimeout(() => {
      line.classList.add("show");
      line.classList.add("visible");
    }, KK_APP.reducedMotion ? 0 : 900 + index * 1100);
  });

  const endDelay = KK_APP.reducedMotion
    ? 100
    : 900 + lines.length * 1100 + 900;

  window.setTimeout(() => {
    if (text) text.classList.add("completed");
    if (finalKK) finalKK.classList.add("show");
    if (finalEnd) finalEnd.classList.add("show");
  }, endDelay);
}


function kkPart4InitFinale() {
  const page = kkGetElement("#page-12");
  if (!page || page.dataset.kkFinaleReady) return;

  page.dataset.kkFinaleReady = "true";

  const replay = kkGetElement("#replayFinaleBtn", page);

  if (replay) {
    replay.addEventListener("click", () => {
      kkFireworksStop();

      const ready = kkGetElement("#finaleReady", page);
      const text = kkGetElement("#finaleText", page);
      const finalKK = kkGetElement("#finalKK", page);
      const finalEnd = kkGetElement("#finalEnd", page);

      if (ready) {
        ready.classList.remove("show");
        ready.textContent = "Ready?";
      }

      if (text) text.classList.remove("completed");
      if (finalKK) finalKK.classList.remove("show");
      if (finalEnd) finalEnd.classList.remove("show");

      kkGetElements("p", text || page).forEach(line => {
        line.classList.remove("show", "visible");
      });

      window.setTimeout(kkPart4StartFinale, 100);
    });
  }
}


/* ---------------------------------------------------------
   INITIALIZE PAGES 8–12
   --------------------------------------------------------- */

function kkPart4InitializeAll() {
  kkPart4InitPromises();
  kkPart4InitFuture();
  kkPart4InitCapsule();
  kkPart4InitFinalMessage();
  kkPart4InitFinale();
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    kkPart4InitializeAll,
    { once: true }
  );
} else {
  kkPart4InitializeAll();
}


/* =========================================================
   END OF PART 4
   ALL FOUR PARTS COMPLETE
   ========================================================= */
   