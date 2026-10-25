import { RANGES, MODES, currentRank } from '../data.js';
import { getPrefs, setPrefs, resetPrefs, getProfile } from '../filters.js';
import { esc, initials, toast } from '../utils.js';
import { pageHeader, bindFilters, optionList } from '../ui.js';

const NAME_RE = /^[A-Za-z0-9_ -]{3,16}$/;
const TAG_RE = /^[A-Za-z0-9]{2,5}$/;

function dialogHtml(profile) {
  return `
    <dialog class="dialog" id="profile-dialog" aria-labelledby="dlg-title">
      <form class="dialog__form" method="dialog" id="profile-form" novalidate>
        <h2 class="dialog__title" id="dlg-title">Edit profile</h2>
        <label class="dialog__label">Display name
          <input class="dialog__input" name="name" value="${esc(profile.name)}" maxlength="16" autocomplete="off" required aria-describedby="dlg-error">
        </label>
        <label class="dialog__label">Tag
          <input class="dialog__input" name="tag" value="${esc(profile.tag)}" maxlength="5" autocomplete="off" required aria-describedby="dlg-error">
        </label>
        <p class="dialog__error" id="dlg-error" role="alert"></p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--ghost" id="dlg-cancel">Cancel</button>
          <button type="submit" class="btn">Save changes</button>
        </div>
      </form>
    </dialog>`;
}

export function render(root) {
  const prefs = getPrefs();
  const profile = getProfile();
  const rank = currentRank();

  const row = ({ title, desc, label, control }) => `
    <section class="card setting" aria-label="${esc(title)}">
      <div><h2 class="setting__title">${esc(title)}</h2><p class="setting__desc">${esc(desc)}</p></div>
      <p class="setting__label">${esc(label)}</p>
      <div class="setting__control">${control}</div>
    </section>`;

  root.innerHTML = `
    ${pageHeader({ title: 'Profile & Settings', subtitle: 'Manage your profile, preferences and data', subtitleShort: 'Profile and preferences' })}
    <div class="stack">
      <section class="card profile-card" aria-label="Profile">
        <span class="avatar avatar--lg" aria-hidden="true">${esc(initials(profile.name))}</span>
        <div class="profile-card__body">
          <h2 class="profile-card__name">${esc(profile.full)}</h2>
          <p class="profile-card__rank">${esc(rank.tier)} · Level ${profile.level}</p>
          <p class="profile-card__note">Demo profile · Local sample data</p>
        </div>
        <button type="button" class="btn" id="edit-profile">Edit profile</button>
      </section>

      ${row({
        title: 'Dashboard preferences', desc: 'Choose the default analytics period.', label: 'Default date range',
        control: `<label class="field field--full"><span class="visually-hidden">Default date range</span><select class="value-box" id="s-range">${optionList(Object.entries(RANGES).map(([k, v]) => [k, v.label]), prefs.range)}</select></label>`,
      })}
      ${row({
        title: 'Game mode', desc: 'Used as the default filter across pages.', label: 'Preferred mode',
        control: `<label class="field field--full"><span class="visually-hidden">Preferred mode</span><select class="value-box" id="s-mode">${optionList(Object.entries(MODES), prefs.mode)}</select></label>`,
      })}
      ${row({
        title: 'Appearance', desc: 'Vanta dark theme is selected. Other themes are not designed yet.', label: 'Theme',
        control: '<label class="field field--full"><span class="visually-hidden">Theme</span><select class="value-box" id="s-theme" disabled><option>Dark</option></select></label>',
      })}
      ${row({
        title: 'Data management', desc: 'No Riot Games account is connected.', label: 'Import status',
        control: '<output class="value-box">Sample data loaded</output><button type="button" class="btn btn--ghost" id="reset-prefs">Reset preferences</button>',
      })}
      ${row({
        title: 'Privacy & account', desc: 'No personal account data is sent.', label: 'Analytics privacy',
        control: '<output class="value-box">Local demo only</output>',
      })}
    </div>
    <p class="footnote footnote--plain">Preferences are saved in this browser only. Account linking and live data import are not available in the demo.</p>
    ${dialogHtml(profile)}`;

  bindFilters(root);

  root.querySelector('#s-range').addEventListener('change', (e) => { setPrefs({ range: e.target.value }); toast('Default date range saved'); });
  root.querySelector('#s-mode').addEventListener('change', (e) => { setPrefs({ mode: e.target.value }); toast('Default game mode saved'); });
  root.querySelector('#reset-prefs').addEventListener('click', () => { resetPrefs(); toast('Preferences reset to defaults'); });

  // --- Edit profile dialog ---
  const dialog = root.querySelector('#profile-dialog');
  const form = root.querySelector('#profile-form');
  const error = root.querySelector('#dlg-error');
  const opener = root.querySelector('#edit-profile');

  opener.addEventListener('click', () => { error.textContent = ''; dialog.showModal(); form.elements.name.focus(); });
  root.querySelector('#dlg-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener.focus());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // click on backdrop

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const tag = form.elements.tag.value.trim();
    const nameOk = NAME_RE.test(name);
    const tagOk = TAG_RE.test(tag);
    form.elements.name.setAttribute('aria-invalid', String(!nameOk));
    form.elements.tag.setAttribute('aria-invalid', String(!tagOk));
    if (!nameOk) { error.textContent = 'Display name must be 3–16 characters: letters, numbers, spaces, - or _.'; form.elements.name.focus(); return; }
    if (!tagOk) { error.textContent = 'Tag must be 2–5 letters or numbers.'; form.elements.tag.focus(); return; }
    error.textContent = '';
    dialog.close();
    setPrefs({ displayName: name, tag });
    toast('Profile updated');
  });
}
