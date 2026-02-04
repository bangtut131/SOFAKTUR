"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setError("");
        setLoading(true);
        console.log("Attempting login for:", username);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            console.log("Login Status:", res.status);
            const data = await res.json();
            console.log("Login Data:", data);

            if (data.success) {
                console.log("Redirecting to dashboard...");
                // Force hard refresh to ensure cookies are applied
                window.location.href = '/dashboard';
            } else {
                setError(data.error || "Login gagal");
                setLoading(false); // Only set loading false on failure/error
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError("Gagal menghubungi server");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm border border-gray-200">
                <div className="flex flex-col items-center mb-6 gap-3">
                    {/* Logo Section */}
                    <img src="/logo.png" alt="Logo Company" className="h-16 w-auto object-contain" />
                    <h1 className="text-xl font-bold text-gray-900">Login Aplikasi SO</h1>
                </div>

                {error && <div className="bg-red-100 text-red-800 p-3 rounded text-sm mb-4 text-center font-bold border border-red-200">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 bg-white placeholder-gray-500"
                            placeholder="Masukkan username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 bg-white placeholder-gray-500"
                            placeholder="Masukkan password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full font-bold py-3 rounded-lg transition shadow-md mt-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {loading ? "MEMPROSES..." : "LOGIN MASUK"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-500 font-medium">
                    PT Gama Agro Sejati &copy; 2026
                </div>
            </div>
        </div>
    );
}
