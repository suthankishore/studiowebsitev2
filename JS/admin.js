
function v2DeepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function v2CurrencyToNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const parsed = String(value).replace(/[^0-9.]/g, '');
    return parsed ? Number(parsed) : 0;
}

function v2FormatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function v2EscapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function v2LoadSiteContent(docId, fallbackValue) {
    try {
        const saved = await window.v2Firebase.getSiteContent(docId);
        if (!saved) {
            return v2DeepClone(fallbackValue);
        }
        return saved;
    } catch (error) {
        console.error(`Could not load ${docId} content:`, error);
        return v2DeepClone(fallbackValue);
    }
}

function v2NormalizeLead(item) {
    return {
        id: item.id,
        collection: item.collection,
        name: item.name || 'Unknown',
        phone: item.phone || '',
        email: item.email || '',
        eventType: item.eventType || item.event || item.clientType || 'General',
        eventDate: item.eventDate || item.date || '',
        status: item.status || 'new',
        amount: Number(item.amount || 0),
        notes: item.notes || item.message || '',
        source: item.source || item.collection,
        createdAt: item.createdAt || '',
        timeSlot: item.timeSlot || '',
        services: Array.isArray(item.services) ? item.services : []
    };
}

function v2CreateWorksItemRow(item = {}) {
    return `
        <div class="admin-repeat-card" data-work-item>
            <div class="admin-repeat-header">
                <strong>Work Item</strong>
                <button type="button" class="admin-mini-button admin-remove-button" data-remove-work-item>Remove</button>
            </div>
            <div class="admin-grid">
                <label class="admin-field admin-field-full">
                    <span>Image / Video Path</span>
                    <input type="text" data-work-key="src" value="${v2EscapeHtml(item.src || '')}" placeholder="../Assets/videos/example.mp4 or https://...">
                </label>
                <label class="admin-field admin-field-full">
                    <span>Thumbnail Image Path (For Videos - Optional)</span>
                    <input type="text" data-work-key="poster" value="${v2EscapeHtml(item.poster || '')}" placeholder="../Assets/images/thumbnail.jpg">
                </label>
            </div>
        </div>
    `;
}

