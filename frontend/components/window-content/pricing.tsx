export function PricingContent() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      features: ["Up to 10 affiliates", "Basic analytics", "Email support", "Standard attribution"],
    },
    {
      name: "Professional",
      price: "$149",
      period: "/month",
      features: [
        "Up to 100 affiliates",
        "Advanced analytics",
        "Priority support",
        "Custom attribution",
        "Fraud detection",
        "API access",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      features: [
        "Unlimited affiliates",
        "White-label solution",
        "Dedicated support",
        "Custom integrations",
        "SLA guarantee",
        "Advanced fraud prevention",
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Pricing Plans</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-muted p-5 rounded border-2 ${plan.popular ? "border-primary" : "border-border"} relative`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded">
                POPULAR
              </div>
            )}
            <h3 className="font-bold text-lg text-foreground mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-foreground/60">{plan.period}</span>
            </div>
            <ul className="space-y-2 text-sm text-foreground/80">
              {plan.features.map((feature, i) => (
                <li key={i}>✓ {feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
