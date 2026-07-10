"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// swagger-ui-react touches `window` at module load time, which crashes
// during server-side rendering — it's loaded client-only via next/dynamic.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function SwaggerUiView() {
  return <SwaggerUI url="/api/openapi.json" />;
}
