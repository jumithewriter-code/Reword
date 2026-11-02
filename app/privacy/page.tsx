import { LEGAL_CONTACT, LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Privacy Policy | Reword' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="Reword turns your voice recordings into written content for different platforms. This policy explains what information we collect when you use Reword, why we collect it, who we share it with, and the choices you have."
    >
      <section>
        <h2>1. Information we collect</h2>
        <p>We collect only what Reword needs to work.</p>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password. If you sign in with Google, we
            receive your name, email address and Google account identifier. We never see your Google password.
          </li>
          <li>
            <strong>Voice profile:</strong> the answers you give during onboarding, such as your niche, audience, tone
            and any writing sample you share.
          </li>
          <li>
            <strong>Your content:</strong> audio you record or upload, the transcripts made from it, text you paste,
            the content Reword generates, and any edits you make.
          </li>
          <li>
            <strong>OneVoice memories:</strong> notes about your style and preferences that you add or approve so
            Reword can write more like you.
          </li>
          <li>
            <strong>Usage information:</strong> basic, anonymous page-view analytics that help us understand how the
            site is used. These do not use advertising cookies.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <ul>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To transcribe your audio and generate content in the formats you choose.</li>
          <li>To remember your voice profile and approved memories so future content sounds like you.</li>
          <li>To store your projects so you can come back to them, edit them and export them.</li>
          <li>To fix problems, prevent abuse and improve Reword.</li>
        </ul>
        <p>
          We do not sell your personal information, and we do not use your recordings, transcripts or content to
          advertise to you.
        </p>
      </section>

      <section>
        <h2>3. Services that process your data</h2>
        <p>
          Reword relies on trusted service providers. They receive only what they need to perform their task for us.
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> hosts our database, file storage and sign-in system. Your account, audio,
            transcripts, content and memories are stored there.
          </li>
          <li>
            <strong>Google:</strong> handles sign-in when you choose Continue with Google.
          </li>
          <li>
            <strong>Groq, and Google Gemini as a backup:</strong> convert your audio into text.
          </li>
          <li>
            <strong>Anthropic (Claude), and Google Gemini as a backup:</strong> generate content from your transcript,
            voice profile and memories.
          </li>
          <li>
            <strong>MindsHub:</strong> stores and retrieves your OneVoice memories.
          </li>
          <li>
            <strong>Vercel:</strong> hosts the Reword website and provides anonymous usage analytics.
          </li>
        </ul>
        <p>
          These providers may process data on servers outside your country, including in the United States and the
          European Union. We choose providers that protect data with industry-standard security.
        </p>
      </section>

      <section>
        <h2>4. How long we keep your information</h2>
        <p>
          We keep your account and content for as long as your account is active. When you delete a project, its audio, transcript and generated content are deleted. When
          you delete your account, we delete your profile, projects, audio, outputs and memories.
        </p>
      </section>

      <section>
        <h2>5. Your choices and rights</h2>
        <ul>
          <li>
            <strong>Access and export:</strong> download all your projects, outputs and memories from Settings.
          </li>
          <li>
            <strong>Correct:</strong> update your profile, transcripts, content and memories at any time.
          </li>
          <li>
            <strong>Delete:</strong> delete individual projects or memories, or delete your whole account from
            Settings.
          </li>
          <li>
            <strong>Object or ask questions:</strong> contact us at the address below.
          </li>
        </ul>
        <p>
          Depending on where you live, you may have further rights under laws such as the Nigeria Data Protection Act
          2023 or the EU General Data Protection Regulation. We will respond to any request within a reasonable time.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          Your data travels over encrypted connections. Each account can only read its own records, and audio is
          stored in private storage tied to your account. No system is perfectly secure, so please use a strong
          password and keep it private.
        </p>
      </section>

      <section>
        <h2>7. Children</h2>
        <p>
          Reword is not intended for anyone under 13. If you believe a child has created an account, contact us and
          we will delete it.
        </p>
      </section>

      <section>
        <h2>8. Changes to this policy</h2>
        <p>
          We may update this policy as Reword changes. When we make significant changes, we will update the date at
          the top and, where appropriate, let you know in the app or by email.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions or requests about your privacy can be sent to{' '}
          <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
