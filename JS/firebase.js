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

    async getAlbumPreviewClients() {
        const normalizeClient = (doc, collectionName) => {
            const data = doc.data();
            return {
                id: doc.id,
                collection: collectionName,
                name: data.name || data.clientName || 'Unnamed Client',
                phone: data.phone || data.phoneNumber || '',
                token: data.token || '',
                email: data.email || '',
                eventType: data.eventType || data.event || data.clientType || '',
                createdAt: timestampToIso(data.createdAt),
                ...data
            };
        };

        const [clientDetailsSnapshot, clientsSnapshot] = await Promise.all([
            db.collection('clientDetails').get().catch(() => null),
            db.collection('clients').orderBy('createdAt', 'desc').get().catch(() => null)
        ]);

        const clientDetails = clientDetailsSnapshot
            ? clientDetailsSnapshot.docs.map(doc => normalizeClient(doc, 'clientDetails'))
            : [];
        const clients = clientsSnapshot
            ? clientsSnapshot.docs.map(doc => normalizeClient(doc, 'clients'))
            : [];
        const merged = [...clientDetails, ...clients];
        const seen = new Set();

        return merged.filter(client => {
            const key = client.token || `${normalizePhone(client.phone)}:${client.name}`;
            if (!client.token || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    },

    getClient(id) {
        return db.collection('clients').doc(id).get().then(doc => doc.exists
            ? { id: doc.id, ...doc.data(), createdAt: timestampToIso(doc.data().createdAt) }
            : null
        );
    },

    async getClientByTokenAndPhone(token, phone) {
        const normalizedPhone = normalizePhone(phone);
        const [clientsSnapshot, clientDetailsSnapshot] = await Promise.all([
            db.collection('clients').where('token', '==', token).get().catch(() => null),
            db.collection('clientDetails').where('token', '==', token).get().catch(() => null)
        ]);
        const docs = [
            ...(clientsSnapshot ? clientsSnapshot.docs.map(doc => ({ doc, collection: 'clients' })) : []),
            ...(clientDetailsSnapshot ? clientDetailsSnapshot.docs.map(doc => ({ doc, collection: 'clientDetails' })) : [])
        ];
        const matchingClients = docs.filter(item => {
            const data = item.doc.data();
            return normalizePhone(data.phone || data.phoneNumber) === normalizedPhone;
        });

        if (matchingClients.length > 0) {
            const match = matchingClients[0];
            return { id: match.doc.id, collection: match.collection, ...match.doc.data() };
        }
        return null;
    },

    // ============================================
    // Client Gallery Operations
    // ============================================

    async uploadClientGalleryImage(clientId, file, client = {}) {
        const storageRef = firebase.storage().ref();
        const collectionName = client.collection || 'clients';
        const clientToken = client.token || '';
        const imageId = db.collection(collectionName).doc(clientId).collection('gallery').doc().id;
        const filePath = `client_galleries/${clientToken || clientId}/${imageId}_${file.name}`;
        const fileRef = storageRef.child(filePath);
        await fileRef.put(file);
        const downloadURL = await fileRef.getDownloadURL();

        await db.collection(collectionName).doc(clientId).collection('gallery').doc(imageId).set({
            id: imageId,
            url: downloadURL,
            path: filePath,
            token: clientToken,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection(collectionName).doc(clientId).set({
            galleryStatus: 'uploaded',
            galleryUploadedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { id: imageId, url: downloadURL };
    },

    async getClientGallery(clientId, collectionName = 'clients') {
        const snapshot = await db.collection(collectionName).doc(clientId).collection('gallery').orderBy('uploadedAt', 'asc').get();
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

    async savePhotoSelection(clientId, selectedImageIds, collectionName = 'clients') {
        console.log(`Client ${clientId} selected photos:`, selectedImageIds);
        const payload = {
            clientId: clientId,
            collection: collectionName,
            selectedImageIds: selectedImageIds,
            selectedCount: selectedImageIds.length,
            status: 'submitted',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('clientSelections').doc(clientId).set(payload, { merge: true });
        await db.collection(collectionName).doc(clientId).set({
            galleryStatus: 'selection-submitted',
            selectionSubmittedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return payload;
    },

    async getClientSelections(clientId) {
        const doc = await db.collection('clientSelections').doc(clientId).get();
        return doc.exists ? { id: doc.id, ...doc.data(), submittedAt: timestampToIso(doc.data().submittedAt) } : null;
    },

    updateClientGalleryStatus(client, payload) {
        if (!client || !client.id) return Promise.resolve();
        const updates = {
            ...payload,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const writes = [
            db.collection(client.collection || 'clients').doc(client.id).set(updates, { merge: true })
        ];

        if (payload.galleryStatus === 'viewed') {
            writes.push(db.collection('clientSelections').doc(client.id).set({
                clientId: client.id,
                collection: client.collection || 'clients',
                token: client.token || '',
                viewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'viewed'
            }, { merge: true }));
        }

        return Promise.all(writes);
    },

    markSelectionStarted(client, selectedImageIds = []) {
        if (!client || !client.id) return Promise.resolve();
        return db.collection('clientSelections').doc(client.id).set({
            clientId: client.id,
            collection: client.collection || 'clients',
            token: client.token || '',
            status: 'started',
            selectedImageIds,
            selectedCount: selectedImageIds.length,
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    watchClientSelection(clientId, callback) {
        return db.collection('clientSelections').doc(clientId).onSnapshot(doc => {
            callback(doc.exists ? { id: doc.id, ...doc.data(), submittedAt: timestampToIso(doc.data().submittedAt) } : null);
        });
    },

    // ============================================
    // Album Preview Operations
    // ============================================

    async uploadAlbumPreviewPdf(client, file) {
        if (!client || !client.token) {
            throw new Error('Client token is required for album preview upload.');
        }
        if (!file || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || ''))) {
            throw new Error('Only PDF files can be uploaded.');
        }

        const storageRef = firebase.storage().ref();
        const filePath = `album-previews/${client.token}/album.pdf`;
        const fileRef = storageRef.child(filePath);
        await fileRef.put(file, { contentType: 'application/pdf' });
        const pdfURL = await fileRef.getDownloadURL();
        const payload = {
            clientName: client.name || client.clientName || 'Unnamed Client',
            phoneNumber: client.phone || client.phoneNumber || '',
            token: client.token,
            pdfURL,
            storagePath: filePath,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('albumPreviews').doc(client.token).set(payload, { merge: true });
        return {
            ...payload,
            createdAt: new Date().toISOString()
        };
    },

    async getAlbumPreviewByTokenAndPhone(token, phone) {
        const normalizedPhone = normalizePhone(phone);
        const doc = await db.collection('albumPreviews').doc(String(token || '').trim()).get();
        if (!doc.exists) return null;

        const data = doc.data();
        if (normalizePhone(data.phoneNumber) !== normalizedPhone) {
            return null;
        }

        return {
            id: doc.id,
            ...data,
            createdAt: timestampToIso(data.createdAt)
        };
    },

};
