// src/lib/jahez/jahez-v2-client.ts
// Direct client implementation and exports matching backend handoff

import { getJahezProfitReport, jahezClient } from "./api";
import type { JahezProfitReport, JahezProfitReportParams } from "./types";
import type { CustomRequestInit } from "../auth/api";

export { getJahezProfitReport, jahezClient };
export type { JahezProfitReport, JahezProfitReportParams, CustomRequestInit };

export default jahezClient;
