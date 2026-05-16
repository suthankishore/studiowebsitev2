const firebaseConfig = {
    apiKey: 'AIzaSyD0DPvdKOZOT0SLKKmdrxYgX8qyu6c2ob4',
    authDomain: 'v2cinematicstudio-c538f.firebaseapp.com',
    projectId: 'v2cinematicstudio-c538f',
    storageBucket: 'v2cinematicstudio-c538f.firebasestorage.app',
    messagingSenderId: '578035225818',
    appId: '1:578035225818:web:75e417d93a0500df5c41e3',
    measurementId: 'G-D4TFQGLZHP'
};

firebase.initializeApp(firebaseConfig);

if (firebase.analytics && location.protocol !== 'file:') {
    firebase.analytics();
}

const db = firebase.firestore();

function timestampToIso(value) {
    if (!value) return '';
    if (typeof value.toDate === 'function') {
        return value.toDate().toISOString();
    }
    if (value.seconds) {
        return new Date(value.seconds * 1000).toISOString();
    }
    return value;
}

function cleanPayload(payload) {
    return Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.trim() : value
        ])
    );
}

function generateUniqueToken() {
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    const timePart = Date.now().toString(36).slice(-4).toUpperCase();
    return `V2-${timePart}-${randomPart}`;
}

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

window.v2Firebase = {
    loginAdmin(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    },

    saveBooking(payload) {
        return db.collection('bookings').add({
            ...cleanPayload(payload),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
    },

    savePackageRequest(payload) {
        return db.collection('packageRequests').add({
            ...cleanPayload(payload),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
    },

    onAdminAuthStateChanged(callback) {
        return firebase.auth().onAuthStateChanged(callback);
    },

    logoutAdmin() {
        return firebase.auth().signOut();
    },

    // ============================================
    // General Collection Operations
    // ============================================

    async getCollectionDocuments(collectionName) {
        const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToIso(doc.data().createdAt)
        }));
    },

    updateCollectionDocument(collectionName, id, payload) {
        return db.collection(collectionName).doc(id).set({
            ...cleanPayload(payload),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    deleteCollectionDocument(collectionName, id) {
        return db.collection(collectionName).doc(id).delete();
    },

    // ============================================
    // Site Content Management (Works, Packages, Gifts)
    // ============================================

    async getSiteContent(docId) {
        const doc = await db.collection('siteContent').doc(docId).get();
        return doc.exists ? doc.data() : null;
    },

    saveSiteContent(docId, payload) {
        return db.collection('siteContent').doc(docId).set({
            ...payload,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    // ============================================
    // Client (CRM) Operations
    // ============================================

    async addClient(payload) {
        const token = generateUniqueToken();
        const clientRef = await db.collection('clients').add({
            ...cleanPayload(payload),
            token: token,
            amount: Number(payload.amount || 0),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: payload.status || 'booked'
        });
        return { id: clientRef.id, token: token, ...payload };
    },

    async getClients() {
        const snapshot = await db.collection('clients').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToIso(doc.data().createdAt)
        }));
    },

    async getClientByTokenAndPhone(token, phone) {
        const normalizedPhone = normalizePhone(phone);
        const snapshot = await db.collection('clients')
            .where('token', '==', token)
            .get();

        const matchingClients = snapshot.docs.filter(doc => normalizePhone(doc.data().phone) === normalizedPhone);

        if (matchingClients.length > 0) {
            return { id: matchingClients[0].id, ...matchingClients[0].data() };
        }
        return null;
    },

    // ============================================
    // Client Gallery Operations
    // ============================================

    async uploadClientGalleryImage(clientId, file) {
        const storageRef = firebase.storage().ref();
        const imageId = db.collection('clients').doc(clientId).collection('gallery').doc().id;
        const filePath = `client_galleries/${clientId}/${imageId}_${file.name}`;
        const fileRef = storageRef.child(filePath);
        await fileRef.put(file);
        const downloadURL = await fileRef.getDownloadURL();

        await db.collection('clients').doc(clientId).collection('gallery').doc(imageId).set({
            id: imageId,
            url: downloadURL,
            path: filePath,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { id: imageId, url: downloadURL };
    },

    async getClientGallery(clientId) {
        const snapshot = await db.collection('clients').doc(clientId).collection('gallery').orderBy('uploadedAt', 'asc').get();
        return {
            clientId: clientId,
            images: snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
        };
    },

    // ============================================
    // Client Selection Operations
    // ============================================

    async savePhotoSelection(clientId, selectedImageIds) {
        console.log(`Client ${clientId} selected photos:`, selectedImageIds);
        return db.collection('clientSelections').doc(clientId).set({
            clientId: clientId,
            selectedImageIds: selectedImageIds,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    async getClientSelections(clientId) {
        const doc = await db.collection('clientSelections').doc(clientId).get();
        return doc.exists ? doc.data() : null;
    },

};
