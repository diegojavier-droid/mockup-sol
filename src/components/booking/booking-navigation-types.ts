import type { CategoryId } from "@/lib/booking-data";

export type BookingEntryPoint = "hero-reserve" | "public-catalog" | "service-detail";

export type BookingReturnTarget =
  | { type: "landing" }
  | { type: "catalog"; categoryId: CategoryId }
  | { type: "serviceDetail"; categoryId: CategoryId; serviceId: string };

export type BookingInitialSelection = {
  categoryId?: CategoryId;
  serviceId?: string;
};

export type StartBookingInput = {
  initialSelection?: BookingInitialSelection;
  entryPoint: BookingEntryPoint;
  returnTarget: BookingReturnTarget;
};
