"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { storeAuthCredentials } from "@/lib/auth-utils";

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
					? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1/auth/login/partner`
					: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/v1/auth/login/vendor`;

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

			// Store auth credentials (tokens, role, user ID, email)
			storeAuthCredentials(
				data.access_token,
				data.refresh_token,
				role as 'partner' | 'vendor',
				data.user_id,
				email
			);

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
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
			<div className="bg-card p-8 rounded-2xl shadow-md w-full max-w-md">
				<h1 className="text-2xl font-semibold text-center mb-6">
					Welcome back to <span className="text-primary">Affable Link</span>
				</h1>

				{error && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-foreground mb-2">
							I am a:
						</label>
						<select
							value={role}
							onChange={(e) => setRole(e.target.value)}
							className="w-full border border-border rounded-lg p-2 text-foreground"
						>
							<option value="partner">Affiliate / Partner</option>
							<option value="vendor">Founder / Vendor</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Email
						</label>
						<input
							type="email"
							placeholder="your@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full border border-border rounded-lg p-2 text-foreground"
							required
							disabled={isLoading}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-foreground mb-1">
							Password
						</label>
						<input
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full border border-border rounded-lg p-2 text-foreground"
							required
							disabled={isLoading}
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-primary/100 text-white rounded-lg py-2 hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed border-2 border-blueberry"
					>
						{isLoading ? "Logging in..." : "Log In"}
					</button>
				</form>

				<p className="text-center text-sm text-muted-foreground mt-6">
					New here?{" "}
					<Link
						href="/signup"
						className="text-primary hover:underline font-medium"
					>
						Create an account
					</Link>
				</p>
			</div>
		</div>
	);
}
