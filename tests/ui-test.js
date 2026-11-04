/* TEST giao diện: PC + giả lập điện thoại vào trận tập, chụp ảnh, bắt lỗi console. node tests/ui-test.js [URL] [thư mục ảnh] */
const { chromium, devices } = require('playwright');
const URL = process.argv[2] || 'http://localhost:8080', OUT = process.argv[3] || 'tests/anh';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const shot = async (p, path) => { await p.evaluate(() => { window.__NORENDER = false; }); const f0 = await p.evaluate(() => __GAME.fc); await p.waitForFunction(f => __GAME.fc >= f + 2, f0, { timeout: 120000 }); await p.screenshot({ path, timeout: 120000 }); await p.evaluate(() => { window.__NORENDER = true; }); };
  const run = async (label, ctxOpt, fn) => {
    const ctx = await b.newContext(ctxOpt), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.addInitScript(() => { window.__NORENDER = true; localStorage.setItem('glh_settings_v1', JSON.stringify({ quality: 'low', name: 'Thử Nghiệm', fk: 'hoa' })); });
    await p.goto(URL); await p.waitForFunction(() => window.__GAME && __GAME.mode === 'home', null, { timeout: 90000 });
    await fn(p); await ctx.close(); console.log(label, errs.length ? 'LỖI:\n  ' + errs.join('\n  ') : 'không lỗi'); return errs;
  };
  const e1 = await run('PC', { viewport: { width: 1280, height: 720 } }, async p => {
    await shot(p, OUT + '/1-man-chinh-pc.png');
    await p.evaluate(() => __GAME.hud.showGuide('lua')); await p.waitForTimeout(300); await shot(p, OUT + '/1b-bi-kip-dong.png'); await p.evaluate(() => document.getElementById('guide').classList.add('hidden'));
    await p.click('#bPractice'); await p.waitForFunction(() => __GAME.mode === 'play' && __GAME.my, null, { timeout: 30000 });
    await p.waitForTimeout(2500); await shot(p, OUT + '/2-trong-tran-pc.png');
    // giả lập chơi: đi, đánh, chiêu, cộng điểm
    await p.evaluate(() => { __GAME.keys.KeyW = true; }); await p.waitForTimeout(1500); await p.evaluate(() => { __GAME.keys.KeyW = false; __GAME.doAttack(); __GAME.castSkill(0); });
    await p.waitForTimeout(800); await shot(p, OUT + '/3-tan-chieu-pc.png');
    await p.evaluate(() => __GAME.hud.toggle('points', true)); await p.waitForTimeout(500); await shot(p, OUT + '/4-bang-diem-suc.png'); await p.evaluate(() => __GAME.hud.closePanels());
    const st = await p.evaluate(() => ({ alive: __GAME.alive, me: __GAME.my && { hp: __GAME.my.hp, lvl: __GAME.my.lvl, skl: __GAME.my.skl }, mons: [...__GAME.mons.values()].filter(m => m.mesh && m.mesh.visible).length, players: __GAME.players.size, zone: __GAME.zone }));
    console.log('trạng thái PC:', JSON.stringify(st));
  });
  const e2 = await run('Điện thoại', { ...devices['Pixel 7'], isMobile: true, hasTouch: true, viewport: { width: 915, height: 412 } }, async p => {
    await shot(p, OUT + '/5-man-chinh-dien-thoai.png');
    await p.click('#bPractice'); await p.waitForFunction(() => __GAME.mode === 'play' && __GAME.my, null, { timeout: 30000 }); await p.waitForTimeout(2500);
    await shot(p, OUT + '/6-trong-tran-dien-thoai.png');
  });
  await b.close(); process.exit(e1.length + e2.length ? 1 : 0);
})();
