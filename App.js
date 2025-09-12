// App.js
import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as AuthSession from 'expo-auth-session';
import { LogBox, Alert, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';


import { useFonts } from 'expo-font';
import { 
  Montserrat_700Bold 
} from '@expo-google-fonts/montserrat';
import { Lato_700Bold } from '@expo-google-fonts/lato';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Lobster_400Regular } from '@expo-google-fonts/lobster';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import PdfViewerScreen from './src/screens/PdfViewerScreen';




import { AuthProvider } from './src/context/AuthContext';
import { EventsProvider } from './src/context/EventsContext';

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
import QuienesSomosScreen from './src/screens/QuienesSomosScreen';

const Stack = createStackNavigator();

LogBox.ignoreLogs(['useInsertionEffect']);


export default function App() {
const notificationListener = useRef();
const responseListener = useRef();
useEffect(() => {
    // URI de redirección OAuth
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('URI de redirección OAuth:', redirectUri);

    // === Escucha notificaciones cuando la app está abierta ===
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
    });

    // === Escucha cuando el usuario toca la notificación ===
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Usuario respondió a la notificación:', response);
      Alert.alert('Notificación', 'Abriste una notificación');
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);


  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Lato_700Bold,
    PlayfairDisplay_700Bold,
    Lobster_400Regular,
    Pacifico_400Regular,
    DancingScript_700Bold,
  });
  
  if (!fontsLoaded) {
    return null; // O un componente de carga
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <EventsProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Splash"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MiPerfil" component={MiPerfilScreen} />
              <Stack.Screen name="Faq" component={FaqScreen} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Plans" component={PlansScreen} />
              <Stack.Screen name="InConstruction" component={InConstructionScreen} />
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