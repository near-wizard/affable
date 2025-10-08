"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BookOpen, Award, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function ProgressSummary() {
  return (
    <section className="grid md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex items-center gap-3">
          <BookOpen className="text-blue-500" />
          <div>
            <CardTitle>Courses Completed</CardTitle>
            <CardDescription>Keep going!</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={33} className="mb-2" />
          <p className="text-sm text-muted-foreground">1 of 3 completed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Award className="text-yellow-500" />
          <div>
            <CardTitle>Certification Level</CardTitle>
            <CardDescription>Certified Partner</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Complete all modules to unlock your next certification tier.
          </p>
          <Button variant="outline" size="sm">View Certificates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-3">
          <Users className="text-green-600" />
          <div>
            <CardTitle>Community</CardTitle>
            <CardDescription>Connect with affiliates</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Join the conversation, share tips, and learn from peers.
          </p>
          <Button variant="outline" size="sm">Join Discord</Button>
        </CardContent>
      </Card>
    </section>
  )
}
