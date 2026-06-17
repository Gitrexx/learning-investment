# CLAUDE.md — Daily Investing-Learning Content Routine

This repo is a static, GitHub Pages–hosted learning site. Each day, **one** new lesson
is generated for the next topic in a fixed 100-topic curriculum. This file tells you
(Claude, running via the daily routine) exactly what to do on each run.

## Mission (per run)

Generate **one** in-depth, interactive Chinese learning document for the **next**
un-covered topic, in strict numeric order 1 → 100. Then rebuild the manifest.

## Step-by-step

1. **Determine the next topic number `N` from EXISTING CONTENT, not from dates.**
   - The source of truth for progress is the **topic numbers in the lesson H1 titles**,
     NOT filenames or how many days have passed.
   - List `content/*.md` lesson files (named `YYYY-MM-DD.md`). In each, read the first `# `
     heading and parse its topic number from the `Topic <num>：...` prefix.
   - `N = (highest topic number found across all files) + 1`. If `content/` has no lesson
     files yet, `N = 1`.
   - If `N > 100`, the curriculum is complete — write nothing and stop, noting it.
   - NOTE: the user may run this routine **several times in one day** to learn ahead or to
     test. So always recompute `N` from existing files — never assume "one topic per day".

2. **Look up topic `N`** in `投资理财学习100Topics.md` (root of repo). Use its title and
   the module it belongs to for context. Read neighboring topics so the lesson connects
   to what came before and teases what comes next.

3. **Research before writing.** This is a *learning* site built from first principles —
   accuracy matters. Verify concepts, numbers, formulas, and historical facts (use web
   search if available). Explain the underlying "why", not just the "what".

4. **Write the lesson** with a filename derived from the LATEST existing file, NOT from
   today's real calendar date:
   - Find the newest lesson file (the max `YYYY-MM-DD` among `content/*.md`).
   - The new file's date = **that latest date + 1 day**. So the dates form a clean
     one-per-day sequence regardless of when you actually run: if the newest file is
     `2026-06-18.md`, the next is `2026-06-19.md`; run again the same day and the one after
     is `2026-06-20.md`, and so on.
   - If `content/` has no lesson files yet, use today's local date as the first file.
   - Filenames stay pure `content/YYYY-MM-DD.md` (no suffixes) and never collide, because
     each run advances the date by one. The **topic number lives in the H1 title** and is
     independent of the date — they just advance together (Topic N on the Nth date).
   - Follow the format spec below.

5. **Validate the quiz JSON parses** before moving on (a broken block silently disables
   the gate). Quick check:
   ```bash
   python3 - <<'PY'
   import re, json, pathlib
   md = pathlib.Path("content/<the file you just wrote>").read_text(encoding="utf-8")
   data = json.loads(re.search(r'class="quiz-data">(.*?)</script>', md, re.S).group(1))
   assert len(data) == 5 and all(0 <= q["answer"] < len(q["options"]) for q in data)
   print("quiz OK")
   PY
   ```

6. **Rebuild the manifest:** run `python3 scripts/build_manifest.py`.

7. **Commit & push** to `main` (this triggers the GitHub Actions deploy). Commit message:
   `Add Topic N: <title>`.

## Lesson format spec (IMPORTANT — the site depends on it)

- **Language: Chinese (简体中文).** All lesson content is in Chinese.
- **First line MUST be an H1 of the exact form:** `# Topic N：<标题>`
  (full-width colon `：` is fine). `build_manifest.py` reads this as the title, and
  `app.js` parses the `N` to track progress (`N / 100`) and number the sidebar. Do not
  omit `Topic N`.
- The file is rendered as Markdown by `marked` in the browser, with:
  - **Math via MathJax**: use `$...$` for inline and `$$...$$` for display formulas.
  - **GFM tables, blockquotes, lists, code blocks** — all supported.
  - **Embedded HTML + `<script>` for interactivity**: the site executes `<script>` tags
    inside content, so you can build live calculators, sliders, quizzes, charts, etc.
- **Make it genuinely interactive when the topic benefits** (compounding calculators,
  inflation erosion sliders, risk/return plots, bond-price-vs-rate demos…). Wrap widgets
  in `<div class="widget">…</div>` — the site already styles `.widget`, its labels,
  `input[type=range]`, `input[type=number]`, `select`, `button`, and `.result`.
  Keep widget JS self-contained in an IIFE and guard for missing elements.
- **Every lesson MUST end with a 章末自测 (end-of-chapter quiz) — the site is a gated /
  闯关 course: the next chapter stays LOCKED until the reader scores ≥ 80% (4 / 5) on this
  quiz.** Do NOT hand-write quiz JS or quiz markup/styling. Emit ONLY a single data block;
  the app renders it (single-question pagination, 上一题/下一题, 提交, grading, explanations,
  retry) and unlocks the next topic on pass:

  ```html
  <script type="application/json" class="quiz-data">
  [
    { "q": "题干…", "options": ["A","B","C","D"], "answer": 1, "explain": "解析…" }
  ]
  </script>
  ```

  - `answer` is the 0-based index of the correct option. Provide **exactly 5 questions**.
  - The JSON must be valid (the app `JSON.parse`s it): escape quotes, no trailing commas,
    no `//` comments. Keep math as plain text or simple `$...$` inside strings.
  - Pass state is stored in the reader's `localStorage`; unlocking is purely client-side.
  - If a lesson has NO quiz block, the app auto-passes it so it can't block the course —
    but always include one.
- **Section order within the file:** H1 (`# Topic N：…`) → lesson body (sections, tables,
  formulas, interactive widget) → `## 📝 本篇小结` (summary) → one-line teaser for
  `Topic N+1` → `## 🧠 章末自测` (intro line + the `quiz-data` block) → disclaimer line.
- **Pedagogy**: start from first principles → build intuition → use a concrete example or
  interactive demo → connect to investing decisions → summary → teaser → quiz.
- Use `content/2026-06-17.md` (Topic 1) and `content/2026-06-18.md` (Topic 2) as the
  reference examples for tone, depth, the `.widget` interactive pattern, and the quiz block.
- Singapore context is welcome where relevant (the curriculum references MAS, CPF, SG tax,
  SG REITs) — the learner is Singapore-based.
- End every lesson with a disclaimer line: *本文为个人学习笔记，不构成任何投资建议。*

## What NOT to do

- Don't generate more than one topic per run, and don't skip ahead or out of order.
- Don't rename `投资理财学习100Topics.md`. Lesson files must stay named `YYYY-MM-DD.md`
  (pure date, no suffix) so the manifest picks them up; advance the date by one each run.
- Don't edit `index.html` / `app.js` / `styles.css` as part of a content run — those are
  the app shell, not content.
