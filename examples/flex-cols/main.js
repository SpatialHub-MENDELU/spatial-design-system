import "../../components/flexbox/constants/constants.js";
import "../../components/flexbox/flexbox.js";
import "../../components/flexbox/Properties/flex-col.js";
import "../../components/flexbox/Properties/flex-grow.js";

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

const Z = '-22';

const createText = (value, { x, y }, scale = 2) => `
  <a-text
    value="${value}"
    position="${x} ${y} ${Z}"
    color="black"
    align="center"
    scale="${scale} ${scale} ${scale}"
  ></a-text>
`;

const box = (color, attrs = '', { w = 1, h = 0.5, d = 0.001 } = {}) =>
    `<a-box width="${w}" height="${h}" depth="${d}" color="${color}" material="opacity: 0.7" ${attrs}></a-box>`;

// Build a one-line description of each child so users can see the exact settings:
// extract flex-col breakpoints, a clear grow flag, and explicit sizes.
const itemLabel = (it) => {
    const bits = [it.color];
    if (it.attrs) {
        const colMatch = it.attrs.match(/flex-col="([^"]+)"/);
        if (colMatch) {
            const bps = colMatch[1]
                .split(';')
                .map(s => s.trim())
                .filter(Boolean)
                .join(', ');
            bits.push(`col[${bps}]`);
        }
        if (/\bflex-grow\b/.test(it.attrs)) bits.push('grow');
    }
    if (it.size) {
        const sizeBits = Object.entries(it.size)
            .filter(([k]) => k !== 'd')
            .map(([k, v]) => `${k}=${v}m`)
            .join(' ');
        if (sizeBits) bits.push(sizeBits);
    }
    return bits.join(' · ');
};

const flexDemo = ({ x, y, w = 4, h = 3, title, flexbox, items }) => {
    const children = items.map(it => box(it.color, it.attrs || '', it.size || {})).join('');
    const labelStartY = y - h / 2 - 0.55;
    const labelStep = 0.42;
    const labelScale = 1.5;

    const childLabels = items
        .map((it, i) => createText(itemLabel(it), { x, y: labelStartY - i * labelStep }, labelScale))
        .join('');

    return `
        ${createText(title, { x, y: y + h / 2 + 1.4 })}
        ${createText(`container: ${w}m × ${h}m`, { x, y: y + h / 2 + 0.75 }, 1.3)}
        ${createText(`flexbox: ${flexbox}`, { x, y: y + h / 2 + 0.3 }, 1.3)}
        <a-plane
            position="${x} ${y} ${Z}"
            width="${w}"
            height="${h}"
            color="green"
            flexbox="${flexbox}"
        >${children}</a-plane>
        ${childLabels}
    `;
};

const COLS = { wrap: 0, col: 9, grow: 18, issue: 27 };
const ROWS = [14, 5, -4, -13];

let html = `
  <a-entity camera look-controls
            wasd-controls="wsAxis: y; wsInverted: true; fly: true; acceleration: 80"
            position="12  14 -10"></a-entity>
  <a-sky color="#FAFAFA"></a-sky>

  ${createText('Use WASD to move (W/S = up/down, A/D = strafe). Click & drag to look around.', { x: 0, y: 20 }, 1.6)}

  ${createText('wrap',              { x: COLS.wrap,  y: 18 }, 3)}
  ${createText('flex-grow',         { x: COLS.grow,  y: 18 }, 3)}
  ${createText('flex-col grid',     { x: COLS.col,   y: 18 }, 3)}
  ${createText('issue regressions', { x: COLS.issue, y: 18 }, 3)}
`;

// ---- wrap column ----
html += flexDemo({
    x: COLS.wrap, y: ROWS[0],
    title: 'row, 5 equal items',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0.1 0.1',
    items: [
        { color: 'red',    size: { w: 1 } },
        { color: 'yellow', size: { w: 1 } },
        { color: 'blue',   size: { w: 1 } },
        { color: 'orange', size: { w: 1 } },
        { color: 'purple', size: { w: 1 } },
    ],
});

html += flexDemo({
    x: COLS.wrap, y: ROWS[1],
    title: 'row, varying widths',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0.2 0.2',
    items: [
        { color: 'red',    size: { w: 1.5 } },
        { color: 'yellow', size: { w: 2.2 } },
        { color: 'blue',   size: { w: 1 } },
        { color: 'orange', size: { w: 1.5 } },
        { color: 'purple', size: { w: 2 } },
    ],
});

