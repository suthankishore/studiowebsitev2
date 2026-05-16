// ============================================
// V2 CINEMATIC STUDIO - JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // ADMIN LOGIN AUTHENTICATION
    // ============================================
    const adminLoginForm = document.getElementById('adminLoginForm');

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const emailInput = document.getElementById('adminEmail');
            const passwordInput = document.getElementById('adminPassword');
            const errorMessage = document.getElementById('adminLoginError');
            const submitButton = document.getElementById('adminLoginButton');
            const originalButtonText = submitButton.textContent;

            if (errorMessage) {
                errorMessage.textContent = '';
            }

            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;

            try {
                await window.v2Firebase.loginAdmin(emailInput.value.trim(), passwordInput.value);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Admin login failed:', error);

                if (errorMessage) {
                    errorMessage.textContent = 'Invalid email or password. Please try again.';
                } else {
                    alert('Invalid email or password. Please try again.');
                }

                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }

    // ============================================
    // ADMIN CRM LOCAL STORAGE
    // ============================================
    const crmRoot = document.querySelector('.crm-admin-page');

    if (crmRoot) {
        const storageKey = 'v2StudioCrmClients';
        const openModalButton = document.getElementById('crmOpenModalButton');
        const closeModalButton = document.getElementById('crmCloseModalButton');
        const cancelButton = document.getElementById('crmCancelButton');
        const modal = document.getElementById('crmClientModal');
        const modalBackdrop = document.getElementById('crmModalBackdrop');
        const modalTitle = document.getElementById('crmModalTitle');
        const submitButton = document.getElementById('crmSubmitButton');
        const form = document.getElementById('crmClientForm');
        const tableBody = document.getElementById('crmClientsTableBody');
        const emptyState = document.getElementById('crmEmptyState');
        let clients = loadClients();
        let editingId = null;

        function loadClients() {
            try {
                return JSON.parse(localStorage.getItem(storageKey)) || [];
            } catch (error) {
                console.error('Could not load CRM clients:', error);
                return [];
            }
        }

        function saveClients() {
            localStorage.setItem(storageKey, JSON.stringify(clients));
        }

        function formatAmount(amount) {
            if (!amount) return '-';

            return Number(amount).toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            });
        }

        function statusClass(status) {
            return `crm-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
        }

        function setText(element, text) {
            element.textContent = text || '-';
        }

        function createIconButton(type, label) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `crm-action-button crm-${type}-button`;
            button.setAttribute('aria-label', label);
            button.dataset.action = type;

            if (type === 'edit') {
                button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>';
            } else {
                button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
            }

            return button;
        }

        function renderClients() {
            tableBody.textContent = '';
            emptyState.classList.toggle('is-visible', clients.length === 0);

            if (clients.length === 0) {
                return;
            }

            clients.forEach((client) => {
                const row = document.createElement('tr');

                const nameCell = document.createElement('td');
                setText(nameCell, client.name);

                const eventCell = document.createElement('td');
                setText(eventCell, client.eventType);

                const contactCell = document.createElement('td');
                contactCell.className = 'crm-contact-cell';
                contactCell.textContent = [client.phone, client.email].filter(Boolean).join(' / ') || '-';

                const dateCell = document.createElement('td');
                setText(dateCell, client.eventDate);

                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = `crm-status-badge ${statusClass(client.status)}`;
                statusBadge.textContent = client.status;
                statusCell.appendChild(statusBadge);

                const amountCell = document.createElement('td');
                amountCell.textContent = formatAmount(client.amount);

                const notesCell = document.createElement('td');
                notesCell.className = 'crm-notes-cell';
                notesCell.textContent = [client.location, client.notes].filter(Boolean).join(' - ') || '-';

                const actionsCell = document.createElement('td');
                const actions = document.createElement('div');
                actions.className = 'crm-actions';
                actions.append(createIconButton('edit', 'Edit client'), createIconButton('delete', 'Delete client'));
                actionsCell.appendChild(actions);

                row.dataset.id = client.id;
                row.append(nameCell, eventCell, contactCell, dateCell, statusCell, amountCell, notesCell, actionsCell);
                tableBody.appendChild(row);
            });
        }

        function getFormData() {
            const formData = new FormData(form);

            return {
                id: editingId || String(Date.now()),
                name: formData.get('name').trim(),
                phone: formData.get('phone').trim(),
                email: formData.get('email').trim(),
                eventType: formData.get('eventType').trim(),
                eventDate: formData.get('eventDate'),
                location: formData.get('location').trim(),
                status: formData.get('status'),
                amount: formData.get('amount'),
                notes: formData.get('notes').trim()
            };
        }

        function openModal(client) {
            editingId = client ? client.id : null;
            modalTitle.textContent = client ? 'Edit Client' : 'Add New Record';
            submitButton.textContent = client ? 'Update' : 'Submit';
            form.reset();

            if (client) {
                form.elements.name.value = client.name || '';
                form.elements.phone.value = client.phone || '';
                form.elements.email.value = client.email || '';
                form.elements.eventType.value = client.eventType || '';
                form.elements.eventDate.value = client.eventDate || '';
                form.elements.location.value = client.location || '';
                form.elements.status.value = client.status || 'Lead';
                form.elements.amount.value = client.amount || '';
                form.elements.notes.value = client.notes || '';
            }

            modal.hidden = false;
            form.elements.name.focus();
        }

        function closeModal() {
            modal.hidden = true;
            editingId = null;
            form.reset();
            modalTitle.textContent = 'Add New Record';
            submitButton.textContent = 'Submit';
        }

        openModalButton.addEventListener('click', () => openModal());
        closeModalButton.addEventListener('click', closeModal);
        cancelButton.addEventListener('click', closeModal);
        modalBackdrop.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hidden) {
                closeModal();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const client = getFormData();

            if (editingId) {
                clients = clients.map((item) => item.id === editingId ? client : item);
            } else {
                clients.push(client);
            }

            saveClients();
            renderClients();
            closeModal();
        });

        tableBody.addEventListener('click', (e) => {
            const actionButton = e.target.closest('[data-action]');
            if (!actionButton) return;

            const row = actionButton.closest('tr');
            const id = row.dataset.id;
            const client = clients.find((item) => item.id === id);

            if (!client) return;

            if (actionButton.dataset.action === 'edit') {
                openModal(client);
            }

            if (actionButton.dataset.action === 'delete') {
                clients = clients.filter((item) => item.id !== id);
                saveClients();
                renderClients();
            }
        });

        renderClients();
    }

    // ============================================
    // ADMIN FINANCE LOCAL STORAGE
    // ============================================
    const financeForm = document.getElementById('financeForm');

    if (financeForm) {
        const financeStorageKey = 'v2StudioFinanceRecords';
        const tableBody = document.getElementById('financeTableBody');
        const emptyState = document.getElementById('financeEmptyState');
        const message = document.getElementById('financeMessage');
        let financeRecords = loadFinanceRecords();

        function loadFinanceRecords() {
            try {
                return JSON.parse(localStorage.getItem(financeStorageKey)) || [];
            } catch (error) {
                console.error('Could not load finance records:', error);
                return [];
            }
        }

        function saveFinanceRecords() {
            localStorage.setItem(financeStorageKey, JSON.stringify(financeRecords));
        }

        function formatMoney(value) {
            const amount = Number(value || 0);
            return amount.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            });
        }

        function renderFinanceRecords() {
            tableBody.textContent = '';
            emptyState.classList.toggle('is-visible', financeRecords.length === 0);

            financeRecords.forEach(record => {
                const row = document.createElement('tr');
                row.dataset.id = record.id;

                const values = [
                    record.name,
                    record.email,
                    record.phone,
                    record.paymentMethod,
                    formatMoney(record.totalBalance)
                ];

                values.forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value || '-';
                    row.appendChild(cell);
                });

                const currentCell = document.createElement('td');
                const currentInput = document.createElement('input');
                currentInput.className = 'finance-current-input';
                currentInput.type = 'number';
                currentInput.min = '0';
                currentInput.step = '1';
                currentInput.value = record.currentPaid || 0;
                currentInput.dataset.currentInput = record.id;
                currentCell.appendChild(currentInput);
                row.appendChild(currentCell);

                const balanceCell = document.createElement('td');
                balanceCell.textContent = formatMoney(Number(record.totalBalance || 0) - Number(record.currentPaid || 0));
                row.appendChild(balanceCell);

                const actionsCell = document.createElement('td');
                const actions = document.createElement('div');
                actions.className = 'finance-actions';

                const saveButton = document.createElement('button');
                saveButton.type = 'button';
                saveButton.className = 'finance-action-button';
                saveButton.textContent = 'Save';
                saveButton.dataset.financeAction = 'save';

                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'finance-action-button finance-delete-button';
                deleteButton.textContent = 'Delete';
                deleteButton.dataset.financeAction = 'delete';

                actions.append(saveButton, deleteButton);
                actionsCell.appendChild(actions);
                row.appendChild(actionsCell);
                tableBody.appendChild(row);
            });
        }

        financeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!financeForm.checkValidity()) {
                financeForm.reportValidity();
                return;
            }

            const formData = new FormData(financeForm);
            financeRecords.push({
                id: String(Date.now()),
                name: formData.get('name').trim(),
                email: formData.get('email').trim(),
                phone: formData.get('phone').trim(),
                paymentMethod: formData.get('paymentMethod'),
                totalBalance: formData.get('totalBalance'),
                currentPaid: formData.get('currentPaid')
            });

            saveFinanceRecords();
            renderFinanceRecords();
            financeForm.reset();
            if (message) message.textContent = 'Finance record saved.';
        });

        tableBody.addEventListener('click', function(e) {
            const button = e.target.closest('[data-finance-action]');
            if (!button) return;

            const row = button.closest('tr');
            const id = row.dataset.id;

            if (button.dataset.financeAction === 'save') {
                const currentInput = row.querySelector('[data-current-input]');
                financeRecords = financeRecords.map(record => record.id === id
                    ? { ...record, currentPaid: currentInput.value }
                    : record
                );
                saveFinanceRecords();
                renderFinanceRecords();
                if (message) message.textContent = 'Current payment updated.';
            }

            if (button.dataset.financeAction === 'delete') {
                financeRecords = financeRecords.filter(record => record.id !== id);
                saveFinanceRecords();
                renderFinanceRecords();
                if (message) message.textContent = 'Finance record deleted.';
            }
        });

        renderFinanceRecords();
    }

    // ============================================
    // WORKS DOWNLOAD TOKEN LOOKUP - 3 Step Flow
    // ============================================
    const startSection = document.getElementById('startSection');
    const formSection = document.getElementById('formSection');
    const downloadSection = document.getElementById('downloadSection');
    const worksDownloadBtn = document.getElementById('worksDownloadBtn');
    const worksDownloadForm = document.getElementById('worksDownloadForm');
    const worksDownloadLink = document.getElementById('worksDownloadLink');
    const worksDownloadMessage = document.getElementById('worksDownloadMessage');

    function showForm() {
        if (startSection) startSection.style.display = 'none';
        if (formSection) formSection.style.display = 'block';
    }

    function showDownload(url) {
        if (formSection) formSection.style.display = 'none';
        if (downloadSection) {
            downloadSection.style.display = 'block';
            if (worksDownloadLink) {
                worksDownloadLink.href = url;
            }
        }
    }

    if (worksDownloadBtn) {
        worksDownloadBtn.addEventListener('click', showForm);
    }

    if (worksDownloadForm) {
        const financeStorageKey = 'v2StudioFinanceRecords';

        function normalizePhone(phone) {
            return String(phone || '').replace(/\D/g, '');
        }

        worksDownloadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(worksDownloadForm);
            const token = formData.get('token').trim();
            const phone = normalizePhone(formData.get('phone'));
            const records = JSON.parse(localStorage.getItem(financeStorageKey) || '[]');
            const match = records.find(record =>
                record.token === token && normalizePhone(record.phone) === phone && record.workUrl
            );

            if (!match) {
                if (worksDownloadMessage) {
                    worksDownloadMessage.textContent = 'Invalid token or phone number. Please check the details sent by admin.';
                }
                return;
            }

            showDownload(match.workUrl);
        });
    }

    
    // ============================================
    // NAVBAR SCROLL EFFECT
    // ============================================
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    let lastScrollY = window.scrollY;
    
    // Change navbar background on scroll
    const handleNavbarState = function() {
        if (!navbar) return;

        const currentScrollY = window.scrollY;
        const isScrollingDown = currentScrollY > lastScrollY;

        if (currentScrollY > 50 && isScrollingDown) {
            navbar.classList.add('scrolled');
        }

        if (currentScrollY <= 50 || !isScrollingDown) {
            navbar.classList.remove('scrolled');
        }
        
        // Update active nav link based on scroll position
        updateActiveNavLink();
        lastScrollY = currentScrollY;
    };

    if (navbar) {
        window.addEventListener('scroll', handleNavbarState);
        handleNavbarState();
    }
    
    // ============================================
    // MOBILE HAMBURGER MENU
    // ============================================
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navMenuLinks = document.querySelectorAll('.nav-link, .nav-book-btn');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Close menu when clicking a nav link
    navMenuLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });
    
    // ============================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const offset = 80; // Account for fixed navbar
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ============================================
    // UPDATE ACTIVE NAV LINK ON SCROLL
    // ============================================
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // ============================================
    // HERO VIDEO FALLBACK
    // ============================================
    const heroVideo = document.getElementById('heroVideo');
    
    if (heroVideo) {
        heroVideo.addEventListener('error', function() {
            const heroSection = document.querySelector('.hero');
            // Fallback is handled via CSS background image now.
        });
    }

    // ============================================
    // ENQUIRY FORM SUBMISSION
    // ============================================
    const enquiryForm = document.getElementById('enquiryForm');
    
    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            const submitBtn = this.querySelector('button[type="submit"]');
            const successMessage = document.getElementById('enquirySuccess');
            const originalText = submitBtn.textContent;

            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            try {
                await window.v2Firebase.saveBooking({
                    source: 'home-enquiry-form',
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    eventType: data.service,
                    message: data.message || ''
                });
            } catch (error) {
                console.error('Could not save booking to Firebase:', error);
            }

            const enquiryDetails = [
                'Hi V2 Cinematic Studio,',
                '',
                'I want to enquire about your service.',
                '',
                `Name: ${data.name}`,
                `Phone: ${data.phone}`,
                `Mail: ${data.email}`,
                `Service: ${data.service}`,
                `Message: ${data.message}`
            ].join('\n');

            const whatsappUrl = `https://wa.me/919384978114?text=${encodeURIComponent(enquiryDetails)}`;

            submitBtn.textContent = 'Redirecting...';
            submitBtn.disabled = true;

            window.open(whatsappUrl, '_blank', 'noopener');

            if (successMessage) {
                successMessage.textContent = 'Thank you! Redirecting to WhatsApp...';
            }

            setTimeout(function() {
                enquiryForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                if(successMessage) successMessage.textContent = '';
            }, 1800);
        });
    }
    
    // ============================================
    // DEDICATED BOOKING PAGE FORM SUBMISSION
    // ============================================
    const dedicatedForm = document.getElementById('dedicatedBookingForm');
    
    if (dedicatedForm) {
        dedicatedForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            const submitBtn = this.querySelector('button[type="submit"]');
            const successMessage = document.getElementById('dedicatedBookingSuccess');
            const originalText = submitBtn.textContent;

            if (!this.checkValidity()) {
                this.reportValidity();
                return;
            }

            try {
                await window.v2Firebase.saveBooking({
                    source: 'dedicated-booking-page',
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    eventType: data.eventType,
                    eventDate: data.eventDate,
                    location: data.location,
                    message: data.message || ''
                });
            } catch (error) {
                console.error('Could not save booking to Firebase:', error);
            }

            const bookingDetails = [
                'New Booking Request 📅',
                '',
                `*Name:* ${data.name}`,
                `*Email:* ${data.email}`,
                `*Phone:* ${data.phone}`,
                `*Event Type:* ${data.eventType}`,
                `*Date:* ${data.eventDate}`,
                `*Location:* ${data.location}`,
                `*Details:* ${data.message || 'None provided'}`
            ].join('\n');

            const whatsappUrl = `https://wa.me/919384978114?text=${encodeURIComponent(bookingDetails)}`;

            submitBtn.textContent = 'Redirecting...';
            submitBtn.disabled = true;

            window.open(whatsappUrl, '_blank', 'noopener');

            if (successMessage) {
                successMessage.textContent = 'Thank you! Redirecting to WhatsApp to complete your booking...';
            }

            setTimeout(function() {
                dedicatedForm.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                if (successMessage) successMessage.textContent = '';
            }, 3000);
        });
    }

    // ============================================
    // PREMIUM MOUSE-OVER GLOW
    // ============================================
    const hoverGlowItems = document.querySelectorAll('.service-card, .contact-item, .contact-form, .premium-booking-card');

    hoverGlowItems.forEach(item => {
        item.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.style.setProperty('--mx', `${x}px`);
            this.style.setProperty('--my', `${y}px`);
        });
    });
    
    // ============================================
    // SCROLL REVEAL ANIMATION
    // ============================================
    const revealElements = document.querySelectorAll('.service-card, .contact-form, .contact .section-header, .gift-card, .custom-design-content, .portfolio-item, .portfolio .section-header, .service-detail-section');
    
    const revealOnScroll = function() {
        const windowHeight = window.innerHeight;
        const elementVisible = 150;
        
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            
            if (elementTop < windowHeight - elementVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };
    
    // Set initial state for reveal elements
    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
    
    // ============================================
    // PREVENT SCROLL ON MOBILE MENU OPEN
    // ============================================
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (navMenu && hamburger && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ============================================
    // PACKAGE TOGGLE FUNCTIONALITY
    // ============================================
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const packageSections = document.querySelectorAll('.package-section');

    // Function to switch packages
    function switchPackage(packageName) {
        // Remove active class from all toggle buttons
        toggleBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        const activeBtn = document.querySelector(`[data-package="${packageName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Hide all package sections
        packageSections.forEach(section => {
            section.classList.remove('active');
        });

        // Show the selected package section
        const selectedSection = document.getElementById(packageName);
        if (selectedSection) {
            selectedSection.classList.add('active');
        }
    }

    // Add click event to toggle buttons
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const packageName = this.getAttribute('data-package');
            switchPackage(packageName);
        });
    });

    // Set default package (Starter) on page load
    // This is handled by HTML - Starter is already active by default

    // ============================================
    // TESTIMONIALS SLIDER
    // ============================================
    const cinematicTestimonialsSlider = document.querySelector('.cinematic-testimonials__slider');

    if (cinematicTestimonialsSlider && window.Swiper) {
        new Swiper(cinematicTestimonialsSlider, {
            loop: true,
            speed: 1000,
            slidesPerView: 1,
            spaceBetween: 22,
            allowTouchMove: true,
            grabCursor: true,
            pagination: {
                el: '.cinematic-testimonials__pagination',
                clickable: true
            },
            autoplay: {
                delay: 1000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
                reverseDirection: true
            },
            breakpoints: {
                768: {
                    slidesPerView: 2,
                    spaceBetween: 26
                },
                1100: {
                    slidesPerView: 3,
                    spaceBetween: 30
                }
            }
        });
    }

    const testimonialTrack = document.querySelector('.testimonial-track');
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    
    if (testimonialTrack && testimonialCards.length > 0) {
        let currentIndex = 2; // Start with center card (index 2 for 5 cards)
        const totalCards = testimonialCards.length;
        
        function updateTestimonials() {
            // Move the track to show current card centered
            const cardWidth = 300; // 280px card + 20px margin
            const offset = (currentIndex - 2) * cardWidth;
            testimonialTrack.style.transform = `translateX(${-offset}px)`;
            
            // Update active class
            testimonialCards.forEach((card, index) => {
                card.classList.remove('active');
                if (index === currentIndex) {
                    card.classList.add('active');
                }
            });
        }
        
        // Auto-slide every 3 seconds
        setInterval(() => {
            currentIndex = (currentIndex + 1) % totalCards;
            updateTestimonials();
        }, 3000);
        
        // Initial position
        updateTestimonials();
    }

    // ============================================
    // FAQ ACCORDION
    // ============================================
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        if (!question) {
            return;
        }

        question.addEventListener('click', function() {
            const isOpen = item.classList.contains('open');

            faqItems.forEach(otherItem => {
                otherItem.classList.remove('open');
            });

            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
    
    // ============================================
    // PORTFOLIO VIDEO HOVER LOGIC
    // ============================================
    const videoItems = document.querySelectorAll('.portfolio-item-video');
    
    videoItems.forEach(item => {
        const video = item.querySelector('.portfolio-video');
        
        if (video) {
            item.addEventListener('mouseenter', () => {
                // Use promise handling to avoid play() interruptions
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Autoplay prevented on hover:", error);
                    });
                }
            });
            
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0.1; // Resets video back to 0.1s to avoid black frame
            });
        }
    });

    const statsSection = document.querySelector('.works-intro');
    const statNumbers = document.querySelectorAll('.works-stat-number');
    let counterStarted = false;

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function animateStat(element, target, suffix, duration) {
        const start = performance.now();
        element.classList.add('counting');

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(easeOutExpo(progress) * target);
            element.textContent = `${value}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = `${target}${suffix}`;
                element.classList.remove('counting');
            }
        }

        requestAnimationFrame(update);
    }

    if (statsSection && statNumbers.length > 0 && 'IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !counterStarted) {
                    counterStarted = true;
                    statNumbers.forEach(el => {
                        const target = parseInt(el.dataset.target, 10) || 0;
                        const suffix = el.dataset.suffix || '';
                        animateStat(el, target, suffix, 1100 + target * 8);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25 });

        statsObserver.observe(statsSection);
    }
});

