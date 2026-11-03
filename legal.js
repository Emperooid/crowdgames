(() => {
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const prog = document.getElementById("progress");
  const onScroll = () => prog.style.width = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100 + "%";
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  document.getElementById("yr").textContent = new Date().getFullYear();

  // highlight the table-of-contents entry for the section being read
  const links = $$(".toc ol a"), map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a === map.get(e.target.id)));
  }), { rootMargin: "-20% 0px -70% 0px" });
  $$(".doc section").forEach(s => io.observe(s));
})();
