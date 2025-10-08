"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { CheckCircle2, ArrowLeft } from "lucide-react"
import clsx from "clsx"

interface Lesson {
  id: string
  title: string
  content: string
  type?: "video" | "text" | "quiz"
  completed?: boolean
}

interface Course {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

const sampleCourses: Record<string, Course> = {
  "affiliate-foundations": {
    id: "affiliate-foundations",
    title: "Affiliate Foundations",
    description:
      "Master the fundamentals of affiliate marketing — audience, funnels, compliance, and conversion.",
    lessons: [
      {
        id: "intro",
        title: "Introduction to Affiliate Marketing",
        content:
          "Affiliate marketing is a performance-based marketing strategy where you earn commissions by promoting products or services...",
      },
      {
        id: "traffic",
        title: "Finding Your Audience & Driving Traffic",
        content:
          "Learn how to identify your ideal audience and use organic or paid channels to reach them effectively...",
      },
      {
        id: "ethics",
        title: "Ethics, Transparency, and Compliance",
        content:
          "Always disclose affiliate relationships clearly. In the U.S., the FTC requires transparent disclosure on sponsored content...",
      },
    ],
  },
  "product-mastery": {
    id: "product-mastery",
    title: "Product Mastery: Affable Link",
    description:
      "Learn to position, explain, and sell Affable Link with confidence and authenticity.",
    lessons: [
      {
        id: "overview",
        title: "Affable Link Overview",
        content:
          "Affable Link is designed to help startups and creators manage transparent affiliate programs easily...",
      },
      {
        id: "features",
        title: "Key Features and Benefits",
        content:
          "Our tracking links, transparent analytics, and partnership dashboards differentiate us from legacy affiliate systems...",
      },
      {
        id: "positioning",
        title: "Positioning Affable Link in the Market",
        content:
          "When communicating with potential customers, emphasize transparency, partnership, and ease of use...",
      },
    ],
  },
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const { courseId } = params as { courseId: string }
  const [courseData, setCourseData] = useState<Course | null>(
    sampleCourses[courseId] || null
  )
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(
    courseData ? courseData.lessons[0] : null
  )

  if (!courseData) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={() => router.push("/academy")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Academy
        </Button>
      </div>
    )
  }

  const completedCount =
    courseData.lessons.filter((l) => l.completed).length
  const totalCount = courseData.lessons.length
  const progress = (completedCount / totalCount) * 100

  const markComplete = (lessonId: string) => {
    setCourseData((prev) => {
      if (!prev) return prev
      const updated = {
        ...prev,
        lessons: prev.lessons.map((lesson) =>
          lesson.id === lessonId ? { ...lesson, completed: true } : lesson
        ),
      }
      setActiveLesson(updated.lessons.find((l) => l.id === lessonId) || null)
      return updated
    })
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="md:w-72 w-full border-r bg-gray-50 p-4 overflow-y-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/academy")}
          className="mb-4 flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h2 className="font-semibold text-lg mb-2">{courseData.title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{courseData.description}</p>

        <Progress value={progress} className="mb-6" />
        <ul className="space-y-2">
          {courseData.lessons.map((lesson) => (
            <li key={lesson.id}>
              <button
                onClick={() => setActiveLesson(lesson)}
                className={clsx(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition",
                  lesson.id === activeLesson?.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100",
                  lesson.completed && "opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{lesson.title}</span>
                  {lesson.completed && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {activeLesson ? (
            <>
              <h1 className="text-2xl font-bold mb-4">{activeLesson.title}</h1>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-gray-700 leading-relaxed">{activeLesson.content}</p>
                </CardContent>
              </Card>
              <div className="flex justify-end mt-6">
                {!activeLesson.completed ? (
                  <Button onClick={() => markComplete(activeLesson.id)}>
                    Mark Complete
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Completed
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Select a lesson to begin.</p>
          )}
        </div>
      </main>
    </div>
  )
}
