import Link from 'next/link'
import { LEGAL_CONTACT, LegalPage } from '@/components/legal-page'

export const metadata = { title: 'Terms and Conditions | Reword' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro="These terms govern your use of Reword. By creating an account or using Reword, you agree to them. If you do not agree, please do not use the service."
    >
      <section>
        <h2>1. The service</h2>
        <p>
          Reword lets you record or upload audio, or paste a transcript, and turns it into content for LinkedIn or a
          blog, X, Instagram or Facebook, and TikTok or Reels. Reword does not publish anything for you. You decide
          what to copy, export and post.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 13 years old to use Reword.</li>
          <li>Give accurate information when you sign up and keep your password secure.</li>
          <li>You are responsible for activity on your account. Tell us promptly if you think it has been misused.</li>
        </ul>
      </section>

      <section>
        <h2>3. Your content</h2>
        <p>
          You own the audio, transcripts and text you put into Reword, and you own the content Reword generates for
          you. You give us permission to store and process your content only as needed to run the service for you,
          including sending it to the providers listed in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          You must have the right to use anything you upload. Do not upload recordings of other people without their
          permission.
        </p>
      </section>

      <section>
        <h2>4. AI-generated content</h2>
        <p>
          Reword uses artificial intelligence to transcribe and write. Transcripts can contain mistakes, and generated
          content can be inaccurate, incomplete or similar to content created for others. Review and edit everything
          before you publish it. You are responsible for what you post and for making sure it follows the rules of
          each platform you use.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree not to use Reword to:</p>
        <ul>
          <li>Create content that is unlawful, defamatory, hateful, harassing or sexually exploitative.</li>
          <li>Infringe anyone else's copyright, trademark, privacy or other rights.</li>
          <li>Spread spam, scams, malware or deliberately misleading information.</li>
          <li>Impersonate another person or organisation.</li>
          <li>Interfere with, overload, reverse engineer or gain unauthorised access to the service.</li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
      </section>

      <section>
        <h2>6. Plans and payments</h2>
        <p>
          Reword offers a free plan. If we introduce paid plans, their prices, billing terms and any refund policy
          will be shown clearly before you pay. Features and limits for each plan are listed on the{' '}
          <Link href="/pricing">pricing page</Link> and may change over time.
        </p>
      </section>

      <section>
        <h2>7. Availability and changes</h2>
        <p>
          We work to keep Reword available and reliable, but we do not guarantee it will always be uninterrupted or
          error-free. We may add, change or remove features. We will try to give notice of changes that significantly
          affect you.
        </p>
      </section>

      <section>
        <h2>8. Ending your use</h2>
        <p>
          You can stop using Reword and delete your account at any time from Settings. We may suspend or end your
          access if you break these terms or if we have to for legal reasons. Before deleting your account, you can
          export your data from Settings.
        </p>
      </section>

      <section>
        <h2>9. Disclaimers and liability</h2>
        <p>
          Reword is provided "as is" and "as available". To the fullest extent allowed by law, we are not liable for
          indirect or consequential losses, lost profits, lost data, or damage to your reputation arising from your
          use of Reword or from content it generates. Where liability cannot be excluded, our total liability is
          limited to the amount you paid us in the 12 months before the claim, or zero if you use the free plan.
          Nothing in these terms limits rights you have under consumer protection law that cannot be waived.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. Any dispute will be handled by the
          courts of Nigeria, unless the law of your country gives you the right to bring it elsewhere.
        </p>
      </section>

      <section>
        <h2>11. Changes to these terms</h2>
        <p>
          We may update these terms. When we do, we will change the date at the top. If you keep using Reword after
          an update, you accept the new terms.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Questions about these terms can be sent to <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
        </p>
      </section>
    </LegalPage>
  )
}
