import { addRoute, simpleErrorResponse } from './router.ts';

addRoute('/psl', async () => {
  const pslResponse = await fetch(
    'https://publicsuffix.org/list/public_suffix_list.dat',
  );

  return new Response(pslResponse.body, {
    headers: {
      ...Object.fromEntries(pslResponse.headers),
      'Content-Security-Policy': 'sandbox',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

interface Details {
  preflightHeaders?: { [name: string]: string };
  headers?: { [name: string]: string };
  method?: string;
}
const detailsMap = new Map<string, Details>();

function getDetails(id: string | null): Details {
  // Just return a dummy object to make things easier.
  if (!id) return {};
  if (!detailsMap.has(id)) {
    detailsMap.set(id, {});
    // Only keep details around for a minute:
    setTimeout(() => detailsMap.delete(id), 60_000);
  }
  return detailsMap.get(id)!;
}

addRoute('/resource', {
  OPTIONS(url, request) {
    const details = getDetails(url.searchParams.get('id'));
    details.preflightHeaders = Object.fromEntries(request.headers);
    const headers = new Headers();
    const status = Number(url.searchParams.get('preflight-status')) || 206;

    for (const acHeader of [
      'allow-origin',
      'allow-credentials',
      'allow-methods',
      'allow-headers',
    ]) {
      const fullHeader = `access-control-${acHeader}`;
      const queryKey = `preflight-${fullHeader}`;
      if (url.searchParams.has(queryKey)) {
        headers.set(fullHeader, url.searchParams.get(queryKey)!);
      }
    }

    return new Response('', { status, headers });
  },
  all(url, request) {
    const details = getDetails(url.searchParams.get('id'));
    details.headers = Object.fromEntries(request.headers);
    details.method = request.method;
    const headers = new Headers({ foo: 'bar', hello: 'world' });

    for (const acHeader of [
      'allow-origin',
      'allow-credentials',
      'expose-headers',
    ]) {
      const fullHeader = `access-control-${acHeader}`;
      if (url.searchParams.has(fullHeader)) {
        headers.set(fullHeader, url.searchParams.get(fullHeader)!);
      }
    }

    return new Response('ok!', { headers });
  },
});

addRoute('/resource-details', (url) => {
  const details = getDetails(url.searchParams.get('id'));
  return new Response(JSON.stringify(details), {
    headers: { 'Content-Type': 'application/json' },
  });
});
