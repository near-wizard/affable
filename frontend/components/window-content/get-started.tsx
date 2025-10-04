'use client'

import { useState } from 'react'
import { loadPostHog } from '@/utils/posthogLazyLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '../ui/card'

export function GetStartedContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    useCase: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1️⃣ Track PostHog event
      const ph = await loadPostHog()
      ph.capture('clientInterestForm_submitted', { ...formData })

      // 2️⃣ Send to backend (DB + email)
      const res = await fetch('/api/clientInterest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      console.log(JSON.stringify(res))
      if (!res.ok) throw new Error('Failed to submit form')

      setSubmitted(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Thank You!</h2>
        <p className="text-foreground/70">
          We've received your information and will be in touch shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Get Started</h2>
        <p className="text-foreground/70">
          Fill out the form below and we'll get you set up with Affable.
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>
      </Card>

      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
