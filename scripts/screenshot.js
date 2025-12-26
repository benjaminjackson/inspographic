import { chromium } from 'playwright';

async function takeScreenshot() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Navigate to the dev server
  await page.goto('http://localhost:3000');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({
    path: 'screenshot.png',
    fullPage: true
  });

  console.log('Screenshot saved to screenshot.png');

  await browser.close();
}

takeScreenshot().catch(console.error);
