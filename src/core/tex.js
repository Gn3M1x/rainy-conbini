// 全部纹理用 Canvas 现场绘制（无外部图片依赖）
import * as THREE from 'three';

const JP = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",sans-serif';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function texFrom(canvas, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

export function makeTex(w, h, draw, opts) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  return texFrom(c, opts);
}

/* --------------------------------- 绘图小工具 -------------------------------- */
function rr(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}

function vtext(x, text, cx, y0, step, font, fill) {
  x.font = font; x.fillStyle = fill; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < text.length; i++) x.fillText(text[i], cx, y0 + i * step);
}

function stripes(x, w, y, h) {
  const cols = ['#e2602c', '#4f9457', '#3570b5'];
  cols.forEach((c, i) => {
    x.fillStyle = c;
    x.fillRect(0, y + i * (h / 3), w, h / 3);
  });
}

function logo(x, cx, cy, r, bg = '#ef8f3c', fg = '#ffffff', letter = 'D') {
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = bg; x.fill();
  x.beginPath(); x.arc(cx, cy, r * 0.78, 0, Math.PI * 2); x.strokeStyle = fg; x.lineWidth = r * 0.055; x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${Math.round(r * 1.02)}px ${JP}`;
  x.fillText(letter, cx, cy + r * 0.04);
}

/* --------------------------------- 便利店主招牌 -------------------------------- */
export function storeFrontSign() {
  return makeTex(2048, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fffaf0'); g.addColorStop(0.55, '#fdf4e2'); g.addColorStop(1, '#f3e9d5');
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    // 内框细线
    x.strokeStyle = 'rgba(150,120,80,.35)'; x.lineWidth = 4;
    x.strokeRect(10, 10, w - 20, h - 20);

    logo(x, 128, 116, 82);

    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#33313a';
    x.font = `700 104px ${JP}`;
    x.fillText('デイリーマート', 240, 148);
    x.fillStyle = '#8a7a63';
    x.font = `700 30px ${JP}`;
    x.fillText('D A I L Y   M A R T', 246, 196);

    // 右侧 24H
    x.textAlign = 'right';
    x.fillStyle = '#c8392f';
    x.font = `800 118px ${JP}`;
    x.fillText('24H', 1740, 160);
    x.fillStyle = '#7a6b55';
    x.font = `700 26px ${JP}`;
    x.fillText('OPEN  24  HOURS', 1742, 200);

    // 底部三色条
    stripes(x, w, 218, 30);

    // 角落小字
    x.textAlign = 'left'; x.fillStyle = 'rgba(90,80,64,.5)';
    x.font = `600 18px ${JP}`;
    x.fillText('ATM / コピー / 宅配便', 240, 214);
  });
}

/* --------------------------------- 立柱灯箱 --------------------------------- */
export function poleSign() {
  return makeTex(512, 1024, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fffcf3'); g.addColorStop(1, '#f4ebd8');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d9cbb2'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);

    logo(x, 256, 118, 74);
    x.textAlign = 'center'; x.fillStyle = '#8a7a63';
    x.font = `700 26px ${JP}`;
    x.fillText('DAILY MART', 256, 220);

    vtext(x, 'デイリーマート', 256, 300, 96, `700 92px ${JP}`, '#33313a');

    x.fillStyle = '#c8392f'; x.textAlign = 'center';
    x.font = `800 86px ${JP}`;
    x.fillText('24H', 256, 900);
    x.fillStyle = '#6b5f4c'; x.font = `700 26px ${JP}`;
    x.fillText('営業中', 256, 946);
    stripes(x, w, 970, 42);
  });
}

/* ------------------------------- 侧墙竖招牌 ------------------------------- */
export function sideSign() {
  return makeTex(256, 1024, (x, w, h) => {
    x.fillStyle = '#fbf5e7'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#d9cbb2'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    logo(x, 128, 96, 52);
    vtext(x, 'デイリーマート', 128, 220, 96, `700 86px ${JP}`, '#33313a');
    x.fillStyle = '#c8392f'; x.textAlign = 'center';
    x.font = `800 60px ${JP}`;
    x.fillText('24H', 128, 960);
    stripes(x, w, 986, 30);
  });
}

/* -------------------------------- 玻璃窗贴纸 ------------------------------- */
export function windowDecal(label, bg, fg = '#ffffff', wpx = 256, hpx = 128) {
  return makeTex(wpx, hpx, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = bg;
    rr(x, 6, 6, w - 12, h - 12, 22); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 4;
    rr(x, 12, 12, w - 24, h - 24, 16); x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 ${Math.round(h * 0.42)}px ${JP}`;
    x.fillText(label, w / 2, h / 2 + 2);
  });
}

