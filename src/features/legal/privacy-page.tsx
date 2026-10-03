export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-slate-50">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Last updated: October 2026</p>
        </div>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">1. Information We Collect</h2>
            <p>
              Auto Poster Engine collects necessary authentication tokens, user identifiers, and authorized account names via official OAuth login mechanisms (TikTok Login Kit and Meta Graph API) to enable cross-platform publishing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">2. How We Use Your Data</h2>
            <p>
              Your credentials and access tokens are strictly used to schedule and publish the media content you choose to post. We do not sell, rent, or distribute personal data or access tokens to any third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">3. Data Security & Storage</h2>
            <p>
              Access tokens and sensitive keys are encrypted securely in transit and at rest. Media files uploaded are temporarily stored only for the duration necessary to publish to the target platforms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">4. User Data Deletion & Revocation</h2>
            <p>
              You can disconnect your TikTok or Meta accounts at any time through the application settings or directly via your TikTok/Meta security settings, which immediately revokes all access tokens and deletes associated session data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">5. Contact Information</h2>
            <p>
              If you have any questions or data deletion requests, please contact the administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
