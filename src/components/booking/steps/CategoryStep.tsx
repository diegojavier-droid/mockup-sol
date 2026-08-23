import { type CategoryId } from "@/lib/booking-data";
import { BookingCategoryCard } from "../shared/BookingCategoryCard";
import { StepShell } from "../wizard/StepShell";
import { useCatalog } from "@/lib/catalog-context";

export function CategoryStep({
  category,
  onChooseCategory,
}: {
  category: CategoryId | null;
  onChooseCategory: (categoryId: CategoryId) => void;
}) {
  const { categories } = useCatalog();
  return (
    <StepShell title="¿Qué te gustaría reservar?">
      <div className="grid gap-5 sm:grid-cols-3">
        {categories.map((currentCategory) => (
          <BookingCategoryCard
            key={currentCategory.id}
            category={currentCategory}
            selected={category === currentCategory.id}
            variant="wizard"
            onClick={() => onChooseCategory(currentCategory.id)}
          />
        ))}
      </div>
    </StepShell>
  );
}
