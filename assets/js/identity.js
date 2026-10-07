// Identity system page (layouts/identity.html). Loaded only on that page, from
// layouts/_partials/layout/head/custom-head.html.
//
// Every value and contrast ratio on the page is read here, live, from elements
// pinned to each face (data-theme="<scheme>", plus class="dark" for the dark
// face). Nothing is copied from custom.css, so the page cannot drift from it.
(() => {
  const page = document.querySelector(".id-page");
  if (!page) return;

  // Contrast is measured from the pixel the browser actually paints: fill a
  // 1×1 canvas and read it back, so oklch-to-sRGB conversion and gamut mapping
  // are the browser's own.
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;

  const rgb = (color) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000";
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };

  const luminance = (color) => {
    const [r, g, b] = rgb(color).map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const format = (r) => `${r.toFixed(2)}:1`;
  const hex = (color) => "#" + rgb(color).map((v) => v.toString(16).padStart(2, "0")).join("");

  const faces = {
    light: page.querySelector('[data-face-probe="light"]'),
    dark: page.querySelector('[data-face-probe="dark"]'),
  };
  const token = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();
  const ground = (face) => token(faces[face], "--color-background");
  // A colour is either a literal or a token name, read on the given face.
  const resolve = (color, face) => (color.startsWith("--") ? token(faces[face], color) : color);

  // Site palette rows: value, hex and contrast against the face's background.
  page.querySelectorAll("[data-palette-face]").forEach((figure) => {
    const face = figure.dataset.paletteFace;
    figure.querySelectorAll("[data-token]").forEach((row) => {
      const value = token(figure, row.dataset.token);
      row.dataset.copyText = value;
      row.querySelector("[data-value]").textContent = `${value} · ${hex(value)}`;
      const ratioEl = row.querySelector("[data-ratio]");
      if (!ratioEl.dataset.ratioLabel) {
        ratioEl.textContent = format(ratio(value, ground(face)));
      }
    });
  });

  // Brand colours: contrast on both faces.
  page.querySelectorAll("[data-brand-contrast]").forEach((el) => {
    const color = el.dataset.brandContrast;
    el.textContent = `${format(ratio(color, ground("light")))} light · ${format(ratio(color, ground("dark")))} dark`;
  });

  // Ratios quoted in prose. The server-rendered text is a fallback.
  page.querySelectorAll("[data-contrast]").forEach((el) => {
    const face = el.dataset.face;
    el.textContent = format(ratio(resolve(el.dataset.contrast, face), ground(face)));
  });

  // --- Copy to clipboard --------------------------------------------------

  const status = page.querySelector("[data-copy-status]");

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  // An SVG as a clean standalone file: no page-only attributes, and an explicit
  // xmlns, which a .svg file needs and Hugo's HTML minifier strips from inline
  // SVG in production.
  function standaloneSvg(svg) {
    const copy = svg.cloneNode(true);
    ["role", "aria-label", "aria-hidden", "class"].forEach((name) => copy.removeAttribute(name));
    copy.querySelectorAll("[data-part]").forEach((el) => el.removeAttribute("data-part"));
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return copy.outerHTML.replace(/>\s+</g, "><");
  }

  page.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-text], [data-copy-svg], [data-copy-template]");
    if (!button) return;

    let text = button.dataset.copyText;
    if (button.hasAttribute("data-copy-svg")) {
      text = standaloneSvg(button.closest("[data-copy-scope]").querySelector("[data-copy-source] svg"));
    }
    if (button.dataset.copyTemplate) {
      text = standaloneSvg(document.getElementById(button.dataset.copyTemplate).content.querySelector("svg"));
    }
    await writeClipboard(text);

    status.textContent = `Copied ${button.dataset.copyLabel || "to clipboard"}`;
    const feedback = button.querySelector("[data-feedback]") || button;
    if (feedback.dataset.label === undefined) feedback.dataset.label = feedback.textContent;
    feedback.textContent = "Copied";
    button.dataset.copied = "";
    clearTimeout(button.copyTimer);
    button.copyTimer = setTimeout(() => {
      feedback.textContent = feedback.dataset.label;
      delete button.dataset.copied;
    }, 2000);
  });

  // --- Colour experimenter ------------------------------------------------

  const experimenter = page.querySelector("[data-experimenter]");
  if (experimenter) {
    const select = (name) => experimenter.querySelector(`[data-exp="${name}"]`);
    const [g, j, groundSelect] = [select("g"), select("j"), select("ground")];
    const preview = experimenter.querySelector("[data-exp-preview]");
    const readout = experimenter.querySelector("[data-exp-readout]");
    const defaults = { g: g.value, j: j.value };
    const pageFace = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

    const update = () => {
      preview.classList.toggle("dark", groundSelect.value === "dark");
      preview.querySelector('[data-part="g"]').setAttribute("fill", g.value);
      preview.querySelector('[data-part="j"]').setAttribute("fill", j.value);
      const bg = ground(groundSelect.value);
      const verdict = (color) => {
        const r = ratio(color, bg);
        return `${format(r)} ${r >= 3 ? "✓" : "✗ below 3:1"}`;
      };
      readout.textContent = `G ${verdict(g.value)} · J ${verdict(j.value)}`;
    };

    experimenter.addEventListener("change", update);
    experimenter.querySelector("[data-exp-reset]").addEventListener("click", () => {
      g.value = defaults.g;
      j.value = defaults.j;
      groundSelect.value = pageFace();
      update();
    });

    groundSelect.value = pageFace();
    update();
  }

  // Controls that only work with scripts were rendered hidden.
  page.querySelectorAll("[data-js-only]").forEach((el) => {
    el.hidden = false;
  });
})();
