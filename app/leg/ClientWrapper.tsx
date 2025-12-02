"use client";

import { LegPlannerClient } from "./LegPlannerClient";
import { LegPlannerProps } from "./types";

export function ClientWrapper(props: LegPlannerProps) {
  return <LegPlannerClient {...props} />;
}
