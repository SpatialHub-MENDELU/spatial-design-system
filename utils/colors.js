export const PRIMARY_COLOR = "#03FCC6";
export const PRIMARY_COLOR_DARK = "#00BA92";

export const VARIANT_DARK_COLOR = "#545454";
export const VARIANT_LIGHT_COLOR = "#ECECEC";

export const SUCCESS_COLOR = "#4CAF50"
export const ERROR_COLOR = "#B00020"
export const WARNING_COLOR = "#FB8C00"
export const DISABLED_COLOR = "#D5D5D5"

// Lighten color in order to create suitable highlilighted color
export function lightenColor(color, percent) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = color; // Convert named colors to hex
  const hex = ctx.fillStyle;

  const [r, g, b] = [1, 3, 5].map((i) =>
    Math.min(
      255,
      parseInt(hex.slice(i, i + 2), 16) +
        Math.round((255 - parseInt(hex.slice(i, i + 2), 16)) * (percent / 100))
    )
  );

  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Darken color in order to create suitable highlilighted color
export function darkenColor(color, percent) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = color; // Convert named colors to hex
  const hex = ctx.fillStyle;

  const [r, g, b] = [1, 3, 5].map((i) =>
    Math.max(
      0,
      parseInt(hex.slice(i, i + 2), 16) -
        Math.round(parseInt(hex.slice(i, i + 2), 16) * (percent / 100))
    )
  );

  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function getColorLightness(color) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = color; // Convert named colors to hex
  const hex = ctx.fillStyle;

  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  // Calculate relative luminance (perceived lightness)
  return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * 100; // Return as percentage
}

export function determineHighlightedColor(color) {
  const colorLightness = getColorLightness(color);
  let difference = 30; // Default difference

  // Adjust difference for very light or very dark colors
  if (colorLightness >= 90 || colorLightness <= 10) {
    difference = 40;
  }

  // Calculate suitable highlighted color based on color lightness
  return colorLightness <= 50
    ? lightenColor(color, difference) // Lighter for dark colors
    : darkenColor(color, difference); // Darker for light colors
}
