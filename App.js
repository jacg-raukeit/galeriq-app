// App.js
import 'intl';
import 'intl/locale-data/jsonp/es-MX'; // Sé explícito para asegurar que carga el formato de México
import 'intl/locale-data/jsonp/es';
import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react'; 
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import './src/i18n/i18n';
import { bootstrapI18n } from './src/i18n/i18n';

import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


import * as AuthSession from 'expo-auth-session';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking'; // abrir URLs de invitaciones

import { useFonts } from 'expo-font';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Lato_700Bold } from '@expo-google-fonts/lato';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';

// Contexts
import { AuthProvider } from './src/context/AuthContext';
import { EventsProvider } from './src/context/EventsContext';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EventsScreen from './src/screens/EventsScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import EventCreatedScreen from './src/screens/EventCreatedScreen';
import PlanningScreen from './src/screens/PlanningScreen';
import PlanningHomeScreen from './src/screens/PlanningHomeScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import GuestScreen from './src/screens/GuestScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import AddGuestManualScreen from './src/screens/AddGuestManualScreen';
import AddGuestFromCSVScreen from './src/screens/AddGuestFromCSVScreen';
import AlbumsScreen from './src/screens/AlbumsScreen';
import InvitationsHomeScreen from './src/screens/invitations/InvitationsHomeScreen';
import ExploreDesignsScreen from './src/screens/invitations/ExploreDesignsScreen';
import InviteEditorScreen from './src/screens/invitations/InviteEditorScreen';
import PortadaAlbumsScreens from './src/screens/PortadaAlbumsScreens';
import NotificationsScreen from './src/screens/NotificationsScreen';
import BudgetControlScreen from './src/screens/BudgetControlScreen';
import MiPerfilScreen from './src/screens/MiPerfilScreen';
import FaqScreen from './src/screens/FaqScreen';
import PlansScreen from './src/screens/PlansScreen';
import InConstructionScreen from './src/screens/InConstructionScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import PdfViewerScreen from './src/screens/PdfViewerScreen';
import QuienesSomosScreen from './src/screens/QuienesSomosScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();
LogBox.ignoreLogs(['useInsertionEffect']);

// ======= Navegación global para listeners =======
export const navigationRef = createNavigationContainerRef();

function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    setTimeout(() => navigate(name, params), 50);
  }
}

function normalizeNotifData(raw = {}) {
  // Acepta tanto "type" como "tipo" (y variantes comunes), y asegura eventId numérico
  const type =
    raw.type ??
    raw.tipo ??
    raw.Type ??
    raw.Tipo ??
    raw.TYPE ??
    null;

  // event_id puede venir como string; forzamos a número si aplica
  const event_id = raw.event_id != null
    ? (Number.isNaN(Number(raw.event_id)) ? raw.event_id : Number(raw.event_id))
    : raw.eventId != null
      ? (Number.isNaN(Number(raw.eventId)) ? raw.eventId : Number(raw.eventId))
      : undefined;

  return { ...raw, type, event_id };
}


function routeFromDbType(data = {}) {
  const { type, event_id, title, message, deepLink, ...rest } = data;
  const t = (type || '').toUpperCase();

  switch (t) {
    case 'CHECKLIST':
      return { name: 'PlanningHome', params: { eventId: event_id, ...rest } };

    case 'INVITATION': {
      const urlMatch = typeof message === 'string' ? message.match(/https?:\/\/\S+/) : null;
      const url = deepLink || (urlMatch ? urlMatch[0] : null);
      return url
        ? { name: '__OPEN_URL__', params: { url, fallback: { name: 'InvitationsHome', params: { eventId: event_id, ...rest } } } }
        : { name: 'InvitationsHome', params: { eventId: event_id, ...rest } };
    }

    case 'OWNER':
    case 'EVENT':
      return { name: 'EventDetail', params: { eventId: event_id, ...rest } };

    case 'AGENDA':
      return { name: 'Agenda', params: { eventId: event_id, ...rest } };

    case 'ALBUM':
      return { name: 'Albums', params: { eventId: event_id, ...rest } };

    case 'NOTIFICATION':
      return { name: 'Notifications', params: { ...rest } };

    default:
      // Si no vino tipo, te llevo a la lista pero con el eventId si existe
      return event_id != null
        ? { name: 'EventDetail', params: { eventId: event_id, ...rest } }
        : { name: 'Events', params: { ...rest } };
  }
}