/* ---------------------------------- 海报 ---------------------------------- */
const POSTERS = {
  karaage: { bg: '#f6e7cf', band: '#d9542b', title: '新発売', main: 'からあげ', price: '180円', sub: 'ジューシー' },
  onigiri: { bg: '#eef1e4', band: '#4f9457', title: 'できたて', main: 'おにぎり', price: '100円', sub: '鮭・ツナ' },
  coffee: { bg: '#f2e6d6', band: '#6b4a33', title: 'HOT', main: 'コーヒー', price: '120円', sub: 'S/M/L' },
  ice: { bg: '#e4eef5', band: '#3b7fbf', title: 'NEW', main: 'アイス', price: '150円', sub: 'バニラ' },
  bento: { bg: '#f5ead6', band: '#b3542e', title: 'おすすめ', main: 'お弁当', price: '450円', sub: 'のり弁' },
  snack: { bg: '#f7edd9', band: '#c98a2f', title: 'SALE', main: 'お菓子', price: '88円', sub: 'ポテチ' },
};

export function poster(kind = 'karaage') {
  const p = POSTERS[kind] || POSTERS.karaage;
  return makeTex(256, 340, (x, w, h) => {
    x.fillStyle = p.bg; x.fillRect(0, 0, w, h);
    x.fillStyle = p.band; x.fillRect(0, 0, w, 74);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 38px ${JP}`;
    x.fillText(p.title, w / 2, 38);

    // 商品图形
    x.beginPath(); x.arc(w / 2, 168, 54, 0, Math.PI * 2);
    x.fillStyle = p.band; x.globalAlpha = 0.9; x.fill(); x.globalAlpha = 1;
    x.beginPath(); x.arc(w / 2 - 16, 156, 20, 0, Math.PI * 2); x.fillStyle = 'rgba(255,255,255,.4)'; x.fill();

    x.fillStyle = '#3a342c';
    x.font = `800 44px ${JP}`;
    x.fillText(p.main, w / 2, 258);
    x.fillStyle = p.band;
    x.font = `800 34px ${JP}`;
    x.fillText(p.price, w / 2, 300);
    x.fillStyle = '#6b6155';
    x.font = `600 18px ${JP}`;
    x.fillText(p.sub, w / 2, 328);
  });
}

/* --------------------------------- 公告栏 --------------------------------- */
export function noticeBoard() {
  return makeTex(512, 384, (x, w, h) => {
    x.fillStyle = '#8a6a45'; x.fillRect(0, 0, w, h);           // 木框
    x.fillStyle = '#b08355'; x.fillRect(14, 14, w - 28, h - 28); // 软木
    // 软木颗粒
    for (let i = 0; i < 900; i++) {
      x.fillStyle = `rgba(${120 + Math.random() * 60},${85 + Math.random() * 45},${45 + Math.random() * 35},.35)`;
      x.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    x.fillStyle = '#f6f0e2'; x.textAlign = 'center';
    x.font = `700 26px ${JP}`;
    x.fillText('桜町三丁目 町内会', w / 2, 44);

    const sheets = [
      { x: 30, y: 66, w: 132, h: 176, c: '#d9542b', t: 'お知らせ', l: ['町内清掃', '11/12 (日)', '9:00 集合'] },
      { x: 176, y: 62, w: 150, h: 190, c: '#3b7fbf', t: '防災訓練', l: ['12/03 (日)', '10:00〜', '公園集合'] },
      { x: 340, y: 70, w: 140, h: 165, c: '#4f9457', t: '資源回収', l: ['毎週水曜', '朝8時まで', 'にお願い'] },
      { x: 60, y: 254, w: 170, h: 110, c: '#c98a2f', t: '年末の火の用心', l: ['夜間は戸締り', '確認を'] },
      { x: 260, y: 250, w: 210, h: 118, c: '#b3542e', t: '桜町夏祭り', l: ['8/20 土曜', '17:00〜21:00', '広場にて'] },
    ];
    sheets.forEach((s) => {
      x.save();
      x.translate(s.x, s.y);
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(3, 4, s.w, s.h);
      x.fillStyle = '#fbf8ef'; x.fillRect(0, 0, s.w, s.h);
      x.fillStyle = s.c; x.fillRect(0, 0, s.w, 26);
      x.fillStyle = '#fff'; x.font = `700 16px ${JP}`; x.textAlign = 'left';
      x.fillText(s.t, 8, 19);
      x.fillStyle = '#4a4238'; x.font = `600 14px ${JP}`;
      s.l.forEach((line, i) => x.fillText(line, 8, 52 + i * 22));
      x.fillStyle = '#d9cfb8'; x.font = `600 10px ${JP}`;
      x.fillText('桜町三丁目町内会', 8, s.h - 8);
      // 图钉
      x.beginPath(); x.arc(s.w / 2, 8, 5, 0, Math.PI * 2); x.fillStyle = '#d8442e'; x.fill();
      x.restore();
    });
  });
}

/* --------------------------------- 路牌 ---------------------------------- */
export function streetSign() {
  return makeTex(512, 160, (x, w, h) => {
    x.fillStyle = '#1b4a9c'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, h - 16);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 58px ${JP}`;
    x.fillText('桜町三丁目', w / 2, 66);
    x.font = `600 22px ${JP}`;
    x.fillText('S A K U R A M A C H I   3', w / 2, 118);
  });
}

