import "../components/flexbox/flexbox.js";
import "../components/flexbox/Properties/flex-col.js";

const app = document.getElementById("app");
const scene = document.createElement("a-scene");

// Configuration constants
const CONFIG = {
    zIndex: '-22',
    positions: {
        justifyRow: '-20.1',
        justifyCol: '-16',
        alignRow: '-10',
        alignCol: '-5.9'
    },
    colors: {
        background: '#018A6C',
        text: 'black'
    }
};

// Helper functions
const createText = (value, position, scale = 2) => `
  <a-text 
    value="${value}" 
    position="${position.x} ${position.y} ${CONFIG.zIndex}" 
    color="${CONFIG.colors.text}"
    align="center"
    scale="${scale} ${scale} ${scale}"
  ></a-text>
`;

const createFlexContainer = (props) => `
  <a-plane 
    position="${props.position.x} ${props.position.y} ${CONFIG.zIndex}" 
    width="4"
    height="4"
    material="color: ${CONFIG.colors.background}"
    flexbox="
      direction: ${props.direction};
      wrap: true;
      ${props.justify ? `justify: ${props.justify};` : ''}
      ${props.items ? `items: ${props.items};` : ''}
    "
  >
    ${createFlexChildren(props.childrenCount)}
  </a-plane>
`;

const createFlexChildren = (count) => {
    const colors = ['black', 'pink', 'blue', 'green', 'red'];

    return Array.from({length: count}, (_, i) => `
    <a-plane 
      color="${colors[i]}" 
      ${i === 0 ? 'width="1.5"' : ''}
      text="value: ${i + 1}; color: white; align: center; width: 12; font: kelsonsans;"
      ${i === 1 ? 'scale="1 2 2"' : ''}
    ></a-plane>
  `).join('');
};

// Layout configurations
const layouts = {
    justify: {
        row: ['start', 'center', 'end', 'between', 'around'],
        col: ['start', 'center', 'end', 'between', 'around']
    },
    align: {
        row: ['start', 'center', 'end'],
        col: ['start', 'center', 'end']
    }
};

// Generate HTML
let sceneHTML = `
  ${createText('justify', {x: -18, y: 18.5}, 4)}
  ${createText('align', {x: -8, y: 18.5}, 4)}
`;

// Generate justify section
['row', 'col'].forEach((direction, dirIndex) => {
    const baseX = direction === 'row' ? CONFIG.positions.justifyRow : CONFIG.positions.justifyCol;

    sceneHTML += `
    ${createText(direction, {x: baseX, y: 15.5}, 3)}
  `;

    layouts.justify[direction].forEach((justify, index) => {
        const y = 13.5 - (index * 5);
        sceneHTML += `
      ${createText(`justify-${justify}`, {x: baseX, y: y})}
      ${createFlexContainer({
            position: {x: baseX, y: y - 2.5},
            direction,
            justify,
            childrenCount: 5
        })}
    `;
    });
});

// Generate align section
['row', 'col'].forEach((direction, dirIndex) => {
    const baseX = direction === 'row' ? CONFIG.positions.alignRow : CONFIG.positions.alignCol;

    sceneHTML += `
    ${createText(direction, {x: baseX, y: 15.5}, 3)}
  `;

    layouts.align[direction].forEach((items, index) => {
        const y = 13.5 - (index * 5);
        sceneHTML += `
      ${createText(`items-${items}`, {x: baseX, y: y})}
      ${createFlexContainer({
            position: {x: baseX, y: y - 2.5},
            direction,
            items,
            childrenCount: 3
        })}
    `;
    });
});

// Generate combination section
sceneHTML += `
  ${createText('combinations', { x: 10, y: 18.5 }, 4)}
`;

['row', 'col'].forEach((direction, dirIndex) => {
    const baseX =  10 + (dirIndex * 6);

    layouts.justify[direction].forEach((justify, justifyIndex) => {
        layouts.align[direction].forEach((items, itemsIndex) => {
            const y = 13.5 - (justifyIndex * 6); // Position rows dynamically
            const x = baseX + (itemsIndex * 12); // Position columns dynamically

            // Add labels for combination
            sceneHTML += `
        ${createText(`[${direction[0]}] j-${justify} + i-${items}`, { x, y: y + 3 })}
      `;

            // Add the combination flex container
            sceneHTML += `
        ${createFlexContainer({
                position: { x, y: y },
                direction,
                justify,
                items,
                childrenCount: 5,
            })}
      `;
        });
    });
});

sceneHTML += `
  <a-plane 
    position="0 0 -10" 
    width="4"
    height="4"
    material="color: ${CONFIG.colors.background}"
    flexbox="
      direction: row;
      wrap: true;
      justify: center;
      items: center;
    "
  >
     <a-plane 
      color="blue" 
      text="value: ${1}; color: white; align: center; width: 12; font: kelsonsans;"
      flex-col="
        sm: 2;
        md: 4;
        lg: 6;
        xl: 8;
        2xl: 10;
        3xl: 12;
      "
    ></a-plane>
  </a-plane>
`

scene.innerHTML = sceneHTML;
app.appendChild(scene);