import { Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login";
import BoardList from "./pages/BoardList";
import Board from "./pages/Board";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link to="/boards" className="font-bold text-lg">
          Kanban
        </Link>
        <nav className="text-sm text-slate-500">
          <Link to="/boards">Boards</Link>
        </nav>
      </header>
      <main className="p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/boards" element={<BoardList />} />
          <Route path="/boards/:boardId" element={<Board />} />
        </Routes>
      </main>
    </div>
  );
}
