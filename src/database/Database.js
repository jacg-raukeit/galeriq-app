import * as SQLite from 'expo-sqlite';

let db = null;

export const initDB = async () => {
  if (db) return db; // ya abierta
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
  return db;
};

const getDB = async () => {
  // garantiza que siempre haya instancia
  return db ?? (await initDB());
};

export const insertInvitado = async (nombre, correo, telefono, alias, status = 'pending', avatar = '') => {
  try {
    const dbi = await getDB();
    await dbi.runAsync(
      `INSERT INTO invitados (nombre, correo, telefono, alias, status, avatar) VALUES (?, ?, ?, ?, ?, ?);`,
      [nombre, correo, telefono, alias, status, avatar]
    );
  } catch (error) {
    console.error('Error al insertar invitado:', error);
    throw error;
  }
};

export const fetchInvitados = async () => {
  try {
    const dbi = await getDB();
    const result = await dbi.getAllAsync(`SELECT * FROM invitados`);
    return result;
  } catch (error) {
    // usa console.warn para que no te saque el “ERROR rojo” en desarrollo
    console.warn('Error al obtener invitados:', error);
    return [];
  }
};

export const clearInvitados = async () => {
  try {
    const dbi = await getDB();
    await dbi.runAsync(`DELETE FROM invitados`);
  } catch (error) {
    console.error('Error al borrar invitados:', error);
  }
};

export const updateInvitadoStatus = async (id, newStatus) => {
  try {
    const dbi = await getDB();
    await dbi.runAsync(`UPDATE invitados SET status = ? WHERE id = ?`, [newStatus, id]);
  } catch (e) {
    console.error('Error al actualizar estado del invitado:', e);
    throw e;
  }
};
