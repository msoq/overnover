import type { Config } from "@react-router/dev/config";

// Client-rendered for now; flip ssr on (and deploy to a Worker) when public pages need SEO.
export default {
  appDirectory: "src",
  ssr: false,
} satisfies Config;
