"use strict";

// 1. דוגמאות מוכנות. אין פנייה לשרת או לשירות בינה מלאכותית.
const EXAMPLES = {
  plate: 'פלטה מלבנית באורך 100 מ״מ וברוחב 60 מ״מ, עם חור מרכזי בקוטר 20 מ״מ',
  disc: 'דיסקה בקוטר חיצוני 80 מ״מ, עם חור מרכזי בקוטר 30 מ״מ',
  rectangle: 'פלטה מלבנית באורך 120 מ״מ וברוחב 80 מ״מ',
  circle: 'דיסקה בקוטר 90 מ״מ'
};

// השוואת תבניות מלאה מונעת התעלמות מפרטים שאינם נתמכים.
function normalizeText(text) {
  return text.trim().toLowerCase()
    .replace(/[״“”]/g, '"')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!]$/, '').trim();
}

function parseDescription(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('כתבו תיאור של חלק או בחרו אחת מהדוגמאות.');
  }
  if (rawText.length > 400) throw new Error('התיאור ארוך מדי. השתמשו בתבנית באורך של עד 400 תווים.');
  const text = normalizeText(rawText);
  const number = '(-?\\d+(?:[.,]\\d{1,2})?)';
  const unit = '(?:מ"מ|ממ|mm)';
  const hole = '(?:\\s*,?\\s*עם חור מרכזי בקוטר ' + number + '\\s*' + unit + ')?';
  const rectanglePattern = new RegExp('^פלטה מלבנית באורך ' + number + '\\s*' + unit + ' וברוחב ' + number + '\\s*' + unit + hole + '$');
  const discPattern = new RegExp('^דיסקה בקוטר(?: חיצוני)? ' + number + '\\s*' + unit + hole + '$');
  let match = text.match(rectanglePattern);
  let part;
  const readNumber = value => Number(value.replace(',', '.'));
  if (match) {
    part = { type: 'rectangle', width: readNumber(match[1]), height: readNumber(match[2]), hole: match[3] === undefined ? null : readNumber(match[3]) };
  } else {
    match = text.match(discPattern);
    if (!match) {
      throw new Error('התיאור אינו תואם לתבניות הנתמכות. בחרו דוגמה ושנו רק את המספרים. ציינו מ״מ בכל מידה; עובי, חומר וחורים נוספים אינם נתמכים.');
    }
    part = { type: 'disc', width: readNumber(match[1]), height: readNumber(match[1]), hole: match[2] === undefined ? null : readNumber(match[2]) };
  }
  const dimensions = [part.width, part.height];
  if (part.hole !== null) dimensions.push(part.hole);
  if (dimensions.some(value => !Number.isFinite(value) || value < 1 || value > 2000)) {
    throw new Error('כל המידות חייבות להיות בין 1 ל־2,000 מ״מ. אפס ומספרים שליליים אינם תקינים. לחלק ללא חור בחרו תבנית ללא חור.');
  }
  if (Math.max(part.width, part.height) / Math.min(part.width, part.height) > 20) {
    throw new Error('יחס האורך לרוחב גדול מ־20:1. ההדגמה מוגבלת ליחס זה כדי לשמור על תצוגה קריאה.');
  }
  if (part.hole !== null && part.hole >= Math.min(part.width, part.height)) {
    throw new Error(part.type === 'disc'
      ? 'קוטר החור חייב להיות קטן מהקוטר החיצוני של הדיסקה.'
      : 'קוטר החור חייב להיות קטן גם מאורך הפלטה וגם מרוחבה, כדי להישאר בתוך החלק.');
  }
  return part;
}

function formatNumber(value) { return String(Number(value.toFixed(2))); }
function circlePath(cx, cy, radius) {
  return `M${cx + radius} ${cy}a${radius} ${radius} 0 1 0 ${-2 * radius} 0a${radius} ${radius} 0 1 0 ${2 * radius} 0Z`;
}