export function stopSign() {
  return makeTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w, h); x.lineTo(0, h); x.closePath();
    x.fillStyle = '#ffffff'; x.fill();
    x.beginPath(); x.moveTo(w / 2, 25); x.lineTo(w - 24, h - 14); x.lineTo(24, h - 14); x.closePath();
    x.fillStyle = '#c7302a'; x.fill();
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 60px ${JP}`;
    x.fillText('止まれ', w / 2, h * 0.65);
  });
}

export function parkingSign() {
  return makeTex(256, 320, (x, w, h) => {
    x.fillStyle = '#f6f3ea'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1b4a9c'; x.fillRect(0, 0, w, 222);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 150px ${JP}`;
    x.fillText('P', w / 2, 118);
    x.fillStyle = '#f6f3ea'; x.fillRect(0, 222, w, h - 222);
    x.fillStyle = '#1b4a9c'; x.font = `700 40px ${JP}`;
    x.fillText('駐車場', w / 2, 266);
    x.font = `600 22px ${JP}`;
    x.fillText('24H', w / 2, 300);
  });
}

/* --------------------------------- 自动贩卖机 -------------------------------- */
const DRINKS = [
  ['#c9412f', 'コーヒー'], ['#2b62b4', 'スポーツ'], ['#3f8f5a', 'お茶'], ['#e0a23a', 'オレンジ'],
  ['#8a4f9e', 'グレープ'], ['#d9d9d9', 'ミルク'], ['#3a4a6b', 'ブラック'], ['#c76a8a', 'もも'],
  ['#7ab8d9', 'ソーダ'], ['#a8663a', 'ココア'], ['#e0c23a', 'レモン'], ['#4f8f8a', '緑茶'],
];

