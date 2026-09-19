export default function Card({ card }: { card: any }) {
  return (
    <div className="bg-white rounded border px-3 py-2">
      <div className="font-medium text-sm">{card.title}</div>
      {card.description && (
        <div className="text-xs text-slate-500">{card.description}</div>
      )}
    </div>
  );
}
