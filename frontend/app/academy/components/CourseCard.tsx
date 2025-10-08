"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"
import Link from "next/link"

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
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative w-full h-40">
        <Image
          src={course.image}
          alt={course.title}
          fill
          className="object-cover"
          priority={false}
        />
      </div>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription>{course.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={course.progress} className="mb-3" />
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{course.duration}</span>
          <Link href={`/academy/${course.id}`}>
            <Button size="sm">
              {course.progress > 0 ? "Continue" : "Start"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
