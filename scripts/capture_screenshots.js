const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BROWSER_PATH = fs.existsSync(EDGE_PATH) ? EDGE_PATH : CHROME_PATH;

async function prepareDemoData() {
  console.log("Preparing demo state for screenshots...");
  // Check tables
  const tables = await prisma.table.findMany({ where: { restaurantId: '1' }, orderBy: { tableNumber: 'asc' } });
  const menuItems = await prisma.menuItem.findMany();

  if (tables.length > 0 && menuItems.length > 0) {
    // Set table 1 to ACTIVE with a PREPARING order
    await prisma.table.update({
      where: { id: tables[0].id },
      data: { status: 'ACTIVE' }
    });

    // Create or update an order for Table 1 with PREPARING status
    const order1 = await prisma.order.create({
      data: {
        tableId: tables[0].id,
        restaurantId: '1',
        status: 'PREPARING',
        totalAmount: 320.00,
        paymentMethod: 'NONE',
        paymentStatus: 'UNPAID',
        createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 mins ago (Green timer)
        items: {
          create: [
            { menuItemId: menuItems[0].id, quantity: 2, specialInstructions: "Extra spicy please" },
            ...(menuItems.length > 1 ? [{ menuItemId: menuItems[1].id, quantity: 1, specialInstructions: "Less oil" }] : [])
          ]
        }
      }
    });

    if (tables.length > 1) {
      // Set table 2 to BILL_REQUESTED with UPI
      await prisma.table.update({
        where: { id: tables[1].id },
        data: { status: 'BILL_REQUESTED' }
      });
      await prisma.order.create({
        data: {
          tableId: tables[1].id,
          restaurantId: '1',
          status: 'PREPARING',
          totalAmount: 540.00,
          paymentMethod: 'UPI',
          paymentStatus: 'UNPAID',
          transactionId: 'UPI-492817294012',
          createdAt: new Date(Date.now() - 11 * 60 * 1000), // 11 mins ago (Red timer)
          items: {
            create: [
              { menuItemId: menuItems[menuItems.length - 1].id, quantity: 3 }
            ]
          }
        }
      });
    }

    if (tables.length > 2) {
      // Table 3: ACTIVE
      await prisma.table.update({
        where: { id: tables[2].id },
        data: { status: 'ACTIVE' }
      });
      await prisma.order.create({
        data: {
          tableId: tables[2].id,
          restaurantId: '1',
          status: 'PREPARING',
          totalAmount: 210.00,
          paymentMethod: 'CASH',
          paymentStatus: 'UNPAID',
          createdAt: new Date(Date.now() - 7 * 60 * 1000), // 7 mins ago (Amber timer)
          items: {
            create: [
              { menuItemId: menuItems[0].id, quantity: 1 }
            ]
          }
        }
      });
    }
  }
}

async function capture() {
  await prepareDemoData();

  console.log("Launching browser via:", BROWSER_PATH);
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  // 1. Customer UI Screenshot (Mobile viewport)
  console.log("Capturing Customer UI...");
  const customerPage = await browser.newPage();
  await customerPage.setViewport({ width: 412, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await customerPage.goto('http://localhost:3000/?table=1', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Try adding an item to the cart to show cart summary if add button exists
  try {
    const addBtns = await customerPage.$$('button');
    for (const btn of addBtns) {
      const text = await customerPage.evaluate(el => el.textContent, btn);
      if (text && text.includes('+')) {
        await btn.click();
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }
  } catch (e) {
    console.log("Could not click cart button", e.message);
  }

  const customerPath = path.join(docsDir, 'customer-ui.png');
  await customerPage.screenshot({ path: customerPath, fullPage: false });
  console.log("Saved Customer UI to", customerPath);
  await customerPage.close();

  // 2. Admin Dashboard Screenshot (Desktop viewport)
  console.log("Capturing Admin Dashboard...");
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });
  
  // Set sessionStorage to bypass passkey login
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.evaluate(() => {
    sessionStorage.setItem("admin_restaurant", JSON.stringify({ id: "1", name: "Test Hotel", passkey: "1234" }));
  });
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const adminPath = path.join(docsDir, 'admin-dashboard.png');
  await adminPage.screenshot({ path: adminPath, fullPage: false });
  console.log("Saved Admin Dashboard to", adminPath);
  await adminPage.close();

  // 3. KDS Screen Screenshot (Desktop/Tablet viewport)
  console.log("Capturing KDS Screen...");
  const kdsPage = await browser.newPage();
  await kdsPage.setViewport({ width: 1280, height: 780, deviceScaleFactor: 2 });
  await kdsPage.goto('http://localhost:3000/kds', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const kdsPath = path.join(docsDir, 'kds-screen.png');
  await kdsPage.screenshot({ path: kdsPath, fullPage: false });
  console.log("Saved KDS Screen to", kdsPath);
  await kdsPage.close();

  await browser.close();
  await prisma.$disconnect();
  console.log("All screenshots captured successfully!");
}

capture().catch(err => {
  console.error("Capture failed:", err);
  process.exit(1);
});
