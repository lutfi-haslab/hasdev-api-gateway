import { ArrowRight, Code, Key, Server, Shield, User } from "lucide-react";
import { useAuthStore } from "../stores/auth";
import React from "react";

function Home() {
  const { user, setUser } = useAuthStore();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <a className="flex items-center space-x-2 cursor-pointer" href="/">
          <Server className="text-blue-400 text-2xl" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Hasdev API
          </span>
        </a>
        <div className="flex items-center space-x-6">
          <a href="#features" className="hover:text-blue-300 transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-blue-300 transition">
            Pricing
          </a>
          {user ? (
            <React.Fragment>
              <a href="/profile" className="hover:text-blue-300 transition">
                <img
                  src={user.avatarUrl || "https://via.placeholder.com/150"}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover"
                />
              </a>
              <button
                onClick={() => setUser(null)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Logout
              </button>
            </React.Fragment>
          ) : (
            <a href="/auth" className="hover:text-blue-300 transition">
              Sign In
            </a>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Developer-Centric{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            SaaS Infrastructure
          </span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
          Hasdev API Gateway provides robust authentication, user management,
          and API routing solutions for modern applications.
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="/auth"
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-medium flex items-center transition"
          >
            Get Started <ArrowRight className="ml-2" />
          </a>
          <a
            href="#features"
            className="border border-gray-700 hover:bg-gray-800 px-8 py-3 rounded-lg font-medium transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">Core Features</h2>
        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-gray-800 p-8 rounded-xl hover:transform hover:scale-105 transition duration-300">
            <div className="bg-blue-900/20 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
              <Shield className="text-blue-400 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Secure Authentication
            </h3>
            <p className="text-gray-400">
              OAuth 2.0, JWT, and session-based auth with multi-provider support
              including Google, GitHub, and more.
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-xl hover:transform hover:scale-105 transition duration-300">
            <div className="bg-purple-900/20 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
              <Key className="text-purple-400 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3">API Gateway</h3>
            <p className="text-gray-400">
              Route, transform, and secure your API requests with our
              high-performance gateway layer.
            </p>
          </div>
          <div className="bg-gray-800 p-8 rounded-xl hover:transform hover:scale-105 transition duration-300">
            <div className="bg-green-900/20 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
              <User className="text-green-400 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold mb-3">User Management</h3>
            <p className="text-gray-400">
              Comprehensive profile system with avatar support, email
              verification, and admin controls.
            </p>
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="container mx-auto px-6 py-20 bg-gray-800 rounded-3xl my-10">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <Code className="text-blue-400 text-5xl mb-6" />
            <h2 className="text-3xl font-bold mb-4">Built for Developers</h2>
            <p className="text-gray-300 mb-6">
              Integrate with just a few lines of code. Our SDKs support all
              major languages and frameworks.
            </p>
            <div className="flex space-x-4">
              <div className="bg-gray-700 px-4 py-2 rounded-lg">Node.js</div>
              <div className="bg-gray-700 px-4 py-2 rounded-lg">Python</div>
              <div className="bg-gray-700 px-4 py-2 rounded-lg">Go</div>
            </div>
          </div>
          <div className="md:w-1/2 bg-gray-900 p-6 rounded-xl">
            <pre className="text-sm text-gray-300 overflow-x-auto">
              <code>
                {`// Example: Secure API call with Hasdev
import { HasdevClient } from 'hasdev-sdk';

const client = new HasdevClient({
  apiKey: 'YOUR_API_KEY',
  gatewayUrl: 'https://api.hasdev.com'
});

const response = await client.get('/protected-route', {
  headers: { 'Authorization': 'Bearer <token>' }
});`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-gray-800 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-6 md:mb-0">
            <Server className="text-blue-400 text-2xl" />
            <span className="text-xl font-bold">Hasdev API</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-blue-300 transition">
              Terms
            </a>
            <a href="#" className="hover:text-blue-300 transition">
              Privacy
            </a>
            <a href="#" className="hover:text-blue-300 transition">
              Docs
            </a>
            <a
              href="/swagger"
              target="_blank"
              className="hover:text-blue-300 transition"
            >
              Api Docs
            </a>
            <a href="#" className="hover:text-blue-300 transition">
              Contact
            </a>
          </div>
        </div>
        <div className="text-center text-gray-500 mt-10">
          © {new Date().getFullYear()} Hasdev API Gateway. All rights reserved.
        </div>
      </footer>

      {user && (
        <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg">
          <p>
            {user.profileName}: {user.email}
          </p>
        </div>
      )}
    </div>
  );
}

export default Home;
