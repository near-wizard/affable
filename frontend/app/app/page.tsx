"use client"

import Link from "next/link"

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm p-4 space-y-4">
        <h2 className="text-xl font-semibold mb-4 text-blue-600">Affable Link</h2>
        <nav className="space-y-2">
          <Link href="/app" className="block hover:bg-blue-50 p-2 rounded-lg">
            Dashboard
          </Link>
          <Link href="/app/programs" className="block hover:bg-blue-50 p-2 rounded-lg">
            Programs
          </Link>
          <Link href="/app/links" className="block hover:bg-blue-50 p-2 rounded-lg">
            My Links
          </Link>
          <Link href="/app/settings" className="block hover:bg-blue-50 p-2 rounded-lg">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-semibold mb-4">Welcome back 👋</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-medium text-gray-700">Total Clicks</h3>
            <p className="text-2xl font-semibold mt-2">1,284</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-medium text-gray-700">Conversions</h3>
            <p className="text-2xl font-semibold mt-2">96</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="font-medium text-gray-700">Top Partner</h3>
            <p className="mt-2 text-blue-600 font-semibold">Chelsea Stokes</p>
          </div>
        </div>
      </main>
    </div>
  )
}
