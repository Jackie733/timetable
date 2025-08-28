import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("t/:id/edit-grid", "routes/t.$id.edit-grid.tsx"),
] satisfies RouteConfig;