// 2. אותו מקדם משמש לשני הצירים, כך שפרופורציות החלק נשמרות.
// ממדי ה-SVG הם יחידות תצוגה. ערכי המידות הכתובים הם במילימטרים.
function createDrawing(part, dimensionsVisible = true) {
  const scale = Math.min(360 / part.width, 210 / part.height);
  const w = part.width * scale;
  const h = part.height * scale;
  const cx = 305;
  const cy = 151;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const right = x + w;
  const bottom = y + h;
  const holeRadius = (part.hole || 0) * scale / 2;
  const title = part.type === 'disc' ? 'דיסקה במבט על' : 'פלטה מלבנית במבט על';
  const sizeDescription = part.type === 'disc'
    ? `קוטר חיצוני ${formatNumber(part.width)} מ״מ`
    : `אורך ${formatNumber(part.width)} מ״מ, רוחב ${formatNumber(part.height)} מ״מ`;
  const description = sizeDescription + (part.hole !== null ? `, חור מרכזי בקוטר ${formatNumber(part.hole)} מ״מ` : ', ללא חור') + '. איור לימודי; אינו בקנה מידה פיזי קבוע.';
  let outline = part.type === 'disc'
    ? circlePath(cx, cy, w / 2)
    : `M${x} ${y}H${right}V${bottom}H${x}Z`;
  if (part.hole !== null) outline += ' ' + circlePath(cx, cy, holeRadius);
  const dimensionY = bottom + 43;
  const dimensionX = x - 43;
  const widthLabel = (part.type === 'disc' ? 'Ø' : '') + formatNumber(part.width);
  const label = (tx, ty, text) => `<text x="${tx}" y="${ty}" text-anchor="middle" fill="#086c62" stroke="#fbfcfb" stroke-width="7" paint-order="stroke" stroke-linejoin="round">${text}</text>`;
  const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`;
  let dimensions = '';
  if (dimensionsVisible) {
    dimensions = `<g fill="none" stroke="#08766c" stroke-width="1.2"><path d="M${x} ${bottom + 7}V${dimensionY + 9}M${right} ${bottom + 7}V${dimensionY + 9}"/>${arrow(x, dimensionY, right, dimensionY)}</g>`;
    dimensions += `<g font-family="Arial,sans-serif" font-size="19" direction="ltr">${label(cx, dimensionY - 9, widthLabel)}</g>`;
    if (part.type === 'rectangle') {
      dimensions += `<g fill="none" stroke="#08766c" stroke-width="1.2"><path d="M${x - 7} ${y}H${dimensionX - 9}M${x - 7} ${bottom}H${dimensionX - 9}"/>${arrow(dimensionX, y, dimensionX, bottom)}</g>`;
      dimensions += `<g font-family="Arial,sans-serif" font-size="19" direction="ltr">${label(dimensionX - 2, cy + 6, formatNumber(part.height))}</g>`;
    }
    if (part.hole !== null) {
      const startX = cx + holeRadius / Math.sqrt(2);
      const startY = cy - holeRadius / Math.sqrt(2);
      dimensions += `<path d="M${startX} ${startY}L${right + 25} ${y + 12}H${right + 81}" fill="none" stroke="#08766c" stroke-width="1.2"/><circle cx="${startX}" cy="${startY}" r="2.5" fill="#08766c"/>`;
      dimensions += `<g font-family="Arial,sans-serif" font-size="19" direction="ltr">${label(right + 50, y + 3, 'Ø' + formatNumber(part.hole))}</g>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 350" width="640" height="350" role="img" aria-labelledby="drawing-title drawing-desc" style="direction:ltr">
    <title id="drawing-title">${title}</title><desc id="drawing-desc">${description}</desc>
    <defs><marker id="dim-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#08766c"/></marker></defs>
    <path d="${outline}" fill="#dcebe6" fill-rule="evenodd" stroke="#12313d" stroke-width="2.3"/>
    <path d="M${x - 22} ${cy}H${right + 22}M${cx} ${y - 22}V${bottom + 22}" fill="none" stroke="#73928b" stroke-width="1" stroke-dasharray="12 4 2 4"/>
    ${dimensions}
    <text x="615" y="337" fill="#526a73" font-size="11" font-family="Arial,sans-serif" text-anchor="end" direction="ltr">mm · TOP VIEW · EDUCATIONAL SVG</text>
  </svg>`;
}

// 3. קישור הפעולות לטופס ולתצוגה בדף.
function initializeDemo() {
  const form = document.getElementById('drawing-form');
  const input = document.getElementById('description');
  const message = document.getElementById('form-message');
  const drawing = document.getElementById('drawing');
  const stage = document.getElementById('drawing-stage');
  const emptyState = document.getElementById('empty-state');
  const summary = document.getElementById('drawing-summary');
  const state = document.getElementById('output-state');
  const dimensions = document.getElementById('show-dimensions');
  const grid = document.getElementById('show-grid');
  const download = document.getElementById('download-svg');
  let currentPart = null;
  let dirty = false;

  function showMessage(text, kind) {
    message.textContent = text;
    message.className = 'form-message ' + kind;
  }
  function refreshDrawing() {
    // ה-HTML היחיד שנוצר כאן מכיל ערכים מספריים מאומתים וטקסט קבוע.
    if (currentPart) drawing.innerHTML = createDrawing(currentPart, dimensions.checked);
  }
  function showSummary(part) {
    summary.replaceChildren();
    const entries = part.type === 'disc'
      ? [['קוטר חיצוני', part.width]]
      : [['אורך', part.width], ['רוחב', part.height]];
    entries.push(['קוטר חור', part.hole]);
    entries.forEach(([name, value]) => {
      const group = document.createElement('div');
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = name;
      definition.textContent = value === null ? '—' : formatNumber(value) + ' mm';
      if (value === null) definition.setAttribute('aria-label', 'ללא חור');
      group.append(term, definition);
      summary.append(group);
    });
  }
  function generate() {
    dirty = false;
    stage.classList.remove('stale');
    try {
      currentPart = parseDescription(input.value);
      input.setAttribute('aria-invalid', 'false');
      emptyState.hidden = true;
      summary.hidden = false;
      download.disabled = false;
      state.textContent = 'תצוגה מעודכנת';
      state.className = 'output-state';
      refreshDrawing();
      showSummary(currentPart);
      showMessage('השרטוט נוצר בהצלחה. כל המידות במ״מ.', 'success');
    } catch (error) {
      currentPart = null;
      drawing.replaceChildren();
      summary.replaceChildren();
      summary.hidden = true;
      emptyState.hidden = false;
      download.disabled = true;
      input.setAttribute('aria-invalid', 'true');
      state.textContent = 'נדרש תיקון בתיאור';
      state.className = 'output-state error';
      showMessage(error.message, 'error');
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); generate(); });
  input.addEventListener('input', () => {
    dirty = true;
    download.disabled = true;
    stage.classList.add('stale');
    summary.hidden = true;
    input.setAttribute('aria-invalid', 'false');
    state.textContent = currentPart ? 'תצוגה קודמת' : 'ממתין ליצירה';
    state.className = 'output-state pending';
    showMessage('התיאור השתנה. לחצו על ״יצירת שרטוט״ כדי לעדכן את התצוגה.', 'pending');
  });
  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      generate();
    }
  });
  document.querySelectorAll('[data-example]').forEach(button => {
    button.addEventListener('click', () => {
      input.value = EXAMPLES[button.dataset.example];
      generate();
      if (button.classList.contains('load-example')) {
        document.getElementById('lab').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        input.focus({ preventScroll: true });
      }
    });
  });
  dimensions.addEventListener('change', refreshDrawing);
  grid.addEventListener('change', () => stage.classList.toggle('grid-on', grid.checked));
  download.addEventListener('click', () => {
    if (!currentPart || dirty) return;
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + createDrawing(currentPart, dimensions.checked);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'text-to-cad-drawing.svg';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showMessage('קובץ SVG הוכן להורדה. זהו איור לימודי, ולא קובץ ייצור.', 'success');
  });
  generate();
}

if (typeof document !== 'undefined') initializeDemo();
// ייצוא לבדיקות מקומיות בלבד; פתיחת האתר אינה דורשת Node.js.
if (typeof module !== 'undefined' && module.exports) module.exports = { EXAMPLES, normalizeText, parseDescription, createDrawing };
