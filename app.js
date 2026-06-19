/* 投资理财底层逻辑 · 静态学习站
 * 读取 content/manifest.json，渲染日期列表与 Markdown 学习文档。
 * 闯关模式：每篇末尾的自测达到通过线，才解锁下一章（进度存 localStorage）。
 * 支持：URL hash 深链、嵌入式交互脚本执行、MathJax 公式、进度条。
 */
(function () {
  "use strict";

  const TOTAL_TOPICS = 139;
  const PASS_RATIO = 0.8;            // 通过线：答对比例 ≥ 80%
  const STORE_KEY = "investing.passed";

  const els = {
    list: document.getElementById("topicList"),
    article: document.getElementById("article"),
    progressFill: document.getElementById("progressFill"),
    progressText: document.getElementById("progressText"),
    sidebar: document.getElementById("sidebar"),
    backdrop: document.getElementById("backdrop"),
    menuBtn: document.getElementById("menuBtn"),
  };

  let manifest = [];

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  /* ---------- 通关进度存储 ---------- */
  function loadPassed() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return new Set(raw.map(Number).filter((n) => n));
    } catch (e) {
      return new Set();
    }
  }
  function savePassed(set) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
    } catch (e) {}
  }
  let passed = loadPassed();
  function markPassed(n) {
    if (!n || passed.has(n)) return;
    passed.add(n);
    savePassed(passed);
    renderList();
    updateProgress();
  }

  /* ---------- 工具 ---------- */
  function topicNumber(title) {
    const m = /topic\s*#?\s*(\d+)/i.exec(title || "");
    return m ? parseInt(m[1], 10) : null;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  // 章节是否解锁：无编号一律解锁；Topic 1 永远解锁；其余需上一章已通过。
  function isUnlocked(entry) {
    const n = topicNumber(entry.title);
    if (!n) return true;
    if (n === 1) return true;
    return passed.has(n - 1);
  }

  /* ---------- 初始化 ---------- */
  async function init() {
    bindUI();
    try {
      const res = await fetch("content/manifest.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("manifest " + res.status);
      manifest = await res.json();
    } catch (e) {
      manifest = [];
    }
    renderList();
    updateProgress();
    routeFromHash();
  }

  function bindUI() {
    els.menuBtn.addEventListener("click", () => toggleSidebar());
    els.backdrop.addEventListener("click", () => toggleSidebar(false));
    window.addEventListener("hashchange", routeFromHash);
  }

  function toggleSidebar(force) {
    const open = force === undefined ? !els.sidebar.classList.contains("open") : force;
    els.sidebar.classList.toggle("open", open);
    els.backdrop.classList.toggle("show", open);
  }

  /* ---------- 侧边目录 ---------- */
  function renderList() {
    if (!manifest.length) {
      els.list.innerHTML =
        '<div class="topic-empty">还没有学习文档。<br>每天通过 Claude routine 生成一篇，' +
        "push 到 GitHub 后会自动出现在这里。</div>";
      return;
    }
    els.list.innerHTML = manifest.map((e) => {
      const n = topicNumber(e.title);
      const unlocked = isUnlocked(e);
      const done = n && passed.has(n);
      const numTag = n ? `<span class="ti-num">#${n}</span>` : "";
      const stateIcon = done ? '<span class="ti-state done">✓</span>'
        : !unlocked ? '<span class="ti-state lock">🔒</span>' : "";
      const cleanTitle = (e.title || e.date).replace(/^topic\s*#?\s*\d+\s*[：:．.\-]\s*/i, "");
      return (
        `<a class="topic-item${unlocked ? "" : " locked"}${done ? " passed" : ""}" ` +
        `data-date="${e.date}" href="#${e.date}">` +
        `<span class="ti-meta">${numTag}<span>${e.date}</span>${stateIcon}</span>` +
        `<span class="ti-title">${escapeHtml(cleanTitle)}</span>` +
        `</a>`
      );
    }).join("");
  }

  function updateProgress() {
    const done = passed.size;
    const pct = Math.min(100, Math.round((done / TOTAL_TOPICS) * 100));
    els.progressFill.style.width = pct + "%";
    els.progressText.textContent = `${done} / ${TOTAL_TOPICS}`;
  }

  /* ---------- 路由 ---------- */
  function routeFromHash() {
    const date = decodeURIComponent(location.hash.replace(/^#/, "")).trim();
    const entry = date ? manifest.find((e) => e.date === date) : null;
    if (entry) {
      if (isUnlocked(entry)) loadEntry(entry);
      else renderLocked(entry);
    } else if (manifest.length) {
      loadEntry(defaultEntry());
    } else {
      renderWelcome();
    }
  }
  // manifest 为日期倒序：默认进入「最新的、已解锁」的一篇。
  function defaultEntry() {
    return manifest.find((e) => isUnlocked(e)) || manifest[0];
  }

  function setActive(date) {
    els.list.querySelectorAll(".topic-item").forEach((a) => {
      a.classList.toggle("active", a.dataset.date === date);
    });
  }

  /* ---------- 各种渲染 ---------- */
  function renderWelcome() {
    els.article.innerHTML =
      '<div class="welcome">' +
      '<div class="big">📈</div>' +
      "<h1>投资理财底层逻辑 · 139 天</h1>" +
      "<p>从「钱是什么」开始，循序渐进建立属于自己的投资认知框架。</p>" +
      "<p>每天一个 Topic，共 139 篇。通过每章末尾的自测，解锁下一章。</p>" +
      "</div>";
  }

  function renderLocked(entry) {
    setActive(entry.date);
    toggleSidebar(false);
    const n = topicNumber(entry.title);
    const prev = manifest.find((e) => topicNumber(e.title) === n - 1);
    const prevLink = prev
      ? `<a class="lock-btn" href="#${prev.date}">← 前往 Topic ${n - 1}</a>`
      : "";
    els.article.innerHTML =
      '<div class="lock-screen">' +
      '<div class="lock-badge">🔒</div>' +
      `<h1>本章尚未解锁</h1>` +
      `<p>完成 <strong>Topic ${n - 1}</strong> 的章末自测并答对 ≥ ${Math.round(PASS_RATIO * 100)}%，即可解锁本章。</p>` +
      prevLink +
      "</div>";
  }

  async function loadEntry(entry) {
    setActive(entry.date);
    toggleSidebar(false);
    els.article.innerHTML = '<div class="loading">加载中…</div>';
    window.scrollTo({ top: 0 });
    try {
      const res = await fetch("content/" + entry.file, { cache: "no-cache" });
      if (!res.ok) throw new Error("content " + res.status);
      renderMarkdown(await res.text(), entry);
    } catch (e) {
      els.article.innerHTML =
        '<div class="loading">无法加载该文档（' + escapeHtml(entry.file) + "）。</div>";
    }
  }

  function renderMarkdown(md, entry) {
    const n = topicNumber(entry.title);
    const dateBadge =
      '<div class="article-date">' +
      (n ? `<span class="badge">Topic ${n}</span>` : "") +
      `<span>📅 ${entry.date}</span></div>`;

    const html = window.marked ? marked.parse(md) : "<pre>" + escapeHtml(md) + "</pre>";
    els.article.innerHTML = dateBadge + html;

    runEmbeddedScripts(els.article);
    buildQuizzes(els.article, n);
    typesetMath(els.article);
  }

  // 执行内容里嵌入的 <script>（自定义交互组件），跳过测验数据块。
  function runEmbeddedScripts(root) {
    root.querySelectorAll("script").forEach((old) => {
      if ((old.getAttribute("type") || "").indexOf("json") !== -1) return;
      const s = document.createElement("script");
      for (const attr of old.attributes) s.setAttribute(attr.name, attr.value);
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }

  function typesetMath(scope) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([scope]).catch(() => {});
    }
  }

  /* ---------- 测验（数据驱动 + 闯关解锁） ---------- */
  // 内容里用 <script type="application/json" class="quiz-data">[ {...} ]</script> 声明题目。
  function buildQuizzes(root, topicNum) {
    const dataEl = root.querySelector(".quiz-data, script.quiz");
    if (!dataEl) {
      // 本篇没有测验：直接视为通过，避免卡住后续章节。
      if (topicNum) markPassed(topicNum);
      return;
    }
    let questions;
    try {
      questions = JSON.parse(dataEl.textContent);
    } catch (e) {
      if (topicNum) markPassed(topicNum);
      return;
    }
    const mount = document.createElement("div");
    mount.className = "widget quiz";
    dataEl.replaceWith(mount);
    renderQuiz(mount, questions, topicNum);
  }

  function renderQuiz(mount, questions, topicNum) {
    const need = Math.ceil(questions.length * PASS_RATIO);
    const LETTERS = "ABCDEFGH";
    const total = questions.length;
    const selected = {};   // qi -> oi
    const optEls = {};     // qi -> [button…]
    const blocks = [];     // qi -> .quiz-q
    let cur = 0;
    let graded = false;

    // ---- 头部（进度） ----
    const head = document.createElement("div");
    head.className = "quiz-head";
    head.innerHTML =
      `<h4>📝 章末自测</h4>` +
      `<p class="quiz-hint">答对 <b>${need} / ${total}</b> 题即可解锁下一章</p>` +
      `<div class="quiz-steps"></div>`;
    mount.appendChild(head);
    const steps = head.querySelector(".quiz-steps");
    questions.forEach(() => {
      const dot = document.createElement("span");
      dot.className = "quiz-step";
      steps.appendChild(dot);
    });

    // ---- 题目（全部构建，靠 .active 控制显隐） ----
    questions.forEach((item, qi) => {
      const block = document.createElement("div");
      block.className = "quiz-q";
      block.dataset.qi = qi;

      const stem = document.createElement("p");
      stem.className = "quiz-stem";
      stem.innerHTML = `<span class="quiz-qno">${qi + 1}</span>${escapeHtml(item.q)}`;
      block.appendChild(stem);

      optEls[qi] = [];
      item.options.forEach((opt, oi) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-opt";
        btn.innerHTML =
          `<span class="quiz-letter">${LETTERS[oi]}</span>` +
          `<span class="quiz-text">${escapeHtml(opt)}</span>` +
          `<span class="quiz-tick" aria-hidden="true"></span>`;
        btn.addEventListener("click", () => onPick(qi, oi));
        block.appendChild(btn);
        optEls[qi].push(btn);
      });

      const ex = document.createElement("p");
      ex.className = "quiz-explain";
      ex.hidden = true;
      block.appendChild(ex);

      mount.appendChild(block);
      blocks.push(block);
    });

    // ---- 底部导航 ----
    const footer = document.createElement("div");
    footer.className = "quiz-footer";
    const prevBtn = document.createElement("button");
    prevBtn.className = "quiz-nav";
    prevBtn.textContent = "← 上一题";
    prevBtn.addEventListener("click", () => go(cur - 1));
    const nextBtn = document.createElement("button");
    nextBtn.className = "quiz-submit";
    nextBtn.addEventListener("click", onNext);
    footer.appendChild(prevBtn);
    footer.appendChild(nextBtn);
    mount.appendChild(footer);

    const banner = document.createElement("div");
    banner.className = "quiz-banner";
    banner.hidden = true;
    mount.appendChild(banner);

    go(0);
    typesetMath(mount);

    /* ---------- 导航 ---------- */
    function go(i) {
      cur = Math.max(0, Math.min(total - 1, i));
      blocks.forEach((b, qi) => b.classList.toggle("active", qi === cur));
      steps.querySelectorAll(".quiz-step").forEach((d, qi) => {
        d.classList.toggle("current", qi === cur);
        d.classList.toggle("answered", selected[qi] !== undefined);
      });
      refreshNav();
    }

    function refreshNav() {
      prevBtn.disabled = cur === 0;
      prevBtn.style.visibility = cur === 0 ? "hidden" : "visible";
      const last = cur === total - 1;
      if (graded) {
        // 复盘模式：末题按钮用于结束（无操作），隐藏即可
        nextBtn.style.visibility = last ? "hidden" : "visible";
        nextBtn.className = "quiz-nav";
        nextBtn.textContent = "下一题 →";
        nextBtn.disabled = false;
        return;
      }
      nextBtn.style.visibility = "visible";
      if (last) {
        nextBtn.textContent = "提交答案";
        nextBtn.className = "quiz-submit";
        nextBtn.disabled = Object.keys(selected).length < total; // 全部答完才能交
      } else {
        nextBtn.textContent = "下一题 →";
        nextBtn.className = "quiz-nav next";
        nextBtn.disabled = selected[cur] === undefined; // 当前题答了才能往下
      }
    }

    function onNext() {
      if (cur === total - 1) {
        if (!graded) grade();
      } else {
        go(cur + 1);
      }
    }

    /* ---------- 作答 ---------- */
    function onPick(qi, oi) {
      if (graded) return;
      selected[qi] = oi;
      optEls[qi].forEach((b, i) => b.classList.toggle("selected", i === oi));
      go(qi); // 刷新步点与导航按钮状态
    }

    /* ---------- 判分 / 复盘 ---------- */
    function grade() {
      graded = true;
      let correct = 0;
      questions.forEach((item, qi) => {
        const ok = selected[qi] === item.answer;
        if (ok) correct++;
        optEls[qi].forEach((b, oi) => {
          b.disabled = true;
          b.classList.remove("selected");
          if (oi === item.answer) b.classList.add("right");
          else if (oi === selected[qi]) b.classList.add("wrong");
        });
        const ex = blocks[qi].querySelector(".quiz-explain");
        ex.hidden = false;
        ex.innerHTML = `<b>${ok ? "✅ 答对" : "❌ 答错"}</b> · ${escapeHtml(item.explain || "")}`;
        steps.querySelectorAll(".quiz-step")[qi].classList.add(ok ? "ok" : "no");
      });

      const pass = correct >= need;
      banner.hidden = false;
      banner.className = "quiz-banner " + (pass ? "pass" : "fail");
      if (pass) {
        banner.innerHTML =
          `<div class="qb-score">🎉 ${correct} / ${total}　已通过</div>` +
          `<div class="qb-sub">下一章已解锁，去左侧目录继续吧。可翻看各题解析。</div>`;
        markPassed(topicNum);
      } else {
        banner.innerHTML =
          `<div class="qb-score">${correct} / ${total}　未达 ${need} 题</div>` +
          `<div class="qb-sub">翻看各题解析，然后重新作答。</div>`;
        const retry = document.createElement("button");
        retry.className = "quiz-submit";
        retry.textContent = "重新作答";
        retry.addEventListener("click", reset);
        banner.appendChild(retry);
      }
      go(0);
      typesetMath(mount);
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function reset() {
      graded = false;
      for (const k in selected) delete selected[k];
      Object.values(optEls).forEach((arr) =>
        arr.forEach((b) => {
          b.disabled = false;
          b.classList.remove("selected", "right", "wrong");
        })
      );
      mount.querySelectorAll(".quiz-explain").forEach((e) => { e.hidden = true; });
      steps.querySelectorAll(".quiz-step").forEach((d) =>
        d.classList.remove("ok", "no", "answered")
      );
      banner.hidden = true;
      go(0);
      mount.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
