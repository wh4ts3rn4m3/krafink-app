import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

// Translation dictionary
const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.search': 'Search',
    'nav.messages': 'Messages',
    'nav.notifications': 'Notifications',
    'nav.create': 'Create',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    
    // Authentication
    'auth.welcome_back': 'Welcome back',
    'auth.join_community': 'Join the community',
    'auth.email': 'Email',
    'auth.username': 'Username',
    'auth.name': 'Display Name',
    'auth.password': 'Password',
    'auth.sign_in': 'Sign In',
    'auth.create_account': 'Create Account',
    'auth.need_account': 'Need an account? Sign up',
    'auth.have_account': 'Already have an account? Sign in',
    
    // Posts
    'post.whats_on_mind': 'What\'s on your mind?',
    'post.create': 'Create Post',
    'post.post': 'Post',
    'post.posting': 'Posting...',
    'post.public': 'Public',
    'post.followers_only': 'Followers Only',
    'post.character_count': 'characters',
    'post.edit': 'Edit',
    'post.delete': 'Delete',
    'post.like': 'Like',
    'post.comment': 'Comment',
    'post.save': 'Save',
    'post.share': 'Share',
    
    // Comments
    'comment.add': 'Add a comment...',
    'comment.reply': 'Reply',
    'comment.delete': 'Delete comment',
    
    // Profile
    'profile.edit': 'Edit Profile',
    'profile.follow': 'Follow',
    'profile.unfollow': 'Unfollow',
    'profile.followers': 'Followers',
    'profile.following': 'Following',
    'profile.posts': 'Posts',
    'profile.about': 'About',
    'profile.no_bio': 'No bio available',
    'profile.links': 'Links',
    
    // Messages
    'messages.title': 'Messages',
    'messages.new': 'New Message',
    'messages.search_users': 'Search users...',
    'messages.type_message': 'Type a message...',
    'messages.online': 'Online',
    'messages.typing': 'typing...',
    'messages.no_conversations': 'No conversations yet',
    'messages.start_conversation': 'Start a conversation',
    
    // Notifications
    'notifications.title': 'Notifications',
    'notifications.mark_read': 'Mark as read',
    'notifications.mark_all_read': 'Mark all read',
    'notifications.no_notifications': 'No notifications yet',
    
    // Search
    'search.title': 'Search',
    'search.placeholder': 'Search users and posts...',
    'search.people': 'People',
    'search.posts': 'Posts',
    'search.no_results': 'No results found',
    
    // Feed
    'feed.empty': 'Your feed is empty!',
    'feed.start_following': 'Start following some creators or create your first post.',
    'feed.no_posts': 'No public posts to explore yet.',
    
    // Privacy
    'privacy.block': 'Block',
    'privacy.report': 'Report',
    'privacy.block_user': 'Block User',
    'privacy.report_content': 'Report Content',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.submit': 'Submit',
    
    // Legal
    'legal.terms': 'Terms of Service',
    'legal.privacy': 'Privacy Policy',
    'legal.imprint': 'Imprint',
    'legal.cookies': 'Cookie Settings',
    
    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.toggle': 'Toggle theme'
  },
  de: {
    // Navigation
    'nav.home': 'Start',
    'nav.explore': 'Entdecken',
    'nav.search': 'Suchen',
    'nav.messages': 'Nachrichten',
    'nav.notifications': 'Benachrichtigungen',
    'nav.create': 'Erstellen',
    'nav.profile': 'Profil',
    'nav.logout': 'Abmelden',
    
    // Authentication
    'auth.welcome_back': 'Willkommen zurück',
    'auth.join_community': 'Der Community beitreten',
    'auth.email': 'E-Mail',
    'auth.username': 'Benutzername',
    'auth.name': 'Anzeigename',
    'auth.password': 'Passwort',
    'auth.sign_in': 'Anmelden',
    'auth.create_account': 'Konto erstellen',
    'auth.need_account': 'Brauchen Sie ein Konto? Registrieren',
    'auth.have_account': 'Haben Sie bereits ein Konto? Anmelden',
    
    // Posts
    'post.whats_on_mind': 'Was beschäftigt Sie?',
    'post.create': 'Beitrag erstellen',
    'post.post': 'Veröffentlichen',
    'post.posting': 'Wird veröffentlicht...',
    'post.public': 'Öffentlich',
    'post.followers_only': 'Nur Follower',
    'post.character_count': 'Zeichen',
    'post.edit': 'Bearbeiten',
    'post.delete': 'Löschen',
    'post.like': 'Gefällt mir',
    'post.comment': 'Kommentieren',
    'post.save': 'Speichern',
    'post.share': 'Teilen',
    
    // Comments
    'comment.add': 'Kommentar hinzufügen...',
    'comment.reply': 'Antworten',
    'comment.delete': 'Kommentar löschen',
    
    // Profile
    'profile.edit': 'Profil bearbeiten',
    'profile.follow': 'Folgen',
    'profile.unfollow': 'Entfolgen',
    'profile.followers': 'Follower',
    'profile.following': 'Folgt',
    'profile.posts': 'Beiträge',
    'profile.about': 'Über mich',
    'profile.no_bio': 'Keine Biografie verfügbar',
    'profile.links': 'Links',
    
    // Messages
    'messages.title': 'Nachrichten',
    'messages.new': 'Neue Nachricht',
    'messages.search_users': 'Benutzer suchen...',
    'messages.type_message': 'Nachricht eingeben...',
    'messages.online': 'Online',
    'messages.typing': 'schreibt...',
    'messages.no_conversations': 'Noch keine Unterhaltungen',
    'messages.start_conversation': 'Unterhaltung beginnen',
    
    // Notifications
    'notifications.title': 'Benachrichtigungen',
    'notifications.mark_read': 'Als gelesen markieren',
    'notifications.mark_all_read': 'Alle als gelesen markieren',
    'notifications.no_notifications': 'Noch keine Benachrichtigungen',
    
    // Search
    'search.title': 'Suchen',
    'search.placeholder': 'Benutzer und Beiträge suchen...',
    'search.people': 'Personen',
    'search.posts': 'Beiträge',
    'search.no_results': 'Keine Ergebnisse gefunden',
    
    // Feed
    'feed.empty': 'Ihr Feed ist leer!',
    'feed.start_following': 'Folgen Sie einigen Künstlern oder erstellen Sie Ihren ersten Beitrag.',
    'feed.no_posts': 'Noch keine öffentlichen Beiträge zu entdecken.',
    
    // Privacy
    'privacy.block': 'Blockieren',
    'privacy.report': 'Melden',
    'privacy.block_user': 'Benutzer blockieren',
    'privacy.report_content': 'Inhalt melden',
    
    // Common
    'common.loading': 'Lädt...',
    'common.error': 'Ein Fehler ist aufgetreten',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.close': 'Schließen',
    'common.submit': 'Absenden',
    
    // Legal
    'legal.terms': 'Nutzungsbedingungen',
    'legal.privacy': 'Datenschutzerklärung',
    'legal.imprint': 'Impressum',
    'legal.cookies': 'Cookie-Einstellungen',
    
    // Theme
    'theme.light': 'Hell',
    'theme.dark': 'Dunkel',
    'theme.toggle': 'Theme wechseln'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('krafink-language');
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('krafink-language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key, fallback = key) => {
    return translations[language]?.[key] || translations['en']?.[key] || fallback;
  };

  const switchLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};