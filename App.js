// App.js
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as AuthSession from 'expo-auth-session';
import { LogBox } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { EventsProvider } from './src/context/EventsContext';
import 'react-native-gesture-handler';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import EventsScreen from './src/screens/EventsScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import PlanningScreen from './src/screens/PlanningScreen';
import PlanningHomeScreen from './src/screens/PlanningHomeScreen';
import AgendaScreen from './src/screens/AgendaScreen';
import GuestScreen from './src/screens/GuestScreen';
import ExpensesScreen    from './src/screens/ExpensesScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import AddExpenseScreen     from './src/screens/AddExpenseScreen';
import AddGuestManualScreen from './src/screens/AddGuestManualScreen';
import AddGuestFromCSVScreen from './src/screens/AddGuestFromCSVScreen';

const Stack = createStackNavigator();

LogBox.ignoreLogs(['useInsertionEffect']);

export default function App() {
  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log('URI de redirección OAuth:', redirectUri);
  }, []);

  return (
    <AuthProvider>
      <EventsProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Events" component={EventsScreen} />
            <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="PlanningHome" component={PlanningHomeScreen} />
            <Stack.Screen name="Planning" component={PlanningScreen} />
            <Stack.Screen name="Agenda" component={AgendaScreen} />
            <Stack.Screen name="GuestList" component={GuestScreen} />
            <Stack.Screen name="AddGuestManual" component={AddGuestManualScreen} />
            <Stack.Screen name="AddGuestFromCSV" component={AddGuestFromCSVScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </EventsProvider>
    </AuthProvider>
  );
}
