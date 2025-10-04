"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

export function LeadForm() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    useCase: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your backend
    console.log("Form submitted:", formData)
    setSubmitted(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (submitted) {
    return (
      <section className="border-b border-border bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Card className="mx-auto max-w-2xl border border-border bg-card p-12 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h3 className="mt-6 text-2xl font-bold text-card-foreground">Thanks for your interest!</h3>
            <p className="mt-4 text-muted-foreground">
              We'll be in touch soon to discuss how our PostHog integration can help scale your affiliate program.
            </p>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="border-b border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
              Get early access
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty">
              Join the waitlist and be among the first to transform your affiliate marketing with PostHog.
            </p>
          </div>

          <Card className="mt-12 border border-border bg-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@company.com"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Acme Inc."
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Tell us about your affiliate program</Label>
                <Textarea
                  id="useCase"
                  name="useCase"
                  required
                  value={formData.useCase}
                  onChange={handleChange}
                  placeholder="What are your goals? How many affiliates do you work with?"
                  className="min-h-[120px] bg-background"
                />
              </div>

              <Button type="submit" size="lg" className="w-full">
                Request Early Access
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By submitting this form, you agree to receive product updates and marketing communications.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </section>
  )
}
