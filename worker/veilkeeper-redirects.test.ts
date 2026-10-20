import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import worker from './veilkeeper-redirects.ts';
const STEAM_URL = 'https://store.steampowered.com/app/4515130/Veilkeeper/';

describe('Veilkeeper domain migration', () => {
  for (const hostname of ['veilkeepergame.com', 'www.veilkeepergame.com']) {
    it(`lands ${hostname} on PocketLore’s Veilkeeper page, retaining attribution`, () => {
      const response = worker.fetch(new Request(`https://${hostname}/?utm_source=qr`));
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('Location'), 'https://pocketlorestudios.com/veilkeeper/?utm_source=qr');
    });
    for (const path of ['/play', '/play/']) {
      it(`sends ${hostname}${path} straight to Steam`, () => {
        const response = worker.fetch(new Request(`https://${hostname}${path}?utm_source=stream`));
        assert.equal(response.status, 302);
        assert.equal(response.headers.get('Location'), `${STEAM_URL}?utm_source=stream`);
      });
    }
  }
  for (const [path, expected] of [
    ['/gameplay/', '/veilkeeper/gameplay/'],
    ['/press/', '/veilkeeper/press/'],
    ['/feedback', '/veilkeeper/feedback'],
    ['/security/', '/veilkeeper/security/'],
    ['/roadmap/#layers', '/veilkeeper/roadmap/'],
    ['/devlog/devlog-09/', '/veilkeeper/devlog/devlog-09/'],
    ['/devlog/post.html?slug=devlog-09&utm_source=old', '/veilkeeper/devlog/devlog-09/?utm_source=old'],
    ['/devlog/post.html', '/veilkeeper/devlog/'],
    ['/rss.xml', '/veilkeeper/rss.xml'],
    ['/assets/devlog/isometric.jpg', '/assets/devlog/isometric.jpg'],
    ['/.well-known/security.txt', '/.well-known/security.txt'],
    ['/veilkeeper', '/veilkeeper'],
    ['/veilkeeper/devlog/', '/veilkeeper/devlog/'],
    ['/unknown-page/', '/veilkeeper/unknown-page/']
  ]) {
    it(`preserves the destination of ${path}`, () => {
      const response = worker.fetch(new Request(`https://veilkeepergame.com${path}`));
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('Location'), `https://pocketlorestudios.com${expected}`);
    });
  }
  it('preserves POST requests for legacy feedback submissions', () => {
    const response = worker.fetch(new Request('https://veilkeepergame.com/api/feedback', { method: 'POST', body: 'test' }));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('Location'), 'https://pocketlorestudios.com/api/feedback');
  });
});
