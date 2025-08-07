import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Button, Snackbar, Text } from 'react-native-paper';
import { insertInvitado } from '../database/Database';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AddGuestFromCSVScreen() {
    const [message, setMessage] = useState('');
    const [visible, setVisible] = useState(false);
    const navigation = useNavigation();

    const handleImportCSV = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const fileContent = await FileSystem.readAsStringAsync(fileUri);

            const lines = fileContent.split('\n');
            const rows = lines.map((line) => line.trim().split(','));

            let count = 0;
            for (const row of rows) {
                if (row.length >= 4) {
                    const [nombre, correo, telefono, alias] = row;
                    await insertInvitado(nombre, correo, telefono, alias);
                    count++;
                }
            }

            Alert.alert(
                'Importación exitosa',
                `${count} invitados agregados.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Error al importar CSV:', error);
            Alert.alert('Error', 'No se pudo importar el archivo CSV');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Importar invitados desde archivo CSV</Text>
            <Button icon="file-upload" mode="contained" onPress={handleImportCSV}>
                Subir archivo CSV
            </Button>

            <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={3000}>
                {message}
            </Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
});