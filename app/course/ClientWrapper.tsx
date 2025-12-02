"use client";

import { CourseCalculatorClient } from "./CourseCalculatorClient";
import { CourseCalculatorProps } from "./types";

export function ClientWrapper(props: CourseCalculatorProps) {
  return <CourseCalculatorClient {...props} />;
}
