// Simple placeholder script to create app icons
// Run this with: node create-icons.js

const fs = require('fs');

// Create a simple SVG icon
const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#grad)" rx="32"/>
  <g transform="translate(96,96)">
    <path d="M -30,-40 L 0,-60 L 30,-40 L 30,40 L -30,40 Z" fill="white" opacity="0.9"/>
    <rect x="-10" y="0" width="20" height="40" fill="#6366f1"/>
    <circle cx="-20" cy="-15" r="8" fill="white"/>
    <circle cx="0" cy="-15" r="8" fill="white"/>
    <circle cx="20" cy="-15" r="8" fill="white"/>
  </g>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" rx="86"/>
  <g transform="translate(256,256)">
    <path d="M -80,-106 L 0,-160 L 80,-106 L 80,106 L -80,106 Z" fill="white" opacity="0.9"/>
    <rect x="-27" y="0" width="54" height="106" fill="#6366f1"/>
    <circle cx="-53" cy="-40" r="21" fill="white"/>
    <circle cx="0" cy="-40" r="21" fill="white"/>
    <circle cx="53" cy="-40" r="21" fill="white"/>
  </g>
</svg>`;

// Write SVG files (you'll need to convert these to PNG using an online tool or imagemagick)
fs.writeFileSync('icon-192.svg', svg192);
fs.writeFileSync('icon-512.svg', svg512);

console.log('SVG icons created! Convert them to PNG using:');
console.log('- Online: https://cloudconvert.com/svg-to-png');
console.log('- Or use any image editor to export as PNG');
