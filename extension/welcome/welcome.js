/**
 * Tabcove — welcome.
 *
 * The first 60 seconds decide retention, so this page has exactly one job: get
 * the user's first collection stowed and shown to them. No tour, no carousel,
 * no signup, no permission ambush.
 *
 * The CTA carries a live count for the same reason the popup's does: the user
 * should know precisely what the button will do before they press it, because
 * the button closes their tabs.
 */

import * as db from '../lib/db.js';
import * as capture from '../lib/capture.js';
import { getSettings, applyAppearance } from '../lib/settings.js';
import { $ } from '../lib/dom.js';
import { plural } from '../lib/format.js';
import { warn, guard } from '../lib/toast.js';

async function main() {
  const settings = await getSettings();
  applyAppearance(document, settings);
  await db.init();

  wire();
  await paintCount(settings);
}

/**
 * Tell the user exactly what the button will take.
 *
 * The welcome page itself is one of the open tabs, and it is excluded from
 * capture (capture.js skips the extension's own pages), so the count shown is
 * genuinely what will be saved.
 */
async function paintCount(settings) {
  const preview = await capture.preview(capture.SCOPE.CURRENT_WINDOW);
  const button = $('#stow-now');
  const note = $('#cta-note');

  if (preview.tabs === 0) {
    button.disabled = true;
    $('#stow-now-label').textContent = 'Nothing to stow yet';
    note.textContent =
      'Open a few tabs, then come back — or press Alt+Shift+S from any window.';
    return;
  }

  $('#stow-now-label').textContent = `Stow my ${plural(preview.tabs, 'open tab')}`;
  note.textContent = [
    preview.groups ? `${plural(preview.groups, 'tab group')} will be kept` : null,
    settings.keepPinnedOpen ? 'pinned tabs stay open' : null,
    'this page stays open',
  ]
    .filter(Boolean)
    .join(' · ');
}

function wire() {
  $('#stow-now').addEventListener('click', () =>
    guard(async () => {
      const result = await capture.capture(capture.SCOPE.CURRENT_WINDOW);

      if (result.empty) {
        warn('Nothing to stow', {
          detail: 'Every open tab is pinned or is a browser page.',
        });
        return;
      }

      // Straight to the library, focused on what was just saved. Seeing where
      // the tabs went is the whole point of the first run.
      location.href = `${chrome.runtime.getURL('library/library.html')}?focus=${encodeURIComponent(
        result.collection.id
      )}`;
    }, 'Those tabs could not be stowed.')
  );

  $('#open-library').addEventListener('click', () => {
    location.href = chrome.runtime.getURL('library/library.html');
  });

  $('#open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());

  $('#open-import').addEventListener('click', () => {
    // Land directly on the import section rather than the top of settings.
    location.href = `${chrome.runtime.getURL('options/options.html')}#import`;
  });
}

main().catch((error) => {
  const note = $('#cta-note');
  if (note) note.textContent = `Tabcove could not start: ${error?.message || error}`;
});
