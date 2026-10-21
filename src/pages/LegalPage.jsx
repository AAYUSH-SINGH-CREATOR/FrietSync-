import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import logo from '../assets/logo.svg';

const documents = {
  privacy: {
    title: 'Privacy Policy for Frietsync',
    pageTitle: 'Privacy Policy | Frietsync',
    sections: [
      {
        title: 'Introduction',
        paragraphs: ['Frietsync ("we," "us," or "our") operates https://frietsync.me/ (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our Service. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.'],
      },
      {
        title: 'Information We Collect',
        paragraphs: ['We may collect the following types of information:'],
        list: ['Name', 'Email address', 'Mailing address'],
        after: ['We collect this information when you voluntarily provide it to us, when you use our Service, or through automated technologies.'],
      },
      {
        title: 'How We Use Your Information',
        paragraphs: ['We may use the information we collect for various purposes, including to:'],
        list: [
          'Provide, operate, and maintain our Service',
          'Improve, personalize, and expand our Service',
          'Understand and analyze how you use our Service',
          'Develop new products, services, features, and functionality',
          'Communicate with you for customer service, updates, and marketing purposes',
          'Process transactions and send related information',
          'Find and prevent fraud',
          'Comply with legal obligations',
        ],
      },
      {
        title: 'Data Retention',
        paragraphs: ['We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.'],
      },
      {
        title: 'Data Security',
        paragraphs: ['The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.'],
      },
      {
        title: 'Changes to This Privacy Policy',
        paragraphs: [
          'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.',
          'You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions about this Privacy Policy, please contact us:'],
        list: ['By email: frietsync@gmail.com', 'By visiting: https://frietsync.me/'],
      },
    ],
  },
  terms: {
    title: 'Terms of Service for Frietsync',
    pageTitle: 'Terms of Service | Frietsync',
    sections: [
      {
        title: 'Agreement to Terms',
        paragraphs: ['By accessing or using the services provided by Frietsync at https://frietsync.me/ (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.'],
      },
      {
        title: 'Use of Service',
        paragraphs: ['You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:'],
        list: [
          'Use the Service in any way that violates any applicable law or regulation',
          'Use the Service to transmit any harmful, threatening, abusive, or otherwise objectionable material',
          'Attempt to gain unauthorized access to any portion of the Service',
          'Use the Service to infringe upon the rights of others',
          'Use any automated system to access the Service in a manner that sends more requests than a human can reasonably produce',
        ],
      },
      {
        title: 'Intellectual Property',
        paragraphs: ['The Service and its original content, features, and functionality are and will remain the exclusive property of Frietsync. The Service is protected by copyright, trademark, and other laws. Our trademarks may not be used in connection with any product or service without our prior written consent.'],
      },
      {
        title: 'User Content',
        paragraphs: ['You retain ownership of any content you submit to or through the Service. By submitting content, you grant Frietsync a non-exclusive, worldwide, royalty-free license to use, reproduce, and display such content in connection with operating the Service.'],
      },
      {
        title: 'Termination',
        paragraphs: [
          'We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.',
          'Upon termination, your right to use the Service will cease immediately.',
        ],
      },
      {
        title: 'Limitation of Liability',
        paragraphs: ['In no event shall Frietsync, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:'],
        list: [
          'Your access to or use of (or inability to access or use) the Service',
          'Any conduct or content of any third party on the Service',
          'Any content obtained from the Service',
          'Unauthorized access, use, or alteration of your transmissions or content',
        ],
      },
      {
        title: 'Disclaimer',
        paragraphs: ['The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.'],
      },
      {
        title: 'Governing Law',
        paragraphs: ['These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which Frietsync operates, without regard to its conflict of law provisions.'],
      },
      {
        title: 'Changes to Terms',
        paragraphs: [
          'We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days\' notice prior to any new terms taking effect.',
          'By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions about these Terms of Service, please contact us:'],
        list: ['By email: frietsync@gmail.com', 'By visiting: https://frietsync.me/'],
      },
    ],
  },
};

const renderLinks = (text) => text.split(/(https:\/\/frietsync\.me\/|frietsync@gmail\.com)/g).map((part, index) => {
  if (part === 'https://frietsync.me/') {
    return <a key={index} href={part} className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200">{part}</a>;
  }
  if (part === 'frietsync@gmail.com') {
    return <a key={index} href="mailto:frietsync@gmail.com" className="text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200">{part}</a>;
  }
  return part;
});

export default function LegalPage({ type }) {
  const document = documents[type];
  const navigate = useNavigate();

  useEffect(() => {
    const previousTitle = window.document.title;
    window.document.title = document.pageTitle;
    return () => { window.document.title = previousTitle; };
  }, [document.pageTitle]);

  const otherPage = type === 'privacy'
    ? { label: 'Terms of Service', to: '/terms' }
    : { label: 'Privacy Policy', to: '/privacy' };

  return (
    <div className="min-h-screen bg-[#EBF6FF] text-slate-900 dark:bg-[#292929] dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#242424]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3 font-bold text-slate-950 dark:text-white">
            <img src={logo} alt="" className="h-9 w-9" />
            <span className="text-xl">Frietsync</span>
          </Link>
          <Link to={otherPage.to} className="text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200">
            {otherPage.label}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 dark:border-white/10 dark:bg-[#1d1d1d]">
          <button
            type="button"
            onClick={() => navigate(window.history.length > 1 ? -1 : '/')}
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <FiArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400"><strong>Last Updated: October 21, 2026</strong></p>

          <div className="mt-9 space-y-8">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[15px] leading-7 text-slate-700 dark:text-slate-300">{renderLinks(paragraph)}</p>
                ))}
                {section.list && (
                  <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-700 dark:text-slate-300">
                    {section.list.map((item) => <li key={item}>{renderLinks(item)}</li>)}
                  </ul>
                )}
                {section.after?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-[15px] leading-7 text-slate-700 dark:text-slate-300">{renderLinks(paragraph)}</p>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
            This document was generated by PolicyGen and is provided for informational purposes only. It does not constitute legal advice. Please consult with a qualified attorney to ensure compliance with applicable laws.
          </p>
        </article>
      </main>
    </div>
  );
}
