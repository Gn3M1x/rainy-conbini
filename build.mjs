// 打包：src/main.js -> 单文件 HTML（可直接双击打开，无需服务器）
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['chrome110', 'safari16'],
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
});

const code = result.outputFiles[0].text;
const tpl = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
const html = tpl.replace('/*__BUNDLE__*/', () => code);

fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/rainy-conbini.html'), html);
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log('built index.html + out/rainy-conbini.html', (html.length / 1024).toFixed(0) + 'KB');
