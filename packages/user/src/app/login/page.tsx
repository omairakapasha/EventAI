"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar } from "lucide-react";

// Component that uses search params - wrapped in Suspense
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get("registered");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingMessage, setPendingMessage] = useState(false);
    const [rejectedMessage, setRejectedMessage] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setPendingMessage(false);
        setRejectedMessage(false);
        setLoading(true);

        try {
            const response = await fetch("http://localhost:3001/api/v1/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.code === "PENDING_APPROVAL") {
                    setPendingMessage(true);
                    setLoading(false);
                    return;
                }
                if (data.code === "ACCOUNT_REJECTED") {
                    setRejectedMessage(true);
                    setLoading(false);
                    return;
                }
                throw new Error(data.error || "Login failed");
            }

            // Store token in localStorage
            localStorage.setItem("userToken", data.data.token);
            localStorage.setItem("userData", JSON.stringify(data.data.user));

            // Redirect to chat page
            router.push("/chat");
        } catch (err: any) {
            setError(err.message || "Invalid email or password");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-gray-900">Event-AI</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Plan your perfect event with AI
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {registered && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
                            Account created successfully! Waiting for admin approval.
                        </div>
                    )}
                    {pendingMessage && (
                        <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md text-sm">
                            Your account is pending admin approval. Please check back later.
                        </div>
                    )}
                    {rejectedMessage && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                            Your account has been rejected. Contact support for assistance.
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}

// Main page component with Suspense boundary
export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
                <div className="text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-4">
                        <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">Loading...</span>
                </div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
