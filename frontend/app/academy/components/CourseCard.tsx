"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import Link from "next/link"
import { Clock, ChevronRight } from "lucide-react"

interface Course {
  id: string
  title: string
  description: string
  progress: number
  duration: string
  image: string
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/academy/${course.id}`}>
      <div className="group h-full cursor-pointer">
        <Card className="overflow-hidden h-full bg-amber-50/80 backdrop-blur-sm border-amber-200/50 hover:bg-amber-50/95 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-amber-400/50">
          {/* Image Container */}
          <div className="relative w-full h-48 bg-gradient-to-br from-amber-200 to-orange-300 overflow-hidden">
            <Image
              src={course.image}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              priority={false}
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent group-hover:from-amber-700/30 transition-all duration-300" />

            {/* Progress Badge */}
            {course.progress > 0 && (
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-amber-700 shadow-lg">
                {Math.round(course.progress)}% Complete
              </div>
            )}
          </div>

          <CardHeader className="relative">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <CardTitle className="text-lg group-hover:text-amber-700 transition-colors duration-300">
                  {course.title}
                </CardTitle>
              </div>
            </div>
            <CardDescription className="line-clamp-2 text-sm text-amber-800">
              {course.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-amber-700">
                <span>Progress</span>
                <span className="font-semibold text-amber-900">{course.progress}%</span>
              </div>
              <div className="relative h-2 bg-gradient-to-r from-amber-100 to-orange-200 rounded-full overflow-hidden">
                <Progress
                  value={course.progress}
                  className="h-full group-hover:from-amber-400 group-hover:to-orange-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Duration and CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-100 group-hover:border-amber-300 transition-colors">
              <div className="flex items-center gap-1.5 text-sm text-amber-700 group-hover:text-amber-900 transition-colors">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{course.duration}</span>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 group-hover:pr-2"
              >
                {course.progress > 0 ? "Continue" : "Start"}
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  )
}
