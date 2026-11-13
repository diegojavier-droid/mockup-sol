import { invalidateAdminChange } from "./admin-invalidation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "./admin-client";
import { ApiError } from "./client";

export interface BusinessHourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
}

export interface BusinessHourEdit {
  opensAt: string;
  closesAt: string;
  isActive: boolean;
}

export function hourEdit(row: BusinessHourRow): BusinessHourEdit {
  return {
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
    isActive: row.is_active,
  };
}

/** Sólo se envía lo editado, sin truncar segundos de valores que no se tocaron. */
export function hourPatch(row: BusinessHourRow, edit: BusinessHourEdit) {
  const initial = hourEdit(row);
  return {
    ...(edit.opensAt !== initial.opensAt ? { opensAt: edit.opensAt } : {}),
    ...(edit.closesAt !== initial.closesAt ? { closesAt: edit.closesAt } : {}),
    ...(edit.isActive !== initial.isActive ? { isActive: edit.isActive } : {}),
    expected: { opensAt: row.opens_at, closesAt: row.closes_at, isActive: row.is_active },
  };
}

export function changedHour(row: BusinessHourRow, edit: BusinessHourEdit): boolean {
  const initial = hourEdit(row);
  return (
    initial.opensAt !== edit.opensAt ||
    initial.closesAt !== edit.closesAt ||
    initial.isActive !== edit.isActive
  );
}

export function hourError(edit: BusinessHourEdit): string | null {
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(edit.opensAt) || !time.test(edit.closesAt))
    return "Completá las horas de apertura y cierre.";
  if (edit.opensAt >= edit.closesAt)
    return "El horario de cierre tiene que ser posterior al de apertura.";
  return null;
}

const HOURS_KEY = ["admin", "business-hours"] as const;

export function useBusinessHours(enabled: boolean) {
  return useQuery({
    queryKey: HOURS_KEY,
    queryFn: () => adminApi.get<BusinessHourRow[]>("/business-hours"),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useSaveBusinessHour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ original, edit }: { original: BusinessHourRow; edit: BusinessHourEdit }) =>
      adminApi.patch<{ ok: true; hour: BusinessHourRow }>(
        `/business-hours/${original.id}`,
        hourPatch(original, edit),
      ),
    onSuccess: ({ hour }) => {
      qc.setQueryData<BusinessHourRow[]>(HOURS_KEY, (rows) =>
        rows?.map((row) => (row.id === hour.id ? hour : row)),
      );
      return invalidateAdminChange(qc, "hours");
    },
    onError: (error) => {
      // Un conflicto conserva el borrador, pero Cancelar debe volver a la versión vigente.
      if (error instanceof ApiError && error.status === 409)
        void qc.invalidateQueries({ queryKey: HOURS_KEY });
    },
  });
}
