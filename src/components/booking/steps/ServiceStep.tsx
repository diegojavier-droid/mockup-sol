import { services, type CategoryId, type Service } from "@/lib/booking-data";
import { ServiceCard } from "../cards/ServiceCard";
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
          <ServiceCard
            key={currentService.id}
            service={currentService}
            selected={service?.id === currentService.id}
            onSelect={() => onChooseService(currentService)}
          />
        ))}
      </div>
    </StepShell>
  );
}
