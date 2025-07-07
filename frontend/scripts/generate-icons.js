/**
 * Simple script to generate placeholder icons for the PWA
 * 
 * Usage:
 * 1. Create a public/icons directory
 * 2. Run this script with Node.js: node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('Created icons directory:', iconsDir);
}

// Define the icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate a simple SVG icon with the given size and text
function generateSvgIcon(size, text) {
  const fontSize = Math.floor(size / 4);
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#5e81ac"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${fontSize}px" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
}

// Generate icons for each size
iconSizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  const svgContent = generateSvgIcon(size, 'SG');
  
  // Write the SVG file (as a placeholder for PNG)
  // In a real project, you would convert this to PNG using a library like sharp
  fs.writeFileSync(iconPath.replace('.png', '.svg'), svgContent);
  console.log(`Generated icon: ${iconPath.replace('.png', '.svg')}`);
});

// Generate a play icon for the shortcut
const playIconPath = path.join(iconsDir, 'play-icon-192x192.svg');
const playIconSvg = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#5e81ac"/>
  <polygon points="70,50 140,96 70,142" fill="white"/>
</svg>`;

fs.writeFileSync(playIconPath, playIconSvg);
console.log(`Generated play icon: ${playIconPath}`);

// Create a screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, '../public/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  console.log('Created screenshots directory:', screenshotsDir);
}

// Generate a placeholder screenshot
const screenshotPath = path.join(screenshotsDir, 'gameplay-1.svg');
const screenshotSvg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2e3440"/>
  <rect x="10" y="10" width="1260" height="700" fill="#3b4252" rx="5" ry="5"/>
  <rect x="20" y="20" width="900" height="680" fill="#4c566a" rx="5" ry="5"/>
  <rect x="930" y="20" width="330" height="330" fill="#434c5e" rx="5" ry="5"/>
  <rect x="930" y="360" width="330" height="340" fill="#434c5e" rx="5" ry="5"/>
  <text x="640" y="360" font-family="Arial" font-size="48px" fill="white" text-anchor="middle">StoryGate RPG</text>
</svg>`;

fs.writeFileSync(screenshotPath, screenshotSvg);
console.log(`Generated placeholder screenshot: ${screenshotPath}`);

console.log('\nPlaceholder icons and screenshots generated successfully!');
console.log('Note: In a production environment, replace these SVG files with proper PNG images.'); 