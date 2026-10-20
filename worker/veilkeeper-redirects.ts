// Deploy to the existing veilkeepergame Worker only after PocketLore is live.
// This Worker has no assets, so an old HTML asset cannot bypass a redirect.
const STUDIO_ORIGIN = 'https://pocketlorestudios.com';
const STEAM_URL = 'https://store.steampowered.com/app/4515130/Veilkeeper/';

export default {
  fetch(request: Request): Response {
    const incoming = new URL(request.url);
    const path = incoming.pathname;

    // Shared QR codes and overlays must go straight to Steam. Keep this
    // temporary so the shortcut can be repointed without a cached 301.
    if (path === '/play' || path === '/play/') {
      const destination = new URL(STEAM_URL);
      destination.search = incoming.search;
      return Response.redirect(destination.href, 302);
    }

    const destination = new URL(STUDIO_ORIGIN);
    destination.search = incoming.search;
    if (path === '/' || path === '/index.html') {
      destination.pathname = '/veilkeeper/';
    } else if (path === '/devlog/post.html' || path === '/devlog/post') {
      const slug = incoming.searchParams.get('slug');
      destination.pathname = slug ? `/veilkeeper/devlog/${encodeURIComponent(slug)}/` : '/veilkeeper/devlog/';
      destination.searchParams.delete('slug');
    } else if (/^\/(assets\/|_astro\/|api\/|\.well-known\/|favicon\.png$|robots\.txt$|sitemap[^/]*\.xml$)/.test(path) || path === '/veilkeeper' || path.startsWith('/veilkeeper/')) {
      destination.pathname = path;
    } else {
      // Includes known pages and unknown paths: unknown pages retain their
      // identity and show the destination's real 404, rather than a soft 404.
      destination.pathname = `/veilkeeper${path}`;
    }
    // 308 preserves the method and body for older form/API links as well.
    return Response.redirect(destination.href, 308);
  }
};
