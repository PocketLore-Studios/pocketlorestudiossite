// Legacy URL shim for /veilkeeper/devlog/post.html?slug=X (see post.html).
var slug = new URLSearchParams(location.search).get('slug');
location.replace(slug ? '/veilkeeper/devlog/' + encodeURIComponent(slug) + '/' : '/veilkeeper/devlog/');