html += flexDemo({
    x: COLS.wrap, y: ROWS[2], w: 3, h: 2.5,
    title: 'col direction, wrap',
    flexbox: 'direction: col; justify: start; items: start; wrap: true; gap: 0.1 0.1',
    items: ['red', 'yellow', 'blue', 'orange', 'purple', 'cyan', 'black', 'pink']
        .map(c => ({ color: c, size: { w: 1, h: 0.5 } })),
});

html += flexDemo({
    x: COLS.wrap, y: ROWS[3],
    title: 'wrap + justify-between',
    flexbox: 'direction: row; justify: between; items: start; wrap: true; gap: 0 0.2',
    items: [
        { color: 'red',    size: { w: 1.2 } },
        { color: 'yellow', size: { w: 1.2 } },
        { color: 'blue',   size: { w: 1.2 } },
        { color: 'orange', size: { w: 1.2 } },
    ],
});

// ---- flex-grow column ----
html += flexDemo({
    x: COLS.grow, y: ROWS[0],
    title: 'single grow (middle)',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 3"' },
        { color: 'yellow', attrs: 'flex-col="sm: 3" flex-grow' },
        { color: 'blue',   attrs: 'flex-col="sm: 3"' },
    ],
});

html += flexDemo({
    x: COLS.grow, y: ROWS[1],
    title: 'two grow split remainder',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 4"' },
        { color: 'yellow', attrs: 'flex-col="sm: 2" flex-grow' },
        { color: 'blue',   attrs: 'flex-col="sm: 2" flex-grow' },
    ],
});

html += flexDemo({
    x: COLS.grow, y: ROWS[2],
    title: 'grow only (3 items)',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 1" flex-grow' },
        { color: 'yellow', attrs: 'flex-col="sm: 1" flex-grow' },
        { color: 'blue',   attrs: 'flex-col="sm: 1" flex-grow' },
    ],
});

html += flexDemo({
    x: COLS.grow, y: ROWS[3],
    title: 'grow wraps to next row',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 6"' },
        { color: 'yellow', attrs: 'flex-col="sm: 4" flex-grow' },
        { color: 'blue',   attrs: 'flex-col="sm: 6" flex-grow' },
    ],
});

// ---- flex-col 12-grid column ----
html += flexDemo({
    x: COLS.col, y: ROWS[0],
    title: 'sum=12 (4+4+4)',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 4"' },
        { color: 'yellow', attrs: 'flex-col="sm: 4"' },
        { color: 'blue',   attrs: 'flex-col="sm: 4"' },
    ],
});

html += flexDemo({
    x: COLS.col, y: ROWS[1],
    title: 'sum=12 (6+6)',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 6"' },
        { color: 'yellow', attrs: 'flex-col="sm: 6"' },
    ],
});

// Show the SAME 4-item responsive grid at several container widths so the
// breakpoint switches are visible side-by-side. Breakpoints: sm(0m), md(4m),
// lg(7m), xl(10m), 2xl(12m), 3xl(15m).
{
    const cx = COLS.col;
    const cy = ROWS[2];
    const flexbox = 'direction: row; justify: start; items: start; wrap: true; gap: 0 0';
    const respItems = [
        { color: 'red',    attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'yellow', attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'blue',   attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'orange', attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
    ];
    // Each variant gets a height tall enough to fit its actual stacked layout
    // at this breakpoint: sm wraps 4 rows, md wraps 2 rows, lg fits 1 row.
    const variants = [
        { w: 3, h: 2.2, bp: 'sm  → 12 each (4 stacked rows)' },
        { w: 6, h: 1.2, bp: 'md  → 6 each (2 per row)' },
        { w: 9, h: 0.7, bp: 'lg  → 3 each (4 per row)' },
    ];
    const labelGap = 0.5;
    const interGap = 0.7;
    const totalH = variants.reduce((s, v) => s + v.h + labelGap, 0)
                 + (variants.length - 1) * interGap;
    let cursorY = cy + totalH / 2 - 1.5;

    html += `
        ${createText('responsive sm/md/lg', { x: cx, y: cursorY + 1.7 })}
        ${createText('items: col[sm: 12; md: 6; lg: 3]', { x: cx, y: cursorY + 1 }, 1.3)}
        ${createText(`flexbox: ${flexbox}`, { x: cx, y: cursorY + 0.55 }, 1.3)}
    `;

    variants.forEach((v, i) => {
        const labelY = cursorY - labelGap / 2;
        const planeY = cursorY - labelGap - v.h / 2;
        const children = respItems
            .map(it => box(it.color, it.attrs, { w: 1, h: 0.5 }))
            .join('');
        html += `
            ${createText(`container ${v.w}m × ${v.h}m — ${v.bp}`, { x: cx, y: labelY }, 1.2)}
            <a-plane
                position="${cx} ${planeY} ${Z}"
                width="${v.w}"
                height="${v.h}"
                color="green"
                flexbox="${flexbox}"
            >${children}</a-plane>
        `;
        cursorY -= labelGap + v.h + (i < variants.length - 1 ? interGap : 0);
    });
}

html += flexDemo({
    x: COLS.col, y: ROWS[3],
    title: 'over-12 wraps (5+5+5)',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 5"' },
        { color: 'yellow', attrs: 'flex-col="sm: 5"' },
        { color: 'blue',   attrs: 'flex-col="sm: 5"' },
    ],
});