export function vendingFront(hot = false) {
  return makeTex(512, 1280, (x, w, h) => {
    const top = hot ? '#8f2b25' : '#224f93';
    const top2 = hot ? '#c74a37' : '#2f6ab5';
    const g = x.createLinearGradient(0, 0, 0, 300);
    g.addColorStop(0, top); g.addColorStop(1, top2);
    x.fillStyle = g; x.fillRect(0, 0, w, 200);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 78px ${JP}`;
    x.fillText(hot ? 'あったか〜い' : 'つめた〜い', w / 2, 100);
    x.font = `600 28px ${JP}`;
    x.fillStyle = 'rgba(255,255,255,.85)';
    x.fillText(hot ? 'HOT DRINKS' : 'COLD DRINKS', w / 2, 160);

    // 灯箱内饮料
    x.fillStyle = '#f8f4e8'; x.fillRect(24, 214, w - 48, 640);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const d = DRINKS[(r * 4 + c) % DRINKS.length];
        const bx = 40 + c * 112, by = 232 + r * 208;
        // 价签
        x.fillStyle = '#ffffff'; x.fillRect(bx + 4, by + 152, 92, 40);
        x.fillStyle = '#c8392f'; x.font = `800 26px ${JP}`; x.textAlign = 'center';
        x.fillText(r === 1 ? '150' : '130', bx + 50, by + 174);
        // 罐体
        x.fillStyle = d[0];
        rr(x, bx + 8, by + 14, 84, 140, 14); x.fill();
        x.fillStyle = 'rgba(255,255,255,.35)';
        x.fillRect(bx + 16, by + 26, 16, 112);
        x.fillStyle = 'rgba(0,0,0,.18)';
        x.fillRect(bx + 10, by + 120, 80, 26);
        x.fillStyle = '#fff'; x.font = `700 20px ${JP}`; x.textAlign = 'center';
        x.fillText(d[1], bx + 50, by + 76);
        x.fillStyle = '#ffffff'; x.font = `600 12px ${JP}`;
        x.fillText('SUNTORY', bx + 50, by + 40);
      }
    }
    // 按钮
    for (let i = 0; i < 4; i++) {
      x.fillStyle = '#e8e4d8'; x.fillRect(40 + i * 112, 876, 84, 52);
      x.fillStyle = hot && i % 2 ? '#c8392f' : '#3570b5';
      rr(x, 46 + i * 112, 884, 72, 34, 8); x.fill();
      x.fillStyle = '#fff'; x.font = `700 20px ${JP}`; x.textAlign = 'center';
      x.fillText(i % 2 ? 'HOT' : 'COLD', 82 + i * 112, 903);
    }
    // 投币/纸币口
    x.fillStyle = '#2f333a'; x.fillRect(24, 950, w - 48, 110);
    x.fillStyle = '#c9c4b6'; x.fillRect(52, 968, 30, 74);
    x.fillStyle = '#15181d'; x.fillRect(60, 976, 14, 58);
    x.fillStyle = '#c9c4b6'; x.fillRect(120, 976, 110, 26);
    x.fillStyle = '#15181d'; x.fillRect(130, 984, 90, 10);
    x.fillStyle = '#e8e4d8'; x.font = `700 22px ${JP}`; x.textAlign = 'left';
    x.fillText('¥', 268, 1000);
    x.fillStyle = '#ffd24a'; x.fillRect(300, 972, 150, 44);
    x.fillStyle = '#2a2118'; x.font = `800 30px ${JP}`; x.textAlign = 'center';
    x.fillText('1,000', 375, 996);
    // 取出口
    x.fillStyle = '#212429'; x.fillRect(60, 1090, w - 120, 130);
    x.strokeStyle = '#0d0f12'; x.lineWidth = 6; x.strokeRect(60, 1090, w - 120, 130);
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = `700 24px ${JP}`; x.textAlign = 'center';
    x.fillText('取り出し口', w / 2, 1155);
    x.fillStyle = '#3b5f8f'; x.fillRect(0, 1236, w, 44);
  });
}

/* --------------------------------- 垃圾桶标签 -------------------------------- */
export function trashLabel(text, color) {
  return makeTex(128, 128, (x, w, h) => {
    x.fillStyle = '#f4f1e6'; x.fillRect(0, 0, w, h);
    x.fillStyle = color;
    x.beginPath(); x.arc(64, 52, 36, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 20px ${JP}`;
    x.fillText(text, 64, 52);
    x.fillStyle = '#6b6155'; x.font = `600 16px ${JP}`;
    x.fillText('リサイクル', 64, 104);
  });
}

