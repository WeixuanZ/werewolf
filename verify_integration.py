import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # 1. Landing Page
        print("Navigating to Landing Page...")
        await page.goto("http://localhost:5173/")
        await page.wait_for_timeout(2000) # Wait for load
        await page.screenshot(path="/home/jules/verification/integration_landing.png")
        print("Captured integration_landing.png")

        # 2. Room URL (Simulate Join)
        # Without a backend, this will likely be in "Loading" or "Waiting" state (Variant 1)
        # But since 'phase' will be undefined, it should fall back to Variant 1.
        print("Navigating to /room/test-123...")
        await page.goto("http://localhost:5173/room/test-123")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="/home/jules/verification/integration_room_default.png")
        print("Captured integration_room_default.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
