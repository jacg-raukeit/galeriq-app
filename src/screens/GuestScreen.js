import React, { useEffect, useState } from 'react';
import { View, FlatList, Image, StyleSheet, LayoutAnimation, UIManager, Platform, Pressable, RefreshControl } from 'react-native';
import { List, FAB, Snackbar, Text, Portal, Provider } from 'react-native-paper';
import { fetchInvitados, updateInvitadoStatus } from '../database/Database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getStatusIcon = (status) => {
    switch (status) {
        case 'confirmed': return 'check-circle';
        case 'rejected': return 'close-circle';
        default: return 'clock-outline';
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'confirmed': return 'green';
        case 'rejected': return 'red';
        default: return 'orange';
    }
};

export default function GuestScreen() {
    const navigation = useNavigation();
    const [guests, setGuests] = useState([]);
    const [filteredGuests, setFilteredGuests] = useState([]);
    const [filter, setFilter] = useState('all');
    const [fabOpen, setFabOpen] = useState(false);
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadGuests();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadGuests();
        }, [])
    );

    const loadGuests = async () => {
        const data = await fetchInvitados();
        setGuests(data);
        applyFilter(filter, data);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadGuests();
        setRefreshing(false);
    };

    const applyFilter = (filterStatus, dataList) => {
        if (filterStatus === 'all') {
            setFilteredGuests(dataList);
        } else {
            setFilteredGuests(dataList.filter(g => g.status === filterStatus));
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'pending'
            ? 'confirmed'
            : currentStatus === 'confirmed'
                ? 'rejected'
                : 'pending';

        try {
            await updateInvitadoStatus(id, nextStatus);
            const data = await fetchInvitados();
            setGuests(data);
            applyFilter(filter, data);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const estadoEsp = nextStatus === 'confirmed' ? 'Confirmado' : nextStatus === 'rejected' ? 'Rechazado' : 'Pendiente';
            setSnackbarMsg(`Invitado marcado como: ${estadoEsp}`);
            setSnackbarVisible(true);
        } catch (error) {
            console.error('Error al actualizar estado:', error);
        }
    };

    const confirmedCount = guests.filter(g => g.status === 'confirmed').length;
    const pendingCount = guests.filter(g => g.status === 'pending').length;
    const rejectedCount = guests.filter(g => g.status === 'rejected').length;
    const totalCount = guests.length;

    return (
        <Provider>
            <SafeAreaView style={styles.container}>
                <Text style={styles.title}>Lista de invitados</Text>

                <View style={styles.statusBar}>
                    <Pressable style={[styles.statusBox, { backgroundColor: 'blue' }]} onPress={() => { setFilter('all'); applyFilter('all', guests); }}>
                        <Text style={styles.statusText}>👥 {totalCount}</Text>
                    </Pressable>
                    <Pressable style={[styles.statusBox, { backgroundColor: 'green' }]} onPress={() => { setFilter('confirmed'); applyFilter('confirmed', guests); }}>
                        <Text style={styles.statusText}>✅ {confirmedCount}</Text>
                    </Pressable>
                    <Pressable style={[styles.statusBox, { backgroundColor: 'orange' }]} onPress={() => { setFilter('pending'); applyFilter('pending', guests); }}>
                        <Text style={styles.statusText}>⏳ {pendingCount}</Text>
                    </Pressable>
                    <Pressable style={[styles.statusBox, { backgroundColor: 'red' }]} onPress={() => { setFilter('rejected'); applyFilter('rejected', guests); }}>
                        <Text style={styles.statusText}>❌ {rejectedCount}</Text>
                    </Pressable>
                </View>

                <FlatList
                    data={filteredGuests}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    renderItem={({ item }) => (
                        <List.Item
                            title={item.nombre}
                            description={item.alias || item.correo || item.telefono}
                            left={() => (
                                <Image
                                    source={item.avatar ? { uri: item.avatar } : require('../assets/images/google.png')}
                                    style={styles.avatar}
                                />
                            )}
                            right={() => (
                                <Pressable onPress={() => toggleStatus(item.id, item.status)}>
                                    <List.Icon
                                        icon={getStatusIcon(item.status)}
                                        color={getStatusColor(item.status)}
                                    />
                                </Pressable>
                            )}
                        />
                    )}
                />

                <Portal>
                    <FAB.Group
                        open={fabOpen}
                        icon={fabOpen ? 'close' : 'plus'}
                        actions={[
                            {
                                icon: 'account-plus',
                                label: 'Agregar Manualmente',
                                onPress: () => navigation.navigate('AddGuestManual'),
                            },
                            {
                                icon: 'file-upload',
                                label: 'Subir CSV',
                                onPress: () => navigation.navigate('AddGuestFromCSV'),
                            },
                        ]}
                        onStateChange={({ open }) => setFabOpen(open)}
                        visible={true}
                    />
                </Portal>

                <Snackbar
                    visible={snackbarVisible}
                    onDismiss={() => setSnackbarVisible(false)}
                    duration={2000}
                    action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
                >
                    {snackbarMsg}
                </Snackbar>
            </SafeAreaView>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 8 },
    fab: { position: 'absolute', right: 16, bottom: 16 },
    statusBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statusBox: { flex: 1, padding: 8, borderRadius: 8 },
    statusText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
    filterButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 }
});