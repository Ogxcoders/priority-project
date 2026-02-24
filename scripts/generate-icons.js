#!/usr/bin/env node
/**
 * PWA Icon Generator
 * 
 * Generates PNG icons from the SVG source.
 * Run: node scripts/generate-icons.js
 * 
 * Requires: sharp (npm install -D sharp)
 * Or use any online SVG-to-PNG converter for the sizes below.
 * 
 * Required sizes: 72, 96, 128, 144, 152, 192, 384, 512
 */

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    try {
        const sharp = require('sharp');
        const path = require('path');
        const fs = require('fs');

        const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
        const svgBuffer = fs.readFileSync(svgPath);

        for (const size of SIZES) {
            const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}.png`);
            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            console.log(`✓ Generated icon-${size}.png`);
        }

        console.log('\nAll icons generated successfully!');
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.log('sharp not installed. Install with: npm install -D sharp');
            console.log('Or manually create PNG icons at these sizes:', SIZES.join(', '));
            console.log('Place them in public/icons/ as icon-{size}.png');
        } else {
            console.error('Error:', err);
        }
    }
}

generateIcons();
