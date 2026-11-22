"""Optional browser smoke test. Requires Python Playwright and installed Chromium.

Run from repository root after installing playwright:
    python -m playwright install chromium
    python tests/browser_smoke.py
This test uses local in-memory page data; no manuscript is uploaded.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import re

ROOT = Path(__file__).resolve().parents[1]

def module_url(path):
    data = (ROOT / path).read_bytes()
    return 'data:text/javascript;base64,' + base64.b64encode(data).decode('ascii')

html = (ROOT / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
html = re.sub(r'<script type="module" src="\./js/main\.js"></script>', '', html)
html = html.replace('</head>', '<style>' + (ROOT / 'style.css').read_text() + '</style></head>')
main = (ROOT / 'js/main.js').read_text()
for module in ['config', 'checker', 'files', 'i18n']:
    main = main.replace(f"'./{module}.js'", f"'{module_url('js/' + module + '.js')}'")

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(html)
    page.add_script_tag(content="Object.defineProperty(window, 'localStorage', {value: {getItem(){return null},setItem(){},removeItem(){}}});")
    page.add_script_tag(type='module', content=main)
    page.wait_for_timeout(400)
    assert page.locator('#summary-total').inner_text() == '15'
    page.locator('#title').fill('A Machine Learning Framework for Research Data Analysis')
    page.locator('#abstract').fill('Machine learning systems assist researchers with reliable data analysis and decisions. ' * 20)
    page.locator('#keywords').fill('Algorithm; Data; Machine learning')
    page.locator('#subject').select_option('Computer Science & AI')
    page.locator('#article-type').select_option('Research Article')
    page.locator('#confirmations input[type=checkbox]').evaluate_all('elements => elements.forEach(e => e.click())')
    assert page.locator('#summary-count').inner_text() == '15'
    with page.expect_download() as download:
        page.locator('#download-report').click()
    assert download.value.suggested_filename.endswith('.html')
    page.locator('#open-settings').click()
    assert page.locator('#settings-dialog').evaluate('el => el.open')
    page.locator('#close-settings').click()
    page.locator('#language').select_option('ar')
    assert page.locator('#hero-title').inner_text()
    assert not errors, errors
    browser.close()
print('Browser smoke test passed.')
