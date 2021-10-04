import { getOwn } from './util.ts';

export type RouteHandler = (
  url: URL,
  request: Request,
) => Promise<Response> | Response;
type Route = RouteHandler | { [method: string]: RouteHandler };

const router = new Map<string, Route>();

function getRouteFunction(
  route: Route,
  method: string,
): RouteHandler | undefined {
  if (typeof route === 'function') {
    if (method === 'GET') return route;
    return undefined;
  }

  return getOwn(route, method) || getOwn(route, 'all');
}

export const simpleErrorResponse = (status: number, message: string) =>
  new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const route = router.get(url.pathname);

  if (!route) return simpleErrorResponse(404, 'Not found');

  const routeHandler = getRouteFunction(route, request.method);

  if (!routeHandler) return simpleErrorResponse(405, 'Method not allowed');

  try {
    return await routeHandler(url, request);
  } catch (error) {
    console.log(error);
    return simpleErrorResponse(500, 'Internal server error');
  }
}

export function addRoute(path: string, route: Route) {
  router.set(path, route);
}

addEventListener('fetch', (event) =>
  event.respondWith(handleRequest(event.request)),
);
