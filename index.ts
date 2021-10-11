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

type KeyValue = [key: string, value: string];

interface Details {
  preflightHeaders?: KeyValue[];
  headers?: KeyValue[];
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
    details.preflightHeaders = [...request.headers];
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
      const value = url.searchParams.get(queryKey);
      if (value) headers.set(fullHeader, url.searchParams.get(queryKey)!);
    }

    return new Response('', { status, headers });
  },
  all(url, request) {
    const details = getDetails(url.searchParams.get('id'));
    details.headers = [...request.headers];
    details.method = request.method;
    const headers = new Headers({
      foo: 'bar',
      hello: 'world',
      'Content-Type': 'text/plain',
    });

    for (const acHeader of [
      'allow-origin',
      'allow-credentials',
      'expose-headers',
    ]) {
      const fullHeader = `access-control-${acHeader}`;
      const value = url.searchParams.get(fullHeader);
      if (value) headers.set(fullHeader, url.searchParams.get(fullHeader)!);
    }

    const cookieValues = url.searchParams.getAll('cookie-value');

    for (const [i, name] of url.searchParams.getAll('cookie-name').entries()) {
      const value = cookieValues[i];
      headers.append(
        'Set-Cookie',
        `${encodeURIComponent(name)}=${encodeURIComponent(
          value,
        )}; Max-Age=86400; SameSite=None; Secure`,
      );
    }

    return new Response('ok!', { headers });
  },
});

addRoute('/resource-details', (url) => {
  const details = getDetails(url.searchParams.get('id'));
  return new Response(JSON.stringify(details), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
