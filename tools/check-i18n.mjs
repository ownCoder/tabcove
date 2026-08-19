/**
 * Tabcove — prove that Chrome actually resolves the manifest's i18n placeholders.
 *
 *     node tools/check-i18n.mjs
 *
 * `manifest.json` addresses its name, short name, and description through
 * `__MSG_…__` so that the bundled `_locales` file is live rather than dead
 * payload inside a reviewed package. That only helps if Chrome really resolves
 * them — a typo'd key silently ships an extension called `__MSG_extensionName__`,
 * which is exactly the sort of thing a static check cannot catch and a store
 * listing screenshot would immortalise.
 *
 * This asks the browser.
 */

import { launch, installExtension, openPage, evaluate, EXT } from './drive.mjs';
import { rm } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const manifest = JSON.parse(await readFile(path.join(EXT, 'manifest.json'), 'utf8'));

  const { cdp, child, profile, version } = await launch();
  const id = await installExtension(cdp, EXT);
  const page = await openPage(cdp, `chrome-extension://${id}/options/options.html`);

  const resolved = await evaluate(
    cdp,
    page.sessionId,
    `({
       name:      chrome.i18n.getMessage('extensionName'),
       shortName: chrome.i18n.getMessage('extensionShortName'),
       desc:      chrome.i18n.getMessage('extensionDescription'),
       uiLocale:  chrome.i18n.getUILanguage(),
     })`
  );

  // The options page renders the licence tier, which is the only consumer of
  // lib/license.js and lib/flags.js — check it is not dead code either.
  const tier = await evaluate(
    cdp,
    page.sessionId,
    `({
       badge: document.querySelector('#tier-badge')?.textContent ?? null,
       note:  document.querySelector('#tier-note')?.textContent ?? null,
     })`
  );

  console.log('Tabcove i18n and Pro-seam check');
  console.log('='.repeat(60));
  console.log(`  browser              ${version}`);
  console.log(`  UI locale            ${resolved.uiLocale}\n`);

  const checks = [
    ['manifest name is a placeholder', manifest.name.startsWith('__MSG_')],
    ['manifest description is a placeholder', manifest.description.startsWith('__MSG_')],
    ['name resolves', !!resolved.name && !resolved.name.startsWith('__MSG_')],
    ['short name resolves', !!resolved.shortName && !resolved.shortName.startsWith('__MSG_')],
    ['description resolves', !!resolved.desc && !resolved.desc.startsWith('__MSG_')],
    ['description within 132 chars', (resolved.desc || '').length <= 132],
    ['licence tier rendered', !!tier.badge],
    ['tier reads Free', tier.badge === 'Free'],
    ['tier note is populated', !!tier.note && tier.note.length > 20],
  ];

  let failed = 0;
  for (const [label, pass] of checks) {
    if (!pass) failed++;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`);
  }

  console.log(`\n  resolved name        ${resolved.name}`);
  console.log(`  resolved short name  ${resolved.shortName}`);
  console.log(`  resolved description ${resolved.desc}`);
  console.log(`  (${(resolved.desc || '').length}/132 characters)`);
  console.log(`\n  tier badge           ${tier.badge}`);
  console.log(`  tier note            ${(tier.note || '').slice(0, 100)}…`);

  cdp.close();
  child.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});

  console.log(`\n${checks.length - failed} passed, ${failed} failed`);
  return failed ? 1 : 0;
}

process.exit(await main());