async function handleNotificationNavigationData(raw = {}) {
  const data = normalizeNotifData(raw);
  const route = routeFromDbType(data);
  if (!route?.name) return;

  if (route.name === '__OPEN_URL__') {
    const { url, fallback } = route.params || {};
    try {
      if (url) await Linking.openURL(url);
      if (fallback?.name) navigate(fallback.name, fallback.params || {});
      return;
    } catch {
      if (fallback?.name) navigate(fallback.name, fallback.params || {});
      return;
    }
  }

  navigate(route.name, route.params || {});
}

async function handleNotificationNavigationFromResponse(response) {
  const raw = response?.notification?.request?.content?.data || {};
  await handleNotificationNavigationData(raw);
}


// ======= Configuración de comportamiento en Android (opcional Heads-up) =======
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_700Bold,
    PlayfairDisplay_700Bold,
    Lobster_400Regular,
    Pacifico_400Regular,
    DancingScript_700Bold,
  });

  useEffect(() => {
    (async () => {
      await bootstrapI18n();
      setI18nReady(true);
    })();
  }, []);

  // Canal Android para notificaciones (heads-up)
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }, []);

  // Listeners de notificaciones + cold start
  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('URI de redirección OAuth:', redirectUri);

    // App abierta (foreground): normalmente solo registramos
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
  const data = notification?.request?.content?.data || {};
  console.log('Notificación recibida (fg) - data completa:', JSON.stringify(data, null, 2));
      // Si quieres navegar también en foreground, descomenta:
      // const data = notification?.request?.content?.data || {};
      // handleNotificationNavigationData(data);
    });

    // Usuario toca la notificación (background/foreground)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('Usuario tocó la notificación:', response);
      await handleNotificationNavigationFromResponse(response);

      // (Opcional) Marcar como leída si mandas notification_id en data
      // const nid = response?.notification?.request?.content?.data?.notification_id;
      // if (nid) {
      //   try { await axios.post(`${API_URL}/notifications/${nid}/read`); } catch (e) {}
      // }
    });

    // Cold start: la app se abrió desde una notificación
    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        console.log('Cold start con notificación previa:', last);
        await handleNotificationNavigationFromResponse(last);
      }
    })();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

 if (!fontsLoaded || !i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <EventsProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MiPerfil" component={MiPerfilScreen} />
              <Stack.Screen name="Faq" component={FaqScreen} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Plans" component={PlansScreen} />
              <Stack.Screen name="InConstruction" component={InConstructionScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="QuienesSomos" component={QuienesSomosScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Events" component={EventsScreen} />
              <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen name="EventCreated" component={EventCreatedScreen} />
              <Stack.Screen name="PlanningHome" component={PlanningHomeScreen} />
              <Stack.Screen name="Planning" component={PlanningScreen} />
              <Stack.Screen name="Agenda" component={AgendaScreen} />
              <Stack.Screen name="BudgetControl" component={BudgetControlScreen} />
              <Stack.Screen name="GuestList" component={GuestScreen} />
              <Stack.Screen name="AddGuestManual" component={AddGuestManualScreen} />
              <Stack.Screen name="AddGuestFromCSV" component={AddGuestFromCSVScreen} />
              <Stack.Screen name="Expenses" component={ExpensesScreen} />
              <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
              <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
              <Stack.Screen name="Albums" component={AlbumsScreen} />
              <Stack.Screen name="PortadaAlbums" component={PortadaAlbumsScreens} />
              <Stack.Screen name="InvitationsHome" component={InvitationsHomeScreen} />
              <Stack.Screen name="ExploreDesigns" component={ExploreDesignsScreen} />
              <Stack.Screen name="InviteEditor" component={InviteEditorScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </EventsProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
