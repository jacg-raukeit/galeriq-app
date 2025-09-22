// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import profile_en from './locales/en/profile.json';
import profile_es from './locales/es/profile.json';
import settings_en from './locales/en/settings.json';
import settings_es from './locales/es/settings.json';
import events_en from './locales/en/events.json';
import events_es from './locales/es/events.json';
import eventCard_en from './locales/en/eventCard.json';
import eventCard_es from './locales/es/eventCard.json';
import events_list_en from './locales/en/events_list.json';
import events_list_es from './locales/es/events_list.json';
import event_detail_en from './locales/en/event_detail.json';
import event_detail_es from './locales/es/event_detail.json';
import create_event_en from './locales/en/create_event.json';
import create_event_es from './locales/es/create_event.json';
import planing_home_en from './locales/en/planning_home.json';
import planing_home_es from './locales/es/planning_home.json';
import planning_es from './locales/es/planning.json';
import planning_en from './locales/en/planning.json';
import expenses_es from './locales/es/expenses.json';
import expenses_en from './locales/en/expenses.json';
import guests_es from './locales/es/guests.json';
import guests_en from './locales/en/guests.json';
import add_guest_en from './locales/en/add_guest.json';
import add_guest_es from './locales/es/add_guest.json';
import add_guest_csv_en from './locales/en/add_guest_csv.json';
import add_guest_csv_es from './locales/es/add_guest_csv.json';
import albums_cover_en from './locales/en/albums_cover.json';
import albums_cover_es from './locales/es/albums_cover.json';
import albums_photos_en from './locales/en/albums_photos.json';
import albums_photos_es from './locales/es/albums_photos.json';
import invitations_home_en from './locales/en/invitations_home.json';
import invitations_home_es from './locales/es/invitations_home.json';
import explore_designs_en from './locales/en/explore_designs.json';
import explore_designs_es from './locales/es/explore_designs.json';
import invite_editor_en from './locales/en/invite_editor.json';
import invite_editor_es from './locales/es/invite_editor.json';
import notifications_en from './locales/en/notifications.json';
import notifications_es from './locales/es/notifications.json';
import faq_en from './locales/en/faq.json';
import faq_es from './locales/es/faq.json';
import about_en from './locales/en/about.json';
import about_es from './locales/es/about.json';
import feedback_en from './locales/en/feedback.json';
import feedback_es from './locales/es/feedback.json';
import agenda_en from './locales/en/agenda.json';
import agenda_es from './locales/es/agenda.json';







const STORAGE_KEY = 'appLang';

const resources = {
  en: {
    profile: profile_en,
    settings: settings_en,
    events: events_en,
    eventCard: eventCard_en,
    events_list: events_list_en, 
    event_detail: event_detail_en,
    create_event: create_event_en,
    planning_home: planing_home_en,
    planning: planning_en, 
    expenses: expenses_en,
    guests: guests_en,
    add_guest: add_guest_en,
    add_guest_csv: add_guest_csv_en,
    albums_cover: albums_cover_en,
    albums_photos: albums_photos_en,
    invitations_home: invitations_home_en,
    explore_designs: explore_designs_en,
    invite_editor: invite_editor_en,
    notifications: notifications_en,
    faq: faq_en,
    about: about_en,
    feedback: feedback_en,
    agenda: agenda_en,
  },
  es: {
    profile: profile_es,
    settings: settings_es,
    events: events_es,
    eventCard: eventCard_es,
    events_list: events_list_es,
    event_detail: event_detail_es,
    create_event: create_event_es,
    planning_home: planing_home_es,
    planning: planning_es,
    expenses: expenses_es,
    guests: guests_es,
    add_guest: add_guest_es,
    add_guest_csv: add_guest_csv_es,
    albums_cover: albums_cover_es,
    albums_photos: albums_photos_es,
    invitations_home: invitations_home_es,
    explore_designs: explore_designs_es,
    invite_editor: invite_editor_es,
    notifications: notifications_es,
    faq: faq_es,
    about: about_es,
    feedback: feedback_es,
    agenda: agenda_es,
  },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'es',
  fallbackLng: 'es',
  ns: ['profile', 'settings', 'events', 'eventCard', 'events_list' , 'event_detail' , 'create_event' , 'planning_home' , 'planning' , 'expenses' , 'guests' , 'add_guest' , 'add_guest_csv' , 'albums_cover' , 'albums_photos' , 'invitations_home' , 'explore_designs' , 'invite_editor' , 'notifications'  , 'faq' , 'about' , 'feedback' , 'agenda'],
});

export async function bootstrapI18n() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const device = Localization.getLocales?.()[0]?.languageCode ?? 'es';
    const lang = saved || (device === 'es' ? 'es' : 'en');
    if (i18n.language !== lang) {
      await i18n.changeLanguage(lang);
    }
  } catch {
  }
}

export async function setAppLanguage(lang) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(STORAGE_KEY, lang);
}

export default i18n;
