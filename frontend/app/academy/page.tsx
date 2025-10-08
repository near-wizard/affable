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
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-1">Affiliate Academy</h1>
          <p className="text-muted-foreground">
            Grow your skills and become a Certified Affable Link Partner.
          </p>
        </div>
        <Button className="mt-4 md:mt-0">Continue Learning</Button>
      </div>

      {/* Progress Overview */}
      <ProgressSummary />

      {/* Courses */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Courses</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Resources & Assets</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Download className="text-purple-500" />
              <CardTitle>Brand Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Download logos, product screenshots, and banners.
              </p>
              <Button variant="outline" size="sm">Download Kit</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <Trophy className="text-orange-500" />
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                See how you rank among top affiliates this month.
              </p>
              <Button variant="outline" size="sm">View Leaderboard</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-3">
              <BookOpen className="text-blue-500" />
              <CardTitle>Guides & FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Access compliance info, templates, and marketing tips.
              </p>
              <Button variant="outline" size="sm">View Guides</Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
