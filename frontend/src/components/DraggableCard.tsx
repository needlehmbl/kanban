import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

export default function DraggableCard({ card }: { card: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: card.id, data: { card } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded shadow-sm border px-3 py-2 cursor-grab"
    >
      <div className="font-medium text-sm">{card.title}</div>
      {card.description && (
        <div className="text-xs text-slate-500 mt-1">{card.description}</div>
      )}
    </div>
  );
}
