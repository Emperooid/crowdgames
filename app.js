(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const naira = n => "₦" + Math.round(n).toLocaleString("en-NG");
  const pad = n => String(n).padStart(2, "0");
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const hover = matchMedia("(hover:hover)").matches;
  const OPEN_MIN = 50;
  const COLORS = ["#c8ff2e", "#ffb020", "#2de2e6", "#ff3d8b", "#8b5cff", "#ffffff"];

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.id); toast.id = setTimeout(() => t.hidden = true, 2600);
  }

  // ───────── sound (off by default) ─────────
  let soundOn = false, actx;
  function beep(f = 440, d = .12, type = "sine", v = .06) {
    if (!soundOn) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = f; g.gain.value = v;
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch {}
  }
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .2, "triangle", .07), i * 90));
  const sad = () => [330, 262].forEach((f, i) => setTimeout(() => beep(f, .25, "sawtooth", .04), i * 140));
  $("#snd").onclick = e => {
    soundOn = !soundOn; const b = e.currentTarget;
    b.setAttribute("aria-pressed", soundOn); b.setAttribute("aria-label", soundOn ? "Sound on" : "Sound off");
    b.innerHTML = `<svg class="ic"><use href="#i-${soundOn ? "sound" : "mute"}"/></svg>`;
    beep(660, .1);
  };

  // ───────── confetti ─────────
  const cv = $("#fx"), cx = cv.getContext("2d");
  let parts = [], raf = 0;
  function sizeCv() { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  sizeCv(); addEventListener("resize", sizeCv);
  function confetti(x = innerWidth / 2, y = innerHeight / 2, n = 120) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLORS[rnd(0, 5)], life: 110 + Math.random() * 50 });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      p.vy += .32; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life / 30);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(loop) : 0;
    if (!raf) cx.clearRect(0, 0, innerWidth, innerHeight);
  }
  const burstAt = el => { const r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2); };

  // ───────── wallet ─────────
  let wallet = 5000;
  function setWallet(v) {
    const el = $("#wal"), from = wallet; wallet = v;
    el.classList.remove("up", "down"); void el.offsetWidth; el.classList.add(v >= from ? "up" : "down");
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3);
      el.textContent = naira(from + (v - from) * e);
      if (k < 1) requestAnimationFrame(step); else setTimeout(() => el.classList.remove("up", "down"), 600);
    })(t0);
  }
  $("#reset").onclick = () => { setWallet(5000); toast("Demo wallet reset to ₦5,000"); };

  // ───────── ball helpers ─────────
  const ballBtns = () => [1, 2, 3, 4, 5].map(n => `<button class="ball" data-n="${n}" aria-pressed="false" aria-label="Number ${n}">${n}</button>`).join("");
  function bindBalls(box, cb) {
    box.innerHTML = ballBtns();
    box.onclick = e => {
      const b = e.target.closest(".ball"); if (!b) return;
      $$(".ball", box).forEach(x => x.setAttribute("aria-pressed", x === b));
      beep(300 + b.dataset.n * 90, .09); cb(+b.dataset.n);
    };
  }
  function bindChips(box, vals, init, cb) {
    box.innerHTML = vals.map(v => `<button class="chip" aria-pressed="${v === init}" data-v="${v}">${naira(v)}</button>`).join("");
    box.onclick = e => {
      const b = e.target.closest(".chip"); if (!b) return;
      $$(".chip", box).forEach(x => x.setAttribute("aria-pressed", x === b)); cb(+b.dataset.v);
    };
  }

  // ───────── clock: hero, dial, countdowns ─────────
  const hr12 = h => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
  const mmss = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  function buildDial() {
    const svg = $("#dial"); let h = "";
    const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
    for (let i = 0; i < 24; i++) {
      const a0 = (i * 15 - 90 + .9) * Math.PI / 180, a1 = ((i + 1) * 15 - 90 - .9) * Math.PI / 180, ro = 120, ri = 80;
      const [x0, y0] = pt(ro, a0), [x1, y1] = pt(ro, a1), [x2, y2] = pt(ri, a1), [x3, y3] = pt(ri, a0);
      const [tx, ty] = pt(100, (a0 + a1) / 2);
      h += `<path class="seg24 up" data-i="${i}" d="M${x0} ${y0}A${ro} ${ro} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 0 0 ${x3} ${y3}Z"><title>Round ${i}: ${hr12(i)} to ${i % 12 || 12}:50${i < 12 ? "AM" : "PM"}</title></path><text x="${tx}" y="${ty}">${i}</text>`;
    }
    svg.innerHTML = h;
  }
  function paintDial(h, open) {
    $$(".seg24").forEach(s => { const i = +s.dataset.i; s.setAttribute("class", "seg24 " + (i < h ? "set" : i > h ? "up" : open ? "open" : "wait")); });
    $$("#dial text").forEach((t, i) => t.style.fill = i === h && open ? "#10081f" : i === h ? "#10081f" : "");
  }
  let lastKey = "";
  function tick() {
    const d = new Date(), h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const open = m < OPEN_MIN, into = m * 60 + s;
    const remain = open ? OPEN_MIN * 60 - into : 3600 - into;
    $("#liveText").textContent = open ? `Round ${h} is open now` : `Round ${h} settling`;
    $("#pRound").textContent = h; $("#pClock").textContent = mmss(remain);
    $("#pRing").style.strokeDashoffset = 327 * (open ? into / (OPEN_MIN * 60) : 1);
    $("#dClock").textContent = mmss(remain); $("#dRound").textContent = `Round ${h}`;
    $("#dState").textContent = open ? "Closes in" : "Next opens in";
    $("#nextIn").textContent = mmss(3600 - into);
    const key = h + "/" + open;
    if (key !== lastKey) { paintDial(h, open); lastKey = key; }
  }
  buildDial();

  // ───────── hero phone loop ─────────
  const pb = $("#pBalls"); pb.innerHTML = [1, 2, 3, 4, 5].map(n => `<span class="ball" data-n="${n}">${n}</span>`).join("");
  let pi = 0;
  setInterval(() => {
    const n = (pi++ % 5) + 1;
    $$(".ball", pb).forEach((b, i) => b.classList.toggle("on", i === n - 1));
    const num = $("#pNum"); num.textContent = n; num.classList.remove("pop"); void num.offsetWidth; num.classList.add("pop");
    const lock = pi % 5 === 0, btn = $("#pBtn"), t = $("#pToast");
    btn.classList.toggle("done", lock); btn.textContent = lock ? "Locked in" : "Lock in";
    t.classList.toggle("show", lock);
  }, 1100);

  // ───────── static bits ─────────
  const words = ["Pick 1 to 5", "24 rounds a day", "Hide or Guess", "Instant results", "Auto Play", "Bank payouts", "Play the crowd", "Win the hour"];
  $("#marquee").innerHTML = [...words, ...words].map(w => `<span>${w}</span>`).join("");

  const FACES = [["farmer", "Farmer"], ["student", "Student"], ["teacher", "Teacher"], ["nurse", "Nurse"], ["rider", "Rider"], ["chef", "Chef"], ["trader", "Trader"], ["entrepreneur", "Entrepreneur"]];
  const faceHTML = FACES.map(([f, n]) => `<figure class="pf"><img src="assets/people/${f}.jpg" alt="${n}" loading="lazy" width="450" height="560"><span>${n}</span></figure>`).join("");
  $("#stripTrack").innerHTML = faceHTML + faceHTML;

  const AUTO = [[9, 500], [13, 500], [18, 1000], [21, 500]], autoOn = AUTO.map(() => true);
  function renderAuto() {
    $("#autoCard").innerHTML = `<header>Auto Play <span>${autoOn.filter(Boolean).length} rounds on</span></header>` + AUTO.map(([h, a], i) =>
      `<div class="arow"><div>Round ${h}<small>${hr12(h)} · ${naira(a)}</small></div><button class="sw" role="switch" aria-checked="${autoOn[i]}" aria-label="Auto Play round ${h}" data-i="${i}"></button></div>`).join("");
  }
  $("#autoCard").onclick = e => { const b = e.target.closest(".sw"); if (!b) return; autoOn[b.dataset.i] = !autoOn[b.dataset.i]; beep(520, .06); renderAuto(); };
  renderAuto();

  // ───────── arena tabs ─────────
  function showTab(t) {
    $$(".seg button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
    ["hourly", "guess", "hide"].forEach(k => $("#p-" + k).hidden = k !== t);
  }
  $$(".seg button").forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $$("[data-game]").forEach(a => a.addEventListener("click", () => showTab(a.dataset.game)));

  // ───────── GAME 1: Hourly Cash ─────────
  let hPick = 0, hStake = 200, hBusy = false;
  const lanes = $("#lanes");
  const resetLanes = () => { lanes.innerHTML = [1, 2, 3, 4, 5].map(n => `<div class="lane" data-n="${n}"><span class="cnt">0</span></div>`).join(""); };
  resetLanes();
  const pos = v => 10 + (v - 1) * 20 + "%";
  bindBalls($("#hBalls"), n => {
    if (hBusy) return; hPick = n;
    const y = $("#mkYou"); y.style.left = pos(n); y.classList.add("show");
    $("#mkCrowd").classList.remove("show");
    $("#hGo").disabled = false; $("#hGo").textContent = `Lock in ${n} and drop the crowd`;
  });
  bindChips($("#hStake"), [100, 200, 500, 1000], 200, v => hStake = v);

  $("#hGo").onclick = async () => {
    if (hStake > wallet) return toast("Not enough demo balance. Hit reset.");
    hBusy = true; const go = $("#hGo"); go.disabled = true; go.textContent = "The crowd is locking in…";
    $("#hRes").className = "result"; $("#hRes").textContent = "Players are picking…";
    resetLanes(); $("#mkCrowd").classList.remove("show");
    const w = [1, 2, 3, 2.2, 1.1], sum = w.reduce((a, b) => a + b), N = 45, picks = [];
    for (let i = 0; i < N - 1; i++) { let r = Math.random() * sum, k = 0; while ((r -= w[k]) > 0) k++; picks.push(k + 1); }
    picks.push(hPick);
    const order = picks.map((n, i) => ({ n, me: i === N - 1 })).sort(() => Math.random() - .5);
    const mine = order.findIndex(o => o.me); [order[mine], order[N - 1]] = [order[N - 1], order[mine]];
    for (let i = 0; i < N; i++) {
      const { n, me } = order[i], lane = lanes.children[n - 1], d = document.createElement("i");
      d.className = "dotp" + (me ? " me" : ""); d.dataset.n = n; d.style.setProperty("--c", getComputedStyle(document.documentElement).getPropertyValue("--n" + n));
      lane.appendChild(d); beep(220 + n * 60, .05, "triangle", .03);
      await sleep(reduce ? 5 : 38);
    }
    await sleep(reduce ? 50 : 650);
    const counts = [0, 0, 0, 0, 0]; picks.forEach(n => counts[n - 1]++);
    $$(".cnt", lanes).forEach((c, i) => { c.textContent = counts[i]; c.classList.add("show"); });
    const avg = picks.reduce((a, b) => a + b) / N, dist = Math.abs(hPick - avg);
    const cm = $("#mkCrowd"); cm.style.transition = "none"; cm.style.left = "50%"; void cm.offsetWidth; cm.style.transition = ""; cm.classList.add("show"); cm.style.left = pos(avg);
    await sleep(reduce ? 50 : 1500);
    // demo-only payout curve
    const mult = dist < .35 ? 2.5 : dist < .8 ? 1.5 : dist < 1.4 ? 1 : 0;
    const label = dist < .35 ? "Bullseye!" : dist < .8 ? "So close." : dist < 1.4 ? "Not far off." : "Too far this time.";
    const change = Math.round(hStake * mult - hStake);
    setWallet(wallet + change);
    const r = $("#hRes"); r.className = "result " + (change >= 0 ? "win" : "lose");
    r.textContent = `${label} Crowd value ${avg.toFixed(2)}, you picked ${hPick}. ${change >= 0 ? "+" : "−"}${naira(Math.abs(change))}`;
    if (change > 0) { burstAt($("#mkCrowd")); fanfare(); } else if (change < 0) sad();
    hBusy = false; go.disabled = false; go.textContent = "Play another round";
  };

  // ───────── GAME 2: Guess a card ─────────
  const STAKES = [100, 200, 300, 500, 750, 1000];
  let cards = [], gSel = -1, gPick = 0, streak = 0, best = 0, gDone = false;
  function deal() {
    cards = Array.from({ length: 5 }, () => ({ stake: STAKES[rnd(0, 5)], n: rnd(1, 5), flip: false }));
    gSel = -1; gPick = 0; gDone = false;
    drawFan(); $("#gTitle").textContent = "Tap a card to guess it";
    $$(".ball", $("#gBalls")).forEach(b => b.setAttribute("aria-pressed", "false"));
    $("#gGo").disabled = true; $("#gGo").textContent = "Lock in my guess";
    $("#gRes").className = "result"; $("#gRes").textContent = "Guess right and win the card's stake. Guess wrong and lose it.";
  }
  function drawFan(outcome) {
    $("#fan").innerHTML = cards.map((c, i) => `<button class="gc ${c.flip ? "flip " + (outcome || "") : ""} ${gSel === i ? "sel" : ""}" style="--r:${(i - 2) * 9}deg;--y:${Math.abs(i - 2) * 12}px" data-i="${i}" aria-label="Card ${i + 1}, ${naira(c.stake)}">
      <div class="in"><div class="f"><b>?</b><small>${naira(c.stake)}</small></div><div class="b"><span class="ball" data-n="${c.n}">${c.n}</span></div></div></button>`).join("");
  }
  const gUpd = () => { $("#gGo").disabled = gDone ? false : (gSel < 0 || !gPick); if (gSel >= 0 && !gDone) $("#gTitle").textContent = `Card ${gSel + 1} (${naira(cards[gSel].stake)}): which number is hidden?`; };
  bindBalls($("#gBalls"), n => { if (!gDone) { gPick = n; gUpd(); } });
  $("#fan").onclick = e => { const b = e.target.closest(".gc"); if (!b || gDone) return; gSel = +b.dataset.i; beep(480, .07); drawFan(); gUpd(); };
  $("#gGo").onclick = () => {
    if (gDone) return deal();
    const c = cards[gSel];
    if (c.stake > wallet) return toast("Not enough demo balance. Hit reset.");
    gDone = true; c.flip = true;
    const won = gPick === c.n;
    drawFan(won ? "win" : "lose");
    const el = $(".gc.flip");
    setWallet(wallet + (won ? c.stake : -c.stake));
    setTimeout(() => { if (won) { burstAt(el); fanfare(); } else { el.classList.add("shake"); sad(); } }, 450);
    streak = won ? streak + 1 : 0; best = Math.max(best, streak);
    $("#streak").textContent = streak; $("#best").textContent = best;
    const r = $("#gRes"); r.className = "result " + (won ? "win" : "lose");
    r.textContent = won ? `Yes! It was ${c.n}. You win ${naira(c.stake)}.` : `It was ${c.n}, you said ${gPick}. You lose ${naira(c.stake)}.`;
    $("#gGo").textContent = "Deal new cards"; $("#gGo").disabled = false;
  };
  deal();

  // ───────── GAME 3: Hide a number ─────────
  let hdPick = 0, hdStake = 200, hdBusy = false;
  bindBalls($("#hdBalls"), n => { if (hdBusy) return; hdPick = n; $("#hdGo").disabled = false; $("#hdGo").textContent = `Hide ${n} for ${naira(hdStake)}`; $("#hcNum").textContent = n; });
  bindChips($("#hdStake"), [100, 200, 500, 1000], 200, v => { hdStake = v; $("#hcStake").textContent = naira(v); if (hdPick) $("#hdGo").textContent = `Hide ${hdPick} for ${naira(v)}`; });
  $("#hdGo").onclick = async () => {
    if (hdStake > wallet) return toast("Not enough demo balance. Hit reset.");
    hdBusy = true; $("#hdGo").disabled = true;
    const reel = $("#reel"), span = $("span", reel), L = $("#reelL"), r = $("#hdRes");
    reel.className = "reel spin"; L.textContent = "A player is guessing your number…"; r.className = "result"; r.textContent = "";
    const final = rnd(1, 5); let delay = 60;
    for (let i = 0; i < 16; i++) { span.textContent = i === 15 ? final : rnd(1, 5); beep(300 + rnd(0, 400), .04, "square", .02); await sleep(reduce ? 5 : delay); delay *= 1.17; }
    const caught = final === hdPick;
    reel.className = "reel " + (caught ? "hit" : "miss");
    setWallet(wallet + (caught ? -hdStake : hdStake));
    if (caught) { sad(); L.textContent = `They guessed ${final}. Caught you.`; r.className = "result lose"; r.textContent = `They got it. You lose ${naira(hdStake)}.`; }
    else { fanfare(); burstAt(reel); L.textContent = `They guessed ${final}. You hid ${hdPick}.`; r.className = "result win"; r.textContent = `Missed! You keep their stake: +${naira(hdStake)}.`; }
    hdBusy = false; $("#hdGo").disabled = false;
  };

  // ───────── scroll + pointer fx ─────────
  const nav = $("#nav"), prog = $("#progress");
  function onScroll() {
    nav.classList.toggle("solid", scrollY > 30);
    prog.style.width = scrollY / (document.documentElement.scrollHeight - innerHeight) * 100 + "%";
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: .12 });
  $$(".head,.tile,.arena,.stats-grid div,.how-steps li,.dial-wrap,.auto-card,.safe-grid article,.faq>*,.final-in,.reel-strip").forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--d", (i % 4) * .08 + "s"); io.observe(el); });

  // count-ups
  const co = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; co.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "", t0 = performance.now();
    (function step(t) { const k = Math.min(1, (t - t0) / 1400), v = Math.round(to * (1 - Math.pow(1 - k, 4))); el.textContent = pre + v.toLocaleString("en-NG") + suf; if (k < 1) requestAnimationFrame(step); })(t0);
  }), { threshold: .6 });
  $$("[data-count]").forEach(el => co.observe(el));

  // how-it-works scroll highlight
  const steps = $$(".how-steps li");
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { steps.forEach(s => s.classList.toggle("active", s === e.target)); $("#howLine").style.width = (steps.indexOf(e.target) + 1) / steps.length * 100 + "%"; }
  }), { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => so.observe(s));

  if (hover) {
    const glow = $("#glow");
    addEventListener("pointermove", e => { glow.style.opacity = 1; glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px"; }, { passive: true });
    const hero = $(".hero");
    hero.addEventListener("pointermove", e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      $$(".orb").forEach(o => o.style.translate = `${x * -o.dataset.depth}px ${y * -o.dataset.depth}px`);
    });
    $$("[data-tilt]").forEach(el => {
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`; });
      el.addEventListener("pointerleave", () => el.style.transform = "");
    });
    $$(".magnet").forEach(el => {
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); el.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .25}px`; });
      el.addEventListener("pointerleave", () => el.style.translate = "");
    });
  }

  $$("[data-store]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); confetti(e.clientX, e.clientY, 70); toast("Store link coming soon. Add it in app.js."); }));
  $("#yr").textContent = new Date().getFullYear();
  tick(); setInterval(tick, 1000);
})();
