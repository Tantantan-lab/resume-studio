import {
  KEY,
  LIB_KEY,
  VERSIONS_KEY,
  store,
  save,
  persistActive,
  applyPhotoToState,
} from './store.js';
import { autoResumeName } from './resume-utils.js';
import { applyDemoPhotoToState } from '../demo/demo-photo.js';
import { demoRegion } from '../demo/data.js';
import { replaceLegacyDemoState } from '../demo/demo-content.js';

export function runEarlyMigrations() {
  try {
    const MK = KEY + '.migrate-20261020';
    if (!localStorage.getItem(MK)) {
      let changed = false;
      const apply = (profile, lang) => {
        const b = profile?.basics;
        if (!b) return;
        if (!('salary' in b) || b.salary === '') {
          b.salary = '6–8K';
          changed = true;
        }
        const old =
          lang === 'zh'
            ? '海外电商运营 / 海外内容运营'
            : 'Overseas E-commerce Operations / Content Operations';
        if (!b.target || b.target === old) {
          b.target = lang === 'zh' ? '市场营销 / 产品运营' : 'Marketing / Product Operations';
          changed = true;
        }
      };
      apply(store.state.profiles?.zh, 'zh');
      apply(store.state.profiles?.en, 'en');
      localStorage.setItem(MK, '1');
      if (changed) save();
    }
  } catch {}
}

export function runLateMigrations() {
  try {
    const SK = KEY + '.sort-projects-20261020';
    if (!localStorage.getItem(SK)) {
      const sortProfile = (p) => {
        if (!p?.projects) return;
        const val = (x) => x.end || x.start || '';
        p.projects.sort((a, b) => {
          const av = val(a),
            bv = val(b);
          if (!av && !bv) return 0;
          if (!av) return 1;
          if (!bv) return -1;
          return bv.localeCompare(av);
        });
      };
      sortProfile(store.state.profiles?.zh);
      sortProfile(store.state.profiles?.en);
      store.library.forEach((e) => {
        sortProfile(e.state.profiles?.zh);
        sortProfile(e.state.profiles?.en);
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(store.state));
        localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
        localStorage.setItem(SK, '1');
      } catch {}
      persistActive();
    }
  } catch {}
  try {
    const TK = KEY + '.title-migrate-20261020';
    if (!localStorage.getItem(TK)) {
      const old = new Set(['我的海外运营简历', '我的简历', '']);
      const fix = (st, region) => {
        if (!st?.meta) return;
        if (old.has((st.meta.title || '').trim()))
          st.meta.title = autoResumeName(st.profiles?.[st.language] || st.profiles?.zh, region);
      };
      fix(store.state, store.library.find((x) => x.id === store.activeResumeId)?.region || '深圳');
      store.library.forEach((e) => fix(e.state, e.region || '深圳'));
      try {
        localStorage.setItem(KEY, JSON.stringify(store.state));
        localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
        localStorage.setItem(TK, '1');
      } catch {}
      persistActive();
    }
  } catch {}
  try {
    const PK = KEY + '.photo-sync-20261020';
    if (!localStorage.getItem(PK)) {
      let src = null;
      const active = store.library.find((x) => x.id === store.activeResumeId);
      if (active) {
        for (const lang of ['zh', 'en']) {
          const b = active.state.profiles?.[lang]?.basics;
          if (b?.photo) {
            src = {
              photo: b.photo,
              photoOriginal: b.photoOriginal || '',
              photoPosition: b.photoPosition || 'center',
            };
            break;
          }
        }
      }
      if (!src) {
        for (const e of store.library) {
          for (const lang of ['zh', 'en']) {
            const b = e.state.profiles?.[lang]?.basics;
            if (b?.photo) {
              src = {
                photo: b.photo,
                photoOriginal: b.photoOriginal || '',
                photoPosition: b.photoPosition || 'center',
              };
              break;
            }
          }
          if (src) break;
        }
      }
      if (src) {
        applyPhotoToState(store.state, src);
        store.library.forEach((e) => {
          applyPhotoToState(e.state, src);
          e.updatedAt = Date.now();
        });
        persistActive();
        try {
          localStorage.setItem(KEY, JSON.stringify(store.state));
        } catch {}
      }
      localStorage.setItem(PK, '1');
    }
  } catch {}

  // Only upgrade demo identities without a photo; preserve personal profiles and uploaded photos.
  try {
    const migrationKey = KEY + '.demo-avatar-20261020';
    if (!localStorage.getItem(migrationKey)) {
      let changed = applyDemoPhotoToState(store.state);
      for (const entry of store.library) {
        if (applyDemoPhotoToState(entry.state)) {
          entry.updatedAt = Date.now();
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(KEY, JSON.stringify(store.state));
        localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
      }
      localStorage.setItem(migrationKey, '1');
    }
  } catch {
    // Stored resumes stay intact if the browser cannot persist this optional upgrade.
  }

  // Replace only the previous exact demo persona, including demo-only saved snapshots.
  try {
    const migrationKey = KEY + '.fictional-demo-content-20261020';
    if (!localStorage.getItem(migrationKey)) {
      let changed = replaceLegacyDemoState(store.state);
      for (const entry of store.library) {
        if (replaceLegacyDemoState(entry.state)) {
          entry.region = demoRegion;
          entry.note = entry.note === '当前版本' ? '虚构演示 · 当前版本' : '虚构演示';
          entry.updatedAt = Date.now();
          changed = true;
        }
      }
      for (const version of store.versions) {
        if (replaceLegacyDemoState(version.state)) {
          version.label = '虚构演示快照';
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(KEY, JSON.stringify(store.state));
        localStorage.setItem(LIB_KEY, JSON.stringify(store.library));
        localStorage.setItem(VERSIONS_KEY, JSON.stringify(store.versions));
      }
      localStorage.setItem(migrationKey, '1');
    }
  } catch {
    // Keep all non-demo records intact if this optional migration cannot be saved.
  }
}