/* --------------------------------- 井盖 ---------------------------------- */
export function manhole() {
  return makeTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.beginPath(); x.arc(128, 128, 122, 0, Math.PI * 2);
    x.fillStyle = '#3a3f48'; x.fill();
    x.strokeStyle = '#585f6a'; x.lineWidth = 6; x.stroke();
    x.strokeStyle = '#4a505a';
    for (let r = 30; r < 110; r += 18) {
      x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.lineWidth = 3; x.stroke();
    }
    for (let a = 0; a < 8; a++) {
      x.beginPath(); x.moveTo(128, 128);
      x.lineTo(128 + Math.cos(a * Math.PI / 4) * 108, 128 + Math.sin(a * Math.PI / 4) * 108);
      x.lineWidth = 2; x.stroke();
    }
    x.fillStyle = '#585f6a'; x.font = `700 26px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('桜町', 128, 128);
  });
}

/* -------------------------------- 玻璃雨痕 -------------------------------- */
export function glassRain() {
  return makeTex(512, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    // 水珠
    for (let i = 0; i < 120; i++) {
      const px = Math.random() * w, py = Math.random() * h;
      const r = 1 + Math.random() * 3.4;
      const a = 0.05 + Math.random() * 0.16;
      const g = x.createRadialGradient(px, py - r * 0.4, 0, px, py, r * 2.2);
      g.addColorStop(0, `rgba(225,240,255,${a + 0.18})`);
      g.addColorStop(0.55, `rgba(200,225,255,${a})`);
      g.addColorStop(1, 'rgba(190,220,255,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r * 2.2, 0, Math.PI * 2); x.fill();
    }
    // 下滑水痕
    for (let i = 0; i < 26; i++) {
      const px = Math.random() * w;
      let py = Math.random() * h;
      const len = 24 + Math.random() * 170;
      const a = 0.04 + Math.random() * 0.08;
      x.strokeStyle = `rgba(210,232,255,${a})`;
      x.lineWidth = 1 + Math.random() * 1.6;
      x.beginPath(); x.moveTo(px, py);
      let cx = px;
      for (let s = 0; s < len; s += 8) {
        cx += (Math.random() - 0.5) * 1.6;
        x.lineTo(cx, py + s);
      }
      x.stroke();
      x.fillStyle = `rgba(225,240,255,${a + 0.14})`;
      x.beginPath(); x.arc(cx, py + len, 2 + Math.random() * 2.2, 0, Math.PI * 2); x.fill();
    }
  }, { repeat: [1.6, 1.4] });
}

/* -------------------------------- 屏幕/咖啡机 ------------------------------- */
export function screenFace(kind = 'pos') {
  return makeTex(256, 160, (x, w, h) => {
    x.fillStyle = '#12161d'; x.fillRect(0, 0, w, h);
    if (kind === 'atm') {
      x.fillStyle = '#1f4c7a'; x.fillRect(6, 6, w - 12, 26);
      x.fillStyle = '#cfe6ff'; x.font = `700 16px ${JP}`; x.textAlign = 'left';
      x.fillText('ATM', 14, 26);
      x.fillStyle = '#e9f2ff'; x.font = `700 34px ${JP}`; x.textAlign = 'center';
      x.fillText('お引出し', w / 2, 78);
      x.fillStyle = '#7fd6a8'; x.fillRect(16, 96, w - 32, 22);
      x.fillStyle = '#0d2018'; x.font = `700 16px ${JP}`;
      x.fillText('¥ 10,000', w / 2, 112);
      x.fillStyle = '#4a5a70'; x.fillRect(16, 128, w - 32, 18);
    } else {
      x.fillStyle = '#1d5b8f'; x.fillRect(6, 6, w - 12, 22);
      x.fillStyle = '#d8ecff'; x.font = `700 14px ${JP}`; x.textAlign = 'left';
      x.fillText('POS  レジ', 14, 22);
      x.fillStyle = '#cfd8e2'; x.font = `700 20px ${JP}`; x.textAlign = 'center';
      x.fillText('お会計', w / 2, 62);
      x.fillStyle = '#f0d060'; x.font = `800 46px ${JP}`;
      x.fillText('¥ 426', w / 2, 108);
      x.fillStyle = '#49a86e'; x.fillRect(28, 126, 90, 22);
      x.fillStyle = '#2b6f95'; x.fillRect(138, 126, 90, 22);
      x.fillStyle = '#fff'; x.font = `700 14px ${JP}`;
      x.fillText('現金', 73, 142); x.fillText('カード', 183, 142);
    }
  });
}

export function coffeeFace() {
  return makeTex(256, 256, (x, w, h) => {
    x.fillStyle = '#2a2018'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#4a3524'; x.fillRect(8, 8, w - 16, 70);
    x.fillStyle = '#ffe0a8'; x.font = `800 30px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('COFFEE', w / 2, 44);
    x.fillStyle = '#c9b9a2'; x.font = `600 16px ${JP}`;
    x.fillText('ホット / アイス', w / 2, 98);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        x.fillStyle = j === 0 ? '#e8e2d2' : '#3c2c1e';
        rr(x, 26 + j * 110, 120 + i * 40, 96, 30, 6); x.fill();
        x.fillStyle = j === 0 ? '#3c2c1e' : '#e8e2d2';
        x.font = `700 15px ${JP}`;
        x.fillText(j === 0 ? 'S' : 'L', 74 + j * 110, 136 + i * 40);
      }
    }
  });
}

