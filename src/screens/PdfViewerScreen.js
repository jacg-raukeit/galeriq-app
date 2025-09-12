// src/screens/PdfViewerScreen.js
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { Asset } from 'expo-asset';
import Pdf from 'react-native-pdf';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function PdfViewerScreen({ route, navigation }) {
  const { title = 'Términos y condiciones', pdfUrl, localRequire } = route.params || {};
  const [resolvedUri, setResolvedUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (localRequire) {
          const asset = Asset.fromModule(localRequire);
          await asset.downloadAsync();
          if (mounted) {
            setResolvedUri(asset.localUri?.replace('file://', '') || asset.uri);
          }
        } else if (pdfUrl) {
          if (mounted) setResolvedUri(pdfUrl);
        } else {
          throw new Error("No se proporcionó PDF.");
        }
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [localRequire, pdfUrl]);

  const source = resolvedUri ? { uri: resolvedUri, cache: true } : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" /></View>
      ) : error || !source ? (
        <View style={styles.loader}><Text>No se pudo cargar el PDF. {error}</Text></View>
      ) : (
        <Pdf
          trustAllCerts={false}
          source={source}
          onLoadComplete={(numberOfPages, filePath) => {
            console.log(`Número de páginas: ${numberOfPages}`);
          }}
          onPageChanged={(page, numberOfPages) => {
            console.log(`Página actual: ${page}`);
          }}
          onError={(pdfError) => {
            console.error(pdfError);
            setError('Error al mostrar el PDF.');
          }}
          onPressLink={(uri) => {
            console.log(`Link presionado: ${uri}`);
          }}
          style={styles.pdf}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e6e6e6', marginTop: 40,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});