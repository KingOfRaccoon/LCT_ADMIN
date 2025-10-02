#!/usr/bin/env node

/**
 * Улучшение UI для avitoDemo.json
 * 
 * Применяет фирменные цвета Avito, правильную типографику,
 * отступы и радиусы для максимального соответствия реальному UI.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '../src/pages/Sandbox/data/avitoDemo.json');

console.log('🎨 Улучшаем UI для avitoDemo...\n');

let content = readFileSync(filePath, 'utf8');
const originalSize = content.length;

// === 1. Цветовая схема Avito ===
console.log('1️⃣ Обновляем цвета...');

const colorMap = {
  // Primary Blue
  '#2563eb': '#0A74F0',
  '#1d4ed8': '#0A74F0',
  '#3b82f6': '#0A74F0',
  '#1e40af': '#0A74F0',
  
  // Success Green  
  '#10b981': '#00C853',
  '#059669': '#00C853',
  '#047857': '#00C853',
  
  // Accent Red
  '#ef4444': '#FF3333',
  '#dc2626': '#FF3333',
  '#b91c1c': '#FF3333',
  
  // Dark Text
  '#0f172a': '#2F3034',
  '#1e293b': '#2F3034',
  '#334155': '#2F3034',
  
  // Background
  '#f8fafc': '#F5F5F5',
  '#f1f5f9': '#F5F5F5',
  
  // Secondary Text
  '#64748b': '#8E8E93',
  '#475569': '#8E8E93',
  
  // Border
  '#e2e8f0': '#E5E5E5',
  '#cbd5e1': '#E5E5E5',
  '#94a3b8': '#E5E5E5',
};

let colorCount = 0;
Object.entries(colorMap).forEach(([oldColor, newColor]) => {
  const regex = new RegExp(oldColor.replace(/[#]/g, '\\#'), 'gi');
  const matches = content.match(regex);
  if (matches) {
    colorCount += matches.length;
    content = content.replace(regex, newColor);
  }
});

console.log(`   ✅ Заменено ${colorCount} цветов\n`);

// === 2. Типографика ===
console.log('2️⃣ Обновляем шрифты...');

// Font family
const fontRegex = /"fontFamily"\s*:\s*"[^"]*Inter[^"]*"/g;
const fontMatches = content.match(fontRegex);
if (fontMatches) {
  console.log(`   ✅ Заменено ${fontMatches.length} шрифтов на -apple-system, Arial`);
  content = content.replace(fontRegex, '"fontFamily": "-apple-system, Arial, sans-serif"');
}

console.log();

// === 3. Border Radius (Avito использует 8-12px) ===
console.log('3️⃣ Оптимизируем радиусы...');

let radiusCount = 0;

// Большие контейнеры: 24/28/32px -> 12px
const largeRadiusRegex = /"borderRadius"\s*:\s*"(24|28|32)px"/g;
const largeMatches = content.match(largeRadiusRegex);
if (largeMatches) {
  radiusCount += largeMatches.length;
  content = content.replace(largeRadiusRegex, '"borderRadius": "12px"');
}

// Средние элементы: 16/18/20px -> 8px
const mediumRadiusRegex = /"borderRadius"\s*:\s*"(16|18|20|22)px"/g;
const mediumMatches = content.match(mediumRadiusRegex);
if (mediumMatches) {
  radiusCount += mediumMatches.length;
  content = content.replace(mediumRadiusRegex, '"borderRadius": "8px"');
}

// Кнопки и мелкие элементы: 999px -> 8px (не используем pill buttons)
const pillRadiusRegex = /"borderRadius"\s*:\s*"999px"/g;
const pillMatches = content.match(pillRadiusRegex);
if (pillMatches) {
  radiusCount += pillMatches.length;
  content = content.replace(pillRadiusRegex, '"borderRadius": "8px"');
}

console.log(`   ✅ Оптимизировано ${radiusCount} радиусов\n`);

// === 4. Тени (Avito использует легкие тени) ===
console.log('4️⃣ Улучшаем тени...');

// Заменяем тяжелые тени на легкие
const heavyShadowRegex = /"boxShadow"\s*:\s*"0\s+\d+px\s+\d+px\s+-?\d+px\s+rgba\([^)]+\)"/g;
const shadowMatches = content.match(heavyShadowRegex);
if (shadowMatches) {
  console.log(`   ✅ Облегчено ${shadowMatches.length} теней`);
  content = content.replace(heavyShadowRegex, '"boxShadow": "0 2px 8px rgba(0, 0, 0, 0.08)"');
}

console.log();

// === 5. Отступы (приведение к 8px grid) ===
console.log('5️⃣ Нормализуем отступы (8px grid)...');

let paddingCount = 0;

// Заменяем нестандартные значения на кратные 8
const paddingMap = {
  '6px': '8px',
  '10px': '8px',
  '14px': '16px',
  '18px': '16px',
  '20px': '16px',
  '22px': '24px',
  '26px': '24px',
  '28px': '24px',
  '30px': '32px',
  '36px': '32px',
};

Object.entries(paddingMap).forEach(([oldVal, newVal]) => {
  const regex = new RegExp(`"(padding[^"]*|margin[^"]*)"\s*:\s*"?${oldVal.replace('px', '')}(px)?"?`, 'g');
  const matches = content.match(regex);
  if (matches) {
    paddingCount += matches.length;
    content = content.replace(regex, (match) => match.replace(oldVal, newVal));
  }
});

console.log(`   ✅ Нормализовано ${paddingCount} отступов\n`);

// === 6. Специфичные улучшения ===
console.log('6️⃣ Применяем специфичные улучшения Avito...');

// Улучшаем высоту кнопок (48px стандарт)
content = content.replace(/"height"\s*:\s*"(40|44|50|52)px"/g, '"height": "48px"');

// Улучшаем line-height для читаемости
content = content.replace(/"lineHeight"\s*:\s*"?1\.2"?/g, '"lineHeight": "1.4"');
content = content.replace(/"lineHeight"\s*:\s*"?1\.3"?/g, '"lineHeight": "1.4"');

console.log('   ✅ Улучшены кнопки и line-height\n');

// === Сохранение ===
writeFileSync(filePath, content, 'utf8');

const newSize = content.length;
const sizeDiff = newSize - originalSize;
const sizeChange = sizeDiff > 0 ? `+${sizeDiff}` : sizeDiff;

console.log('═'.repeat(50));
console.log('✨ Улучшение завершено!');
console.log('═'.repeat(50));
console.log(`📁 Файл: ${filePath}`);
console.log(`📏 Размер: ${originalSize} → ${newSize} байт (${sizeChange})`);
console.log('\n🎯 Что изменилось:');
console.log(`   • ${colorCount} цветов приведены к стандарту Avito`);
console.log(`   • Шрифты заменены на -apple-system, Arial`);
console.log(`   • ${radiusCount} радиусов оптимизированы (8-12px)`);
console.log(`   • Тени облегчены для современного вида`);
console.log(`   • ${paddingCount} отступов нормализованы (8px grid)`);
console.log(`   • Кнопки приведены к стандарту (48px height)`);
console.log('\n📱 Проверьте результат:');
console.log('   npm run dev');
console.log('   → http://localhost:5173/sandbox\n');
