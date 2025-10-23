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
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sidebar */}
      <aside className="md:w-80 w-full border-r border-gray-200 bg-white/80 backdrop-blur-sm p-6 overflow-y-auto shadow-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/academy")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Academy
        </Button>

        <div className="space-y-4 mb-6">
          <div>
            <h2 className="font-bold text-lg text-gray-900 mb-2">{courseData.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{courseData.description}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span className="font-semibold">Course Progress</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full overflow-hidden">
              <Progress value={progress} className="h-full bg-gradient-to-r from-blue-400 to-blue-600" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Lessons</h3>
          <ul className="space-y-2">
            {courseData.lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <button
                  onClick={() => setActiveLesson(lesson)}
                  className={clsx(
                    "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-between group",
                    lesson.id === activeLesson?.id
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-gray-100 text-gray-700 hover:text-gray-900",
                    lesson.completed && "opacity-90"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-bold opacity-60">{index + 1}</span>
                    <span className="text-sm font-medium truncate">{lesson.title}</span>
                  </div>
                  {lesson.completed && (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 ml-2" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {activeLesson ? (
            <>
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Lesson</span>
                </div>
                <h1 className="text-4xl font-bold text-gray-900">
                  {activeLesson.title}
                </h1>
              </div>

              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="pt-8 space-y-6">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {activeLesson.content}
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-end mt-8 gap-4">
                {!activeLesson.completed ? (
                  <Button
                    onClick={() => markComplete(activeLesson.id)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 px-8 py-3 h-auto font-semibold"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Mark as Complete
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="border-green-300 text-green-700 bg-green-50"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                    Completed
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-lg text-gray-500">Select a lesson to begin learning.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
