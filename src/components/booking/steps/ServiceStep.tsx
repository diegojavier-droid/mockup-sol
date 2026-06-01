import { services, type CategoryId, type Service } from "@/lib/booking-data";
import { BookingServiceCard } from "../shared/BookingServiceCard";
import { StepShell } from "../wizard/StepShell";

export function ServiceStep({
  category,
  service,
  onChooseService,
}: {
  category: CategoryId;
  service: Service | null;
  onChooseService: (service: Service) => void;
}) {
  return (
    <StepShell title="Elegí tu servicio">
      <div className="grid gap-3 sm:grid-cols-2">
        {services[category].map((currentService) => (
          <BookingServiceCard
            key={currentService.id}
            service={currentService}
            categoryId={category}
            selected={service?.id === currentService.id}
            variant="wizard"
            showAction={false}
            onClick={() => onChooseService(currentService)}
          />
        ))}
      </div>
    </StepShell>
  );
}
