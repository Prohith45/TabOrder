const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-core');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

const customerImgBase64 = fs.readFileSync(path.join(__dirname, '..', 'docs', 'customer-ui.png')).toString('base64');
const adminImgBase64 = fs.readFileSync(path.join(__dirname, '..', 'docs', 'admin-dashboard.png')).toString('base64');
const kdsImgBase64 = fs.readFileSync(path.join(__dirname, '..', 'docs', 'kds-screen.png')).toString('base64');

const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
    background: #07090E;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    color: #FFFFFF;
    position: relative;
  }

  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255, 107, 0, 0.05) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 107, 0, 0.05) 1px, transparent 1px);
    background-size: 60px 60px;
    opacity: 0.8;
  }

  .glow {
    position: absolute;
    width: 900px;
    height: 900px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 107, 0, 0.25) 0%, rgba(16, 185, 129, 0.1) 50%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    filter: blur(90px);
  }

  .scene {
    position: absolute;
    inset: 0;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 100px;
  }

  .scene.active {
    display: flex;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 24px;
    border-radius: 9999px;
    background: rgba(255, 107, 0, 0.15);
    border: 1px solid rgba(255, 107, 0, 0.4);
    color: #FF8A3D;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 24px;
  }

  .hero-title {
    font-size: 110px;
    font-weight: 900;
    letter-spacing: -2px;
    line-height: 1.05;
    text-align: center;
    background: linear-gradient(135deg, #FFFFFF 20%, #FF8A3D 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 24px;
  }

  .hero-subtitle {
    font-size: 38px;
    font-weight: 500;
    color: #94A3B8;
    text-align: center;
    max-width: 1250px;
    margin-bottom: 48px;
    line-height: 1.4;
  }

  .tags-row {
    display: flex;
    gap: 20px;
  }

  .tag {
    padding: 14px 28px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    font-size: 22px;
    font-weight: 600;
    color: #E2E8F0;
  }

  .split-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 80px;
  }

  .content-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .media-side {
    flex: 1.2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .phone-mockup {
    width: 380px;
    height: 780px;
    border-radius: 44px;
    border: 8px solid #1E293B;
    overflow: hidden;
    box-shadow: 0 30px 60px rgba(0,0,0,0.9), 0 0 50px rgba(255, 107, 0, 0.35);
  }

  .phone-mockup img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .desktop-mockup {
    width: 980px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    overflow: hidden;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(16, 185, 129, 0.25);
  }

  .desktop-mockup img {
    width: 100%;
    display: block;
  }

  .feature-heading {
    font-size: 54px;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 20px;
    color: #FFFFFF;
  }

  .feature-desc {
    font-size: 24px;
    color: #94A3B8;
    line-height: 1.5;
    margin-bottom: 32px;
  }

  .feature-points {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .point-item {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px 20px;
    border-radius: 14px;
  }

  .point-icon {
    font-size: 30px;
  }

  .point-title {
    font-size: 22px;
    font-weight: 700;
    color: #F8FAFC;
  }

  .point-sub {
    font-size: 17px;
    color: #94A3B8;
  }
</style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow"></div>

  <!-- Scene 1: Hook -->
  <div id="scene1" class="scene active">
    <div class="badge">🍽️ Restaurant Tech Redefined</div>
    <div class="hero-title">TABORDER</div>
    <div class="hero-subtitle">No Waiter Bottlenecks. Zero Payment Gateway Fees. 100% Real-Time Ordering.</div>
    <div class="tags-row">
      <div class="tag">⚡ Next.js 15</div>
      <div class="tag">📡 Socket.IO Real-Time</div>
      <div class="tag">🖨️ ESC/POS Thermal Printing</div>
      <div class="tag">💸 Direct P2P UPI</div>
    </div>
  </div>

  <!-- Scene 2: Customer Mobile QR -->
  <div id="scene2" class="scene">
    <div class="split-layout">
      <div class="content-side">
        <div class="badge">📱 Diner Experience</div>
        <div class="feature-heading">Frictionless Table QR Ordering</div>
        <div class="feature-desc">Guests scan table-specific QR codes to immediately explore menus, customize items, and order without waiter delays.</div>
        <div class="feature-points">
          <div class="point-item">
            <span class="point-icon">🔒</span>
            <div>
              <div class="point-title">2-Hour Table Session Lock</div>
              <div class="point-sub">Prevents cross-table spamming and keeps session cart states synchronized.</div>
            </div>
          </div>
          <div class="point-item">
            <span class="point-icon">🧾</span>
            <div>
              <div class="point-title">Itemized Digital Receipt</div>
              <div class="point-sub">Consolidates dining rounds with 2.5% CGST + 2.5% SGST auto-calculation.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="media-side">
        <div class="phone-mockup">
          <img src="data:image/png;base64,${customerImgBase64}" alt="Customer UI">
        </div>
      </div>
    </div>
  </div>

  <!-- Scene 3: Kitchen Display System -->
  <div id="scene3" class="scene">
    <div class="split-layout">
      <div class="media-side">
        <div class="desktop-mockup">
          <img src="data:image/png;base64,${kdsImgBase64}" alt="KDS Screen">
        </div>
      </div>
      <div class="content-side">
        <div class="badge">👨‍🍳 Kitchen Operations</div>
        <div class="feature-heading">Live Kitchen Display (KDS)</div>
        <div class="feature-desc">Live WebSocket tickets route directly to kitchen screens with color-coded wait urgency timers and synthetic audio chimes.</div>
        <div class="feature-points">
          <div class="point-item">
            <span class="point-icon">⏱️</span>
            <div>
              <div class="point-title">Dynamic Urgency Timers</div>
              <div class="point-sub">Green &lt; 5m, Amber 5-10m, Red &gt; 10m kitchen escalation.</div>
            </div>
          </div>
          <div class="point-item">
            <span class="point-icon">⚠️</span>
            <div>
              <div class="point-title">Special Instruction Callouts</div>
              <div class="point-sub">High-visibility warning badges for custom allergy & prep instructions.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Scene 4: Admin & P2P UPI -->
  <div id="scene4" class="scene">
    <div class="split-layout">
      <div class="content-side">
        <div class="badge">💸 Zero-Fee Checkout & Admin</div>
        <div class="feature-heading">Direct Peer-to-Peer UPI Checkout</div>
        <div class="feature-desc">Dynamic deep-link QR codes map directly to the merchant's VPA, eliminating 2-3% payment aggregator transaction commissions.</div>
        <div class="feature-points">
          <div class="point-item">
            <span class="point-icon">📲</span>
            <div>
              <div class="point-title">Auto-Filled Deep Links</div>
              <div class="point-sub">Exact bill total embedded in UPI QR; customer submits transaction UTR.</div>
            </div>
          </div>
          <div class="point-item">
            <span class="point-icon">⚙️</span>
            <div>
              <div class="point-title">Admin Table Settlement</div>
              <div class="point-sub">Real-time table status grid: Mark Paid & Settle with one click.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="media-side">
        <div class="desktop-mockup">
          <img src="data:image/png;base64,${adminImgBase64}" alt="Admin Dashboard">
        </div>
      </div>
    </div>
  </div>

  <script>
    function showScene(sceneNum) {
      document.querySelectorAll('.scene').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById('scene' + sceneNum);
      if (activeEl) activeEl.classList.add('active');
    }
  </script>
</body>
</html>`;

async function main() {
  const outputDir = path.join(__dirname, '..', 'brag-output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const animHtmlPath = path.join(outputDir, 'animation.html');
  fs.writeFileSync(animHtmlPath, htmlContent);
  console.log("Animation HTML written.");

  const musicPath = path.join(outputDir, 'music.mp3');
  const mp4Path = path.join(outputDir, 'brag.mp4');
  const posterPath = path.join(outputDir, 'brag.jpg');
  const gifPath = path.join(__dirname, '..', 'docs', 'taborder-preview.gif');

  console.log("Launching browser for scene captures...");
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('file:///' + animHtmlPath.replace(/\\/g, '/'), { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1000));

  const scenes = [
    { num: 1, duration: 4.0, name: 'scene1.png' },
    { num: 2, duration: 4.5, name: 'scene2.png' },
    { num: 3, duration: 4.5, name: 'scene3.png' },
    { num: 4, duration: 5.0, name: 'scene4.png' }
  ];

  for (const s of scenes) {
    await page.evaluate((num) => showScene(num), s.num);
    await new Promise(r => setTimeout(r, 300));
    const shotPath = path.join(outputDir, s.name);
    await page.screenshot({ path: shotPath });
    console.log("Captured " + s.name);
  }

  // Also save scene 1 as poster
  fs.copyFileSync(path.join(outputDir, 'scene1.png'), posterPath);
  console.log("Saved poster image.");
  await browser.close();

  // Use ffmpeg to create smooth transitions with audio
  console.log("Composing video with ffmpeg crossfades and music...");
  const s1 = path.join(outputDir, 'scene1.png').replace(/\\/g, '/');
  const s2 = path.join(outputDir, 'scene2.png').replace(/\\/g, '/');
  const s3 = path.join(outputDir, 'scene3.png').replace(/\\/g, '/');
  const s4 = path.join(outputDir, 'scene4.png').replace(/\\/g, '/');
  const m = musicPath.replace(/\\/g, '/');
  const outMp4 = mp4Path.replace(/\\/g, '/');

  const filterComplex = 
    `[0:v]loop=loop=120:size=1:start=0,settb=AVTB,fps=30,setpts=PTS-STARTPTS[v0];` +
    `[1:v]loop=loop=135:size=1:start=0,settb=AVTB,fps=30,setpts=PTS-STARTPTS[v1];` +
    `[2:v]loop=loop=135:size=1:start=0,settb=AVTB,fps=30,setpts=PTS-STARTPTS[v2];` +
    `[3:v]loop=loop=150:size=1:start=0,settb=AVTB,fps=30,setpts=PTS-STARTPTS[v3];` +
    `[v0][v1]xfade=transition=fade:duration=0.5:offset=3.5[x1];` +
    `[x1][v2]xfade=transition=fade:duration=0.5:offset=7.5[x2];` +
    `[x2][v3]xfade=transition=fade:duration=0.5:offset=11.5[v]`;

  const ffmpegCmd = [
    'ffmpeg', '-y',
    '-r', '30',
    '-i', s1,
    '-i', s2,
    '-i', s3,
    '-i', s4,
    '-i', m,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '4:a',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', '16.0',
    outMp4
  ];

  console.log("Running ffmpeg render...");
  const res = spawnSync(ffmpegCmd[0], ffmpegCmd.slice(1), { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error("ffmpeg render failed");
  }
  console.log("Rendered brag.mp4 successfully!");

  // Now create the animated preview GIF for GitHub README (playing on scroll)
  console.log("Generating animated preview GIF for README...");
  const gifCmd = [
    'ffmpeg', '-y',
    '-i', outMp4,
    '-vf', 'fps=12,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',
    gifPath
  ];
  const gifRes = spawnSync(gifCmd[0], gifCmd.slice(1), { stdio: 'inherit' });
  if (gifRes.status !== 0) {
    throw new Error("GIF generation failed");
  }
  console.log("Generated GIF preview at " + gifPath);

  // Write share-copy.txt
  const shareCopy = "Made TabOrder: A full-stack restaurant table ordering ecosystem with table-locked QR sessions, real-time KDS wait timers, ESC/POS hardware printing, and zero-fee P2P UPI payments directly to the merchant's VPA.\nCheck it out on GitHub: https://github.com/Prohith45/TabOrder";
  fs.writeFileSync(path.join(outputDir, 'share-copy.txt'), shareCopy);
  console.log("All tasks completed!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
