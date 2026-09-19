import { Link } from "react-router-dom";
import { authUrl } from "../lib/api";
import { withDemo } from "../lib/demo";

export default function Login() {
  return (
    <div className="max-w-sm mx-auto mt-20 bg-white p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">Sign in</h1>
      <p className="text-sm text-slate-500 mb-4">
        OAuth via GitHub. On first login a User row is created.
      </p>
      <a
        href={authUrl("/auth/github")}
        className="block text-center bg-slate-900 text-white rounded px-4 py-2"
      >
        Sign in with GitHub
      </a>
      <div className="text-center text-xs text-slate-400 my-3">or</div>
      <Link
        to={withDemo("/boards?demo=1")}
        className="block text-center border rounded px-4 py-2"
      >
        Try the live demo (no login)
      </Link>
      <p className="text-xs text-slate-400 mt-3">
        Demo runs fully in your browser with simulated collaborators — nothing
        is saved to a server.
      </p>
    </div>
  );
}
