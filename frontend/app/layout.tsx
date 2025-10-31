// app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { BugReportProvider } from "@/components/bug-report-provider";

import "./globals.css";

export const metadata: Metadata = {
	title: "AffableLink - Founder-Friendly Affiliate Platform & Partner Program Software",
	description: "Launch your partner program in less than 24 hours. AffableLink is the premium, founder-friendly affiliate management platform with real-time analytics, fraud detection, and commission management.",
	keywords: [
		"affiliate program",
		"partner program",
		"affiliate marketing",
		"partner management",
		"affiliate tracking",
		"commission management",
		"affiliate software",
		"SaaS affiliate",
	],
	authors: [{ name: "AffableLink Team" }],
	creator: "AffableLink",
	publisher: "AffableLink",
	formatDetection: {
		email: false,
		telephone: false,
		address: false,
	},
	icons: {
		icon: [
			{ url: "/favicon.ico" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
		],
		apple: "/apple-touch-icon.png",
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "https://affablelink.com",
		siteName: "AffableLink",
		title: "AffableLink - Founder-Friendly Affiliate Platform",
		description: "Launch your partner program in less than 24 hours. Premium affiliate management software built by founders.",
		images: [
			{
				url: "https://affablelink.com/og-image.png",
				width: 1200,
				height: 630,
				alt: "AffableLink - Affiliate Partner Platform",
				type: "image/png",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "AffableLink - Founder-Friendly Affiliate Platform",
		description: "Launch your partner program in less than 24 hours. Premium affiliate management software built by founders.",
		images: ["https://affablelink.com/og-image.png"],
		creator: "@affablelink",
	},
	robots: {
		index: true,
		follow: true,
		"max-image-preview": "large",
		"max-snippet": "-1",
		"max-video-preview": "-1",
	},
	alternates: {
		canonical: "https://affablelink.com",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				{/* Add cache-busting favicon */}
				<link rel="icon" href="/favicon.ico?v=2" />

				{/* PWA Manifest */}
				<link rel="manifest" href="/manifest.json" />

				{/* iOS Web App Meta Tags */}
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
				<meta name="theme-color" content="#8b5a2b" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
				<meta name="apple-mobile-web-app-title" content="AffableLink" />
			</head>
			<body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
				<BugReportProvider>
					<ServiceWorkerRegister />
					<MobileHeader />
					{children}
					<MobileNavBar showOn="dashboard" />
					<Analytics />
				</BugReportProvider>
				<Script id="posthog-init" strategy="afterInteractive">
					{`
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Fe Us zs Oe js Ns capture Ze calculateEventProperties Hs register register_once register_for_session unregister unregister_for_session Js getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Gs qs createPersonProfile Vs As Ks opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Bs debug L Ws getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('phc_dkRJCk9u2EbONpfOmuEm3beabINorsVbdtRIXxAVmU4', {
              api_host: 'https://us.i.posthog.com',
              defaults: '2025-05-24',
              person_profiles: 'identified_only',
            })
          `}
				</Script>
			</body>
		</html>
	);
}
