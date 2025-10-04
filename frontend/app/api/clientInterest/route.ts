import { NextRequest, NextResponse } from 'next/server'

// Example DB + email helpers
import { saveClientInterest } from '../../utils/db'
import { sendConfirmationEmail } from '../../utils/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, company, useCase } = body
    console.log(body)

    // Save to DB
    await saveClientInterest(name, email, company, useCase)
    console.log("Saved Client Interest")
    // Send confirmation email
    await sendConfirmationEmail(email, name)
    console.log("Email sent")

    return NextResponse.json({ success: true }, {status: 200})
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
