import { useQuery } from "@tanstack/react-query";
import { api, keys } from "../../api/client";
import type { Dashboard } from "../../api/types";

/** Every dashboard figure, from one endpoint (DB7). */
export const useDashboard = () =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>("/dashboard") });