/* --------------------------------- 吊旗/挂旗 -------------------------------- */
export function hangingSign(text, bg = '#c8392f', fg = '#ffffff') {
  return makeTex(512, 224, (x, w, h) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 74px ${JP}`;
    x.fillText(text, w / 2, h / 2 + 4);
  });
}

/* --------------------------------- A 字招牌 -------------------------------- */
export function aFrame() {
  return makeTex(256, 320, (x, w, h) => {
    x.fillStyle = '#fbf6e9'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8392f'; x.fillRect(0, 0, w, 84);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 46px ${JP}`;
    x.fillText('おにぎり', w / 2, 44);
    x.fillStyle = '#3a342c'; x.font = `800 70px ${JP}`;
    x.fillText('100', w / 2, 168);
    x.font = `800 30px ${JP}`;
    x.fillText('円', w / 2, 216);
    x.fillStyle = '#7a6a52'; x.font = `600 20px ${JP}`;
    x.fillText('できたて 11時〜', w / 2, 272);
  });
}

/* --------------------------------- 路面文字 -------------------------------- */
export function roadPaint(text) {
  return makeTex(512, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(235,240,246,.9)';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 150px ${JP}`;
    x.fillText(text, w / 2, h / 2);
  });
}

/* --------------------------------- 光晕贴图 -------------------------------- */
export function glowTex() {
  return makeTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, { srgb: false });
}

export function poolTex() {
  return makeTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,.45)');
    g.addColorStop(0.7, 'rgba(255,255,255,.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, { srgb: false });
}

