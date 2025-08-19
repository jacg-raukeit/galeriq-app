// src/screens/AddGuestFromCSVScreen.js
import React, { useState, useContext } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Button, Snackbar, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://143.198.138.35:8000'; 

export default function AddGuestFromCSVScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);

  const eventId = route?.params?.eventId;
  const token = user?.token || user?.accessToken || '';

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  
  const normalizeRow = (row) => {
    const lower = {};
    Object.keys(row || {}).forEach((k) => {
      if (!k) return;
      lower[k.trim().toLowerCase()] = String(row[k] ?? '').trim();
    });

    
    const full_name =
      lower['full_name'] ||
      lower['fullname'] ||
      lower['nombre'] ||
      lower['name'] ||
      '';

    const email =
      lower['email'] ||
      lower['correo'] ||
      lower['mail'] ||
      '';

    const phone =
      lower['phone'] ||
      lower['telefono'] ||
      lower['teléfono'] ||
      '';

    const alias = lower['alias'] || lower['apodo'] || '';

    return { full_name, email, phone, alias };
  };

  const validateRow = ({ full_name, email }) => {
    if (!full_name || !email) return false;
    return /\S+@\S+\.\S+/.test(email);
  };

  
  const csvTypes = Platform.select({
    ios: [
      'public.comma-separated-values-text', 
      'public.text',                        
      'public.data',
    ],
    android: [
      'text/csv',
      'text/comma-separated-values',
      'application/csv',
      'application/vnd.ms-excel',
      'text/*',                   
      '*/*',                      
    ],
    default: ['text/csv', 'text/plain', '*/*'],
  });

  const handleImportCSV = async () => {
    try {
      if (!eventId) {
        Alert.alert('Falta eventId', 'No se encontró el ID del evento.');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: csvTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      setLoading(true);

      const asset = result.assets?.[0];
      const fileUri = asset?.uri || '';
      const fileName = asset?.name || '';

      if (!fileUri) throw new Error('No se pudo leer el archivo');

      
      if (!/\.(csv|txt)$/i.test(fileName) && !/\.(csv|txt)$/i.test(fileUri)) {
        setLoading(false);
        Alert.alert('Archivo inválido', 'Selecciona un archivo .csv (o .txt con formato CSV).');
        return;
      }

      
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

     
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: 'greedy',
      });

      if (parsed.errors?.length) {
        console.warn('Errores de parseo:', parsed.errors);
      }

      
      const normalized = (parsed.data || [])
        .map(normalizeRow)
        .filter(validateRow);

      if (!normalized.length) {
        setLoading(false);
        Alert.alert(
          'CSV vacío o inválido',
          'Asegúrate de incluir columnas como: full_name (o nombre) y email (o correo).'
        );
        return;
      }

      
      const payload = {
        event_id: Number(eventId),
        guests: normalized,
      };

      const resp = await fetch(`${API_URL}/guests/import-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(`Error ${resp.status}: ${body || 'No se pudo importar la lista'}`);
      }

      const created = await resp.json(); 
      const count = Array.isArray(created) ? created.length : 0;

      Alert.alert('Importación exitosa', `${count} invitado(s) agregados.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error al importar CSV:', error);
      Alert.alert('Error', 'No se pudo importar el archivo CSV.');
      setMessage('Falló la importación.');
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Importar invitados desde archivo CSV</Text>

      <Button
        icon="file-upload"
        mode="contained"
        onPress={handleImportCSV}
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Subiendo...' : 'Subir archivo CSV'}
      </Button>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
      >
        {message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  text: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
});
