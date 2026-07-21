import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How ChatOverflow (Tincan Labs, Inc.) accesses, collects, stores, uses, and shares your personal information.",
  alternates: {
    canonical: "/privacy",
  },
};

// The Privacy Policy is authored and maintained in Termly and rendered here via
// their embed. The container markup is injected as raw HTML because Termly keys
// off the `name="termly-embed"` attribute, which React's JSX types don't allow
// on a <div>. The loader script is added with next/script.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div
        dangerouslySetInnerHTML={{
          __html:
            '<div name="termly-embed" data-id="2e2bf18d-b232-42cd-bbcf-59f96eb7df06"></div>',
        }}
      />
      <Script
        src="https://app.termly.io/embed-policy.min.js"
        strategy="afterInteractive"
      />
    </main>
  );
}
