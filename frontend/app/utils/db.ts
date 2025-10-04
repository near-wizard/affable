export const saveClientInterest = async (
    name: string,
    email: string,
    company: string,
    useCase: string
  ) => {
    const res = await fetch(
      process.env.CLIENT_INTAKE_GOOGLE_SHEETS_FORM_APP_SCRIPT_WEB_URL!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          useCase,
          submittedAt: new Date().toISOString(), // optional timestamp
        }),
      }
    )
  
    if (!res.ok) {
      throw new Error('Failed to submit form')
    }
  }
  