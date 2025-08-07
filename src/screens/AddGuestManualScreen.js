import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { insertInvitado } from '../database/Database';

export default function AddGuestManualScreen() {
    const navigation = useNavigation();

    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [telefono, setTelefono] = useState('');
    const [alias, setAlias] = useState('');

    const handleGuardar = async () => {
        if (!nombre || !correo || !telefono || !alias) {
            Alert.alert('Faltan datos', 'Completa todos los campos.');
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
                            const nuevoInvitado = {
                                nombre,
                                correo,
                                telefono,
                                alias,
                            };

                            console.log('Invitado agregado:', nuevoInvitado);
                            await insertInvitado(nombre, correo, telefono, alias);
                            Alert.alert('Éxito', 'Invitado guardado correctamente.', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error) {
                            console.error('Error al guardar invitado:', error);
                            Alert.alert('Error', 'No se pudo guardar el invitado.');
                        }
                    }
                }
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
                    { text: 'Sí, salir', style: 'destructive', onPress: () => navigation.goBack() }
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
            />
            <TextInput
                label="Correo"
                value={correo}
                onChangeText={setCorreo}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
            />
            <TextInput
                label="Teléfono"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
                style={styles.input}
            />
            <TextInput
                label="Alias"
                value={alias}
                onChangeText={setAlias}
                style={styles.input}
            />

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Button mode="contained" onPress={handleGuardar}>
                        Guardar
                    </Button>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Button
                        mode="outlined"
                        onPress={handleCancelar}
                        textColor="red"
                        style={{ borderColor: 'red' }}
                    >
                        Cancelar
                    </Button>
                </View>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flex: 1,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 12,
    },
    button: {
        marginTop: 20,
    },
});
