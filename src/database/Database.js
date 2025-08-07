import * as SQLite from 'expo-sqlite';

let db;

// Inicializar la base de datos y crear la tabla si no existe
export const initDB = async () => {
  try {
    db = await SQLite.openDatabaseAsync('galeriq.db');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS invitados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        correo TEXT,
        telefono TEXT,
        alias TEXT,
        status TEXT,
        avatar TEXT
      );
    `);

    console.log('Base de datos lista');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
};

// Insertar nuevo
export const insertInvitado = async (nombre, correo, telefono, alias, status = 'pending', avatar = '') => {
  try {
    if (!db) throw new Error('La base de datos no está inicializada');

    await db.runAsync(
      `INSERT INTO invitados (nombre, correo, telefono, alias, status, avatar) VALUES (?, ?, ?, ?, ?, ?);`,
      [nombre, correo, telefono, alias, status, avatar]
    );

    console.log('Invitado insertado');
  } catch (error) {
    console.error('Error al insertar invitado:', error);
    throw error;
  }
};

// Obtener todos los invitados
export const fetchInvitados = async () => {
  try {
    if (!db) throw new Error('La base de datos no está inicializada');

    const result = await db.getAllAsync(`SELECT * FROM invitados`);
    console.log('Invitados obtenidos:', result);
    return result;
  } catch (error) {
    console.error('Error al obtener invitados:', error);
    return [];
  }
};

// Borrar todos los invitados
export const clearInvitados = async () => {
  try {
    if (!db) throw new Error('La base de datos no está inicializada');
    await db.runAsync(`DELETE FROM invitados`);
    console.log('🧹 Invitados eliminados');
  } catch (error) {
    console.error('Error al borrar invitados:', error);
  }
};

export const updateInvitadoStatus = (id, newStatus) => {
  try {
    db.runSync(`UPDATE invitados SET status = ? WHERE id = ?`, [newStatus, id]);
  } catch (e) {
    console.error('Error al actualizar estado del invitado:', e);
  }
};
