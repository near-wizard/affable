"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Award, Users, Download, Trophy } from "lucide-react"
import { CourseCard } from "./components/CourseCard"
import { ProgressSummary } from "./components/ProgressSummary"

interface Course {
  id: string
  title: string
  description: string
  progress: number
  duration: string
  image: string
}

const sampleCourses: Course[] = [
  {
    id: "affiliate-foundations",
    title: "Affiliate Foundations",
    description:
      "Learn the core principles of affiliate marketing and how to build sustainable campaigns.",
    progress: 45,
    duration: "2h 30m",
    image: "/images/academy/affiliate-foundations.jpg",
  },
  {
    id: "product-mastery",
    title: "Product Mastery: Affable Link",
    description:
      "Understand our product deeply — features, value props, and how to position it effectively.",
    progress: 0,
    duration: "3h 10m",
    image: "/images/academy/product-mastery.jpg",
  },
  {
    id: "capstone",
    title: "Capstone Campaign",
    description:
      "Apply everything you've learned to create your first campaign and earn certification.",
    progress: 0,
    duration: "1h 45m",
    image: "/images/academy/capstone.jpg",
  },
]

export default function AcademyPage() {
  const [courses] = useState<Course[]>(sampleCourses)

  return (
    <div className="flex flex-col gap-10 p-8 min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Desktop-like texture background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 mix-blend-multiply"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #65432108 2px 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, #65432108 2px 4px), radial-gradient(circle at 20%, #8b5a2b0d 0, transparent 50%)"
          }}
        />
      </div>

      {/* Header with Premium Styling */}
      <div className="relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-2xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-gradient-to-r from-amber-700 via-orange-700 to-yellow-700 rounded-2xl shadow-2xl text-white">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-amber-100 text-sm font-semibold uppercase tracking-wider">Learning Hub</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Affiliate Academy</h1>
            <p className="text-amber-50 text-lg max-w-xl">
              Master affiliate marketing and become a certified partner. Unlock exclusive benefits and join our elite community.
            </p>
          </div>
          <Button className="mt-4 md:mt-0 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold px-8 py-2 h-auto">
            Continue Learning
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <ProgressSummary />

      {/* Courses Section */}
      <section className="space-y-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-amber-900">Courses</h2>
            <p className="text-amber-700 mt-1">Structured learning paths to master affiliate marketing</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Resources Section */}
      <section className="space-y-6 mt-4 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-amber-900">Resources & Assets</h2>
            <p className="text-amber-700 mt-1">Everything you need to succeed</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Brand Assets Card */}
          <div className="group">
            <Card className="h-full overflow-hidden bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-600/10 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-amber-100 group-hover:bg-amber-200 rounded-lg transition-colors">
                    <Download className="text-amber-700 w-5 h-5" />
                  </div>
                  <CardTitle className="text-amber-900 group-hover:text-amber-800">Brand Assets</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-800">
                  Download logos, product screenshots, marketing banners, and more.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all duration-300 group-hover:shadow-md"
                >
                  Download Kit
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Card */}
          <div className="group">
            <Card className="h-full overflow-hidden bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-600/10 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-orange-100 group-hover:bg-orange-200 rounded-lg transition-colors">
                    <Trophy className="text-orange-700 w-5 h-5" />
                  </div>
                  <CardTitle className="text-orange-900 group-hover:text-orange-800">Leaderboard</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-orange-800">
                  Compete with other affiliates and see your ranking among top performers.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-all duration-300 group-hover:shadow-md"
                >
                  View Leaderboard
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Guides & FAQs Card */}
          <div className="group">
            <Card className="h-full overflow-hidden bg-yellow-50 border-yellow-200 hover:border-yellow-400 hover:shadow-2xl hover:shadow-yellow-600/10 transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg transition-colors">
                    <BookOpen className="text-yellow-700 w-5 h-5" />
                  </div>
                  <CardTitle className="text-yellow-900 group-hover:text-yellow-800">Guides & FAQs</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-yellow-800">
                  Access compliance guides, templates, and pro marketing tips.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-400 transition-all duration-300 group-hover:shadow-md"
                >
                  View Guides
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