/* --------------------------------- 地面瓷砖 -------------------------------- */
export function floorTile() {
  return makeTex(512, 512, (x, w, h) => {
    x.fillStyle = '#cfccc3'; x.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        x.fillStyle = (i + j) % 2 ? '#eeebe2' : '#e6e2d8';
        x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
        x.fillStyle = 'rgba(255,255,255,.35)';
        x.fillRect(i * s + 3, j * s + 3, s - 6, 6);
      }
    }
  }, { repeat: [3, 2] });
}

/* ------------------------------- 停车位标线用 ------------------------------- */
export function parkingStencil() {
  return makeTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(235,240,246,.85)';
    x.font = `800 150px ${JP}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('P', w / 2, h / 2);
  });
}

/* ------------------------------- 屋顶屋面 ------------------------------- */
export function roofTex() {
  return makeTex(320, 320, (x, w, h) => {
    x.fillStyle = '#4b5364';
    x.fillRect(0, 0, w, h);
    // 防水卷材颗粒
    for (let i = 0; i < 4200; i++) {
      const px = Math.random() * w, py = Math.random() * h;
      const g = Math.random();
      x.fillStyle = g > 0.5 ? `rgba(120,132,150,${0.05 + Math.random() * 0.16})`
        : `rgba(34,40,52,${0.05 + Math.random() * 0.18})`;
      x.fillRect(px, py, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
    }
    // 卷材拼接缝
    x.strokeStyle = 'rgba(26,31,40,.55)';
    x.lineWidth = 3;
    [0.33, 0.66].forEach((f) => {
      x.beginPath(); x.moveTo(0, h * f); x.lineTo(w, h * f); x.stroke();
    });
    x.strokeStyle = 'rgba(150,162,178,.14)';
    x.lineWidth = 2;
    [0.33, 0.66].forEach((f) => {
      x.beginPath(); x.moveTo(0, h * f + 3); x.lineTo(w, h * f + 3); x.stroke();
    });
    // 老化的水渍
    for (let i = 0; i < 7; i++) {
      const px = Math.random() * w, py = Math.random() * h, r = 18 + Math.random() * 46;
      const gr = x.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, 'rgba(28,34,44,.16)');
      gr.addColorStop(1, 'rgba(28,34,44,0)');
      x.fillStyle = gr;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    // 边缘泛白
    x.strokeStyle = 'rgba(178,190,206,.10)';
    x.lineWidth = 6;
    x.strokeRect(3, 3, w - 6, h - 6);
  }, { repeat: [1.5, 1.2] });
}

/* ------------------------------ 玻璃反射微光 ------------------------------ */
export function glassSheen() {
  return makeTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(176,206,248,.30)');
    g.addColorStop(0.28, 'rgba(150,188,238,.09)');
    g.addColorStop(0.62, 'rgba(120,168,220,.05)');
    g.addColorStop(1, 'rgba(110,160,215,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    // 斜向高光带
    x.save();
    x.translate(w * 0.06, 0);
    x.rotate(-0.52);
    const g2 = x.createLinearGradient(0, 0, w * 0.62, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)');
    g2.addColorStop(0.45, 'rgba(226,242,255,.15)');
    g2.addColorStop(0.62, 'rgba(226,242,255,.05)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g2;
    x.fillRect(0, 0, w * 0.62, h * 1.8);
    x.restore();
    // 边角暗一点，像玻璃厚度
    const g3 = x.createLinearGradient(0, 0, w, 0);
    g3.addColorStop(0, 'rgba(24,32,44,.18)');
    g3.addColorStop(0.06, 'rgba(24,32,44,0)');
    g3.addColorStop(0.94, 'rgba(24,32,44,0)');
    g3.addColorStop(1, 'rgba(24,32,44,.18)');
    x.fillStyle = g3;
    x.fillRect(0, 0, w, h);
  });
}
