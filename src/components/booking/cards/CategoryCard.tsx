import type { Category } from "@/lib/booking-data";
import { BookingCategoryCard } from "../shared/BookingCategoryCard";

export function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: Category;
  image?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <BookingCategoryCard
      category={category}
      selected={selected}
      variant="wizard"
      onClick={onSelect}
    />
  );
}
