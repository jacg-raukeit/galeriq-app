// src/screens/AddGuestManualScreen.js
import React, { useState, useContext } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

const API_URL = 'http://192.168.1.71:8000'; 

export default function AddGuestManualScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);

  const eventId = route?.params?.eventId;
  const token = user?.token || user?.accessToken || '';

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleGuardar = async () => {
    if (!eventId) {
      Alert.alert('Falta información', 'No se encontró el eventId para este invitado.');
      return;
    }
    if (!nombre || !correo) {
      Alert.alert('Faltan datos', 'Nombre y correo son obligatorios.');
      return;
    }
    if (!validateEmail(correo)) {
      Alert.alert('Correo inválido', 'Por favor, escribe un correo válido.');
      return;
    }

    Alert.alert(
      'Confirmar guardado',
      '¿Deseas guardar este invitado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Guardar',
          style: 'default',
          onPress: async () => {
            try {
              setSaving(true);

              
              const payload = {
                event_id: Number(eventId),
                full_name: nombre,
                email: correo,
              };
              
              if (telefono) payload.phone = telefono;
              if (alias) payload.alias = alias;

              const resp = await fetch(`${API_URL}/guests`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
              });

              if (!resp.ok) {
                const body = await resp.text().catch(() => '');
                throw new Error(`Error ${resp.status}: ${body || 'No se pudo crear el invitado'}`);
              }

              await resp.json(); 
              Alert.alert('Éxito', 'Invitado guardado correctamente.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error al guardar invitado:', error);
              
              const msg =
                String(error?.message || '')
                  .toLowerCase()
                  .includes('422')
                  ? 'Datos inválidos para el backend (verifica los campos).'
                  : 'No se pudo guardar el invitado.';
              Alert.alert('Error', msg);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelar = () => {
    if (nombre || correo || telefono || alias) {
      Alert.alert(
        '¿Cancelar?',
        'Perderás la información escrita. ¿Deseas continuar?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Sí, salir', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agregar invitado</Text>

      <TextInput
        label="Nombre"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        label="Correo"
        value={correo}
        onChangeText={setCorreo}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        label="Teléfono (opcional)"
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        label="Alias (opcional)"
        value={alias}
        onChangeText={setAlias}
        style={styles.input}
        disabled={saving}
      />

      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Button mode="contained" onPress={handleGuardar} loading={saving} disabled={saving}>
            Guardar
          </Button>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Button
            mode="outlined"
            onPress={handleCancelar}
            textColor="red"
            style={{ borderColor: 'red' }}
            disabled={saving}
          >
            Cancelar
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, marginBottom: 20, fontWeight: 'bold' },
  input: { marginBottom: 12 },
});