// ============================================
// PACKAGE BUILDER LOGIC
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const builderContainer = document.querySelector('.builder-container');
    if (!builderContainer) return; // Only run on the package builder page

    // State Object
    const state = {
        event: null,
        services: [],
        addons: [],
        name: '',
        phone: '',
        date: ''
    };

    // DOM Elements
    const eventCards = document.querySelectorAll('.event-card');
    const serviceCards = document.querySelectorAll('.service-card');
    const addonCards = document.querySelectorAll('.addon-card');
    const inputs = document.querySelectorAll('input');
    const sendPackageBtn = document.getElementById('sendPackageBtn');

    // Setup Event Listeners
    eventCards.forEach(card => {
        card.addEventListener('click', () => {
            eventCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            state.event = card.dataset.value;
            updateSummary();
        });
    });

    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const val = card.dataset.value;
            if(card.classList.contains('selected')) {
                state.services.push(val);
            } else {
                state.services = state.services.filter(s => s !== val);
            }
            updateSummary();
        });
    });

    addonCards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('selected');
            const val = card.dataset.value;
            if(card.classList.contains('selected')) {
                state.addons.push(val);
            } else {
                state.addons = state.addons.filter(a => a !== val);
            }
            updateSummary();
        });
    });

    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            state[e.target.id.replace('user', '').replace('event', '').toLowerCase()] = e.target.value;
            updateSummary();
        });
    });

    // Live Update Summary Panel
    function updateSummary() {
        const sumEvent = document.getElementById('sum-event');
        if (state.event) {
            sumEvent.innerHTML = state.event;
            sumEvent.classList.remove('empty-text');
        } else {
            sumEvent.innerHTML = 'None selected';
            sumEvent.classList.add('empty-text');
        }

        const sumServices = document.getElementById('sum-services');
        if (state.services.length > 0) {
            sumServices.innerHTML = state.services.map(s => `<li>${s}</li>`).join('');
        } else {
            sumServices.innerHTML = '<li class="empty-text">None selected</li>';
        }

        const sumAddons = document.getElementById('sum-addons');
        if (state.addons.length > 0) {
            sumAddons.innerHTML = state.addons.map(a => `<li>${a}</li>`).join('');
        } else {
            sumAddons.innerHTML = '<li class="empty-text">None selected</li>';
        }

        const sumDetails = document.getElementById('sum-details');
        let detailsText = '';
        if (state.name) detailsText += `Name: ${state.name}<br>`;
        if (state.date) detailsText += `Date: ${state.date}`;
        
        if (detailsText) {
            sumDetails.innerHTML = detailsText;
            sumDetails.classList.remove('empty-text');
        } else {
            sumDetails.innerHTML = 'Not provided';
            sumDetails.classList.add('empty-text');
        }
    }

    // Send WhatsApp Action
    if (sendPackageBtn) {
        sendPackageBtn.addEventListener('click', async function() {
            if (!state.event) {
                alert("Please select an event type to continue.");
                return;
            }
            if (state.services.length === 0) {
                alert("Please select at least one service.");
                return;
            }
            if (!state.name || !state.phone || !state.date) {
                alert("Please fill in all your details (Name, Phone, Date).");
                return;
            }

            try {
                await window.v2Firebase.savePackageRequest({
                    source: 'package-builder',
                    event: state.event,
                    services: state.services,
                    addons: state.addons,
                    name: state.name,
                    phone: state.phone,
                    date: state.date
                });
            } catch (error) {
                console.error('Could not save package request to Firebase:', error);
            }

            const phone = "919384978114";
            
            let message = `*Custom Package Request* 🎬\n\n`;
            message += `*Event:* ${state.event}\n`;
            message += `*Services:* ${state.services.join(', ')}\n`;
            message += `*Add-ons:* ${state.addons.length > 0 ? state.addons.join(', ') : 'None'}\n\n`;
            message += `*Name:* ${state.name}\n`;
            message += `*Phone:* ${state.phone}\n`;
            message += `*Date:* ${state.date}`;

            const encodedMessage = encodeURIComponent(message);
            const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
            
            window.open(waUrl, '_blank', 'noopener');
        });
    }

    // Scroll Reveal Animation Initialization
    const sections = document.querySelectorAll('.builder-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(section => {
        observer.observe(section);
    });
});
