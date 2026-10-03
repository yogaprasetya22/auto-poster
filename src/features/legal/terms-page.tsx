export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-50">Terms of Service</h1>
          <p className="text-xs text-slate-400 mt-1">Last updated: October 2026</p>
        </div>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Auto Poster Engine (&quot;the Service&quot;), you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">2. Service Usage & Third-Party APIs</h2>
            <p>
              Auto Poster Engine provides social media publishing and content scheduling tools for platforms including TikTok, Instagram, and Facebook. You must comply with all developer rules, community standards, and terms established by TikTok and Meta platforms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">3. User Content & Responsibility</h2>
            <p>
              You retain all ownership of the media and textual content you upload. You are solely responsible for ensuring your posted content does not violate any copyright, intellectual property, or community guidelines.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">4. Disclaimer of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any downtime, API limits imposed by third-party social networks, or account suspensions resulting from user activity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">5. Contact</h2>
            <p>
              For inquiries regarding these terms, please contact the application administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
