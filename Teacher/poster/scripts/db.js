/**
 * IndexedDB Database Module
 * Handles data persistence with large storage capacity
 */

const DB_NAME = 'PosterEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'posterData';
const DATA_KEY = 'academicPosterData';

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Get data from IndexedDB
 * @param {string} key - Data key
 * @returns {Promise<any>}
 */
async function getFromDB(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result?.data || null);
    });
}

/**
 * Save data to IndexedDB
 * @param {string} key - Data key
 * @param {any} data - Data to save
 * @returns {Promise<void>}
 */
async function saveToDB(key, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ id: key, data: data });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Migrate data from localStorage to IndexedDB
 * @returns {Promise<any|null>}
 */
async function migrateFromLocalStorage() {
    const localData = localStorage.getItem(DATA_KEY);
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            await saveToDB(DATA_KEY, parsed);
            localStorage.removeItem(DATA_KEY);
            console.log('✅ localStorage → IndexedDB 마이그레이션 완료');
            return parsed;
        } catch (e) {
            console.error('마이그레이션 실패:', e);
        }
    }
    return null;
}

// Export for use in other modules
window.PosterDB = {
    DATA_KEY,
    getFromDB,
    saveToDB,
    migrateFromLocalStorage
};
