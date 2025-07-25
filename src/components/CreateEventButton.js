import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CreateEventButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.iconWrapper}>
        <Ionicons name="add" size={26} color="#3B2556" />
      </View>
      <Text style={styles.text}>Crear evento</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 88,
    backgroundColor: '#D6C4E3',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    color: '#3B2556',
    fontSize: 26,
    fontWeight: '500',
  },
});
