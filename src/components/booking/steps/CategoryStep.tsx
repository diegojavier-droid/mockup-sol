import { categories, type CategoryId } from "@/lib/booking-data";
import { CategoryCard } from "../cards/CategoryCard";
import { StepShell } from "../wizard/StepShell";

export function CategoryStep({
  category,
  categoryImages,
  onChooseCategory,
}: {
  category: CategoryId | null;
  categoryImages: Record<CategoryId, string>;
  onChooseCategory: (categoryId: CategoryId) => void;
}) {
  return (
    <StepShell title="¿Qué te gustaría reservar?">
      <div className="grid gap-5 sm:grid-cols-3">
        {categories.map((currentCategory) => (
          <CategoryCard
            key={currentCategory.id}
            category={currentCategory}
            image={categoryImages[currentCategory.id]}
            selected={category === currentCategory.id}
            onSelect={() => onChooseCategory(currentCategory.id)}
          />
        ))}
      </div>
    </StepShell>
  );
}
