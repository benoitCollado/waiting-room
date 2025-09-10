addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    // Redirige vers la waiting room si pas de token
    return Response.redirect('https://waiting.mondomaine.com', 302);
  }

  // Vérifie le token auprès du backend
  const res = await fetch(`https://backend.mondomaine.com/verify?token=${token}`);
  const data = await res.json();

  if (!data.valid) {
    // Token invalide → waiting room
    return Response.redirect('https://waiting.mondomaine.com', 302);
  }

  // Token valide → accès au site final
  const targetUrl = `https://site-final.com${url.pathname}${url.search}`;
  return fetch(targetUrl, request);
}
