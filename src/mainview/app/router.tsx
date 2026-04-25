import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet
} from "@tanstack/react-router";
import { WorkspaceScreen } from "@/mainview/features/workspace/WorkspaceScreen";

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <WorkspaceScreen routePageId={null} />
});

const pageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pages/$pageId",
  component: PageRoute
});

function PageRoute() {
  const { pageId } = pageRoute.useParams();

  return <WorkspaceScreen routePageId={pageId} />;
}

const routeTree = rootRoute.addChildren([workspaceRoute, pageRoute]);

export const router = createRouter({
  history: createHashHistory(),
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
