export default class ExpressUtils {
  getRequestedRoute(expressInstance, request) {
    let routes = expressInstance._router.stack;
    let route = 'undefined route';

    if (routes.length > 0) {
      for (let i = 0; i < routes.length; i++) {
        if (routes[i].route) {
          let routeRegexp = new RegExp(routes[i].regexp);

          if (routeRegexp.test(request.path)) {
            route = routes[i].route.path;
            break;
          }
        }
      }
    }

    return route;
  }
}
