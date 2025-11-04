// src/screens/LoginScreen.js
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
  Keyboard,
  Modal,
  Linking,
  ScrollView,
} from "react-native";
import { BackHandler } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
// import * as WebBrowser from "expo-web-browser";
// import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";
import * as Device from "expo-device";
import { AuthContext } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Localization from 'expo-localization';
import * as Notifications from "expo-notifications";

import {
  GoogleSignin,
  statusCodes,
  GoogleSigninButton,
  isErrorWithCode,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";

// WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

const TOKEN_KEY = "galeriq_token";
const USER_ID_KEY = "galeriq_user_id";
const API_BASE = "http://143.198.138.35:8000";

const TERMS_PDF_LOCAL = require("../assets/documents/terminos.pdf");

const SLIDES = [
  {
    img: require("../../src/assets/images/carousel1.jpg"),
    title: "Organiza sin estrés",
    subtitle: "Checklist y agenda inteligentes para tu evento.",
  },
  {
    img: require("../../src/assets/images/carousel2.jpg"),
    title: "Invitaciones Interactivas",
    subtitle: "Envía, invitaciones personalizadas y más.",
  },
  {
    img: require("../../src/assets/images/carousel3.jpg"),
    title: "Álbumes compartidos",
    subtitle: "Tus mejores momentos en un solo lugar.",
  },
];

const PANEL_HEIGHT = Math.max(360, height * 0.42);
const EXTRA_EXPAND = Math.min(height * 0.24, 230);

const SUPPORT_WHATSAPP = "+5217777884778";
const SUPPORT_EMAIL = "soporte@galeriq.app";
const SUPPORT_PHONE = "+527777884778";
const SUPPORT_DEFAULT_MSG = "Hola, necesito ayuda con mi cuenta de Galeriq.";

const getUserTimezone = () => {
  try {
    return Localization.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [focusedInput, setFocusedInput] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const handleFocus = (field) => setFocusedInput(field);
  const handleBlur = () => setFocusedInput(null);

  const getInputStyle = (field) => [
    styles.input,
    focusedInput === field && styles.inputFocused,
  ];

  // const [bootLoading, setBootLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [email, setEmail] = useState("");
  thePasswordHack = "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbOpen, setKbOpen] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef(null);
  const passRef = useRef(null);

  const [supportOpen, setSupportOpen] = useState(false);
  const supportAnim = useRef(new Animated.Value(0)).current;

  const openSupport = () => {
    setSupportOpen(true);
    Animated.timing(supportAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSupport = () => {
    Animated.timing(supportAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSupportOpen(false));
  };

  const backdropOpacity = supportAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const sheetTranslateY = supportAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "1060805663067-q0c8jp11ito6nqm65osmtca42hhbsgh8.apps.googleusercontent.com",
      offlineAccess: true,
      // forceCodeForRefreshToken: true,
    });
  }, []);

  useEffect(() => {
    const sh = Keyboard.addListener("keyboardDidShow", () => setKbOpen(true));
    const hd = Keyboard.addListener("keyboardDidHide", () => setKbOpen(false));
    return () => {
      sh.remove();
      hd.remove();
    };
  }, []);

  const autoLoginExecuted = useRef(false);

  useEffect(() => {
  if (autoLoginExecuted.current) return;
  
  (async () => {
    try {
      autoLoginExecuted.current = true;
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (savedToken) {
        const profileRes = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser({ id: profile.user_id, token: savedToken });
         setTimeout(() => {
  navigation.replace("Events");
}, 100);
          return;
        } else {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_ID_KEY);
        }
      }
    } catch (e) {
      console.log("Auto-login error:", e);
    } finally {
      setBootLoading(false);
    }
  })();
}, [navigation, setUser]);

  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(4500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start(() => setCurrent((p) => (p + 1) % SLIDES.length));
    };
    animate();
    const id = setInterval(animate, 5400);
    return () => clearInterval(id);
  }, [fadeAnim]);

  const slide = SLIDES[current];

  const panelOuterY = useRef(new Animated.Value(40)).current;
  const panelOuterOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelOuterY, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(panelOuterOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const panelExpand = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(panelExpand, {
      toValue: showEmailForm ? 1 : 0,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [showEmailForm]);

  const panelHeight = panelExpand.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, PANEL_HEIGHT + EXTRA_EXPAND],
  });

  const persistSession = async (token, userId) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
      console.log("✅ Token guardado exitosamente para Google Sign-In");
    } catch (e) {
      console.log("Error guardando sesión:", e);
    }
  };
  const clearPersistedSession = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_ID_KEY);
    } catch {}
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // 1) Android: verificar Play Services
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // 2) Google Sign-In (API "Original")
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return;

      const { user, idToken } = res.data; 

      if (!idToken) {
        Alert.alert(
          "Error",
          "No se obtuvo idToken de Google (revisa webClientId)."
        );
        return;
      }

      // (opcional) Obtener FCM token como ya lo haces en login por correo
      let fcmToken = null;
      try {
        if (Device.isDevice) {
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus === "granted") {
            const tokenData = await Notifications.getDevicePushTokenAsync();
            fcmToken = tokenData.data;
          }
        }
      } catch {}

      const timezone = getUserTimezone();
      console.log('🌍 Timezone detectado:', timezone);

      // 3) Llamar a tu backend con JSON (idToken tiene que ir como "idToken")
      const r = await fetch(`${API_BASE}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken, // <- clave exacta que tu backend lee con request.json().get("idToken")
          // NOTA: Tus params fcm/device están declarados como Form en el backend.
          // Si los mandas aquí en JSON, FastAPI no los levantará como Form.
          // Si quieres que se registren, ajusta el backend para leerlos también desde JSON.
          fcm_token: fcmToken,
          device_type: Platform.OS,
          device_name: Device.modelName,
          device_os: Device.osVersion,
          browser: null,
          user_zone: timezone,
        }),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || `HTTP ${r.status}`);
      }

      const { user_id, full_name, email, jwt_token, session_token } =
        await r.json();

      // 4) Guardar sesión local y navegar a Home
      setUser({ id: user_id, token: jwt_token }); 
      if (rememberMe) {
        await SecureStore.setItemAsync(TOKEN_KEY, jwt_token);
        await SecureStore.setItemAsync(USER_ID_KEY, String(user_id));
        // Si te interesa persistir el session_token del device:
         await SecureStore.setItemAsync('galeriq_session_token', session_token || '');
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_ID_KEY);
      }

      navigation.replace("Events");
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
        return;
      console.log("Google Sign-In error:", e);
      Alert.alert(
        "Error",
        e?.message || "No se pudo iniciar sesión con Google"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert("Error", "Ingresa email y contraseña");
    }
    setLoading(true);
    try {
      let fcmToken = null;
      if (Device.isDevice) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === "granted") {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          fcmToken = tokenData.data;
          console.log("FCM Token:", fcmToken);
        } else {
          console.log("Permisos de notificación no concedidos");
        }
      }

      const timezone = getUserTimezone();
      console.log('🌍 Timezone detectado:', timezone);

      const res = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          fcm_token: fcmToken || "",
          device_type: Platform.OS,
          device_name: Device.modelName,
          device_os: Device.osVersion,
          user_zone: timezone,
        }).toString(),
      });

      if (res.status !== 200) {
        if (res.status === 401) {
          return Alert.alert(
            "Credenciales inválidas",
            "Revisa tu email o contraseña"
          );
        }
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const { access_token: token } = await res.json();
      const profileRes = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!profileRes.ok) throw new Error("No pude cargar perfil de usuario");
      const profile = await profileRes.json();

      setUser({ id: profile.user_id, token });

      if (rememberMe) {
        await persistSession(token, profile.user_id);
      } else {
        await clearPersistedSession();
      }

      navigation.replace("Events");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", e.message || "Algo falló durante el login");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    const value = (forgotEmail || "").trim().toLowerCase();
    const isEmail = /^\S+@\S+\.\S+$/.test(value);
    if (!isEmail)
      return Alert.alert("Correo inválido", "Escribe un correo válido.");
    setForgotSending(true);
    try {
      const res = await fetch(`${API_BASE}/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: value }).toString(),
      });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 404)
          return Alert.alert(
            "No encontrado",
            "No existe un usuario con ese correo."
          );
        return Alert.alert(
          "Error",
          text || "No se pudo iniciar la recuperación."
        );
      }
      Alert.alert(
        "Listo",
        "Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo."
      );
      setForgotOpen(false);
      setForgotEmail("");
    } catch {
      Alert.alert("Error", "No se pudo iniciar la recuperación.");
    } finally {
      setForgotSending(false);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (kbOpen) {
        Keyboard.dismiss();
        return true;
      }
      if (supportOpen) {
        closeSupport();
        return true;
      }
      if (showEmailForm) {
        setShowEmailForm(false);
        return true;
      }
      if (forgotOpen) {
        setForgotOpen(false);
        return true;
      }
      BackHandler.exitApp();
    return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [kbOpen, showEmailForm, forgotOpen, supportOpen]);

  // if (bootLoading) {
  //   return (
  //     <View
  //       style={{
  //         flex: 1,
  //         backgroundColor: "#FFE8D6",
  //         alignItems: "center",
  //         justifyContent: "center",
  //       }}
  //     >
  //       <ActivityIndicator size="large" color="#6B21A8" />
  //       <Text style={{ marginTop: 10, color: "#111827" }}>Cargando…</Text>
  //     </View>
  //   );
  // }

  const heroHeight = kbOpen
    ? Math.min(140, height * 0.18)
    : showEmailForm
    ? height * 0.19
    : height * 0.28;

  const bottomPad = PANEL_HEIGHT + (showEmailForm ? EXTRA_EXPAND : 0) + 40;

  const openWhatsApp = async () => {
    try {
      const url = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${encodeURIComponent(
        SUPPORT_DEFAULT_MSG
      )}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        const wa = `https://wa.me/${SUPPORT_WHATSAPP.replace(
          /\D/g,
          ""
        )}?text=${encodeURIComponent(SUPPORT_DEFAULT_MSG)}`;
        await Linking.openURL(wa);
      }
      closeSupport();
    } catch (e) {
      Alert.alert(
        "No se pudo abrir WhatsApp",
        "Revisa que la app esté instalada."
      );
    }
  };

  const openEmail = async () => {
    try {
      const subject = "Soporte Galeriq";
      const body = SUPPORT_DEFAULT_MSG;
      const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else
        Alert.alert(
          "No se pudo abrir el correo",
          "Configura una app de correo por defecto."
        );
      closeSupport();
    } catch {
      Alert.alert("No se pudo abrir el correo", "Intenta de nuevo.");
    }
  };

  const openPhone = async () => {
    try {
      const url = `tel:${SUPPORT_PHONE}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else
        Alert.alert(
          "No se pudo iniciar llamada",
          "Revisa permisos o dispositivo."
        );
      closeSupport();
    } catch {
      Alert.alert("No se pudo iniciar llamada", "Intenta de nuevo.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      {/* Zona superior (fuera del panel) */}
      <KeyboardAwareScrollView
        scrollEnabled={Platform.OS !== "ios"}
        bounces={Platform.OS !== "ios"}
        alwaysBounceVertical={false}
        overScrollMode="never"

        enableOnAndroid
        extraScrollHeight={Platform.OS === "android" ? 80 : 40}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.topScroll,
          { paddingTop: insets.top + 16, paddingBottom: bottomPad },
        ]}
        enableAutomaticScroll={Platform.OS !== "ios"}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.marca}>Galeriq</Text>

        <View style={[styles.hero, { height: heroHeight }]}>
          <Animated.Image
            source={slide.img}
            style={[styles.carouselImage, { opacity: fadeAnim }]}
            resizeMode="cover"
          />
          <Animated.View
            style={[
              styles.copyOverlay,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.copyTitle}>{slide.title}</Text>
            <Text style={styles.copySubtitle}>{slide.subtitle}</Text>
          </Animated.View>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === current && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Tarjetitas ocultas si showEmailForm */}
        {!showEmailForm && !kbOpen && (
          <View style={styles.featuresRow}>
            <Feature icon="calendar-outline" text="Agenda inteligente" />
            <Feature icon="pricetags-outline" text="Proveedores confiables" />
            <Feature icon="images-outline" text="Álbum colaborativo" />
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Nodo A: solo translateY/opacity (nativo) */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.peachPanelOuter,
          {
            transform: [{ translateY: panelOuterY }],
            opacity: panelOuterOpacity,
          },
        ]}
      >
        {/* Nodo B: solo height */}
        <Animated.View
          style={[
            styles.peachPanelInner,
            { height: panelHeight, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {!kbOpen && (
            <Text style={styles.subtitle}>
              Tu espacio para celebrar, recordar y compartir momentos. ✨
            </Text>
          )}

          {!showEmailForm ? (
            <>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                    <Text style={styles.buttonTextGoogle}>
                      Continuar con Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonEmail}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.9}
              >
                <Ionicons name="mail-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Continuar con correo</Text>
              </TouchableOpacity>

              {/* <GoogleSigninButton
                style={{ width: '100%', height: 48 }}
                size={GoogleSigninButton.Size.Wide}
                color={GoogleSigninButton.Color.Dark}
                onPress={handleGoogleSignIn}
              /> */}
            </>
          ) : (
            <View style={styles.form}>
              <TextInput
                ref={emailRef}
                style={getInputStyle("email")}
                placeholder="Correo electrónico"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passRef.current?.focus()}
                onFocus={() => handleFocus("email")}
                onBlur={handleBlur}
              />
              <View
                style={[
                  styles.passwordContainer,
                  focusedInput === "password" &&
                    styles.passwordContainerFocused,
                ]}
              >
                <TextInput
                  ref={passRef}
                  style={[
                    styles.input,
                    { flex: 1, marginBottom: 0, borderWidth: 0 },
                  ]}
                  placeholder="Contraseña"
                  placeholderTextColor="#6B7280"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleEmailLogin}
                  onFocus={() => handleFocus("password")}
                  onBlur={handleBlur}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={showPassword ? "#6B21A8" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setRememberMe((v) => !v)}
                style={styles.rememberRow}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={rememberMe ? "checkbox" : "square-outline"}
                  size={20}
                  color={rememberMe ? "#6B21A8" : "#6B7280"}
                />
                <Text style={styles.rememberText}>Recordarme</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.loginBtn,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleEmailLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.buttonText, { marginLeft: 0 }]}>
                    Iniciar sesión
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* INFORMACIÓN DE DEBUG EN PANTALLA */}
          {debugInfo && (
            <ScrollView
              style={styles.debugContainer}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator
            >
              <Text style={styles.debugTitle}>🔍 Debug Info</Text>

              {debugInfo.success ? (
                <>
                  <Text style={styles.debugSuccess}>
                    ✅ GOOGLE SIGN-IN EXITOSO
                  </Text>

                  <View style={styles.debugSection}>
                    <Text style={styles.debugSectionTitle}>👤 Usuario:</Text>
                    <Text style={styles.debugText}>
                      Nombre: {debugInfo.user.name}
                    </Text>
                    <Text style={styles.debugText}>
                      Email: {debugInfo.user.email}
                    </Text>
                    <Text style={styles.debugText}>
                      ID: {debugInfo.user.id}
                    </Text>
                    <Text style={styles.debugText}>
                      Nombre: {debugInfo.user.givenName}
                    </Text>
                    <Text style={styles.debugText}>
                      Apellido: {debugInfo.user.familyName}
                    </Text>
                  </View>

                  <View style={styles.debugSection}>
                    <Text style={styles.debugSectionTitle}>🔑 Token:</Text>
                    <Text style={styles.debugText}>
                      Tiene Token: {debugInfo.token.hasToken ? "SÍ" : "NO"}
                    </Text>
                    <Text style={styles.debugText}>
                      Longitud: {debugInfo.token.tokenLength}
                    </Text>
                    <Text style={styles.debugText}>
                      Preview: {debugInfo.token.tokenPreview}
                    </Text>
                    <Text style={styles.debugText}>
                      Server Auth Code: {debugInfo.token.serverAuthCode}
                    </Text>
                    <Text style={styles.debugText}>
                      Access Token: {debugInfo.token.accessToken}
                    </Text>
                  </View>

                  <View style={styles.debugSection}>
                    <Text style={styles.debugSectionTitle}>📱 FCM:</Text>
                    <Text style={styles.debugText}>
                      Tiene FCM: {debugInfo.fcm.hasToken ? "SÍ" : "NO"}
                    </Text>
                    <Text style={styles.debugText}>
                      FCM Length: {debugInfo.fcm.tokenLength}
                    </Text>
                    <Text style={styles.debugText}>
                      FCM Token: {debugInfo.fcm.token}
                    </Text>
                    {debugInfo.fcm.error && (
                      <Text style={styles.debugText}>
                        Error FCM: {debugInfo.fcm.error}
                      </Text>
                    )}
                  </View>

                  <View style={styles.debugSection}>
                    <Text style={styles.debugSectionTitle}>📱 Device:</Text>
                    <Text style={styles.debugText}>
                      Platform: {debugInfo.device.platform}
                    </Text>
                    <Text style={styles.debugText}>
                      Is Device: {debugInfo.device.isDevice ? "Sí" : "No"}
                    </Text>
                  </View>

                  <View style={styles.debugSection}>
                    <Text style={styles.debugSectionTitle}>🔗 Backend:</Text>
                    <Text style={styles.debugText}>
                      URL: {debugInfo.backend.url}
                    </Text>
                    <Text style={styles.debugText}>
                      Endpoint: {debugInfo.backend.endpoint}
                    </Text>
                    <Text style={styles.debugText}>
                      Nota: {debugInfo.backend.note}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.debugError}>❌ ERROR</Text>
                  <Text style={styles.debugText}>
                    Código: {debugInfo.error?.code || "UNKNOWN"}
                  </Text>
                  <Text style={styles.debugText}>
                    Mensaje: {debugInfo.error?.message || "Error desconocido"}
                  </Text>
                  {debugInfo.error?.originalMessage && (
                    <Text style={styles.debugText}>
                      Mensaje original: {debugInfo.error.originalMessage}
                    </Text>
                  )}
                  {debugInfo.error?.stack && (
                    <Text style={styles.debugText}>
                      Stack: {debugInfo.error.stack}
                    </Text>
                  )}

                  {debugInfo.config && (
                    <View style={styles.debugSection}>
                      <Text style={styles.debugSectionTitle}>
                        ⚙️ Configuración:
                      </Text>
                      <Text style={styles.debugText}>
                        Web Client ID: {debugInfo.config.webClientId}
                      </Text>
                      <Text style={styles.debugText}>
                        Package: {debugInfo.config.packageName}
                      </Text>
                      <Text style={styles.debugText}>
                        SHA-1: {debugInfo.config.sha1Expected}
                      </Text>
                    </View>
                  )}

                  {debugInfo.suggestions &&
                    debugInfo.suggestions.length > 0 && (
                      <View style={styles.debugSection}>
                        <Text style={styles.debugSectionTitle}>
                          💡 Sugerencias:
                        </Text>
                        {debugInfo.suggestions.map((suggestion, index) => (
                          <Text key={index} style={styles.debugText}>
                            {suggestion}
                          </Text>
                        ))}
                      </View>
                    )}
                </>
              )}

              <Text style={styles.debugTime}>
                Timestamp: {debugInfo.timestamp}
              </Text>

              <TouchableOpacity
                style={styles.debugClearBtn}
                onPress={() => setDebugInfo(null)}
              >
                <Text style={styles.debugClearText}>Limpiar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {!kbOpen && (
            <>
              <View style={styles.footer}>
                {!showEmailForm ? (
                  <>
                    <Text style={styles.footerText}>
                      ¿No tienes una cuenta?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Register")}
                    >
                      <Text style={styles.footerLink}>Regístrate</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.footerText}>
                      ¿Olvidaste tu contraseña?{" "}
                    </Text>
                    <TouchableOpacity onPress={() => setForgotOpen(true)}>
                      <Text style={styles.footerLink}>Recuperar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.legalRow}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("PdfViewer", {
                      title: "Términos Y Condiciones",
                      localRequire: TERMS_PDF_LOCAL,
                    })
                  }
                >
                  <Text style={styles.legalLink}>Términos</Text>
                </TouchableOpacity>
                <Text style={styles.dotSep}>·</Text>
                <TouchableOpacity>
                  <Text style={styles.legalLink}>Privacidad</Text>
                </TouchableOpacity>
                <Text style={styles.dotSep}>·</Text>
                <TouchableOpacity onPress={openSupport}>
                  <Text style={styles.legalLink}>Soporte</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>

      {/* Modal Recuperar contraseña */}
      <Modal
        visible={forgotOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            setForgotOpen(false);
          }}
        >
          <View
            style={[styles.modalCard, { marginTop: insets.top + 60 }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Recuperar contraseña</Text>
            <Text style={styles.modalHint}>
              Escribe el correo asociado a tu cuenta y te enviaremos un enlace
              para restablecerla.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoFocus
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setForgotOpen(false)}
                disabled={forgotSending}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.primaryBtn,
                  forgotSending && styles.buttonDisabled,
                ]}
                onPress={handleForgotSubmit}
                disabled={forgotSending}
              >
                {forgotSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>Enviar enlace</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Soporte */}
      {supportOpen && (
        <Modal
          visible={supportOpen}
          transparent
          animationType="none"
          onRequestClose={closeSupport}
        >
          <Animated.View
            style={[styles.supportBackdrop, { opacity: backdropOpacity }]}
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeSupport}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.supportSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.supportHandle} />
            <Text style={styles.supportTitle}>¿Cómo deseas contactarnos?</Text>

            <View style={styles.supportOptions}>
              <TouchableOpacity
                style={styles.supportOption}
                onPress={openWhatsApp}
                activeOpacity={0.9}
              >
                <View style={styles.supportIconWrap}>
                  <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportOptTitle}>WhatsApp</Text>
                  <Text style={styles.supportOptText}>
                    Abrir chat con soporte
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportOption}
                onPress={openEmail}
                activeOpacity={0.9}
              >
                <View style={styles.supportIconWrap}>
                  <Ionicons name="mail-outline" size={24} color="#6B21A8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportOptTitle}>Correo</Text>
                  <Text style={styles.supportOptText}>{SUPPORT_EMAIL}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.supportOption}
                onPress={openPhone}
                activeOpacity={0.9}
              >
                <View style={styles.supportIconWrap}>
                  <Ionicons name="call-outline" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportOptTitle}>Teléfono</Text>
                  <Text style={styles.supportOptText}>{SUPPORT_PHONE}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.supportCloseBtn}
              onPress={closeSupport}
              activeOpacity={0.85}
            >
              <Text style={styles.supportCloseTxt}>Cerrar</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

function Feature({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIconWrap}>
        <Ionicons name={icon} size={18} color="#6B21A8" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topScroll: {
    alignItems: "center",
    minHeight: height * 1.05,
  },

  marca: {
    fontSize: 32,
    fontWeight: "800",
    color: "black",
    marginBottom: 8,
    textAlign: "center",
  },

  hero: {
    width: width * 0.9,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#E5E7EB",
    marginTop: 6,
  },
  carouselImage: { width: "100%", height: "100%" },
  copyOverlay: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
  copyTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  copySubtitle: { color: "#F3F4F6", marginTop: 2, fontSize: 13 },

  dots: {
    position: "absolute",
    alignSelf: "center",
    bottom: 10,
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { backgroundColor: "#FFFFFF" },

  featuresRow: {
    width: "90%",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  featureItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#E9D5FF",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12.5,
    color: "#4B5563",
    textAlign: "center",
    fontWeight: "700",
  },

  peachPanelOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  peachPanelInner: {
    backgroundColor: "#F3E8FF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 18,
  },

  subtitle: {
    fontSize: 18.5,
    color: "#1f2937",
    textAlign: "center",
    width: "85%",
    marginBottom: 8,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 12,
    borderRadius: 28,
    width: "85%",
    marginTop: 14,
    borderColor: "#B380B9",
    borderWidth: 1,
  },
  buttonEmail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B380B9",
    padding: 12,
    borderRadius: 28,
    width: "85%",
    marginTop: 12,
    borderColor: "#B380B9",
    borderWidth: 1,
  },
  buttonDisabled: { opacity: 0.6 },
  loginBtn: { backgroundColor: "#6B21A8", justifyContent: "center" },
  buttonText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  buttonTextGoogle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "black",
    marginLeft: 8,
  },

  form: { width: "88%", alignItems: "center", marginTop: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 30,
    width: "100%",
    padding: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
    paddingRight: 10,
    marginBottom: 12,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  rememberRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  rememberText: { color: "#111827", fontWeight: "600" },

  footer: { flexDirection: "row", marginTop: 16, alignItems: "center" },
  footerText: { color: "black", fontSize: 14 },
  footerLink: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  legalLink: {
    color: "#111827",
    fontSize: 12.5,
    textDecorationLine: "underline",
  },
  dotSep: { color: "#111827", fontSize: 12.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#6B21A8" },
  modalHint: { color: "#4B5563", marginTop: 6, marginBottom: 10 },
  modalActionsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: { backgroundColor: "#efeff4" },
  primaryBtn: { backgroundColor: "#6B21A8" },
  cancelText: { color: "#111827", fontWeight: "700" },
  primaryText: { color: "#fff", fontWeight: "700" },

  inputFocused: {
    borderColor: "#6B21A8",
    borderWidth: 2,
  },
  passwordContainerFocused: {
    borderColor: "#6B21A8",
    borderWidth: 2,
  },

  supportBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  supportSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
  },
  supportHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  supportOptions: {
    marginTop: 4,
  },
  supportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  supportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  supportOptTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  supportOptText: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 2,
  },
  supportCloseBtn: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#efeff4",
    paddingHorizontal: 18,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  supportCloseTxt: {
    color: "#111827",
    fontWeight: "700",
  },

  debugContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  debugSuccess: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 8,
  },
  debugError: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#DC2626",
    marginBottom: 8,
  },
  debugSection: {
    marginBottom: 8,
  },
  debugSectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  debugTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 8,
  },
  debugClearBtn: {
    backgroundColor: "#EF4444",
    padding: 6,
    borderRadius: 4,
    alignItems: "center",
  },
  debugClearText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});