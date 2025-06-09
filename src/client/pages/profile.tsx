import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Cookies from "js-cookie";
import { User } from "../models/user";
import { useAuthStore } from "../stores/auth";
import {
  Edit,
  Home,
  Key,
  LogOut,
  Shield,
  User as UserIcon,
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const clientToken = Cookies.get("client-token");
      if (!clientToken) return navigate("/");

      try {
        const res = await fetch("/api/auth/v2/profile", {
          headers: {
            Authorization: `Bearer ${clientToken}`,
          },
        });
        const data: {
          user: User;
        } = await res.json();
        if (!res.ok) throw new Error("Unauthorized");
        setUser(data.user);
      } catch (err) {
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigate, setUser]);

  const handleLogout = () => {
    Cookies.remove("client-token");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center text-white">
        <p>Authentication required. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-2">
            <button onClick={() => navigate("/")} className="cursor-pointer">
              <Home className="text-blue-400" />
            </button>
            <UserIcon className="text-blue-400" />
            <h1 className="text-2xl font-bold">Profile</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            <LogOut />
            <span>Logout</span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex flex-col items-center">
                <img
                  src={user.avatarUrl || "https://via.placeholder.com/150"}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full border-4 border-blue-500 object-cover mb-4"
                />
                <h2 className="text-xl font-semibold">{user.profileName}</h2>
                <p className="text-gray-400 text-sm">{user.email}</p>
                <button className="mt-4 flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition">
                  <Edit size={14} />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="mr-2 text-blue-400" />
                Account Information
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400">Email</span>
                  <span className="flex items-center">
                    {user.email}
                    {user.emailVerified ? (
                      <span className="ml-2 bg-green-900 text-green-300 text-xs px-2 py-1 rounded">
                        Verified
                      </span>
                    ) : (
                      <span className="ml-2 bg-yellow-900 text-yellow-300 text-xs px-2 py-1 rounded">
                        Unverified
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400">Account Type</span>
                  <span>{user.isAdmin ? "Admin" : "Developer"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400">Auth Provider</span>
                  <span className="capitalize">{user.provider || "Email"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since</span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Key className="mr-2 text-blue-400" />
                API Access
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">API Key</span>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">
                      Regenerate
                    </button>
                  </div>
                  <div className="bg-black text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
                    hd_********************
                  </div>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">
                  Create New API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
