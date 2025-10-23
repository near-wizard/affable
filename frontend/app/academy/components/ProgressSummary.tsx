"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen, Award, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function ProgressSummary() {
  return (
    <section className="grid md:grid-cols-3 gap-6">
      {/* Courses Completed Card */}
      <div className="group">
        <Card className="h-full bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-white/60 rounded-xl group-hover:bg-white transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110">
                <BookOpen className="text-orange-600 w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-600">1/3</p>
              </div>
            </div>
            <CardTitle className="text-orange-900 group-hover:text-orange-700 transition-colors">
              Courses Completed
            </CardTitle>
            <CardDescription className="text-orange-700/70 group-hover:text-orange-700 transition-colors">
              You're on your way!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Progress value={33} className="h-2 bg-orange-200" />
              <p className="text-sm text-orange-700 font-medium">33% Progress</p>
            </div>
            <p className="text-xs text-orange-600/80">Complete your next course to level up</p>
          </CardContent>
        </Card>
      </div>

      {/* Certification Level Card */}
      <div className="group">
        <Card className="h-full bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-white/60 rounded-xl group-hover:bg-white transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110">
                <Award className="text-amber-600 w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  TIER 1
                </p>
              </div>
            </div>
            <CardTitle className="text-amber-900 group-hover:text-amber-700 transition-colors">
              Certification Level
            </CardTitle>
            <CardDescription className="text-amber-700/70 group-hover:text-amber-700 transition-colors">
              Certified Partner
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700/90">
              Complete all modules to unlock your next certification tier and exclusive benefits.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-200 hover:bg-amber-100/50 hover:border-amber-300 text-amber-700 hover:text-amber-800 transition-all duration-300 group-hover:shadow-md"
            >
              View Certificates
              <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Community Card */}
      <div className="group">
        <Card className="h-full bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200/50 hover:border-yellow-300 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-white/60 rounded-xl group-hover:bg-white transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110">
                <Users className="text-yellow-600 w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-yellow-600">+2K</p>
              </div>
            </div>
            <CardTitle className="text-yellow-900 group-hover:text-yellow-700 transition-colors">
              Community
            </CardTitle>
            <CardDescription className="text-yellow-700/70 group-hover:text-yellow-700 transition-colors">
              Connect with partners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-700/90">
              Join our thriving community, share strategies, and learn from top-performing affiliates.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-yellow-200 hover:bg-yellow-100/50 hover:border-yellow-300 text-yellow-700 hover:text-yellow-800 transition-all duration-300 group-hover:shadow-md"
            >
              Join Discord
              <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
