import { linesDetailData } from './src/data/linesData.js';
import fs from 'fs';

let sql = 'ALTER TABLE linhas ADD COLUMN IF NOT EXISTS detalhes JSONB;\n\n';

for (const [numero, data] of Object.entries(linesDetailData)) {
  const jsonStr = JSON.stringify(data).replace(/'/g, "''");
  sql += `UPDATE linhas SET detalhes = '${jsonStr}'::jsonb WHERE numero = '${numero}';\n`;
}

fs.writeFileSync('update_linhas.sql', sql);
console.log('Generated update_linhas.sql');
