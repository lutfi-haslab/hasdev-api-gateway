import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [redirect] = useState("http://localhost:5173/profile");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/v2/login?redirect=${redirect}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data: {
        error?: string;
        token?: string;
      } = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("token", data.token!);
      navigate("/profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUri = `/api/auth/v2/google?redirect=${redirect}`;
    window.location.href = redirectUri;
  };

  const handleGithubLogin = () => {
    const redirectUri = `/api/auth/v2/github?redirect=${redirect}`;
    window.location.href = redirectUri;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6 border border-gray-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Sign in to your Hasdev API account</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="text-gray-500" />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="text-gray-500" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition duration-200 flex items-center justify-center ${
              isLoading ? "opacity-75" : ""
            }`}
          >
            {isLoading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "Sign In"
            )}
          </button>
        </div>

        <div className="flex items-center">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-400">or</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg transition"
          >
            <img src="https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s96-fcrop64=1,00000000ffffffff-rw" className="w-6 h-6" alt="Google" />
            <span>Google</span>
          </button>
          <button
            onClick={handleGithubLogin}
            className="flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg transition"
          >
            <img src="https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png" className="w-6 h-6" alt="GitHub" />
            <span>GitHub</span>
          </button>
        </div>

        <div className="text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <a href="#" className="text-blue-400 hover:text-blue-300 transition">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
