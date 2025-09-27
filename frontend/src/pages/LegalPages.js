import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, Shield, Info, Cookie } from 'lucide-react';

export const TermsPage = () => {
  const { t } = useLanguage();
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{t('legal.terms')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By accessing and using krafink ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                krafink is a social networking platform designed for artists and crafters to showcase their work, connect with other creators, and build a community around art and craftsmanship.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You are responsible for safeguarding the password and all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">4. Content Policy</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You retain rights to any content you submit, post or display on krafink. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">5. Prohibited Uses</h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Posting illegal, harmful, or offensive content</li>
                <li>Harassment or bullying of other users</li>
                <li>Spam or unauthorized commercial communications</li>
                <li>Violation of intellectual property rights</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">6. Termination</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We may terminate or suspend your account at our discretion for violations of these terms or for any other reason.
              </p>
            </section>
            
            <p className="text-sm text-gray-500 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PrivacyPage = () => {
  const { t } = useLanguage();
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>{t('legal.privacy')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-gray max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We collect information you provide directly (account information, posts, messages) and automatically (usage data, device information).
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Provide and maintain the service</li>
                <li>Process your transactions</li>
                <li>Send notifications and updates</li>
                <li>Improve our services</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">3. Information Sharing</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">5. Your Rights (GDPR)</h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Right to access your data</li>
                <li>Right to rectification</li>
                <li>Right to erasure</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">6. Contact Us</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For privacy-related questions, contact us at privacy@krafink.art
              </p>
            </section>
            
            <p className="text-sm text-gray-500 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const ImprintPage = () => {
  const { t } = useLanguage();
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>{t('legal.imprint')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-4">Information pursuant to § 5 TMG</h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>krafink GmbH</p>
                <p>Kunst Straße 123</p>
                <p>10115 Berlin, Germany</p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Contact</h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>Phone: +49 30 12345678</p>
                <p>Email: legal@krafink.art</p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Commercial Register</h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>Register Court: Berlin Charlottenburg</p>
                <p>Registration Number: HRB 123456</p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">VAT ID</h2>
              <p className="text-gray-700 dark:text-gray-300">
                VAT identification number pursuant to § 27 a VAT Tax Act: DE123456789
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Responsible for Content</h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p>Jane Doe, Managing Director</p>
                <p>Address as above</p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-4">Dispute Resolution</h2>
              <p className="text-gray-700 dark:text-gray-300">
                The European Commission provides a platform for online dispute resolution (ODR): 
                <a href="https://ec.europa.eu/consumers/odr/" className="text-blue-500 hover:underline ml-1">
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
            </section>
            
            <p className="text-sm text-gray-500 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const CookieBanner = () => {
  const [showBanner, setShowBanner] = React.useState(false);
  const { t } = useLanguage();

  React.useEffect(() => {
    const consent = localStorage.getItem('krafink-cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('krafink-cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('krafink-cookie-consent', 'rejected');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg z-50 p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Cookie className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              We use cookies to improve your experience and analyze site usage. 
              <a href="/privacy" className="text-purple-600 hover:underline ml-1">
                Learn more
              </a>
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={rejectCookies}>
            Reject
          </Button>
          <Button size="sm" onClick={acceptCookies}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};