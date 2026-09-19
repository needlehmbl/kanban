import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import DraggableCard from "./DraggableCard";

export default function Column({
  column,
  onAddCard,
  onMoveCard,
  columns,
}: {
  column: any;
  columns: any[];
  onAddCard: (columnId: string, title: string) => void;
  onMoveCard: (cardId: string, toColumnId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { column } });

  return (
    <div ref={setNodeRef} className="w-72 shrink-0 bg-slate-200 rounded p-3">
      <h2 className="font-semibold mb-3">{column.name}</h2>
      <SortableContext
        items={(column.cards ?? []).map((c: any) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-10">
          {(column.cards ?? []).map((card: any) => (
            <div key={card.id}>
              <DraggableCard card={card} />
              {/* Fallback move dropdown (Phase 2 validation, kept for a11y) */}
              <select
                className="mt-1 text-xs border rounded w-full"
                value={column.id}
                onChange={(e) => {
                  if (e.target.value !== column.id)
                    onMoveCard(card.id, e.target.value);
                }}
              >
                {columns.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    Move to {c.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </SortableContext>
      <AddCardForm onAdd={(t) => onAddCard(column.id, t)} />
    </div>
  );
}

function AddCardForm({ onAdd }: { onAdd: (title: string) => void }) {
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") ?? "").trim();
        if (title) onAdd(title);
        e.currentTarget.reset();
      }}
    >
      <input
        name="title"
        placeholder="+ Add card"
        className="flex-1 text-sm border rounded px-2 py-1"
      />
      <button className="text-sm bg-white border rounded px-2">Add</button>
    </form>
  );
}
