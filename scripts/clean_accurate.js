const fs = require('fs');
const filePath = 'C:/Users/Administrator/.gemini/antigravity/scratch/ainovel-engine/scripts/execute_update_vol1_chapters_1_to_3_accurate.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.split('a[href*="7704528770274689560"]').join('a[href^="/main/writer/7704518175408278552/publish/7704528770274689560"]');
code = code.split('a[href*="7704529735971258904"]').join('a[href^="/main/writer/7704518175408278552/publish/7704529735971258904"]');
code = code.split('a[href*="7704529911825826328"]').join('a[href^="/main/writer/7704518175408278552/publish/7704529911825826328"]');

fs.writeFileSync(filePath, code, 'utf8');

const stars = (code.match(/\x2A/g) || []).length;
console.log('Stars count:', stars);
if (stars > 0) process.exit(1);
