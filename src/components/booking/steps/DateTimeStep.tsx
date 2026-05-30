import { mockDates, mockTimes } from "@/lib/booking-data";
import { DateCard } from "../cards/DateCard";
import { TimeSlotButton } from "../cards/TimeSlotButton";
import { StepShell } from "../wizard/StepShell";

export function DateTimeStep({
  date,
  time,
  onChooseDate,
  onChooseTime,
}: {
  date: string | null;
  time: string | null;
  onChooseDate: (date: string) => void;
  onChooseTime: (time: string) => void;
}) {
  return (
    <StepShell
      title="Elegí fecha y hora"
      subtitle="Disponibilidad de ejemplo para validar la experiencia."
    >
      <div>
        <p className="mb-3 text-sm font-medium text-foreground">Fecha</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {mockDates.map((mockDate) => (
            <DateCard
              key={mockDate.iso}
              date={mockDate}
              selected={date === mockDate.iso}
              onSelect={() => onChooseDate(mockDate.iso)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium text-foreground">Horario</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mockTimes.map((mockTime) => (
            <TimeSlotButton
              key={mockTime}
              time={mockTime}
              disabled={!date}
              selected={time === mockTime}
              onSelect={() => onChooseTime(mockTime)}
            />
          ))}
        </div>
        {!date && <p className="mt-3 text-xs text-muted-foreground">Elegí primero una fecha.</p>}
      </div>
    </StepShell>
  );
}
