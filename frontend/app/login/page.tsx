"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("partner");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const endpoint =
				role === "partner"
					? `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/login/partner`
					: `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/login/vendor-user`;

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || "Login failed");
			}

			const data = await response.json();

			// Store tokens in localStorage
			localStorage.setItem("access_token", data.access_token);
			if (data.refresh_token) {
				localStorage.setItem("refresh_token", data.refresh_token);
			}

			// Store user role for later reference
			localStorage.setItem("user_role", role);
			localStorage.setItem("user_id", data.user_id || "");

			// Redirect based on role
			const redirectUrl =
				role === "partner" ? "/partner/dashboard" : "/vendor/dashboard";
			router.push(redirectUrl);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An error occurred during login"
			);
			console.error("Login error:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
			<div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
				<h1 className="text-2xl font-semibold text-center mb-6">
					Welcome back to <span className="text-blue-600">Affable Link</span>
				</h1>

				{error && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							I am a:
						</label>
						<select
							value={role}
							onChange={(e) => setRole(e.target.value)}
							className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
						>
							<option value="partner">Affiliate / Partner</option>
							<option value="vendor">Founder / Vendor</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							placeholder="your@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							required
							disabled={isLoading}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<input
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
							required
							disabled={isLoading}
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Logging in..." : "Log In"}
					</button>
				</form>

				<p className="text-center text-sm text-gray-600 mt-6">
					New here?{" "}
					<Link
						href="/signup"
						className="text-blue-600 hover:underline font-medium"
					>
						Create an account
					</Link>
				</p>
			</div>
		</div>
	);
}
