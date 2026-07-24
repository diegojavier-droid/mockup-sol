import type { CategoryId } from "@/lib/booking-data";

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
  returnTarget: BookingReturnTarget;
};
