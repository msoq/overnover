import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("new", "routes/new.tsx"),
  route("topics/:id", "routes/topic.tsx"),
  route("practice", "routes/practice.tsx"),
] satisfies RouteConfig;
