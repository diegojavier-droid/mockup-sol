import type { Service } from "@/lib/booking-data";
import { BookingServiceCard } from "../shared/BookingServiceCard";

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <BookingServiceCard service={service} selected={selected} variant="wizard" onClick={onSelect} />
  );
}
