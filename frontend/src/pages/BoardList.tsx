import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { isDemoMode, withDemo } from "../lib/demo";

export default function BoardList() {
  const [boards, setBoards] = useState<any[]>([]);
  const [name, setName] = useState("");
  const nav = useNavigate();
  const demo = isDemoMode();

  useEffect(() => {
    api
      .me()
      .catch(() => nav("/login"))
      .then(() => api.boards())
      .then((d) => setBoards(d.boards ?? []))
      .catch(() => {});
  }, [nav]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const d = await api.createBoard(name.trim());
    setBoards((b) => [d.board, ...b]);
    setName("");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Boards</h1>
      {demo && (
        <p className="text-sm text-slate-500 mb-4 rounded border bg-white px-3 py-2">
          Demo mode — everything runs locally in your browser with simulated
          collaborators.
        </p>
      )}
      <form onSubmit={create} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name"
          className="flex-1 border rounded px-3 py-2"
        />
        <button className="bg-slate-900 text-white rounded px-4">Create</button>
      </form>
      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id} className="bg-white rounded shadow px-4 py-3">
            <Link to={withDemo(`/boards/${b.id}`)} className="font-medium">
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