function v2CreateStatRow(stat = {}) {
    return `
        <div class="admin-repeat-card" data-stat-item>
            <div class="admin-repeat-header">
                <strong>Highlight Stat</strong>
                <button type="button" class="admin-mini-button admin-remove-button" data-remove-stat-item>Remove</button>
            </div>
            <div class="admin-grid admin-grid-2">
                <label class="admin-field">
                    <span>Value</span>
                    <input type="text" data-stat-key="value" value="${v2EscapeHtml(stat.value || '')}">
                </label>
                <label class="admin-field">
                    <span>Label</span>
                    <input type="text" data-stat-key="label" value="${v2EscapeHtml(stat.label || '')}">
                </label>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    const worksStats = document.getElementById('worksStats');
    const worksGallery = document.getElementById('worksGallery');
    const worksPhotoGallery = document.getElementById('worksPhotoGallery');
    const worksVideoGallery = document.getElementById('worksVideoGallery');
    const dashboardRoot = document.getElementById('adminDashboardRoot');
    const bookingsRoot = document.getElementById('adminBookingsRoot');
    const galleryUploadRoot = document.getElementById('adminGalleryUploadRoot');
    const selectionViewRoot = document.getElementById('adminSelectionViewRoot');
    const clientDetailsRoot = document.getElementById('adminClientDetailsRoot');
    const paymentTrackerRoot = document.getElementById('adminPaymentTrackerRoot');
    const worksEditorRoot = document.getElementById('adminWorksEditorRoot');
    const packagesEditorRoot = document.getElementById('adminPackagesEditorRoot');
    const giftsEditorRoot = document.getElementById('adminGiftsEditorRoot');
    const logoutButton = document.getElementById('adminLogout');

    if (paymentTrackerRoot && (!window.v2Firebase || !window.v2Firebase.onAdminAuthStateChanged)) {
        initAdminPaymentTracker();
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async function() {
            try {
                if (!window.v2Firebase || !window.v2Firebase.logoutAdmin) {
                    window.location.href = 'login.html';
                    return;
                }
                await window.v2Firebase.logoutAdmin();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Logout failed. Please try again.');
            }
        });
    }

    if (dashboardRoot || bookingsRoot || galleryUploadRoot || selectionViewRoot || clientDetailsRoot || paymentTrackerRoot || worksEditorRoot || packagesEditorRoot || giftsEditorRoot) {
        if (!window.v2Firebase || !window.v2Firebase.onAdminAuthStateChanged) {
            return;
        }

        window.v2Firebase.onAdminAuthStateChanged(function(user) {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            if (dashboardRoot) {
                initAdminDashboard();
            }

            if (bookingsRoot) {
                initAdminBookings();
            }

            if (galleryUploadRoot) {
                initAdminGalleryUpload();
            }

            if (selectionViewRoot) {
                initAdminSelectionView();
            }

            if (clientDetailsRoot) {
                initAdminClientDetails();
            }

            if (paymentTrackerRoot) {
                initAdminPaymentTracker();
            }

            if (worksEditorRoot) {
                initAdminWorksEditor();
            }

            if (packagesEditorRoot) {
                initAdminPackagesEditor();
            }

            if (giftsEditorRoot) {
                initAdminGiftsEditor();
            }


        });
    }
});

async function initAdminDashboard() {
    const totalClientsEl = document.getElementById('dashboardTotalClients');
    const totalLeadsEl = document.getElementById('dashboardTotalLeads');
    const expectedSalesEl = document.getElementById('dashboardExpectedSales');
    const pendingEl = document.getElementById('dashboardPending');
    const activityEl = document.getElementById('dashboardActivity');

    try {
        const [bookings, packageRequests, manualClients] = await Promise.all([
            window.v2Firebase.getCollectionDocuments('bookings'),
            window.v2Firebase.getCollectionDocuments('packageRequests'),
            window.v2Firebase.getCollectionDocuments('clients')
        ]);

        const allLeads = [
            ...bookings.map(item => v2NormalizeLead({ ...item, collection: 'bookings' })),
            ...packageRequests.map(item => v2NormalizeLead({ ...item, collection: 'packageRequests' })),
            ...manualClients.map(item => v2NormalizeLead({ ...item, collection: 'clients' }))
        ];

        const confirmedStatuses = new Set(['confirmed', 'booked', 'paid', 'completed']);
        const pendingStatuses = new Set(['new', 'lead', 'follow-up', 'pending']);
        const totalClients = allLeads.filter(item => confirmedStatuses.has(String(item.status).toLowerCase())).length;
        const totalLeads = allLeads.length;
        const pendingCount = allLeads.filter(item => pendingStatuses.has(String(item.status).toLowerCase())).length;
        const expectedSales = allLeads.reduce((sum, item) => sum + Number(item.amount || 0), 0);

        totalClientsEl.textContent = totalClients;
        totalLeadsEl.textContent = totalLeads;
        expectedSalesEl.textContent = `Rs ${expectedSales.toLocaleString('en-IN')}`;
        pendingEl.textContent = pendingCount;

        const recentItems = allLeads
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 6);

        activityEl.innerHTML = recentItems.length
            ? recentItems.map(item => `
                <div class="admin-activity-item">
                    <strong>${v2EscapeHtml(item.name)}</strong>
                    <span>${v2EscapeHtml(item.eventType)} | ${v2EscapeHtml(item.status)}</span>
                    <small>${v2EscapeHtml(v2FormatDate(item.eventDate))}</small>
                </div>
            `).join('')
            : '<p class="admin-empty-state">No client activity yet.</p>';
    } catch (error) {
        console.error('Could not load dashboard data:', error);
        activityEl.innerHTML = '<p class="admin-empty-state">Unable to load dashboard right now.</p>';
    }
}

async function initAdminBookings() {
    const tableBody = document.getElementById('bookingsTableBody');
    const message = document.getElementById('bookingsMessage');
    const openDirectBookingButton = document.getElementById('openDirectBookingForm');
    const closeDirectBookingButton = document.getElementById('closeDirectBookingForm');
    const directBookingCard = document.getElementById('directBookingCard');
    const directBookingForm = document.getElementById('directBookingForm');
    const directBookingMessage = document.getElementById('directBookingMessage');
    const directBookingSubmit = document.getElementById('saveDirectBooking');
    let currentBookings = [];

    if (!tableBody) return;

    function showDirectBookingForm() {
        if (directBookingCard) {
            directBookingCard.hidden = false;
        }
    }

    function hideDirectBookingForm() {
        if (directBookingCard) {
            directBookingCard.hidden = true;
        }
        if (directBookingForm) {
            directBookingForm.reset();
        }
        if (directBookingMessage) {
            directBookingMessage.textContent = '';
        }
    }

    async function createBookedClient(payload) {
        return window.v2Firebase.addClient({
            source: payload.source || 'admin-direct-booking',
            bookingId: payload.bookingId || '',
            name: payload.name || '',
            email: payload.email || '',
            phone: payload.phone || '',
            eventType: payload.eventType || 'General',
            eventDate: payload.eventDate || '',
            location: payload.location || '',
            amount: Number(payload.amount || 0),
            status: 'booked'
        });
    }

    async function loadBookings() {
        try {
            const bookings = await window.v2Firebase.getCollectionDocuments('bookings');
            currentBookings = bookings;
            const pendingBookings = currentBookings.filter(booking => {
                const status = String(booking.status || 'new').toLowerCase();
                return !['declined', 'accepted', 'confirmed', 'booked', 'completed'].includes(status);
            });

            tableBody.innerHTML = pendingBookings.length
                ? pendingBookings.map(booking => `
                    <tr>
                        <td>${v2EscapeHtml(booking.name)}</td>
                        <td>${v2EscapeHtml(booking.eventType || booking.event || 'General')}</td>
                        <td>${v2EscapeHtml(v2FormatDate(booking.eventDate || booking.date))}</td>
                        <td>${v2EscapeHtml(booking.location || '-')}</td>
                        <td>${v2EscapeHtml(booking.phone || '-')}</td>
                        <td>${v2EscapeHtml(booking.email || '-')}</td>
                        <td>
                            <div class="admin-booking-actions">
                                <button type="button" class="admin-mini-button accept" data-booking-action="accept" data-id="${v2EscapeHtml(booking.id)}">Accept</button>
                                <button type="button" class="admin-mini-button decline" data-booking-action="decline" data-id="${v2EscapeHtml(booking.id)}">Decline</button>
                            </div>
                        </td>
                    </tr>
                `).join('')
                : '<tr><td colspan="7" class="admin-empty-row">No pending bookings.</td></tr>';
        } catch (error) {
            console.error('Could not load bookings:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="admin-empty-row">Unable to load bookings.</td></tr>';
        }
    }

    tableBody.addEventListener('click', async function(event) {
        const button = event.target.closest('[data-booking-action]');
        if (!button) return;

        const id = button.getAttribute('data-id');
        const action = button.getAttribute('data-booking-action');
        const row = button.closest('tr');
        const booking = currentBookings.find(item => item.id === id);
        button.disabled = true;
        button.textContent = action === 'accept' ? 'Accepting...' : 'Declining...';

        try {
            if (action === 'accept') {
                if (!booking) {
                    throw new Error('Booking details were not found.');
                }

                const client = await createBookedClient({
                    bookingId: id,
                    source: 'accepted-booking',
                    name: booking ? booking.name : '',
                    email: booking ? booking.email : '',
                    phone: booking ? booking.phone : '',
                    eventType: booking ? (booking.eventType || booking.event || 'General') : 'General',
                    eventDate: booking ? (booking.eventDate || booking.date || '') : '',
                    location: booking ? (booking.location || '') : '',
                    amount: booking ? Number(booking.amount || 0) : 0,
                    status: 'booked'
                });

                await window.v2Firebase.updateCollectionDocument('bookings', id, {
                    status: 'booked',
                    clientId: client.id,
                    token: client.token
                });

                if (message) {
                    message.textContent = `Booking accepted. Token created: ${client.token}`;
                }

                window.location.href = `client-details.html?clientId=${encodeURIComponent(client.id)}`;
                return;
            }

            await window.v2Firebase.updateCollectionDocument('bookings', id, {
                status: 'declined'
            });

            if (message) {
                message.textContent = 'Booking declined.';
            }
            row.remove();
            if (!tableBody.querySelector('tr')) {
                tableBody.innerHTML = '<tr><td colspan="7" class="admin-empty-row">No pending bookings.</td></tr>';
            }
        } catch (error) {
            console.error('Could not update booking:', error);
            if (message) {
                message.textContent = 'Could not update this booking right now.';
            }
            button.disabled = false;
            button.textContent = action === 'accept' ? 'Accept' : 'Decline';
        }
    });

    if (openDirectBookingButton) {
        openDirectBookingButton.addEventListener('click', showDirectBookingForm);
    }

    if (closeDirectBookingButton) {
        closeDirectBookingButton.addEventListener('click', hideDirectBookingForm);
    }

    if (directBookingForm) {
        directBookingForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            if (!directBookingForm.checkValidity()) {
                directBookingForm.reportValidity();
                return;
            }

            const formData = new FormData(directBookingForm);

            if (directBookingSubmit) {
                directBookingSubmit.disabled = true;
                directBookingSubmit.textContent = 'Booking...';
            }

            try {
                const client = await createBookedClient({
                    source: 'admin-direct-booking',
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    eventType: formData.get('eventType'),
                    eventDate: formData.get('eventDate'),
                    location: formData.get('location'),
                    amount: formData.get('amount')
                });

                if (directBookingMessage) {
                    directBookingMessage.textContent = `Booked. Token created: ${client.token}`;
                }

                window.location.href = `client-details.html?clientId=${encodeURIComponent(client.id)}`;
            } catch (error) {
                console.error('Could not create direct booking:', error);
                if (directBookingMessage) {
                    directBookingMessage.textContent = 'Could not create this booking right now.';
                }
            } finally {
                if (directBookingSubmit) {
                    directBookingSubmit.disabled = false;
                    directBookingSubmit.textContent = 'Book Now';
                }
            }
        });
    }

    loadBookings();
}

async function initAdminGalleryUpload() {
    const form = document.getElementById('clientGalleryUploadForm');
    const clientSelect = document.getElementById('clientSelect');
    const fileInput = document.getElementById('galleryImages');
    const previewGrid = document.getElementById('imagePreviews');
    const message = document.getElementById('galleryUploadMessage');
    const uploadButton = document.getElementById('uploadGalleryBtn');

    if (!form || !clientSelect || !fileInput) return;

    try {
        const clients = await window.v2Firebase.getClients();
        clientSelect.innerHTML = '<option value="">-- Select a client --</option>' + clients.map(client => `
            <option value="${v2EscapeHtml(client.id)}">${v2EscapeHtml(client.name || 'Unnamed Client')} - ${v2EscapeHtml(client.phone || client.email || 'No contact')}</option>
        `).join('');
    } catch (error) {
        console.error('Could not load clients for gallery upload:', error);
        if (message) {
            message.textContent = 'Unable to load clients right now.';
        }
    }

    fileInput.addEventListener('change', function() {
        const files = Array.from(fileInput.files || []);
        if (!previewGrid) return;

        previewGrid.innerHTML = files.map(file => `
            <div class="gallery-preview-item">
                <img src="${v2EscapeHtml(URL.createObjectURL(file))}" alt="${v2EscapeHtml(file.name)}">
            </div>
        `).join('');
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const clientId = clientSelect.value;
        const files = Array.from(fileInput.files || []);

        if (!clientId || !files.length) {
            if (message) {
                message.textContent = 'Select a client and at least one image.';
            }
            return;
        }

        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';
        }

        try {
            for (const file of files) {
                await window.v2Firebase.uploadClientGalleryImage(clientId, file);
            }
            form.reset();
            if (previewGrid) {
                previewGrid.innerHTML = '';
            }
            if (message) {
                message.textContent = 'Gallery uploaded successfully.';
            }
        } catch (error) {
            console.error('Could not upload gallery:', error);
            if (message) {
                message.textContent = 'Could not upload gallery right now.';
            }
        } finally {
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Gallery';
            }
        }
    });
}

async function initAdminSelectionView() {
    const clientSelect = document.getElementById('clientSelect');
    const previewGrid = document.getElementById('selectedImagePreviews');
    const noSelectionMessage = document.getElementById('noSelectionMessage');
    const downloadButton = document.getElementById('downloadFullQualityBtn');
    const message = document.getElementById('selectionViewMessage');
    let selectedImages = [];

    if (!clientSelect || !previewGrid) return;

    function renderSelectedImages(images) {
        selectedImages = images;
        const noImages = images.length === 0;
        if (noSelectionMessage) {
            noSelectionMessage.classList.toggle('is-visible', noImages);
        }
        if (downloadButton) {
            downloadButton.disabled = noImages;
        }

        previewGrid.innerHTML = noImages
            ? '<p id="noSelectionMessage" class="admin-empty-state is-visible">No selections found for this client.</p>'
            : images.map(image => `
                <a class="gallery-preview-item" href="${v2EscapeHtml(image.url)}" target="_blank" rel="noopener">
                    <img src="${v2EscapeHtml(image.url)}" alt="Selected client image">
                </a>
            `).join('');
    }

    async function loadSelection(clientId) {
        if (!clientId) {
            renderSelectedImages([]);
            return;
        }

        try {
            const [selection, gallery] = await Promise.all([
                window.v2Firebase.getClientSelections(clientId),
                window.v2Firebase.getClientGallery(clientId)
            ]);
            const selectedIds = new Set(selection && Array.isArray(selection.selectedImageIds) ? selection.selectedImageIds : []);
            const images = gallery.images.filter(image => selectedIds.has(image.id));
            renderSelectedImages(images);
        } catch (error) {
            console.error('Could not load client selections:', error);
            renderSelectedImages([]);
            if (message) {
                message.textContent = 'Unable to load selections right now.';
            }
        }
    }

    try {
        const clients = await window.v2Firebase.getClients();
        clientSelect.innerHTML = '<option value="">-- Select a client --</option>' + clients.map(client => `
            <option value="${v2EscapeHtml(client.id)}">${v2EscapeHtml(client.name || 'Unnamed Client')} - ${v2EscapeHtml(client.phone || client.email || 'No contact')}</option>
        `).join('');
    } catch (error) {
        console.error('Could not load clients for selections:', error);
        if (message) {
            message.textContent = 'Unable to load clients right now.';
        }
    }

    clientSelect.addEventListener('change', function() {
        loadSelection(clientSelect.value);
    });

    if (downloadButton) {
        downloadButton.addEventListener('click', function() {
            selectedImages.forEach(image => {
                window.open(image.url, '_blank', 'noopener');
            });
        });
    }
}

async function initAdminClientDetails() {
    const selectedCard = document.getElementById('clientDetailsSelectedCard');
    const highlight = document.getElementById('clientDetailsHighlight');
    const tableBody = document.getElementById('clientDetailsTableBody');
    const message = document.getElementById('clientDetailsMessage');
    const params = new URLSearchParams(window.location.search);
    const selectedClientId = params.get('clientId');

    if (!highlight || !tableBody) return;

    function clientDate(client) {
        return client.eventDate || client.date || '';
    }

    function clientEvent(client) {
        return client.eventType || client.event || client.clientType || 'General';
    }

    function renderHighlight(client) {
        if (!client) {
            if (selectedCard) {
                selectedCard.hidden = true;
            }
            highlight.innerHTML = '<p class="admin-empty-state">Select a booked client from the table below.</p>';
            return;
        }

        if (selectedCard) {
            selectedCard.hidden = false;
        }

        highlight.innerHTML = `
            <div class="admin-stat-grid">
                <div class="admin-stat-card">
                    <p>Name</p>
                    <strong>${v2EscapeHtml(client.name || '-')}</strong>
                </div>
                <div class="admin-stat-card">
                    <p>Token</p>
                    <strong>${v2EscapeHtml(client.token || '-')}</strong>
                </div>
                <div class="admin-stat-card">
                    <p>Status</p>
                    <strong>${v2EscapeHtml(client.status || 'booked')}</strong>
                </div>
                <div class="admin-stat-card">
                    <p>Event Date</p>
                    <strong>${v2EscapeHtml(v2FormatDate(clientDate(client)))}</strong>
                </div>
            </div>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <tbody>
                        <tr><th>Mail</th><td>${v2EscapeHtml(client.email || '-')}</td></tr>
                        <tr><th>Phone</th><td>${v2EscapeHtml(client.phone || '-')}</td></tr>
                        <tr><th>Event</th><td>${v2EscapeHtml(clientEvent(client))}</td></tr>
                        <tr><th>Location</th><td>${v2EscapeHtml(client.location || '-')}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderTable(clients) {
        tableBody.innerHTML = clients.length
            ? clients.map(client => `
                <tr class="${client.id === selectedClientId ? 'is-selected' : ''}">
                    <td>${v2EscapeHtml(client.name || '-')}</td>
                    <td>${v2EscapeHtml(client.email || '-')}</td>
                    <td>${v2EscapeHtml(client.phone || '-')}</td>
                    <td>${v2EscapeHtml(clientEvent(client))}</td>
                    <td>${v2EscapeHtml(v2FormatDate(clientDate(client)))}</td>
                    <td>${v2EscapeHtml(client.location || '-')}</td>
                    <td>${v2EscapeHtml(client.token || '-')}</td>
                    <td>${v2EscapeHtml(client.status || 'booked')}</td>
                    <td>
                        <a class="admin-mini-button" href="client-details.html?clientId=${encodeURIComponent(client.id)}">View</a>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="9" class="admin-empty-row">No booked clients yet.</td></tr>';
    }

    try {
        const clients = await window.v2Firebase.getClients();
        const bookedClients = clients.filter(client => String(client.status || '').toLowerCase() === 'booked');
        const selectedClient = selectedClientId
            ? bookedClients.find(client => client.id === selectedClientId)
            : null;

        renderHighlight(selectedClient);
        renderTable(bookedClients);

        if (message && selectedClient && selectedClient.token) {
            message.textContent = `Client token: ${selectedClient.token}`;
        } else if (message) {
            message.textContent = '';
        }
    } catch (error) {
        console.error('Could not load client details:', error);
        highlight.innerHTML = '<p class="admin-empty-state">Unable to load client details right now.</p>';
        tableBody.innerHTML = '<tr><td colspan="9" class="admin-empty-row">Unable to load clients.</td></tr>';
    }
}

async function initAdminPaymentTracker() {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId') || '';
    let client = {
        id: clientId,
        token: params.get('token') || '-',
        name: params.get('name') || '-',
        phone: params.get('phone') || '-',
        eventType: params.get('event') || '-',
        eventDate: params.get('date') || '',
        amount: Number(params.get('total') || 0)
    };
    let totalAmount = Number(client.amount || 0);
    let payments = [];

    const elements = {
        token: document.getElementById('paymentClientToken'),
        name: document.getElementById('paymentClientName'),
        phone: document.getElementById('paymentClientPhone'),
        event: document.getElementById('paymentClientEvent'),
        date: document.getElementById('paymentClientDate'),
        total: document.getElementById('paymentTotalAmount'),
        paid: document.getElementById('paymentPaidAmount'),
        balance: document.getElementById('paymentBalanceAmount'),
        status: document.getElementById('paymentStatusBadge'),
        form: document.getElementById('paymentForm'),
        amountInput: document.getElementById('paymentAmountInput'),
        methodInput: document.getElementById('paymentMethodInput'),
        dateInput: document.getElementById('paymentDateInput'),
        historyBody: document.getElementById('paymentHistoryBody'),
        completeButton: document.getElementById('paymentCompleteButton'),
        message: document.getElementById('paymentTrackerMessage')
    };

    function getStorageKey() {
        return `v2StudioPayments:${client.id || client.token}`;
    }

    function loadPayments() {
        try {
            payments = JSON.parse(localStorage.getItem(getStorageKey()) || '[]');
        } catch (error) {
            console.error('Could not load client payments:', error);
            payments = [];
        }
    }

    function savePayments() {
        localStorage.setItem(getStorageKey(), JSON.stringify(payments));
    }

    async function loadClient() {
        if (!clientId || !window.v2Firebase || !window.v2Firebase.getClient) {
            return;
        }

        try {
            const savedClient = await window.v2Firebase.getClient(clientId);
            if (!savedClient) {
                setMessage('Client not found. Open Payment from Client Details.');
                return;
            }

            client = {
                ...client,
                ...savedClient,
                eventType: savedClient.eventType || savedClient.event || savedClient.clientType || client.eventType,
                eventDate: savedClient.eventDate || savedClient.date || client.eventDate,
                amount: Number(savedClient.amount || 0)
            };
            totalAmount = Number(client.amount || 0);
        } catch (error) {
            console.error('Could not load payment client:', error);
            setMessage('Unable to load this client. Open Payment from Client Details.');
        }
    }

    function formatMoney(value) {
        return `Rs ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function formatDisplayDate(value) {
        return v2FormatDate(value);
    }

    function getPaidAmount() {
        return payments.reduce((sum, payment) => sum + payment.amount, 0);
    }

    function getBalanceAmount() {
        return Math.max(totalAmount - getPaidAmount(), 0);
    }

    function getStatus() {
        const paidAmount = getPaidAmount();
        if (paidAmount <= 0) return 'Pending';
        if (getBalanceAmount() <= 0) return 'Paid';
        return 'Partial';
    }

    function renderClientInfo() {
        elements.token.textContent = client.token;
        elements.name.textContent = client.name;
        elements.phone.textContent = client.phone;
        elements.event.textContent = client.eventType;
        elements.date.textContent = formatDisplayDate(client.eventDate);
    }

    function renderSummary() {
        const paidAmount = getPaidAmount();
        const balanceAmount = getBalanceAmount();
        const status = getStatus();

        elements.total.textContent = formatMoney(totalAmount);
        elements.paid.textContent = formatMoney(paidAmount);
        elements.balance.textContent = formatMoney(balanceAmount);
        elements.status.textContent = status;
        elements.status.classList.toggle('is-partial', status === 'Partial');
        elements.status.classList.toggle('is-paid', status === 'Paid');
        elements.completeButton.disabled = totalAmount <= 0 || balanceAmount !== 0;
    }

    function renderHistory() {
        elements.historyBody.innerHTML = payments.length
            ? payments.map(payment => `
                <tr>
                    <td>${v2EscapeHtml(formatDisplayDate(payment.date))}</td>
                    <td>${v2EscapeHtml(formatMoney(payment.amount))}</td>
                    <td>${v2EscapeHtml(payment.method)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" class="payment-history__empty">No payments added yet.</td></tr>';
    }

    function renderPaymentTracker() {
        renderSummary();
        renderHistory();
    }

    function setMessage(text) {
        elements.message.textContent = text || '';
    }

    function addPayment(amount, method, date) {
        payments.push({ amount, method, date });
        savePayments();
        renderPaymentTracker();
    }

    await loadClient();
    loadPayments();
    elements.dateInput.value = today();
    renderClientInfo();
    renderPaymentTracker();

    if (!client.id) {
        setMessage('Open Payment from a booked client row to track that client.');
    } else if (totalAmount <= 0) {
        setMessage('This client has no total amount saved yet.');
    }

    elements.form.addEventListener('submit', function(event) {
        event.preventDefault();
        const amount = Number(elements.amountInput.value || 0);
        const balance = getBalanceAmount();

        if (amount <= 0) {
            setMessage('Enter a valid payment amount.');
            return;
        }

        if (amount > balance) {
            setMessage(`Amount cannot exceed balance ${formatMoney(balance)}.`);
            return;
        }

        addPayment(amount, elements.methodInput.value, elements.dateInput.value);
        elements.form.reset();
        elements.dateInput.value = today();
        setMessage('Payment added successfully.');
    });

    elements.completeButton.addEventListener('click', function() {
        if (getBalanceAmount() !== 0) return;
        setMessage('Payment marked as completed.');
        elements.completeButton.textContent = 'Completed';
        elements.completeButton.disabled = true;
    });
}

async function initAdminWorksEditor() {
    const editorRoot = document.getElementById('adminWorksEditorRoot');
    const worksItemsContainer = document.getElementById('editorWorksItems');
    const worksForm = document.getElementById('editorWorksForm');
    const worksMessage = document.getElementById('editorWorksMessage');
    const worksContent = await v2LoadSiteContent('works', { stats: V2_DEFAULT_WORKS_CONTENT.stats, items: [] }); // Fallback to default stats, empty items
    worksItemsContainer.innerHTML = worksContent.items.map(item => v2CreateWorksItemRow(item)).join('');

    document.getElementById('addWorksItem').addEventListener('click', function() {
        worksItemsContainer.insertAdjacentHTML('beforeend', v2CreateWorksItemRow({ src: '' }));
    });

    editorRoot.addEventListener('click', function(event) {
        if (event.target.matches('[data-remove-work-item]')) {
            event.target.closest('[data-work-item]').remove();
        }
    });

    worksForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const items = Array.from(worksItemsContainer.querySelectorAll('[data-work-item]')).map((row, index) => {
            const existingItem = worksContent.items[index] || {};
            const src = row.querySelector('[data-work-key="src"]').value.trim();
            const isVideo = /\.(mp4|webm|ogg)$/i.test(src);
        const posterElement = row.querySelector('[data-work-key="poster"]');
        const poster = posterElement ? posterElement.value.trim() : (existingItem.poster || '');

            return {
                ...existingItem,
                src,
            poster,
                type: src ? (existingItem.type || (isVideo ? 'video' : 'image')) : (existingItem.type || 'image'),
                title: existingItem.title || '',
                subtitle: existingItem.subtitle || '',
                alt: existingItem.alt || existingItem.title || ''
            };
        }).filter(item => item.src);

        try {
            await window.v2Firebase.saveSiteContent('works', { stats: worksContent.stats, items });
            worksMessage.textContent = 'Works content saved successfully.';
        } catch (error) {
            console.error('Could not save works content:', error);
            worksMessage.textContent = 'Could not save works content right now.';
        }
    });
}

async function initAdminPackagesEditor() {
    const packageSectionsContainer = document.getElementById('editorPackageSections');
    const packagesForm = document.getElementById('editorPackagesForm');
    const packagesMessage = document.getElementById('editorPackagesMessage');
    const resetButton = document.getElementById('resetPackagePrices');
    const packagesContent = v2MergePackageContent(await v2LoadSiteContent('packages', { sections: [] })); // Fallback to empty sections
    const originalSections = v2DeepClone(packagesContent.sections);

    renderPackageSections(packagesContent.sections);

    packagesForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        await savePackageSections(collectPackageSections());
    });

    resetButton.addEventListener('click', function() {
        renderPackageSections(originalSections);
        packagesMessage.textContent = 'Prices reset.';
    });

    packageSectionsContainer.addEventListener('input', function(event) {
        if (!event.target.matches('[data-card-key="price"]')) return;
        const row = event.target.closest('[data-package-card]');
        markRowChanged(row);
    });

    packageSectionsContainer.addEventListener('change', function(event) {
        if (!event.target.matches('[data-custom-toggle]')) return;

        const row = event.target.closest('[data-package-card]');
        const input = row.querySelector('[data-card-key="price"]');
        const steppers = row.querySelectorAll('[data-price-step]');

        if (event.target.checked) {
            input.type = 'text';
            input.value = 'Custom';
            input.classList.add('is-custom');
            steppers.forEach(button => {
                button.disabled = true;
            });
        } else {
            input.type = 'number';
            input.value = '';
            input.placeholder = '₹15000';
            input.min = '0';
            input.step = '500';
            input.classList.remove('is-custom');
            steppers.forEach(button => {
                button.disabled = false;
            });
        }

        markRowChanged(row);
    });

    packageSectionsContainer.addEventListener('click', async function(event) {
        const stepper = event.target.closest('[data-price-step]');
        const saveButton = event.target.closest('[data-save-package-section]');

        if (stepper) {
            const row = stepper.closest('[data-package-card]');
            const input = row.querySelector('[data-card-key="price"]');
            if (input.type === 'text') return;

            const step = Number(stepper.getAttribute('data-price-step'));
            const current = Number(input.value || 0);
            input.value = Math.max(0, current + step);
            markRowChanged(row);
        }

        if (saveButton) {
            const section = saveButton.closest('[data-package-section]');
            const payload = collectSingleSection(section);
            await savePackageSections([payload], saveButton);
        }
    });

    function renderPackageSections(sections) {
        packageSectionsContainer.innerHTML = sections.map(section => v2CreatePackagePricingSectionRow(section)).join(''); // This function is still needed for admin panel
    }

    function markRowChanged(row) {
        row.classList.add('is-dirty');
    }

    function collectSingleSection(sectionRow) {
        return {
            id: sectionRow.querySelector('[data-section-key="id"]').value.trim(),
            name: sectionRow.querySelector('[data-section-key="name"]').value.trim(),
            cards: Array.from(sectionRow.querySelectorAll('[data-package-card]')).map(cardRow => {
                const input = cardRow.querySelector('[data-card-key="price"]');
                const isCustom = cardRow.querySelector('[data-custom-toggle]').checked;
                return {
                    title: cardRow.querySelector('[data-card-key="title"]').value.trim(),
                    price: isCustom ? 'Custom' : `Rs ${String(input.value || '').trim()}`.replace(/^Rs\s*Rs\s*/i, 'Rs '),
                    premium: cardRow.querySelector('[data-card-key="premium"]').value === 'true',
                    features: cardRow.querySelector('[data-card-key="features"]').value
                        .split(',')
                        .map(item => item.trim())
                        .filter(Boolean)
                };
            }).filter(card => card.title)
        };
    }

    function collectPackageSections() {
        return Array.from(packageSectionsContainer.querySelectorAll('[data-package-section]'))
            .map(collectSingleSection)
            .filter(section => section.id);
    }

    async function savePackageSections(sections, sourceButton) {
        let hasError = false;

        sections.forEach(section => {
            section.cards.forEach(card => {
                if (!card.price || (!/^Custom$/i.test(card.price) && !v2CurrencyToNumber(card.price))) {
                    hasError = true;
                }
            });
        });

        if (hasError) {
            packagesMessage.textContent = 'Enter a valid price or use Custom.';
            return;
        }

        if (sourceButton) {
            sourceButton.disabled = true;
            sourceButton.textContent = 'Saving...';
        }

        try {
            const existing = v2MergePackageContent(await v2LoadSiteContent('packages', { sections: [] })); // Fallback to empty sections
            const nextSections = existing.sections.map(existingSection => {
                const updated = sections.find(section => section.id === existingSection.id);
                return updated || existingSection;
            });

            await window.v2Firebase.saveSiteContent('packages', { sections: nextSections });
            packagesMessage.textContent = sourceButton ? 'Card saved.' : 'All package prices saved.';
            packageSectionsContainer.querySelectorAll('.is-dirty').forEach(item => item.classList.remove('is-dirty'));
        } catch (error) {
            console.error('Could not save package content:', error);
            packagesMessage.textContent = 'Could not save package prices right now.';
        } finally {
            if (sourceButton) {
                sourceButton.disabled = false;
                sourceButton.textContent = 'Save';
            }
        }
    }
}

async function initAdminGiftsEditor() {
    const editorRoot = document.getElementById('adminGiftsEditorRoot');
    const giftsContainer = document.getElementById('editorGiftItems');
    const giftsForm = document.getElementById('editorGiftsForm');
    const giftsMessage = document.getElementById('editorGiftsMessage');
    const giftsContent = await v2LoadSiteContent('gifts', { items: [] }); // Fallback to empty items

    giftsContainer.innerHTML = giftsContent.items.map(item => v2CreateGiftRow(item)).join('');

    document.getElementById('addGiftItem').addEventListener('click', function() {
        giftsContainer.insertAdjacentHTML('beforeend', v2CreateGiftRow({}));
    });

    editorRoot.addEventListener('click', function(event) {
        if (event.target.matches('[data-remove-gift-item]')) {
            event.target.closest('[data-gift-item]').remove();
        }
    });

    giftsForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const items = Array.from(giftsContainer.querySelectorAll('[data-gift-item]')).map(row => ({
            title: row.querySelector('[data-gift-key="title"]').value.trim(),
            image: row.querySelector('[data-gift-key="image"]').value.trim(),
            description: row.querySelector('[data-gift-key="description"]').value.trim(),
            alt: row.querySelector('[data-gift-key="alt"]').value.trim()
        })).filter(item => item.title && item.image);

        try {
            await window.v2Firebase.saveSiteContent('gifts', { items });
            giftsMessage.textContent = 'Gift content saved successfully.';
        } catch (error) {
            console.error('Could not save gift content:', error);
            giftsMessage.textContent = 'Could not save gift content right now.';
        }
    });
}