// ---- issue regression column ----
html += flexDemo({
    x: COLS.issue, y: ROWS[0], w: 2.6,
    title: '#41 breakpoints',
    flexbox: 'direction: row; justify: center; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="0: 10; 3: 4; 5: 12"', size: { w: 1, h: 0.5, d: 0.001 } },
        { color: 'orange', attrs: 'flex-col="0: 8; 3: 8;"',        size: { w: 1, h: 0.5, d: 0.001 } },
    ],
});

html += flexDemo({
    x: COLS.issue + 7, y: ROWS[0], w: 3.6,
    title: '',
    flexbox: 'direction: row; justify: center; items: start; wrap: true; gap: 0 0',
    items: [
        { color: 'red',    attrs: 'flex-col="0: 10; 3: 4; 5: 12"', size: { w: 1, h: 0.5, d: 0.001 } },
        { color: 'orange', attrs: 'flex-col="0: 8; 3: 8;"',        size: { w: 1, h: 0.5, d: 0.001 } },
    ],
});



html += flexDemo({
    x: COLS.issue, y: ROWS[1],
    title: '#42 wrap: true',
    flexbox: 'direction: row; justify: center; items: start; wrap: true; gap: 0 0.1',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'yellow', attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'blue',   attrs: 'flex-col="sm: 12; md: 4; lg: 3"' },
        { color: 'orange', attrs: 'flex-col="sm: 12; md: 8; lg: 3"' },
        { color: 'black',  attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
    ],
});

html += flexDemo({
    x: COLS.issue, y: ROWS[2],
    title: '#43 overlap',
    flexbox: 'direction: row; justify: start; items: start; wrap: true; gap: 0 0.5',
    items: [
        { color: 'red',    attrs: 'flex-col="sm: 4; md: 1"' },
        { color: 'yellow', attrs: 'flex-col="sm: 4; md: 11"' },
        { color: 'blue',   attrs: 'flex-col="sm: 4; md: 4"' },
    ],
});

html += flexDemo({
    x: COLS.issue, y: ROWS[3], w: 5,
    title: 'combined showcase',
    flexbox: 'direction: row; justify: center; items: start; wrap: true; gap: 1 0',
    items: [
        { color: 'red',    attrs: 'flex-col="3: 6; 4: 11;"' },
        { color: 'yellow', attrs: 'flex-col="sm: 12; md: 6; lg: 3"' },
        { color: 'purple', attrs: 'flex-col="sm: 4; lg: 3" flex-grow' },
        { color: 'orange', attrs: 'flex-col="sm: 4; lg: 3" flex-grow' },
        { color: 'cyan',   attrs: 'flex-col="sm: 12; lg: 6"' },
    ],
});

scene.innerHTML = html;
app.appendChild(scene);

document.addEventListener('DOMContentLoaded', () => {
    scene.addEventListener('loaded', () => {
        document.querySelectorAll('[flex-col]').forEach((item) => {
            item.addEventListener('breakpoint-changed', (evt) => {
                const color = item.getAttribute('color');
                console.log(
                    `color=${color} → breakpoint=${evt.detail.breakpoint}, containerWidth=${evt.detail.containerWidth.toFixed(2)}m`
                );
            });
        });
    });
});
