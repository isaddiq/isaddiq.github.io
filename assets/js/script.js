/**
 * Academic Portfolio JavaScript - Fully JSON Data-Driven with Enhanced Features
 * Author: Saddiq Ur Rehman
 * Description: Interactive functionality with custom logos, certificate images, publication numbering
 */

// ==========================================================================
// Theme Toggle Functionality
// ==========================================================================

/**
 * Update the visual state of the theme toggle
 */
function updateThemeToggle(theme) {
    const themeButton = document.getElementById('theme-toggle-btn');
    if (themeButton) {
        themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        themeButton.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

/**
 * Keep the fixed header styling in sync with the current theme and scroll state
 */
function updateHeaderThemeStyle() {
    const header = document.querySelector('.header-wrapper');
    if (!header) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeToggle(newTheme);
    updateHeaderThemeStyle();

    // Save theme preference
    localStorage.setItem('preferred-theme', newTheme);

    console.log(`🎨 Theme switched to: ${newTheme}`);
}

/**
 * Initialize theme from user preference or system preference
 */
function initializeTheme() {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('preferred-theme');

    // Always default to light mode unless user has explicitly saved a preference
    const theme = savedTheme || 'light';

    // Apply theme with smooth transition
    document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggle(theme);
    updateHeaderThemeStyle();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('preferred-theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeToggle(newTheme);
            updateHeaderThemeStyle();
        }
    });
}

// ==========================================================================
// Mobile Menu Toggle Function
// ==========================================================================

/**
 * Toggle mobile navigation menu
 */
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle) {
        navMenu.classList.toggle('active');
        const isOpen = navMenu.classList.contains('active');
        menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        
        // Update icon
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }
}

/**
 * Close mobile menu when clicking outside
 */
function closeMobileMenuOnClickOutside(event) {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle && navMenu.classList.contains('active')) {
        if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            navMenu.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    }
}

/**
 * Close mobile menu when a nav button is clicked
 */
function closeMobileMenuOnNavClick() {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && menuToggle && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bars';
        }
    }
}

// ==========================================================================
// Tab Navigation Functions
// ==========================================================================

/**
 * Initialize tab from URL hash on page load
 */
function initializeTabFromUrl() {
    const hash = location.hash.replace('#', '') || 'home';
    
    if (VALID_TABS.includes(hash)) {
        showTab(hash);
    } else {
        showTab('home');
    }
}

/**
 * Register static page controls that are present in index.html
 */
function initializeStaticEventHandlers() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    const themeButton = document.getElementById('theme-toggle-btn');
    if (themeButton) {
        themeButton.addEventListener('click', toggleTheme);
    }

    // Note: [data-tab] clicks are handled via delegation in handleDelegatedActionClick
    // so dynamically rendered triggers (highlight cards, news links) work too.

    document.querySelectorAll('[data-pub]').forEach(button => {
        button.addEventListener('click', () => {
            showPublications(button.dataset.pub);
        });
    });

    const scrollButton = document.getElementById('scrollToTop');
    if (scrollButton) {
        scrollButton.addEventListener('click', scrollToTop);
    }

    document.addEventListener('click', handleDelegatedActionClick);
    document.addEventListener('keydown', handleDelegatedActionKeydown);
}

function handleDelegatedActionClick(event) {
    if (!(event.target instanceof Element)) return;

    const newsToggleAll = event.target.closest('[data-news-toggle-all]');
    if (newsToggleAll) {
        event.preventDefault();
        toggleAllNewsCards(newsToggleAll);
        return;
    }

    const newsToggle = event.target.closest('[data-news-toggle]');
    if (newsToggle) {
        event.preventDefault();
        toggleNewsCard(newsToggle);
        return;
    }

    const tabTrigger = event.target.closest('[data-tab]');
    if (tabTrigger) {
        event.preventDefault();
        showTab(tabTrigger.dataset.tab);
        return;
    }

    const closeModalTrigger = event.target.closest('[data-close-modal]');
    if (closeModalTrigger) {
        event.preventDefault();
        closeModal(closeModalTrigger.dataset.closeModal);
        return;
    }

    const closeZoomTrigger = event.target.closest('[data-close-zoom]');
    if (closeZoomTrigger) {
        event.preventDefault();
        closeImageZoom();
        return;
    }

    const imageZoomTrigger = event.target.closest('[data-image-zoom-src]');
    if (imageZoomTrigger) {
        event.preventDefault();
        openImageZoom(imageZoomTrigger.dataset.imageZoomSrc, imageZoomTrigger.dataset.imageZoomAlt || imageZoomTrigger.alt || '');
        return;
    }

    const awardTrigger = event.target.closest('[data-award-id]');
    if (awardTrigger) {
        event.preventDefault();
        openAwardCertificate(awardTrigger.dataset.awardId);
        return;
    }

    const projectTrigger = event.target.closest('[data-project-id]');
    if (projectTrigger) {
        event.preventDefault();
        openProjectModal(projectTrigger.dataset.projectId);
        return;
    }

    const certificateTrigger = event.target.closest('[data-certificate-id]');
    if (certificateTrigger) {
        event.preventDefault();
        openCertificateModal(certificateTrigger.dataset.certificateId);
    }
}

function handleDelegatedActionKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!(event.target instanceof Element)) return;

    const actionTrigger = event.target.closest('[data-close-modal], [data-close-zoom], [data-image-zoom-src], [data-award-id], [data-project-id], [data-certificate-id]');
    if (!actionTrigger) return;

    event.preventDefault();
    actionTrigger.click();
}

/**
 * Escape a string for safe use inside HTML attributes / text.
 */
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Convert a news type into a CSS-safe modifier class (e.g. "Software Release" -> "software-release").
 */
function newsTypeClass(type) {
    return (type || '').toLowerCase().replace(/\s+/g, '-');
}

/**
 * Render the full, collapsible News tab from newsData.
 */
function renderNewsTab() {
    const accordion = document.getElementById('news-accordion');
    if (!accordion) return;

    if (!Array.isArray(newsData) || newsData.length === 0) {
        accordion.innerHTML = `
            <div class="news-loading">
                <i class="fas fa-exclamation-circle"></i>
                No news available right now.
            </div>
        `;
        return;
    }

    accordion.innerHTML = newsData.map((item, index) => {
        const typeClass = newsTypeClass(item.type);
        const panelId = `news-detail-${item.id ?? index}`;
        const summary = item.summary ? `<span class="news-card-summary">${escapeHtml(item.summary)}</span>` : '';

        // Software items can reuse the picture + description from the Software tab.
        const software = item.softwareId ? getSoftwareInfo(item.softwareId) : { detail: '', image: null, alt: '' };

        let mediaImages = Array.isArray(item.images) ? item.images.slice() : [];
        if (mediaImages.length === 0 && software.image) {
            mediaImages = [{ src: software.image, alt: software.alt }];
        }

        // A live LinkedIn post embed (from the post's "Embed this post" URL) takes
        // precedence over static images; it renders the real post, image and all.
        const embed = item.embedUrl
            ? `<div class="news-embed">
                <iframe src="${escapeHtml(item.embedUrl)}" title="Embedded LinkedIn post"
                    frameborder="0" allowfullscreen loading="lazy"></iframe>
               </div>`
            : '';

        const images = (!embed && mediaImages.length)
            ? `<div class="news-media-grid">
                ${mediaImages.map(img => `
                    <figure class="news-media">
                        <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt)}" loading="lazy">
                        ${img.caption ? `<figcaption>${escapeHtml(img.caption)}</figcaption>` : ''}
                    </figure>
                `).join('')}
            </div>`
            : '';

        const detailBody = item.details || software.detail || '';
        const detailsText = detailBody ? `<p class="news-detail-text">${escapeHtml(detailBody)}</p>` : '';

        const link = item.link
            ? `<a class="news-detail-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
                <i class="fas fa-external-link-alt"></i> ${escapeHtml(item.linkLabel || 'Learn more')}
            </a>`
            : '';

        return `
            <article class="news-card news-type-${typeClass}">
                <button type="button" class="news-toggle" data-news-toggle aria-expanded="false" aria-controls="${panelId}">
                    <span class="news-date">${escapeHtml(item.date)}</span>
                    <i class="${escapeHtml(item.icon)} news-icon"></i>
                    <span class="news-card-heading">
                        <span class="news-card-title"><strong>${escapeHtml(item.type)}:</strong> ${escapeHtml(item.title)}</span>
                        ${summary}
                    </span>
                    <i class="fas fa-chevron-down news-chevron" aria-hidden="true"></i>
                </button>
                <div class="news-detail" id="${panelId}" role="region">
                    <div class="news-detail-inner">
                        ${detailsText}
                        ${embed}
                        ${images}
                        ${link}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Toggle a single news card open/closed.
 * @param {HTMLElement} toggleBtn - The clicked .news-toggle button
 */
function toggleNewsCard(toggleBtn) {
    const card = toggleBtn.closest('.news-card');
    if (!card) return;
    const isOpen = card.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
}

/**
 * Expand or collapse all news cards and sync the master toggle label.
 * @param {HTMLElement} toggleAllBtn - The .news-toggle-all button
 */
function toggleAllNewsCards(toggleAllBtn) {
    const accordion = document.getElementById('news-accordion');
    if (!accordion) return;

    const expand = toggleAllBtn.getAttribute('aria-expanded') !== 'true';
    accordion.querySelectorAll('.news-card').forEach(card => {
        card.classList.toggle('open', expand);
        const btn = card.querySelector('.news-toggle');
        if (btn) btn.setAttribute('aria-expanded', String(expand));
    });

    toggleAllBtn.setAttribute('aria-expanded', String(expand));
    toggleAllBtn.innerHTML = expand
        ? '<i class="fas fa-chevron-up"></i> Collapse all'
        : '<i class="fas fa-chevron-down"></i> Show all';
}

/**
 * Look up a software tool from softwareData by id.
 * @param {string} id - The software tool id (e.g. "roboaccessbim")
 */
function getSoftwareTool(id) {
    return (Array.isArray(softwareData) ? softwareData : []).find(t => t.id === id) || null;
}

/**
 * Pull the preview image and description for a software tool by id.
 * Lets software highlights/news reuse the exact picture + text from data/software.json.
 * @param {string} id - The software tool id (e.g. "roboaccessbim")
 * @returns {{detail: string, image: string|null, alt: string}}
 */
function getSoftwareInfo(id) {
    const tool = getSoftwareTool(id);
    if (!tool) return { detail: '', image: null, alt: '' };
    return {
        detail: tool.description || '',
        image: tool.previewImage || null,
        alt: tool.title || ''
    };
}

/**
 * Build the href/target attributes and CTA label for a highlight/news link.
 * Supports external URLs (http...), internal tab links (#software), or none.
 */
function resolveHighlightLink(item) {
    if (item.link && /^https?:/i.test(item.link)) {
        return { attrs: `href="${escapeHtml(item.link)}" target="_blank" rel="noopener"`, cta: item.linkLabel || 'Learn more' };
    }
    if (item.link && item.link.startsWith('#')) {
        const tab = item.link.slice(1);
        return { attrs: `href="${escapeHtml(item.link)}" data-tab="${escapeHtml(tab)}"`, cta: item.linkLabel || 'View' };
    }
    return { attrs: `href="#news" data-tab="news"`, cta: 'See in News' };
}

/**
 * Aggregate everything that should appear in the home Highlights:
 *   1. the curated data/highlights.json list, plus
 *   2. any item flagged "featured": true across news, publications,
 *      certificates, projects, and software.
 * Returns a normalized array of card objects, de-duplicated by title.
 */
function collectHighlights() {
    const cards = [];

    // 1) Curated highlights.json (already in card shape); featured unless explicitly false
    (Array.isArray(highlightsData) ? highlightsData : [])
        .filter(h => h.featured !== false)
        .forEach(h => cards.push(h));

    // 2) news.json
    (Array.isArray(newsData) ? newsData : []).filter(i => i.featured).forEach(i => cards.push({
        type: i.type, date: i.date, icon: i.icon || 'fas fa-newspaper',
        title: i.title, detail: i.summary || i.details || '',
        image: i.images && i.images[0] && i.images[0].src,
        imageAlt: i.images && i.images[0] && i.images[0].alt,
        fallbackImage: 'assets/images/covers/news-cover.png',
        link: i.link, linkLabel: i.linkLabel, softwareId: i.softwareId
    }));

    // 3) publications.json (all categories)
    ['journals', 'conferences', 'korean_conferences', 'technical_reports'].forEach(cat => {
        (publicationsData[cat] || []).filter(p => p.featured).forEach(p => {
            const venue = p.journal || p.conference || '';
            const detailBits = [venue];
            if (p.impactFactor) detailBits.push('IF: ' + p.impactFactor);
            cards.push({
                type: 'Publication', date: String(p.year || ''), icon: 'fas fa-file-alt',
                title: p.title, detail: p.detail || detailBits.filter(Boolean).join(' · '),
                image: p.image, fallbackImage: 'assets/images/covers/publication-cover.png',
                link: p.doi || p.link, linkLabel: p.linkLabel || 'View Paper (DOI)'
            });
        });
    });

    // 4) certificates.json (awards + certifications)
    ((certificatesData && certificatesData.awards) || []).filter(a => a.featured).forEach(a => cards.push({
        type: 'Award', date: a.date, icon: a.icon || 'fas fa-trophy',
        title: a.title, detail: a.description || a.issuer || '',
        fallbackImage: 'assets/images/covers/certifications-awards-cover.png',
        link: '#certifications', linkLabel: 'View Awards'
    }));
    ((certificatesData && certificatesData.certifications) || []).filter(c => c.featured).forEach(c => cards.push({
        type: 'Certificate', date: c.date, icon: 'fas fa-certificate',
        title: c.title, detail: c.description || c.issuer || '',
        image: c.image, fallbackImage: 'assets/images/covers/certifications-awards-cover.png',
        link: c.verification_url || '#certifications', linkLabel: c.verification_url ? 'Verify' : 'View Certificates'
    }));

    // 5) projects.json
    (Array.isArray(projectsData) ? projectsData : []).filter(p => p.featured).forEach(p => cards.push({
        type: 'Project', date: p.duration || p.status || '', icon: p.icon || 'fas fa-project-diagram',
        title: p.title, detail: p.description || '',
        image: p.image, fallbackImage: 'assets/images/covers/projects-cover.png',
        link: '#projects', linkLabel: 'View Projects'
    }));

    // 6) software.json
    (Array.isArray(softwareData) ? softwareData : []).filter(t => t.featured).forEach(t => {
        const firstAction = (t.actions || []).find(a => a.variant !== 'sponsor-link');
        cards.push({
            type: 'Software', date: t.highlightDate || '', icon: t.navIcon || 'fas fa-laptop-code',
            title: t.title, detail: t.description || '',
            image: t.previewImage, fallbackImage: 'assets/images/covers/software-cover.png',
            link: t.highlightLink || (firstAction && firstAction.href) || '#software',
            linkLabel: t.highlightLinkLabel || (firstAction && firstAction.label) || 'View in Software',
            softwareId: t.id
        });
    });

    // De-duplicate by title (case-insensitive); first occurrence wins.
    const seen = new Set();
    return cards.filter(c => {
        const key = (c.title || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Render the home Highlights cards.
 * Sourced from data/highlights.json plus any "featured": true item across the
 * other data files. Software items (with a softwareId) reuse the picture and
 * description from data/software.json.
 */
function renderHighlights() {
    const container = document.getElementById('highlights-container');
    if (!container) return;

    const items = collectHighlights();
    if (items.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = items.map(item => {
        const typeClass = newsTypeClass(item.type);
        const software = item.softwareId ? getSoftwareInfo(item.softwareId) : { detail: '', image: null, alt: '' };

        const detail = item.detail || software.detail || '';
        // Image priority: explicit -> software-tab preview -> fallback cover.
        const imgSrc = item.image || software.image || item.fallbackImage || '';
        const imgAlt = item.imageAlt || software.alt || item.title || '';

        const { attrs, cta } = resolveHighlightLink(item);

        const image = imgSrc
            ? `<span class="highlight-thumb">
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(imgAlt)}" loading="lazy"
                     ${item.fallbackImage ? `onerror="this.onerror=null;this.src='${escapeHtml(item.fallbackImage)}'"` : ''}>
               </span>`
            : '';

        return `
            <a class="highlight-card news-type-${typeClass}" ${attrs}>
                ${image}
                <span class="highlight-body">
                    <span class="highlight-type">
                        <i class="${escapeHtml(item.icon)} news-icon"></i> ${escapeHtml(item.type)}
                        <span class="highlight-date">${escapeHtml(item.date)}</span>
                    </span>
                    <span class="highlight-card-title">${escapeHtml(item.title)}</span>
                    ${detail ? `<span class="highlight-card-detail">${escapeHtml(detail)}</span>` : ''}
                    <span class="highlight-cta">${escapeHtml(cta)} <i class="fas fa-arrow-right"></i></span>
                </span>
            </a>
        `;
    }).join('');
}

// ==========================================================================
// Award Certificate Functions
// ==========================================================================

/**
 * Open award certificate modal with detailed information
 * @param {string} awardId - ID of the award
 */
function openAwardCertificate(awardId) {
    const modal = document.getElementById('awardCertificateModal');
    const content = document.getElementById('awardCertificateModalContent');
    
    // Award certificate data
    const awardCertificates = {
        'best-paper-award': {
            title: 'Best Paper Award',
            issuer: 'Korea CDE Society',
            event: 'Winter Conference',
            years: ['2023', '2022'],
            image: 'assets/images/certificates/best-paper-award-2023.jpg',
            description: 'Awarded for outstanding research contribution and presentation excellence at the Korea CDE Society Winter Conference.',
            details: [
                'Recognized for innovative research in Building Information Modeling (BIM)',
                'Presented cutting-edge methodologies in construction technology',
                'Contributed to advancing the field of computational design and engineering'
            ],
            verification: 'Certificate verified by Korea CDE Society'
        }
    };
    
    const award = awardCertificates[awardId];
    if (!award) return;
    
    content.innerHTML = `
        <h2 style="color: var(--text-primary); margin-bottom: 20px; text-align: center;">
            <i class="fas fa-medal" style="color: #f39c12; margin-right: 10px;"></i>
            ${award.title}
        </h2>
        
        <div style="text-align: center; margin: 30px 0;">
            <div class="award-certificate-image-frame" style="position: relative; display: inline-block;">
                <img src="${award.image}" alt="${award.title}" class="modal-award-image"
                     data-image-zoom-src="${award.image}" data-image-zoom-alt="${award.title}"
                     data-fallback-icon="fas fa-scroll">
                <div style="position: absolute; bottom: -10px; right: -10px; 
                           background: var(--secondary-color); color: white; border-radius: 50%; 
                           width: 40px; height: 40px; display: flex; align-items: center; 
                           justify-content: center; box-shadow: 0 4px 12px rgba(var(--secondary-color-rgb),0.4);">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 15px; font-style: italic;">
                <i class="fas fa-mouse-pointer"></i> Click image to view full size
            </p>
        </div>
        
        <div style="background: var(--bg-tertiary); 
                    padding: 25px; border-radius: var(--radius-md); margin: 25px 0; 
                    border: 1px solid var(--border-color);">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                        gap: 15px; margin-bottom: 15px;">
                <div>
                    <strong style="color: var(--text-primary);">Issued by:</strong><br>
                    <span style="color: var(--text-secondary);">${award.issuer}</span>
                </div>
                <div>
                    <strong style="color: var(--text-primary);">Event:</strong><br>
                    <span style="color: var(--text-secondary);">${award.event}</span>
                </div>
                <div>
                    <strong style="color: var(--text-primary);">Years:</strong><br>
                    <span style="color: var(--text-secondary);">${award.years.join(', ')}</span>
                </div>
            </div>
            <div>
                <strong style="color: var(--text-primary);">Description:</strong><br>
                <p style="margin: 10px 0 0 0; color: var(--text-secondary); line-height: 1.6;">${award.description}</p>
            </div>
        </div>
        
        ${award.details ? `
            <div style="margin: 25px 0;">
                <h4 style="color: var(--secondary-color); margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-star"></i> Achievement Highlights
                </h4>
                <ul style="list-style: none; padding: 0;">
                    ${award.details.map(detail => `
                        <li style="margin-bottom: 12px; padding: 12px 15px; 
                                   background: var(--bg-tertiary); 
                                   border-left: 4px solid var(--secondary-color); border-radius: var(--radius-xs);">
                            <i class="fas fa-check-circle" style="color: var(--success-color); margin-right: 10px;"></i>
                            ${detail}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; 
                    background: var(--bg-tertiary); border-radius: var(--radius-md); 
                    border: 1px solid var(--success-color);">
            <i class="fas fa-shield-alt" style="color: var(--success-color); font-size: 1.5em; margin-bottom: 10px;"></i>
            <p style="margin: 0; color: var(--success-color); font-weight: 600;">
                ${award.verification}
            </p>
        </div>
    `;
    attachImageFallbacks(content);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Global Variables and Configuration
// ==========================================================================

const CONFIG = {
    animationDuration: 350,
    scrollOffset: 100,
    headerHeight: 80,
    staggerDelay: 60,
    observerThreshold: 0.1,
    debounceDelay: 150
};

const VALID_TABS = ['home', 'news', 'education', 'experience', 'publications', 'projects', 'skills', 'software', 'certifications', 'activities', 'contact'];

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Utility function for throttling
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function attachImageFallbacks(root = document) {
    root.querySelectorAll('img[data-fallback-icon]').forEach(img => {
        img.addEventListener('error', () => {
            const fallbackIcon = img.dataset.fallbackIcon || 'fas fa-image';
            const icon = document.createElement('i');

            icon.className = `${fallbackIcon} skill-logo-icon`;
            icon.setAttribute('aria-hidden', 'true');
            img.replaceWith(icon);
        }, { once: true });
    });
}

function isImageIcon(icon) {
    return /^https?:\/\//i.test(icon) || /\.(?:svg|png|jpe?g|webp)(?:$|\?)/i.test(icon);
}

function renderSkillIcon(skill) {
    if (!skill.icon) return '';

    if (isImageIcon(skill.icon)) {
        return `<img src="${skill.icon}" alt="${skill.name} logo" class="skill-logo" loading="lazy" data-fallback-icon="fas fa-tools">`;
    }

    return `<i class="${skill.icon} skill-logo-icon" aria-hidden="true"></i>`;
}

// Data containers - will be populated from JSON files
let experienceData = [];
let publicationsData = {};
let projectsData = [];
let certificatesData = {};
let skillsData = {};
let newsData = [];
let highlightsData = [];
let softwareData = [];
let collaborationsData = null;
let scholarData = null;
let announcementsData = [];

// ==========================================================================
// Data Loading Functions
// ==========================================================================

/**
 * Load all data from JSON files
 */
async function loadDataFromJSON() {
    const loadingPromises = [
        loadPublicationsData(),
        loadProjectsData(),
        loadExperienceData(),
        loadSkillsData(),
        loadCertificatesData(),
        loadNewsData(),
        loadHighlightsData(),
        loadSoftwareData(),
        loadCollaborationsData(),
        loadScholarData(),
        loadAnnouncementsData()
    ];

    try {
        await Promise.all(loadingPromises);
        console.log('All data loaded successfully from JSON files');
    } catch (error) {
        console.error('Error loading some JSON files:', error);
    }
}

/**
 * Load publications data from JSON
 */
async function loadPublicationsData() {
    try {
        const response = await fetch('data/publications.json');
        if (response.ok) {
            publicationsData = await response.json();
            console.log('✅ Publications data loaded successfully');
        } else {
            console.error('❌ Could not load publications.json');
            publicationsData = {};
        }
    } catch (error) {
        console.error('❌ Error loading publications.json:', error);
        publicationsData = {};
    }
}

/**
 * Load collaboration network data from JSON
 */
async function loadCollaborationsData() {
    try {
        const response = await fetch('data/collaborations.json');
        if (response.ok) {
            collaborationsData = await response.json();
            console.log('✅ Collaborations data loaded successfully');
        } else {
            console.error('❌ Could not load collaborations.json');
            collaborationsData = null;
        }
    } catch (error) {
        console.error('❌ Error loading collaborations.json:', error);
        collaborationsData = null;
    }
}

// ==========================================================================
// Google Scholar Metrics (client-side, self-refreshing every 12 hours)
// ==========================================================================

const SCHOLAR_ID = 'wMH9sSgAAAAJ';
const SCHOLAR_PROFILE_URL = 'https://scholar.google.com/citations?user=' + SCHOLAR_ID + '&hl=en';
const SCHOLAR_CACHE_KEY = 'scholarMetrics.v1';
const SCHOLAR_REFRESH_MS = 12 * 60 * 60 * 1000; // 12 hours
const SCHOLAR_RETRY_MS = 30 * 60 * 1000; // back-off after a failed fetch
const SCHOLAR_FETCH_TIMEOUT_MS = 12000;

let scholarRefreshInFlight = false;
let scholarLastAttemptAt = 0;

/**
 * Google Scholar serves no CORS-enabled API, so the profile page is pulled
 * through public read-only relays. They are tried in order until one returns
 * a page that actually contains the metrics table.
 */
const SCHOLAR_PROXIES = [
    (url) => 'https://api.cors.lol/?url=' + encodeURIComponent(url),
    (url) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    (url) => 'https://corsproxy.io/?url=' + encodeURIComponent(url)
];

/**
 * Load Google Scholar metrics for the first paint.
 * Order of preference: a cached live result from a previous visit, then the
 * committed data/scholar.json seed. Either way the card renders instantly and
 * refreshScholarMetrics() tops it up afterwards if the numbers are stale.
 */
async function loadScholarData() {
    const cached = readScholarCache();
    if (cached) {
        scholarData = cached.metrics;
        console.log('✅ Scholar metrics loaded from cache');
    }

    try {
        const response = await fetch('data/scholar.json?v=' + Date.now());
        if (response.ok) {
            const seed = await response.json();
            // The seed only wins when there is no cached live reading yet.
            if (!scholarData) {
                scholarData = seed;
                console.log('✅ Scholar metrics loaded from seed file');
            } else if (seed.profileUrl && !scholarData.profileUrl) {
                scholarData.profileUrl = seed.profileUrl;
            }
        } else if (!scholarData) {
            console.error('❌ Could not load scholar.json');
        }
    } catch (error) {
        if (!scholarData) {
            console.error('❌ Error loading scholar.json:', error);
        }
    }
}

/**
 * Populate the Google Scholar metrics card from scholarData.
 */
function renderScholarMetrics() {
    const card = document.getElementById('scholar-metrics');
    if (!card || !scholarData) return;

    const fields = ['citations', 'hIndex', 'i10Index'];
    fields.forEach((key) => {
        const el = card.querySelector('[data-scholar="' + key + '"]');
        const value = scholarData[key];
        if (el && (typeof value === 'number' || typeof value === 'string')) {
            el.textContent = Number(value).toLocaleString();
        }
    });

    card.setAttribute('href', scholarData.profileUrl || SCHOLAR_PROFILE_URL);
    if (scholarData.updated) {
        card.setAttribute('title', 'Google Scholar, last updated ' + scholarData.updated);
    }
    card.classList.remove('is-loading');
}

/**
 * Read the cached metrics written by a previous live fetch.
 * Returns { metrics, fetchedAt, isFresh } or null when nothing usable is stored.
 */
function readScholarCache() {
    try {
        const raw = localStorage.getItem(SCHOLAR_CACHE_KEY);
        if (!raw) return null;

        const cache = JSON.parse(raw);
        const fetchedAt = Number(cache && cache.fetchedAt);
        if (!isValidScholarMetrics(cache && cache.metrics) || !fetchedAt) {
            localStorage.removeItem(SCHOLAR_CACHE_KEY);
            return null;
        }

        const age = Date.now() - fetchedAt;
        return {
            metrics: cache.metrics,
            fetchedAt: fetchedAt,
            // A clock that jumped backwards should not freeze the cache forever.
            isFresh: age >= 0 && age < SCHOLAR_REFRESH_MS
        };
    } catch (error) {
        return null; // Private mode / disabled storage: just fetch every visit.
    }
}

/**
 * Persist a freshly fetched set of metrics with its timestamp.
 */
function writeScholarCache(metrics) {
    try {
        localStorage.setItem(SCHOLAR_CACHE_KEY, JSON.stringify({
            metrics: metrics,
            fetchedAt: Date.now()
        }));
    } catch (error) {
        /* Storage unavailable or full - the numbers still render this visit. */
    }
}

/**
 * Sanity-check a metrics object before it is cached or rendered, so a captcha
 * page or a truncated response can never overwrite good numbers.
 */
function isValidScholarMetrics(metrics) {
    if (!metrics) return false;

    const values = [metrics.citations, metrics.hIndex, metrics.i10Index];
    const allSane = values.every((v) => Number.isInteger(v) && v >= 0 && v < 1000000);
    if (!allSane) return false;

    // Citations >= h-index >= i10-index holds for every real profile.
    return metrics.citations >= metrics.hIndex
        && metrics.hIndex >= metrics.i10Index
        && metrics.citations > 0;
}

/**
 * Pull the three "All" figures out of the Scholar profile markup.
 * The stats table holds six cells in order: citations(all), citations(since),
 * h(all), h(since), i10(all), i10(since) - so the "All" column is 0, 2, 4.
 */
function parseScholarMetrics(html) {
    if (!html || html.indexOf('gsc_rsb_std') === -1) return null;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    let cells = doc.querySelectorAll('#gsc_rsb_st td.gsc_rsb_std');
    if (cells.length < 5) {
        cells = doc.querySelectorAll('td.gsc_rsb_std');
    }
    if (cells.length < 5) return null;

    const toInt = (cell) => parseInt(cell.textContent.replace(/[^\d]/g, ''), 10);
    const metrics = {
        citations: toInt(cells[0]),
        hIndex: toInt(cells[2]),
        i10Index: toInt(cells[4])
    };

    return isValidScholarMetrics(metrics) ? metrics : null;
}

/**
 * Fetch the live profile through the relay list, returning the first result
 * that parses cleanly. Returns null when every relay fails or is blocked.
 */
async function fetchScholarMetrics() {
    for (const buildUrl of SCHOLAR_PROXIES) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SCHOLAR_FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(buildUrl(SCHOLAR_PROFILE_URL), {
                signal: controller.signal,
                cache: 'no-store'
            });
            if (response.ok) {
                const metrics = parseScholarMetrics(await response.text());
                if (metrics) return metrics;
            }
        } catch (error) {
            /* Relay down, blocked, or timed out - fall through to the next one. */
        } finally {
            clearTimeout(timer);
        }
    }
    return null;
}

/**
 * Refresh the card from Google Scholar when the cached numbers are older than
 * 12 hours. Runs in the background: the card already shows the cached or seed
 * values, and only repaints if a live reading comes back.
 */
async function refreshScholarMetrics(force) {
    const cached = readScholarCache();
    if (!force && cached && cached.isFresh) {
        console.log('ℹ️ Scholar metrics are less than 12h old, skipping fetch');
        return;
    }
    if (scholarRefreshInFlight) return;
    // A failed round of relays should not be retried on every tab focus.
    if (!force && scholarLastAttemptAt && Date.now() - scholarLastAttemptAt < SCHOLAR_RETRY_MS) {
        return;
    }

    scholarRefreshInFlight = true;
    scholarLastAttemptAt = Date.now();
    let metrics = null;
    try {
        metrics = await fetchScholarMetrics();
    } finally {
        scholarRefreshInFlight = false;
    }

    if (!metrics) {
        console.warn('⚠️ Live Scholar fetch unavailable, showing last known metrics');
        return;
    }

    scholarData = Object.assign({}, scholarData, metrics, {
        profileUrl: SCHOLAR_PROFILE_URL,
        updated: new Date().toISOString().slice(0, 10)
    });
    writeScholarCache(scholarData);
    renderScholarMetrics();
    console.log('✅ Scholar metrics refreshed from Google Scholar');
}

/**
 * Keep the card current without a reload: re-check every 12 hours, and also
 * when a long-idle tab is brought back to the foreground.
 */
function initializeScholarAutoRefresh() {
    refreshScholarMetrics();

    setInterval(() => refreshScholarMetrics(), SCHOLAR_REFRESH_MS);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshScholarMetrics();
        }
    });
}

/**
 * Load projects data from JSON
 */
async function loadProjectsData() {
    try {
        const response = await fetch('data/projects.json');
        if (response.ok) {
            const projectsJSON = await response.json();
            projectsData = projectsJSON.research_projects || [];
            console.log('✅ Projects data loaded successfully');
        } else {
            console.error('❌ Could not load projects.json');
            projectsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading projects.json:', error);
        projectsData = [];
    }
}

/**
 * Load experience data from JSON
 */
async function loadExperienceData() {
    try {
        const response = await fetch('data/experience.json');
        if (response.ok) {
            const experienceJSON = await response.json();
            experienceData = [
                ...(experienceJSON.academic_experience || []),
                ...(experienceJSON.industry_experience || [])
            ];
            console.log('✅ Experience data loaded successfully');
        } else {
            console.error('❌ Could not load experience.json');
            experienceData = [];
        }
    } catch (error) {
        console.error('❌ Error loading experience.json:', error);
        experienceData = [];
    }
}

/**
 * Load skills data from JSON
 */
async function loadSkillsData() {
    try {
        const response = await fetch('data/skills.json');
        if (response.ok) {
            skillsData = await response.json();
            console.log('✅ Skills data loaded successfully');
        } else {
            console.error('❌ Could not load skills.json');
            skillsData = {};
        }
    } catch (error) {
        console.error('❌ Error loading skills.json:', error);
        skillsData = {};
    }
}

/**
 * Load certificates data from JSON
 */
async function loadCertificatesData() {
    try {
        const response = await fetch('data/certificates.json');
        if (response.ok) {
            certificatesData = await response.json();
            console.log('✅ Certificates data loaded successfully');
        } else {
            console.error('❌ Could not load certificates.json');
            certificatesData = { awards: [], certifications: [] };
        }
    } catch (error) {
        console.error('❌ Error loading certificates.json:', error);
        certificatesData = { awards: [], certifications: [] };
    }
}

/**
 * Load news data from JSON
 */
async function loadNewsData() {
    try {
        const response = await fetch('data/news.json');
        if (response.ok) {
            newsData = await response.json();
            console.log('✅ News data loaded successfully');
        } else {
            console.error('❌ Could not load news.json');
            newsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading news.json:', error);
        newsData = [];
    }
}

/**
 * Load home highlights data from JSON
 */
async function loadHighlightsData() {
    try {
        const response = await fetch('data/highlights.json');
        if (response.ok) {
            highlightsData = await response.json();
            console.log('✅ Highlights data loaded successfully');
        } else {
            console.error('❌ Could not load highlights.json');
            highlightsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading highlights.json:', error);
        highlightsData = [];
    }
}

/**
 * Load announcement popup data from JSON (drives the bottom-left popup).
 */
async function loadAnnouncementsData() {
    try {
        const response = await fetch('data/announcements.json');
        if (response.ok) {
            announcementsData = await response.json();
            console.log('✅ Announcements data loaded successfully');
        } else {
            console.error('❌ Could not load announcements.json');
            announcementsData = [];
        }
    } catch (error) {
        console.error('❌ Error loading announcements.json:', error);
        announcementsData = [];
    }
}

/**
 * Load software/tools data from JSON
 */
async function loadSoftwareData() {
    try {
        const response = await fetch('data/software.json');
        if (response.ok) {
            const json = await response.json();
            softwareData = json.tools || [];
            console.log('✅ Software data loaded successfully');
        } else {
            console.error('❌ Could not load software.json');
            softwareData = [];
        }
    } catch (error) {
        console.error('❌ Error loading software.json:', error);
        softwareData = [];
    }
}

// ==========================================================================
// Navigation Functions with Tab Persistence
// ==========================================================================

const PAGE_METADATA = {
    home: {
        title: 'Saddiq Ur Rehman - BIM, XR & Modular Construction Research',
        description: 'Official academic portfolio of Saddiq Ur Rehman, PhD candidate at Kyung Hee University researching BIM, XR, DfMA, modular construction, digital twins, AI, and BIM-to-Unity workflows.'
    },
    news: {
        title: 'News - Saddiq Ur Rehman',
        description: 'Latest research news, journal and conference publications, software releases, and academic milestones from Saddiq Ur Rehman in BIM, XR, and modular construction.'
    },
    education: {
        title: 'Education - Saddiq Ur Rehman',
        description: 'Academic background of Saddiq Ur Rehman, including architecture research at Kyung Hee University and civil engineering education at UET Peshawar.'
    },
    experience: {
        title: 'Experience - Saddiq Ur Rehman',
        description: 'Research and professional experience in BIM, construction technology, modular construction, AI, XR, and digital workflows for AEC.'
    },
    publications: {
        title: 'Publications - Saddiq Ur Rehman',
        description: 'Selected journal and conference publications on BIM, semantic data exchange, BIM-to-Unity workflows, game engine integration, 4D BIM, and modular construction.'
    },
    projects: {
        title: 'Research Projects - Saddiq Ur Rehman',
        description: 'Research projects covering robot-friendly building design, AI-based architectural design, BIM cost estimation, open BIM, rule checking, and digital twin workflows.'
    },
    skills: {
        title: 'Skills - Saddiq Ur Rehman',
        description: 'Technical skills in BIM software, Unity, Python, C#, AI, machine learning, Revit, Navisworks, IFC, XR, and construction informatics.'
    },
    software: {
        title: 'BIM Software - Saddiq Ur Rehman',
        description: 'BIM and XR tools by Saddiq Ur Rehman, including RoboAccess BIM, ReUniXchange, BIMUniXchange, IFCExplorer, Ifc2Unity, BIM network graphs, and Unity BIM workflows.'
    },
    certifications: {
        title: 'Certifications and Awards - Saddiq Ur Rehman',
        description: 'Awards, scholarships, certificates, and professional recognition for BIM, construction technology, research, and academic achievement.'
    },
    activities: {
        title: 'Academic Activities - Saddiq Ur Rehman',
        description: 'Academic service, workshops, conferences, research activities, and professional engagement in BIM, XR, and construction technology.'
    },
    contact: {
        title: 'Contact - Saddiq Ur Rehman',
        description: 'Contact Saddiq Ur Rehman at Kyung Hee University for BIM, XR, modular construction, DfMA, AI, and construction informatics research collaboration.'
    }
};

function updateMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (element && value) {
        element.setAttribute('content', value);
    }
}

function updatePageMetadata(tabName, fallbackSectionTitle) {
    const metadata = PAGE_METADATA[tabName] || {
        title: `Saddiq Ur Rehman - ${fallbackSectionTitle}`,
        description: PAGE_METADATA.home.description
    };
    const pageUrl = tabName === 'home'
        ? 'https://isaddiq.github.io/'
        : `https://isaddiq.github.io/#${tabName}`;

    document.title = metadata.title;
    updateMetaContent('meta[name="description"]', metadata.description);
    updateMetaContent('meta[property="og:title"]', metadata.title);
    updateMetaContent('meta[property="og:description"]', metadata.description);
    updateMetaContent('meta[property="og:url"]', pageUrl);
    updateMetaContent('meta[name="twitter:title"]', metadata.title);
    updateMetaContent('meta[name="twitter:description"]', metadata.description);
}

/**
 * Get current tab from URL hash or default to 'home'
 */
function getCurrentTab() {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.includes(hash) ? hash : 'home';
}

/**
 * Set URL hash for tab persistence
 * @param {string} tabName - Name of the tab
 */
function setCurrentTab(tabName) {
    window.location.hash = tabName;
}

/**
 * Show specific tab and hide others
 * @param {string} tabName - Name of the tab to show
 */
function showTab(tabName) {
    // Close mobile menu when switching tabs
    closeMobileMenuOnNavClick();
    
    // Remove active class from all tabs first
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class and aria-current from all nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
    });
    
    // Show selected tab immediately for smooth transition
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            selectedTab.classList.add('active');
            // Trigger animations for elements in the tab
            animateTabContent(selectedTab);
        });
    }
    
    // Add active class and aria-current to corresponding nav button
    const navBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
        navBtn.setAttribute('aria-current', 'page');
    }
    
    // Update document title and URL hash
    const titleMap = {
        home: 'Home',
        news: 'News',
        education: 'Education',
        experience: 'Experience',
        publications: 'Publications',
        projects: 'Projects',
        skills: 'Skills',
        software: 'Software',
        certifications: 'Certifications & Awards',
        activities: 'Activities',
        contact: 'Contact'
    };
    
    const sectionTitle = titleMap[tabName] || 'Portfolio';
    updatePageMetadata(tabName, sectionTitle);
    
    // Update URL hash for persistence
    setCurrentTab(tabName);
    if (location.hash !== `#${tabName}`) {
        history.replaceState(null, '', `#${tabName}`);
    }
    
    // Load dynamic content if needed
    loadTabContent(tabName);
    
    // Reinitialize map when contact tab is shown
    if (tabName === 'contact' && mapInstance) {
        setTimeout(() => {
            mapInstance.invalidateSize();
            mapInstance.setView([37.2464, 127.0809], 18);
        }, 100);
    }
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Animate content elements when tab is shown using Intersection Observer
 * @param {HTMLElement} tabElement - The tab element to animate
 */
function animateTabContent(tabElement) {
    const animatableElements = tabElement.querySelectorAll('.publication-item, .project-card, .experience-item, .certificate-card, .skill-category, .research-card, .award-item, .activity-item, .news-bullet-item, .news-card, .highlight-card');
    
    // Use Intersection Observer for better performance
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                el.style.transition = `opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0) scale(1)';
                observer.unobserve(el);
            }
        });
    }, { threshold: CONFIG.observerThreshold, rootMargin: '0px 0px -50px 0px' });
    
    animatableElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px) scale(0.98)';
        observer.observe(el);
    });
}

/**
 * Initialize tab from URL hash on page load
 */
function initializeTabFromHash() {
    const currentTab = getCurrentTab();
    showTab(currentTab);
}

/**
 * Load dynamic content for specific tabs
 * @param {string} tabName - Name of the tab
 */
function loadTabContent(tabName) {
    switch (tabName) {
        case 'news':
            renderNewsTab();
            break;
        case 'experience':
            loadExperienceContent();
            break;
        case 'skills':
            loadSkillsContent();
            break;
        case 'publications':
            loadPublicationsContent();
            loadPublicationStats();
            break;
        case 'projects':
            loadProjectsContent();
            break;
        case 'certifications':
            loadCertificatesContent();
            break;
        case 'software':
            initializeSoftwareTools();
            break;
        case 'activities':
            initCollaborationNetwork();
            break;
        case 'contact':
            initializeEmailJS();
            initializeMap();
            initializeContactAnimations();
            initializeActionButtons();
            
            // Add form submission handler
            const contactForm = document.getElementById('contactForm');
            if (contactForm) {
                contactForm.addEventListener('submit', handleFormSubmission);
            }

            // Add click-to-copy functionality for address
            const addressItem = document.querySelector('.contact-item--address');
            if (addressItem) {
                addressItem.addEventListener('click', copyAddress);
                addressItem.style.cursor = 'pointer';
                addressItem.title = 'Click to copy address';
            }
            break;
    }
}

// ==========================================================================
// Skills Functions
// ==========================================================================

/**
 * Load skills content dynamically
 */
function loadSkillsContent() {
    const skillsContainer = document.getElementById('skills-content');
    if (!skillsContainer) return;
    
    // Clear existing content
    skillsContainer.innerHTML = '';
    
    if (Object.keys(skillsData).length === 0) {
        skillsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>Skills data not available</h3>
                <p>Please ensure skills.json file is present in the data folder.</p>
            </div>
        `;
        return;
    }
    
    const skillsHTML = Object.entries(skillsData).map(([key, category]) => `
        <div class="skill-category">
            <h3><i class="${category.icon}"></i> ${category.title}</h3>
            <div class="skills-grid">
                ${category.skills.map(skill => `
                    <div class="skill-item">
                        <div class="skill-header">
                            <span class="skill-name">
                                ${renderSkillIcon(skill)}
                                <span>${skill.name}</span>
                            </span>
                            <span class="skill-level">${skill.level}</span>
                        </div>
                        <div class="skill-progress">
                            <div class="skill-progress-bar" style="width: 0%;" data-width="${skill.percentage}%"></div>
                        </div>
                        ${skill.description ? `<div class="skill-description">${skill.description}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    skillsContainer.innerHTML = skillsHTML;
    attachImageFallbacks(skillsContainer);
    
    // Animate progress bars
    setTimeout(() => {
        const progressBars = document.querySelectorAll('.skill-progress-bar');
        progressBars.forEach(bar => {
            const width = bar.getAttribute('data-width');
            bar.style.width = width;
        });
    }, 500);
}

// ==========================================================================
// Publications Functions
// ==========================================================================

/**
 * Load publication statistics and update navigation counts
 */
function loadPublicationStats() {
    const statsContainer = document.getElementById('publication-stats');
    if (!statsContainer) return;
    
    const journalCount = (publicationsData.journals || []).length;
    const conferenceCount = (publicationsData.conferences || []).length;
    const koreanCount = (publicationsData.korean_conferences || publicationsData.korean || []).length;
    const reportCount = (publicationsData.technical_reports || publicationsData.reports || []).length;
    const totalCount = journalCount + conferenceCount + koreanCount + reportCount;
    
    // Update main stats display
    statsContainer.innerHTML = `
        <h3>Publication Overview</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-number">${totalCount}</span>
                <span class="stat-label">Total Publications</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${journalCount}</span>
                <span class="stat-label">Journal Articles</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${conferenceCount}</span>
                <span class="stat-label">International Conferences</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${koreanCount}</span>
                <span class="stat-label">Korean Conferences</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${reportCount}</span>
                <span class="stat-label">Technical Reports</span>
            </div>
        </div>
    `;
    
    // Update navigation button counts
    updatePublicationNavCounts(journalCount, conferenceCount, koreanCount, reportCount);
}

/**
 * Update publication navigation button counts
 * @param {number} journalCount - Number of journal publications
 * @param {number} conferenceCount - Number of conference publications
 * @param {number} koreanCount - Number of Korean conference publications
 * @param {number} reportCount - Number of technical reports
 */
function updatePublicationNavCounts(journalCount, conferenceCount, koreanCount, reportCount) {
    const journalsCountEl = document.getElementById('journals-count');
    const conferencesCountEl = document.getElementById('conferences-count');
    const koreanCountEl = document.getElementById('korean-count');
    const reportsCountEl = document.getElementById('reports-count');
    
    if (journalsCountEl) journalsCountEl.textContent = journalCount;
    if (conferencesCountEl) conferencesCountEl.textContent = conferenceCount;
    if (koreanCountEl) koreanCountEl.textContent = koreanCount;
    if (reportsCountEl) reportsCountEl.textContent = reportCount;
}

/**
 * Show specific publication type
 * @param {string} pubType - Type of publication to show
 */
function showPublications(pubType) {
    // Hide all publication contents
    const pubContents = document.querySelectorAll('.pub-content');
    pubContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all pub buttons
    const pubBtns = document.querySelectorAll('.pub-btn');
    pubBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected publication type
    const selectedPub = document.getElementById(pubType);
    if (selectedPub) {
        selectedPub.classList.add('active');
    }
    
    // Add active class to matching button
    const selectedButton = document.querySelector(`.pub-btn[data-pub="${pubType}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

/**
 * Load publications content dynamically
 */
function loadPublicationsContent() {
    loadJournals();
    loadConferences();
    loadKoreanConferences();
    loadTechnicalReports();
}

/**
 * Load journal publications with numbering
 */
function loadJournals() {
    const journalsContainer = document.getElementById('journals');
    if (!journalsContainer) return;
    
    // Clear existing content
    journalsContainer.innerHTML = '';
    
    const journals = publicationsData.journals || [];
    
    if (journals.length === 0) {
        journalsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-book" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No journal publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    journalsContainer.innerHTML = journals.map((pub, index) => `
        <div class="publication-item">
            <div class="publication-number">${index + 1}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)}</div>
            <div class="pub-journal">${[pub.journal, pub.volume, pub.pages].filter(Boolean).join(', ')} (${pub.year})</div>
            <div class="pub-details">
                ${pub.impactFactor ? `<span class="pub-badge impact-factor">IF: ${pub.impactFactor}</span>` : ''}
                ${pub.category ? `<span class="pub-badge">${pub.category}${pub.quartile ? ', ' + pub.quartile : ''}</span>` : ''}
                ${pub.badges ? pub.badges.map(badge => `<span class="pub-badge ${getBadgeClass(badge)}">${badge}</span>`).join('') : ''}
                ${pub.doi && pub.doi !== '#' ? `<a href="${pub.doi}" class="doi-link" target="_blank" rel="noopener">DOI Link</a>` : (pub.status ? `<span class="pub-badge ${getBadgeClass(pub.status)}">${escapeHtml(pub.status)}</span>` : '')}
            </div>
        </div>
    `).join('');
}

/**
 * Load conference publications with numbering
 */
function loadConferences() {
    const conferencesContainer = document.getElementById('conferences');
    if (!conferencesContainer) return;
    
    // Clear existing content
    conferencesContainer.innerHTML = '';
    
    const conferences = publicationsData.conferences || [];
    
    if (conferences.length === 0) {
        conferencesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-users" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No conference publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    conferencesContainer.innerHTML = conferences.map((pub, index) => `
        <div class="publication-item">
            <div class="publication-number">${index + 1}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.conference}${pub.location ? `, ${pub.location}` : ''}${pub.date ? `, ${pub.date}` : ''}</div>
            <div class="pub-details">
                ${pub.pages ? `<span class="pub-badge">Pages: ${pub.pages}</span>` : ''}
                ${pub.publisher ? `<span class="pub-badge">Publisher: ${pub.publisher}</span>` : ''}
                ${pub.doi ? `<a href="${pub.doi}" class="doi-link" target="_blank" rel="noopener">DOI Link</a>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Load Korean conference publications with numbering
 */
function loadKoreanConferences() {
    const koreanContainer = document.getElementById('korean');
    if (!koreanContainer) return;
    
    // Clear existing content
    koreanContainer.innerHTML = '';
    
    const korean = publicationsData.korean_conferences || publicationsData.korean || [];
    
    if (korean.length === 0) {
        koreanContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-flag" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No Korean conference publications found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    koreanContainer.innerHTML = korean.map((pub, index) => `
        <div class="publication-item">
            <div class="publication-number">${index + 1}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.conference}${pub.volume ? `, ${pub.volume}` : ''}${pub.pages ? `, ${pub.pages}` : ''}</div>
            <div class="pub-details">
                ${pub.badges ? pub.badges.map(badge => `<span class="pub-badge ${getBadgeClass(badge)}">${badge}</span>`).join('') : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Load technical reports with numbering
 */
function loadTechnicalReports() {
    const reportsContainer = document.getElementById('reports');
    if (!reportsContainer) return;
    
    // Clear existing content
    reportsContainer.innerHTML = '';
    
    const reports = publicationsData.technical_reports || publicationsData.reports || [];
    
    if (reports.length === 0) {
        reportsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-file-alt" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No technical reports found</h3>
                <p>Please check the publications.json file.</p>
            </div>
        `;
        return;
    }
    
    reportsContainer.innerHTML = reports.map((pub, index) => `
        <div class="publication-item">
            <div class="publication-number">${index + 1}</div>
            <div class="pub-title">${pub.title}</div>
            <div class="pub-authors">${formatAuthors(pub.authors)} (${pub.year})</div>
            <div class="pub-journal">${pub.journal}${pub.volume ? `, ${pub.volume}` : ''}${pub.pages ? `, pages ${pub.pages}` : ''}</div>
            <div class="pub-details">
                ${pub.link ? `<a href="${pub.link}" class="doi-link" target="_blank" rel="noopener">${escapeHtml(pub.linkLabel || 'View Report')}</a>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Format authors with name highlighting
 * @param {Array} authors - Array of author names
 * @returns {string} Formatted author string
 */
function formatAuthors(authors) {
    if (!authors || !Array.isArray(authors)) return '';
    return authors.map(author => {
        if (author.includes('Saddiq Ur Rehman')) {
            return `<span class="bold">${author}</span>`;
        }
        return author;
    }).join(', ');
}

/**
 * Get CSS class for publication badge
 * @param {string} badge - Badge text
 * @returns {string} CSS class name
 */
function getBadgeClass(badge) {
    const badgeClasses = {
        'Editor\'s Choice': 'editor-choice',
        'Best Paper Award': 'editor-choice',
        'Corresponding author': 'corresponding'
    };
    return badgeClasses[badge] || '';
}

// ==========================================================================
// Experience Functions
// ==========================================================================

/**
 * Load experience content dynamically with logo support
 */
function loadExperienceContent() {
    const experienceContainer = document.getElementById('experience-container');
    if (!experienceContainer) return;
    
    // Clear existing content
    experienceContainer.innerHTML = '';
    
    if (experienceData.length === 0) {
        experienceContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-briefcase" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No experience data found</h3>
                <p>Please check the experience.json file.</p>
            </div>
        `;
        return;
    }
    
    experienceContainer.innerHTML = experienceData.map(exp => `
        <div class="experience-item">
            <div class="exp-header">
                <div class="company-logo">
                    ${exp.logo ? 
                        `<img src="${exp.logo}" alt="${exp.organization || exp.company}" data-fallback-icon="${exp.icon || 'fas fa-building'}">` :
                        `<i class="${exp.icon || 'fas fa-building'}"></i>`
                    }
                </div>
                <div class="exp-details">
                    <h3>${exp.position || exp.title}</h3>
                    <a href="${exp.companyUrl || exp.website || '#'}" class="company-name" target="_blank" rel="noopener">${exp.organization || exp.company}</a>
                    <p class="exp-duration">${exp.duration?.display || exp.duration}</p>
                    ${exp.department ? `<p><strong>Department:</strong> ${exp.department}</p>` : ''}
                    ${exp.course ? `<p><strong>Course:</strong> ${exp.course}</p>` : ''}
                    ${exp.task ? `<p><strong>Task:</strong> ${exp.task}</p>` : ''}
                    ${exp.primary_responsibilities ? `<p><strong>Responsibilities:</strong> ${Array.isArray(exp.primary_responsibilities) ? exp.primary_responsibilities[0] : exp.primary_responsibilities}</p>` : ''}
                    ${exp.responsibilities ? `<p><strong>Responsibilities:</strong> ${exp.responsibilities}</p>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    attachImageFallbacks(experienceContainer);
}

// ==========================================================================
// Projects Functions
// ==========================================================================

/**
 * Load projects content dynamically
 */
function loadProjectsContent() {
    const projectsContainer = document.getElementById('projects-container');
    if (!projectsContainer) return;
    
    // Clear existing content
    projectsContainer.innerHTML = '';
    
    if (projectsData.length === 0) {
        projectsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-project-diagram" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No projects found</h3>
                <p>Please check the projects.json file.</p>
            </div>
        `;
        return;
    }
    
    projectsContainer.innerHTML = projectsData.map(project => `
        <div class="project-card" data-project-id="${project.id}" role="button" tabindex="0">
            <div class="project-image">
                ${project.image ? `
                    <img src="${project.image}" alt="${project.title}" class="project-card-image"
                         onerror="this.outerHTML='&lt;i class=\\'${project.icon || 'fas fa-project-diagram'}\\'&gt;&lt;/i&gt;'" />
                ` : `
                    <i class="${project.icon || 'fas fa-project-diagram'}"></i>
                `}
            </div>
            <div class="project-info">
                <div class="project-title">${project.title}</div>
                <div class="project-role">${project.role}</div>
                <div class="project-duration">${project.duration}</div>
            </div>
        </div>
    `).join('');
}

/**
 * Open project modal with detailed information
 * @param {string} projectId - ID of the project
 */
function openProjectModal(projectId) {
    const modal = document.getElementById('projectModal');
    const content = document.getElementById('projectModalContent');
    
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;
    
    content.innerHTML = `
        ${project.image ? `
            <div class="project-modal-image-frame">
                <img src="${project.image}" alt="${project.title}" class="project-modal-image"
                     onerror="this.closest('.project-modal-image-frame').style.display='none'" />
            </div>
        ` : ''}
        <h2 style="color: var(--text-primary); margin-bottom: 20px;">${project.title}</h2>
        <div style="margin-bottom: 15px; color: var(--text-secondary);">
            <strong>Duration:</strong> ${project.duration}<br>
            <strong>Role:</strong> ${project.role}<br>
            ${project.supervisor ? `<strong>Supervisor:</strong> ${project.supervisor}<br>` : ''}
            ${project.funding || project.funding_source ? `<strong>Funding:</strong> ${project.funding || project.funding_source}<br>` : ''}
            ${project.collaborators ? `<strong>Collaborators:</strong> ${Array.isArray(project.collaborators) ? project.collaborators.join(', ') : project.collaborators}<br>` : ''}
            ${project.status ? `<strong>Status:</strong> ${project.status}<br>` : ''}
        </div>
        <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Project Description</h3>
        <p style="margin-bottom: 20px; text-align: justify; line-height: 1.6; color: var(--text-secondary);">${project.description || project.detailed_description}</p>
        ${project.problem ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Problem &amp; Challenges</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.problem.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.objectives ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Objectives</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.objectives.map(obj => `<li style="margin-bottom: 8px; line-height: 1.5;">${obj}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.methodology ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Methodology</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.methodology.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.workflow_stages ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Workflow</h3>
            <div style="margin-bottom: 20px;">
                ${project.workflow_stages.map(s => `
                    <div style="margin-bottom: 14px; padding: 12px 15px; background: var(--bg-tertiary); border-left: 4px solid var(--secondary-color); border-radius: var(--radius-xs);">
                        <strong style="color: var(--text-primary);">${s.stage}</strong>
                        <p style="margin: 6px 0 0 0; line-height: 1.5; color: var(--text-secondary);">${s.description}</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        ${project.contribution ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Contribution</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px; color: var(--text-secondary);">
                ${project.contribution.map(item => `<li style="margin-bottom: 8px; line-height: 1.5;">${item}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.technologies ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Technologies Used</h3>
            <p style="margin-bottom: 20px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 15px; border-radius: var(--radius-md); font-family: monospace;">${Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies}</p>
        ` : ''}
        ${project.outcomes ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Key Outcomes</h3>
            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--success-color); color: var(--text-primary);">
                ${Array.isArray(project.outcomes) ? project.outcomes.map(outcome => `<p style="margin-bottom: 10px;">${outcome}</p>`).join('') : `<p>${project.outcomes}</p>`}
            </div>
        ` : ''}
        ${project.outputs ? `
            <h3 style="color: var(--secondary-color); margin: 20px 0 10px 0;">Outputs</h3>
            <div style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--success-color); color: var(--text-primary);">
                ${Array.isArray(project.outputs) ? project.outputs.map(out => `<p style="margin-bottom: 10px;">${out}</p>`).join('') : `<p>${project.outputs}</p>`}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Certificates Functions
// ==========================================================================

/**
 * Load certificates content dynamically with image support
 */
function loadCertificatesContent() {
    const certificatesContainer = document.getElementById('certificates-container');
    if (!certificatesContainer) return;
    
    // Update awards section
    const awardsContainer = document.querySelector('.awards-container');
    if (awardsContainer && certificatesData.awards) {
        awardsContainer.innerHTML = certificatesData.awards.map(award => `
            <div class="award-item">
                <div class="award-icon">
                    <i class="${award.icon || 'fas fa-trophy'}"></i>
                </div>
                <div class="award-content">
                    <strong>${award.title}</strong>
                    <p>${award.issuer} (${award.date})</p>
                </div>
            </div>
        `).join('');
    }
    
    // Clear existing content
    certificatesContainer.innerHTML = '';
    
    const certifications = certificatesData.certifications || [];
    
    if (certifications.length === 0) {
        certificatesContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <i class="fas fa-certificate" style="font-size: 3em; margin-bottom: 20px;"></i>
                <h3>No certifications found</h3>
                <p>Please check the certificates.json file.</p>
            </div>
        `;
        return;
    }
    
    certificatesContainer.innerHTML = certifications.map(cert => `
        <div class="certificate-card" data-certificate-id="${cert.id}" role="button" tabindex="0">
            <div class="certificate-image">
                ${cert.image ? 
                    `<img src="${cert.image}" alt="${cert.title}" data-fallback-icon="fas fa-certificate">` :
                    `<i class="fas fa-certificate"></i>`
                }
            </div>
            <div class="certificate-caption">${cert.title}</div>
        </div>
    `).join('');
    attachImageFallbacks(certificatesContainer);
}

/**
 * Open certificate modal with detailed information and image
 * @param {string} certId - ID of the certificate
 */
function openCertificateModal(certId) {
    const modal = document.getElementById('certificateModal');
    const content = document.getElementById('certificateModalContent');
    
    const certifications = certificatesData.certifications || [];
    const cert = certifications.find(c => c.id === certId);
    if (!cert) return;
    
    content.innerHTML = `
        <h2 style="color: var(--text-primary); margin-bottom: 20px; text-align: center;">${cert.title}</h2>
        ${cert.image ? `
            <div class="modal-certificate-image" style="text-align: center;">
                <img src="${cert.image}" alt="${cert.title}" class="modal-certificate-preview" data-image-zoom-src="${cert.image}" data-image-zoom-alt="${cert.title}">
                <p style="font-size: 0.9em; color: var(--text-muted); margin-top: 10px; text-align: center;">Click image to enlarge</p>
            </div>
        ` : `
            <div style="text-align: center; margin: 30px 0;">
                <div style="width: 300px; height: 200px; background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%); 
                            border-radius: var(--radius-lg); margin: 0 auto; display: flex; align-items: center; justify-content: center; 
                            color: white; font-size: 3em; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <i class="fas fa-certificate"></i>
                </div>
            </div>
        `}
        <div style="text-align: center; background: var(--bg-tertiary); padding: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin: 20px 0; color: var(--text-secondary);">
            <p style="margin-bottom: 10px;"><strong>Issued by:</strong> ${cert.issuer}</p>
            <p style="margin-bottom: 10px;"><strong>Date:</strong> ${cert.date}</p>
            ${cert.category ? `<p style="margin-bottom: 10px;"><strong>Category:</strong> ${cert.category}</p>` : ''}
            ${cert.credential_id ? `<p style="margin-bottom: 10px;"><strong>Credential ID:</strong> ${cert.credential_id}</p>` : ''}
            <p style="margin-bottom: 0;"><strong>Description:</strong> ${cert.description}</p>
        </div>
        ${cert.skills ? `
            <div style="margin-top: 20px;">
                <h4 style="color: var(--secondary-color); margin-bottom: 10px;">Skills Acquired:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${cert.skills.map(skill => `
                        <span style="background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%); 
                                     color: white; padding: 5px 12px; border-radius: 15px; 
                                     font-size: 0.8em; font-weight: 500;">${skill}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${cert.verification_url ? `
            <div style="text-align: center; margin-top: 20px;">
                <a href="${cert.verification_url}" target="_blank" rel="noopener" style="color: var(--secondary-color); text-decoration: none; font-weight: 500;">
                    <i class="fas fa-external-link-alt"></i> Verify Certificate
                </a>
            </div>
        ` : ''}
    `;
    attachImageFallbacks(content);
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Image Zoom Functions
// ==========================================================================

/**
 * Open image zoom overlay
 * @param {string} imageSrc - Source of the image
 * @param {string} altText - Alt text for the image
 */
function openImageZoom(imageSrc, altText) {
    const overlay = document.getElementById('imageZoomOverlay');
    const zoomedImage = document.getElementById('zoomedImage');
    
    if (overlay && zoomedImage) {
        zoomedImage.src = imageSrc;
        zoomedImage.alt = altText;
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close image zoom overlay
 */
function closeImageZoom() {
    const overlay = document.getElementById('imageZoomOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==========================================================================
// Modal Functions
// ==========================================================================

/**
 * Close modal
 * @param {string} modalId - ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Close modal when clicking outside content area
 */
function handleModalClick(event) {
    const projectModal = document.getElementById('projectModal');
    const certificateModal = document.getElementById('certificateModal');
    const awardCertificateModal = document.getElementById('awardCertificateModal');
    const imageZoomOverlay = document.getElementById('imageZoomOverlay');
    
    if (event.target === projectModal) {
        closeModal('projectModal');
    }
    if (event.target === certificateModal) {
        closeModal('certificateModal');
    }
    if (event.target === awardCertificateModal) {
        closeModal('awardCertificateModal');
    }
    if (event.target === imageZoomOverlay) {
        closeImageZoom();
    }
}

// ==========================================================================
// Scroll to Top Functionality
// ==========================================================================

/**
 * Scroll smoothly to the top of the page with animation
 */
function scrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    
    // Add clicked animation
    if (scrollButton) {
        scrollButton.style.transform = 'scale(0.85) translateY(-3px)';
        setTimeout(() => {
            scrollButton.style.transform = '';
        }, 200);
    }
    
    // Use native smooth scroll for better performance
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Initialize scroll to top button functionality with enhanced effects
 */
function initializeScrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    if (!scrollButton) return;
    
    let isVisible = false;
    
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const shouldShow = scrollTop > 400;
        
        if (shouldShow !== isVisible) {
            isVisible = shouldShow;
            if (shouldShow) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        }
        
        // Progress indicator effect
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / maxScroll) * 100, 100);
        scrollButton.style.setProperty('--scroll-progress', `${progress}%`);
    }, 50);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Enhanced hover effects
    scrollButton.addEventListener('mouseenter', () => {
        scrollButton.style.transform = 'translateY(-8px) scale(1.1)';
        scrollButton.style.boxShadow = '0 12px 35px rgba(var(--primary-color-rgb), 0.4)';
    });
    
    scrollButton.addEventListener('mouseleave', () => {
        scrollButton.style.transform = 'translateY(0) scale(1)';
        scrollButton.style.boxShadow = '';
    });
}

// ==========================================================================
// Animation and UI Functions
// ==========================================================================

/**
 * Initialize intersection observer for animations
 */
function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.opacity = '1';
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);

    // Observe elements that should animate
    const animateElements = '.experience-item, .publication-item, .project-card, .certificate-card, .award-item, .activity-item, .news-item, .news-card, .highlight-card, .skill-item';
    document.querySelectorAll(animateElements).forEach(el => {
        el.style.transform = 'translateY(20px)';
        el.style.opacity = '0';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Add smooth scrolling to anchor links
 */
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.dataset.tab) return;

            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = CONFIG.headerHeight;
                const elementPosition = target.offsetTop - headerHeight;
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize keyboard navigation
 */
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Close modals with Escape key
        if (e.key === 'Escape') {
            closeModal('projectModal');
            closeModal('certificateModal');
            closeModal('awardCertificateModal');
            closeImageZoom();
        }
        
        // Navigate tabs with arrow keys (when focused on nav buttons)
        if (e.target instanceof Element && e.target.classList.contains('nav-btn')) {
            const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
            const currentIndex = navButtons.indexOf(e.target);
            
            if (e.key === 'ArrowRight' && currentIndex < navButtons.length - 1) {
                e.preventDefault();
                navButtons[currentIndex + 1].focus();
                navButtons[currentIndex + 1].click();
            } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                navButtons[currentIndex - 1].focus();
                navButtons[currentIndex - 1].click();
            }
        }
    });
}

/**
 * Initialize header effects with enhanced scroll behavior
 */
function initializeHeaderEffects() {
    const header = document.querySelector('.header-wrapper');
    if (!header) return;

    const handleScroll = throttle(updateHeaderThemeStyle, 16);

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial call
    handleScroll();
}

// ==========================================================================
// Event Listeners and Initialization
// ==========================================================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Academic Portfolio initializing - Enhanced UI/UX with Performance Optimizations');

    // Reveal the page (body starts at opacity:0 via CSS and fades in once loaded)
    document.body.classList.add('loaded');

    // Load all data from JSON files first with loading indicator
    const dataPromise = loadDataFromJSON();
    
    // Initialize critical components immediately
    initializeTheme(); // Initialize theme toggle functionality first
    initializeStaticEventHandlers();
    
    // Wait for data to load
    await dataPromise;
    
    // Initialize various components
    initializeSmoothScrolling();
    initializeKeyboardNavigation();
    initializeHeaderEffects();
    initializeScrollToTop();
    
    // Initialize tab from URL hash on page load
    initializeTabFromUrl();
    
    // Render home highlights (featured items; data already loaded)
    renderHighlights();

    // Populate the Google Scholar metrics card, then refresh it in the
    // background if the cached numbers are older than 12 hours
    renderScholarMetrics();
    initializeScholarAutoRefresh();

    // Set up modal click handlers
    window.addEventListener('click', handleModalClick);
    
    // Add mobile menu click outside listener
    document.addEventListener('click', closeMobileMenuOnClickOutside);
    
    // Initialize animations after a short delay
    setTimeout(initializeAnimations, 500);

    initializeFlagCounterPopup();

    // Show the bottom-left announcement popup a moment after load (data already loaded)
    setTimeout(renderAnnouncementPopup, 900);

    // Handle browser back/forward navigation
    window.addEventListener('hashchange', function() {
        const currentTab = getCurrentTab();
        showTab(currentTab);
    });
    
    // Add resize handler for responsive adjustments with debounce
    const handleResize = debounce(() => {
        const header = document.querySelector('.header-wrapper');
        if (header) {
            CONFIG.headerHeight = header.offsetHeight;
        }
        
        // Close mobile menu on desktop view
        if (window.innerWidth > 768) {
            const navMenu = document.querySelector('.nav-menu');
            const menuToggle = document.querySelector('.mobile-menu-toggle');
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
                document.body.style.overflow = '';
            }
        }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // Initial header height calculation
    setTimeout(() => {
        const header = document.querySelector('.header-wrapper');
        if (header) {
            CONFIG.headerHeight = header.offsetHeight;
        }
    }, 100);
    
    // Add performance monitoring
    if (window.performance && window.performance.timing) {
        window.addEventListener('load', () => {
            const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
            console.log(`📊 Page loaded in ${loadTime}ms`);
        });
    }
    
    // Preload critical images
    preloadImages([
        'assets/images/profile/saddiq-ur-rehman-profile.png',
        'assets/images/profile/saddiq-ur-rehman-profile-alt.jpg'
    ]);

    console.log('✅ Portfolio initialization complete with enhanced features');
});

/**
 * Preload images for better performance
 * @param {Array} imageUrls - Array of image URLs to preload
 */
function preloadImages(imageUrls) {
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

// ==========================================================================
// Error Handling
// ==========================================================================

/**
 * Global error handler
 */
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

// ==========================================================================
// Export functions for global access
// ==========================================================================

// Make functions available globally
window.showTab = showTab;
window.showPublications = showPublications;
window.openProjectModal = openProjectModal;
window.openCertificateModal = openCertificateModal;
window.openAwardCertificate = openAwardCertificate;
window.closeModal = closeModal;
window.openImageZoom = openImageZoom;
window.closeImageZoom = closeImageZoom;
window.scrollToTop = scrollToTop;
window.toggleMobileMenu = toggleMobileMenu;

//FLAG COUNTER JS

function initializeFlagCounterPopup() {
    const popup    = document.getElementById("flagcounter-popup");
    const flagIcon = document.querySelector(".social-icon.flagcounter-icon");
    let isOpen     = false;

    if (!popup || !flagIcon) return;

    function closePopup() {
        popup.style.display = "none";
        isOpen = false;
    }

    function showPopup() {
        // If it's already open, toggle it closed
        if (isOpen) {
            closePopup();
            return;
        }

        // Temporarily render the popup (invisible) so we can measure its real width
        popup.style.visibility = "hidden";
        popup.style.display    = "block";

        // Compute icon's on‐screen position
        const rect       = flagIcon.getBoundingClientRect();
        const scrollTop  = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        // Measure the popup's actual rendered width now that it's in the DOM
        const popupW = popup.offsetWidth;

        // Place popup so that its RIGHT edge is flush with the icon's LEFT edge (opens to the left)
        const x = scrollLeft + rect.left - popupW;

        // Align the TOP edges of popup and icon
        const y = scrollTop + rect.top;

        popup.style.left       = x + "px";
        popup.style.top        = y + "px";
        popup.style.visibility = "";
        isOpen = true;
    }

    // Toggle popup when flag icon is clicked
    flagIcon.addEventListener("click", (evt) => {
        evt.preventDefault();
        showPopup();
    });

    // If you click anywhere outside both the popup and the icon, close it
    window.addEventListener("click", (evt) => {
        if (!(evt.target instanceof Element)) return;

        if (
            !popup.contains(evt.target) &&
            !evt.target.closest(".social-icon.flagcounter-icon")
        ) {
            closePopup();
        }
    });

    // "✕" inside the popup also closes it
    const closeBtn = popup.querySelector(".close-popup");
    if (closeBtn) {
        closeBtn.addEventListener("click", (evt) => {
            evt.stopPropagation();
            closePopup();
        });
    }
}

// ==========================================================================
// Announcement Popup (bottom-right, data-driven from data/announcements.json)
// ==========================================================================

/**
 * Local calendar date as YYYY-MM-DD (used for the "Don't show today" snooze).
 */
function announcementToday() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/**
 * Render the bottom-right announcement popup.
 * Shows every entry in data/announcements.json whose "enabled" is not false and
 * that has not been snoozed for the current day. Dismissal behaviour:
 *   - The ✕ closes the card for this visit only; it reappears on the next load.
 *   - "Don't show today" snoozes that announcement until tomorrow (per id, in
 *     localStorage).
 * To add a popup: append an object to announcements.json. To hide one for good:
 * set "enabled": false. This mirrors how highlights are toggled with "featured".
 */
function renderAnnouncementPopup() {
    const today = announcementToday();
    const items = (Array.isArray(announcementsData) ? announcementsData : [])
        .filter(a => a && a.enabled !== false)
        .filter(a => {
            try { return localStorage.getItem('announcement-snooze:' + a.id) !== today; }
            catch (e) { return true; }
        });

    if (items.length === 0) return;

    // Reuse an existing container or create one appended to <body>.
    let container = document.getElementById('announcement-popup');
    if (!container) {
        container = document.createElement('div');
        container.id = 'announcement-popup';
        container.className = 'announcement-popup';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Site announcements');
        document.body.appendChild(container);
    }

    container.innerHTML = items.map(a => {
        const typeClass = newsTypeClass(a.type || 'Announcement');
        const icon = escapeHtml(a.icon || 'fas fa-bullhorn');
        const type = a.type ? `<span class="announcement-type">${escapeHtml(a.type)}</span>` : '';
        const title = a.title ? `<span class="announcement-title">${escapeHtml(a.title)}</span>` : '';
        const message = a.message ? `<span class="announcement-message">${escapeHtml(a.message)}</span>` : '';
        const link = (a.link && /^https?:/i.test(a.link))
            ? `<a class="announcement-link" href="${escapeHtml(a.link)}" target="_blank" rel="noopener">
                 ${escapeHtml(a.linkLabel || 'Learn more')} <i class="fas fa-arrow-right"></i>
               </a>`
            : '';
        return `
            <div class="announcement-card news-type-${typeClass}" role="status" data-announcement-id="${escapeHtml(a.id || '')}">
                <i class="${icon} announcement-icon" aria-hidden="true"></i>
                <div class="announcement-body">
                    ${type}
                    ${title}
                    ${message}
                    ${link}
                    <div class="announcement-actions">
                        <button type="button" class="announcement-snooze">Don't show today</button>
                    </div>
                </div>
                <button type="button" class="announcement-close" aria-label="Close for now" title="Close">✕</button>
            </div>
        `;
    }).join('');

    // Fade a card out; drop the container once its last card is gone.
    const hideCard = (card) => {
        card.classList.add('announcement-hiding');
        setTimeout(() => {
            card.remove();
            if (!container.querySelector('.announcement-card')) container.remove();
        }, 320);
    };

    container.querySelectorAll('.announcement-card').forEach(card => {
        const id = card.getAttribute('data-announcement-id');

        // ✕ closes for this visit only; it reappears on the next page load.
        const closeBtn = card.querySelector('.announcement-close');
        if (closeBtn) closeBtn.addEventListener('click', () => hideCard(card));

        // "Don't show today" suppresses this announcement until tomorrow.
        const snoozeBtn = card.querySelector('.announcement-snooze');
        if (snoozeBtn) snoozeBtn.addEventListener('click', () => {
            if (id) {
                try { localStorage.setItem('announcement-snooze:' + id, announcementToday()); }
                catch (e) { /* storage blocked */ }
            }
            hideCard(card);
        });
    });

    // Celebrate the announcement with a confetti burst around the popup itself
    // (skipped for reduced motion).
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) launchConfetti(container);
}

/**
 * Fire a lightweight, self-contained confetti burst (no libraries) that stays
 * near the popup. Pieces originate at the top-center of `originEl`, arc up and
 * outward, then fall back down before the container cleans itself up.
 * @param {HTMLElement} originEl - element the burst should emanate from
 */
function launchConfetti(originEl) {
    const COLORS = ['#d4af37', '#f5c542', '#60a5fa', '#0284c7', '#c084fc', '#10b981', '#ec4899', '#f39c12'];
    const PIECES = 60;

    // Emanate from the top-center of the popup; fall back on bottom-right corner.
    let ox, oy;
    const rect = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
    if (rect && rect.width) {
        ox = rect.left + rect.width / 2;
        oy = rect.top + 6;
    } else {
        ox = window.innerWidth - 150;
        oy = window.innerHeight - 140;
    }

    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.setAttribute('aria-hidden', 'true');
    container.style.left = ox + 'px';
    container.style.top = oy + 'px';

    const frag = document.createDocumentFragment();
    for (let i = 0; i < PIECES; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        const size = 6 + Math.random() * 7;
        piece.style.width = size + 'px';
        piece.style.height = (size * (0.6 + Math.random() * 0.9)) + 'px';
        piece.style.background = COLORS[(Math.random() * COLORS.length) | 0];
        if (Math.random() < 0.35) piece.style.borderRadius = '50%';
        // Trajectory: horizontal spread, an upward peak, then a downward landing.
        piece.style.setProperty('--tx', (Math.random() * 300 - 150).toFixed(0) + 'px');
        piece.style.setProperty('--peak', (-(60 + Math.random() * 120)).toFixed(0) + 'px');
        piece.style.setProperty('--ty', (30 + Math.random() * 150).toFixed(0) + 'px');
        piece.style.setProperty('--spin', (Math.random() * 720 + 300).toFixed(0) + 'deg');
        piece.style.setProperty('--fall-duration', (1.5 + Math.random() * 1.1).toFixed(2) + 's');
        piece.style.setProperty('--fall-delay', (Math.random() * 0.2).toFixed(2) + 's');
        frag.appendChild(piece);
    }
    container.appendChild(frag);
    document.body.appendChild(container);

    // Remove after the longest possible piece lifetime (duration max + delay max).
    setTimeout(() => container.remove(), 3200);
}

// ==========================================================================
// Software/Tools Tab Functions
// ==========================================================================

/**
 * Render the Software tab (nav buttons + tool sections) from data/software.json.
 * Reproduces the original markup so existing CSS continues to apply.
 */
function renderSoftwareContent() {
    const nav = document.querySelector('.tools-nav');
    const container = document.querySelector('.tools-content-container');
    if (!nav || !container) return;
    if (!Array.isArray(softwareData) || softwareData.length === 0) return;

    nav.innerHTML = softwareData.map((tool, i) => `
        <button type="button" class="tool-nav-btn${i === 0 ? ' active' : ''}" data-tool="${escapeHtml(tool.id)}">
            <i class="${escapeHtml(tool.navIcon || 'fas fa-cube')}"></i>
            ${escapeHtml(tool.navLabel || tool.title)}
        </button>
    `).join('');

    container.innerHTML = softwareData.map((tool, i) => renderSoftwareTool(tool, i === 0)).join('');
}

function renderSoftwareTool(tool, active) {
    const badges = (tool.badges || []).map(b =>
        `<span class="pub-badge ${escapeHtml(b.variant || 'impact-factor')}">${escapeHtml(b.label)}</span>`).join('');
    const badgesHtml = badges ? `<div class="tool-badges">${badges}</div>` : '';

    const actions = (tool.actions || []).map(a =>
        `<a href="${escapeHtml(a.href)}" target="_blank" rel="noopener" class="doi-link${a.variant ? ' ' + escapeHtml(a.variant) : ''}">
            <i class="${escapeHtml(a.icon || 'fas fa-link')}"></i> ${escapeHtml(a.label)}
        </a>`).join('');
    const actionsHtml = actions ? `<div class="tool-actions">${actions}</div>` : '';

    const sections = (tool.sections || []).map(renderSoftwareSection).join('');

    return `
        <div id="${escapeHtml(tool.id)}" class="tool-content${active ? ' active' : ''}">
            <div class="tool-header">
                <h2 class="section-title">${escapeHtml(tool.title)}</h2>
                <p class="tool-description">${escapeHtml(tool.description || '')}</p>
                ${badgesHtml}
                ${actionsHtml}
            </div>
            <div class="tool-details">
                ${sections}
            </div>
        </div>
    `;
}

function renderSoftwareSection(section) {
    switch (section.type) {
        case 'info':
            // Paragraphs may contain trusted inline HTML (<strong>, <code>).
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                ${(section.paragraphs || []).map(p => `<p class="bio-text">${p}</p>`).join('')}
            </div>`;
        case 'features':
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                <ul class="software-features-list">
                    ${(section.items || []).map(it => `<li><i class="${escapeHtml(it.icon || 'fas fa-check')}"></i>${it.html}</li>`).join('')}
                </ul>
            </div>`;
        case 'featureGrid':
            return `<div class="tool-features-grid">
                ${(section.cards || []).map(renderSoftwareFeatureCard).join('')}
            </div>`;
        case 'code':
            return `<div class="tool-info-section">
                <h3 class="info-title">${escapeHtml(section.title)}</h3>
                ${(section.paragraphs || []).map(p => `<p class="bio-text">${p}</p>`).join('')}
                <pre class="install-code-block"><code>${escapeHtml(section.code || '')}</code></pre>
            </div>`;
        case 'media':
            return renderSoftwareMedia(section);
        default:
            return '';
    }
}

function renderSoftwareFeatureCard(card) {
    const caps = (card.capabilities || []).map(c =>
        `<div class="capability-item"><i class="${escapeHtml(c.icon || 'fas fa-check')}"></i><span>${escapeHtml(c.label)}</span></div>`).join('');
    const capsHtml = caps ? `<div class="capabilities-grid">${caps}</div>` : '';
    return `<div class="experience-item">
        <div class="exp-header">
            <div class="company-logo"><i class="${escapeHtml(card.icon || 'fas fa-cube')}"></i></div>
            <div class="exp-details">
                <h3>${escapeHtml(card.title)}</h3>
                <p class="company-name">${escapeHtml(card.subtitle || '')}</p>
                <p class="exp-duration">${escapeHtml(card.duration || '')}</p>
            </div>
        </div>
        ${capsHtml}
    </div>`;
}

function renderSoftwareMedia(section) {
    const sectionClass = section.media === 'video' ? 'tool-video-section' : 'tool-info-section';
    const wrapClass = section.autoWrap ? 'video-wrapper media-wrapper-auto' : 'video-wrapper';
    const inner = section.media === 'video'
        ? `<iframe src="${escapeHtml(section.src)}" title="${escapeHtml(section.iframeTitle || section.title || '')}" allowfullscreen></iframe>`
        : `<img src="${escapeHtml(section.src)}" alt="${escapeHtml(section.alt || '')}" class="${escapeHtml(section.imageClass || 'media-image-contain')}">`;
    return `<div class="${sectionClass}">
        <h3 class="info-title">${escapeHtml(section.title)}</h3>
        <div class="${wrapClass}">
            ${inner}
        </div>
    </div>`;
}

/**
 * Show specific software tool
 * @param {string} toolId - ID of the tool to show
 */
function showTool(toolId) {
    // Hide all tool contents
    const toolContents = document.querySelectorAll('.tool-content');
    toolContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.tool-nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tool content
    const selectedTool = document.getElementById(toolId);
    if (selectedTool) {
        selectedTool.classList.add('active');
    }

    // Add active class to selected nav button
    const selectedBtn = document.querySelector(`[data-tool="${toolId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }

    // Scroll to top of content area
    const contentContainer = document.querySelector('.tools-content-container');
    if (contentContainer) {
        contentContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Initialize software tools functionality
 */
function initializeSoftwareTools() {
    // Build the tab from data/software.json first, then wire up the nav.
    renderSoftwareContent();

    const navButtons = document.querySelectorAll('.tool-nav-btn');

    // Add click event listeners to nav buttons
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const toolId = btn.getAttribute('data-tool');
            showTool(toolId);
        });
    });

    // Show the first tool by default
    const defaultTool = (softwareData[0] && softwareData[0].id) || 'reunixchange';
    showTool(defaultTool);
}

// ==========================================================================
// Contact Tab Functions
// ==========================================================================

/**
 * Initialize EmailJS
 */
function initializeEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your actual EmailJS public key
        console.log('EmailJS initialized');
    } else {
        console.log('EmailJS not available - using fallback');
    }
}

/**
 * Handle contact form submission
 */
function handleFormSubmission(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const messageAlert = document.getElementById('messageAlert');

    if (!submitBtn || !messageAlert) {
        console.error('Required form elements not found');
        return;
    }

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Disable submit button while the message is being sent
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    // Get form data
    const formData = {
        name: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        subject: document.getElementById('subject')?.value || '',
        message: document.getElementById('message')?.value || '',
        to_email: 'saddiq.r.97@gmail.com'
    };

    // Simulate email sending (replace with actual EmailJS when configured)
    setTimeout(() => {
        showMessage('success', 'Thank you! Your message has been sent successfully. I will get back to you within 24 hours.');
        const form = document.getElementById('contactForm');
        if (form) form.reset();

        // Reset submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }, 2000);
}

/**
 * Show success or error message
 */
function showMessage(type, text) {
    const messageAlert = document.getElementById('messageAlert');
    if (!messageAlert) return;

    messageAlert.className = `message ${type}`;
    messageAlert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${text}
    `;

    if (messageAlert.classList) {
        messageAlert.classList.add('show');
    }

    // Hide message after 5 seconds
    setTimeout(() => {
        if (messageAlert.classList) {
            messageAlert.classList.remove('show');
        }
    }, 5000);
}

/**
 * Form validation
 */
function validateForm() {
    const name = document.getElementById('name')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const subject = document.getElementById('subject')?.value?.trim() || '';
    const message = document.getElementById('message')?.value?.trim() || '';

    if (!name || !email || !subject || !message) {
        showMessage('error', 'Please fill in all required fields.');
        return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('error', 'Please enter a valid email address.');
        return false;
    }

    return true;
}

/**
 * Initialize Leaflet Map
 */
let mapInstance = null;

function initializeMap() {
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) return;

    // If map already exists, remove it
    if (mapInstance) {
        mapInstance.remove();
    }

    // Exact coordinates for Kyung Hee University College of Engineering
    const lat = 37.2464;
    const lng = 127.0809;

    // Initialize the map with center coordinates
    mapInstance = L.map('map', {
        center: [lat, lng],
        zoom: 18,
        scrollWheelZoom: true,
        zoomControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(mapInstance);

    // Add marker
    const marker = L.marker([lat, lng]).addTo(mapInstance);

    // Add a circle to highlight the area
    L.circle([lat, lng], {
        color: '#3498db',
        fillColor: '#3498db',
        fillOpacity: 0.2,
        radius: 100
    }).addTo(mapInstance);

    // Force map to invalidate size and recenter after tiles load
    setTimeout(() => {
        mapInstance.invalidateSize();
        mapInstance.setView([lat, lng], 18);
    }, 250);

    console.log('Map initialized successfully');
}

/**
 * Copy address functionality
 */
function copyAddress() {
    const address = "Kyung Hee University, Global Campus, 1732 Deogyeong-daero, Giheung-gu, Yongin-si, Gyeonggi-do, South Korea";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(() => {
            showMessage('success', 'Address copied to clipboard!');
        }).catch(() => {
            showMessage('error', 'Could not copy address. Please select and copy manually.');
        });
    } else {
        showMessage('error', 'Copy to clipboard not supported. Please select and copy manually.');
    }
}

/**
 * Initialize contact animations
 */
function initializeContactAnimations() {
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach((item, index) => {
        if (item) {
            setTimeout(() => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'all 0.6s ease';

                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 100);
            }, index * 100);
        }
    });
}

/**
 * Initialize action buttons
 */
function initializeActionButtons() {
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        if (button) {
            button.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-2px) scale(1.05)';
            });

            button.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0) scale(1)';
            });
        }
    });
}

// ==========================================================================
// Academic Collaboration Network (interactive co-authorship graph)
// ==========================================================================

const collabNet = {
    initialized: false,
    canvas: null,
    ctx: null,
    tooltip: null,
    legend: null,
    wrap: null,
    mode: 'author',
    dim: '2d',
    nodes: [],
    center: null,
    width: 0,
    height: 0,
    dpr: 1,
    alpha: 1,
    running: false,
    rafId: null,
    hovered: null,
    dragging: null,
    dragMoved: false,
    // 3D camera / rotation state
    rotX: -0.35,
    rotY: 0.6,
    autoSpin: 0.0032,
    focal: 820,
    visible: true,
    reducedMotion: false,
    // Shared camera (zoom + pan) for both 2D and 3D
    zoom: 1,
    panX: 0,
    panY: 0,
    minZoom: 0.35,
    maxZoom: 5,
    action: 'none', // 'none' | 'orbit' | 'pan' | 'dragNode'
    dragNode: null,
    lastPx: 0,
    lastPy: 0,
    countryColors: {},
    palette: ['#0ea5e9', '#16a34a', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#ec4899', '#6366f1']
};

// Fallback for CanvasRenderingContext2D.roundRect (older browsers)
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
        else r = { tl: r[0], tr: r[1] || r[0], br: r[2] || r[0], bl: r[3] || r[0] };
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        return this;
    };
}

/**
 * Read a collaborator's affiliation regardless of the key used in JSON
 * (supports "university", "Industry", "industry", "affiliation").
 */
function collabAffiliation(item) {
    return item.university || item.Industry || item.industry || item.affiliation || '';
}

/**
 * Resolve a stable color for a country from the palette.
 */
function collabCountryColor(country) {
    if (!country) return '#64748b';
    if (!collabNet.countryColors[country]) {
        const idx = Object.keys(collabNet.countryColors).length % collabNet.palette.length;
        collabNet.countryColors[country] = collabNet.palette[idx];
    }
    return collabNet.countryColors[country];
}

/**
 * Entry point, called when the Activities tab is shown.
 */
function initCollaborationNetwork() {
    const canvas = document.getElementById('collab-canvas');
    if (!canvas || !collaborationsData) return;

    if (!collabNet.initialized) {
        collabNet.canvas = canvas;
        collabNet.ctx = canvas.getContext('2d');
        collabNet.tooltip = document.getElementById('collab-tooltip');
        collabNet.legend = document.getElementById('collab-legend');
        collabNet.wrap = canvas.closest('.collab-canvas-wrap');
        collabNet.reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // View mode buttons (author / university / country)
        document.querySelectorAll('.collab-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.collab-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                collabNet.mode = btn.dataset.mode;
                buildCollabGraph();
            });
        });

        // Dimension buttons (2D / 3D)
        document.querySelectorAll('.collab-dim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.collab-dim-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                collabNet.dim = btn.dataset.dim;
                if (collabNet.wrap) collabNet.wrap.classList.toggle('is-3d', collabNet.dim === '3d');
                buildCollabGraph();
            });
        });

        const resetBtn = document.getElementById('collab-reset');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            collabNet.rotX = -0.35;
            collabNet.rotY = 0.6;
            collabNet.zoom = 1;
            collabNet.panX = 0;
            collabNet.panY = 0;
            buildCollabGraph();
        });

        bindCollabPointerEvents();
        window.addEventListener('resize', collabResize);

        // Pause the loop when the graph scrolls out of view / tab is hidden
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                collabNet.visible = entries[0].isIntersecting;
                if (collabNet.visible) ensureCollabRunning();
            }, { threshold: 0.01 });
            io.observe(collabNet.wrap);
        }

        collabNet.initialized = true;
    }

    // The Activities tab becomes visible inside a requestAnimationFrame, so the
    // container may still be display:none (zero width) right now. Wait until it
    // has a real size before sizing the canvas and laying out the graph.
    collabWhenVisible(() => {
        collabResize();
        buildCollabGraph();
    });
}

/**
 * Run a callback once the network container has a non-zero width, retrying on
 * subsequent animation frames (capped) while the tab finishes becoming visible.
 */
function collabWhenVisible(cb, attempts) {
    attempts = attempts || 0;
    const wrap = collabNet.wrap;
    if (wrap && wrap.getBoundingClientRect().width > 0) {
        cb();
    } else if (attempts < 60) {
        requestAnimationFrame(() => collabWhenVisible(cb, attempts + 1));
    }
}

/**
 * Size the canvas to its container with device-pixel-ratio support.
 */
function collabResize() {
    const { canvas, wrap } = collabNet;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    collabNet.width = rect.width;
    collabNet.height = rect.height;
    collabNet.dpr = dpr;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    collabNet.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    startCollabSim();
}

/**
 * Build the node set for the currently selected mode/dimension and (re)start
 * the layout. Works for both the 2D (canvas-space) and 3D (model-space) paths.
 */
function buildCollabGraph() {
    const data = collaborationsData;
    if (!data) return;

    let items = [];
    if (collabNet.mode === 'university') items = data.byUniversity || [];
    else if (collabNet.mode === 'country') items = data.byCountry || [];
    else items = data.byAuthor || [];

    const cx = collabNet.width / 2;
    const cy = collabNet.height / 2;
    const maxPapers = Math.max(1, ...items.map(i => i.papers || 1));
    const is3D = collabNet.dim === '3d';

    // Center node (me)
    collabNet.center = {
        id: '__center__',
        label: (data.center && data.center.shortName) || 'Me',
        isCenter: true,
        papers: 0,
        x: cx, y: cy,
        mx: 0, my: 0, mz: 0,
        vx: 0, vy: 0, vz: 0,
        r: 30,
        sr: 30,
        sx: 0, sy: 0,
        scale: 1,
        depth: 0,
        color: '#4f46e5',
        meta: data.center || {}
    };

    const n = items.length;
    collabNet.nodes = items.map((item, i) => {
        const country = collabNet.mode === 'country' ? item.name : item.country;
        const papers = item.papers || 1;
        const r = 12 + 16 * Math.sqrt(papers / maxPapers);

        // 2D seed position: radial ring around canvas centre
        const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
        const radius2d = Math.min(collabNet.width, collabNet.height) * 0.32 + (Math.random() * 40 - 20);

        // 3D seed position: even spread on a sphere (Fibonacci), radius by ties
        const k = i + 0.5;
        const phi = Math.acos(1 - (2 * k) / Math.max(1, n));
        const theta = Math.PI * (1 + Math.sqrt(5)) * k;
        const rad3d = 240 - 95 * (papers / maxPapers);

        return {
            id: 'n' + i,
            label: item.name,
            papers,
            isCenter: false,
            x: cx + Math.cos(angle) * radius2d,
            y: cy + Math.sin(angle) * radius2d,
            mx: Math.sin(phi) * Math.cos(theta) * rad3d,
            my: Math.sin(phi) * Math.sin(theta) * rad3d,
            mz: Math.cos(phi) * rad3d,
            vx: 0, vy: 0, vz: 0,
            r,
            sr: r,
            sx: 0, sy: 0,
            scale: 1,
            depth: 0,
            color: collabCountryColor(country),
            fixed: false,
            meta: {
                affiliation: collabNet.mode === 'author' ? collabAffiliation(item) : item.name,
                university: item.name,
                country: item.country || (collabNet.mode === 'country' ? item.name : ''),
                authors: item.authors
            }
        };
    });

    collabNet.maxPapers = maxPapers;
    collabNet.is3D = is3D;
    renderCollabLegend();
    startCollabSim();
}

/**
 * Render the country color legend.
 */
function renderCollabLegend() {
    const legend = collabNet.legend;
    if (!legend) return;
    const countries = Object.keys(collabNet.countryColors);
    if (collabNet.mode === 'university' || collabNet.mode === 'country' || collabNet.mode === 'author') {
        legend.innerHTML = countries
            .map(c => `<div class="legend-item"><span class="legend-dot" style="background:${collabNet.countryColors[c]}"></span>${c}</div>`)
            .join('');
        legend.style.display = countries.length ? 'flex' : 'none';
    }
}

/**
 * Begin / re-heat the force simulation (resets layout energy).
 */
function startCollabSim() {
    collabNet.alpha = 1;
    ensureCollabRunning();
}

/**
 * Resume the render loop without re-heating the layout (e.g. hover, orbit).
 */
function ensureCollabRunning() {
    if (!collabNet.running && collabNet.visible) {
        collabNet.running = true;
        collabNet.rafId = requestAnimationFrame(collabTick);
    }
}

/**
 * Main animation tick: integrate forces (while warm), spin (3D) and draw.
 */
function collabTick() {
    if (!collabNet.visible) { collabNet.running = false; return; }

    const warm = collabNet.alpha > 0.01;
    if (warm) stepCollabPhysics();

    // Continuous auto-rotation in 3D mode (paused while interacting / inspecting)
    const spinning = collabNet.is3D && collabNet.action === 'none' &&
        !collabNet.hovered && !collabNet.reducedMotion;
    if (spinning) collabNet.rotY += collabNet.autoSpin;

    drawCollab();

    if (warm || spinning || collabNet.hovered || collabNet.action !== 'none') {
        collabNet.rafId = requestAnimationFrame(collabTick);
    } else {
        collabNet.running = false;
    }
}

/**
 * One step of the force-directed layout (delegates to 2D or 3D).
 */
function stepCollabPhysics() {
    if (collabNet.is3D) { stepCollabPhysics3D(); return; }

    const nodes = collabNet.nodes;
    const center = collabNet.center;
    const cx = collabNet.width / 2;
    const cy = collabNet.height / 2;
    const maxPapers = collabNet.maxPapers || 1;
    const alpha = collabNet.alpha;

    // Pin the center
    center.x = cx;
    center.y = cy;

    // Repulsion between satellite nodes
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let dist2 = dx * dx + dy * dy;
            if (dist2 < 1) { dist2 = 1; dx = Math.random(); dy = Math.random(); }
            const dist = Math.sqrt(dist2);
            const minDist = a.r + b.r + 14;
            const strength = (3200 + (minDist * minDist) * 0.6) / dist2;
            const fx = (dx / dist) * strength * alpha;
            const fy = (dy / dist) * strength * alpha;
            if (!a.fixed) { a.vx += fx; a.vy += fy; }
            if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
        }
    }

    // Spring from center: stronger ties (more papers) sit closer
    for (const node of nodes) {
        if (node.fixed) continue;
        const dx = node.x - center.x;
        const dy = node.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const rest = 220 - 90 * (node.papers / maxPapers);
        const k = 0.02;
        const disp = dist - rest;
        const fx = (dx / dist) * disp * k * alpha;
        const fy = (dy / dist) * disp * k * alpha;
        node.vx -= fx;
        node.vy -= fy;
    }

    // Integrate + damping + keep inside bounds
    for (const node of nodes) {
        if (node.fixed) { node.vx = 0; node.vy = 0; continue; }
        node.vx *= 0.86;
        node.vy *= 0.86;
        node.x += node.vx * 0.5;
        node.y += node.vy * 0.5;
        const pad = node.r + 6;
        node.x = Math.max(pad, Math.min(collabNet.width - pad, node.x));
        node.y = Math.max(pad, Math.min(collabNet.height - pad, node.y));
    }

    collabNet.alpha *= 0.97;
}

/**
 * One step of the 3D force-directed layout (model space, origin-centred).
 */
function stepCollabPhysics3D() {
    const nodes = collabNet.nodes;
    const center = collabNet.center;
    const maxPapers = collabNet.maxPapers || 1;
    const alpha = collabNet.alpha;

    center.mx = 0; center.my = 0; center.mz = 0;

    // Repulsion between satellite nodes (3D)
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j];
            let dx = a.mx - b.mx;
            let dy = a.my - b.my;
            let dz = a.mz - b.mz;
            let dist2 = dx * dx + dy * dy + dz * dz;
            if (dist2 < 1) { dist2 = 1; dx = Math.random(); dy = Math.random(); dz = Math.random(); }
            const dist = Math.sqrt(dist2);
            const strength = (5200 + (a.r + b.r) * (a.r + b.r)) / dist2;
            const fx = (dx / dist) * strength * alpha;
            const fy = (dy / dist) * strength * alpha;
            const fz = (dz / dist) * strength * alpha;
            a.vx += fx; a.vy += fy; a.vz += fz;
            b.vx -= fx; b.vy -= fy; b.vz -= fz;
        }
    }

    // Spring toward the origin: stronger ties sit closer
    for (const node of nodes) {
        const dist = Math.sqrt(node.mx * node.mx + node.my * node.my + node.mz * node.mz) || 1;
        const rest = 250 - 100 * (node.papers / maxPapers);
        const disp = dist - rest;
        const k = 0.02;
        node.vx -= (node.mx / dist) * disp * k * alpha;
        node.vy -= (node.my / dist) * disp * k * alpha;
        node.vz -= (node.mz / dist) * disp * k * alpha;
    }

    // Integrate + damping
    for (const node of nodes) {
        node.vx *= 0.85; node.vy *= 0.85; node.vz *= 0.85;
        node.mx += node.vx * 0.5;
        node.my += node.vy * 0.5;
        node.mz += node.vz * 0.5;
    }

    collabNet.alpha *= 0.97;
}

/**
 * Project a model-space point (x,y,z) to screen space using the current
 * rotation and a simple perspective camera.
 */
function collabProject(x, y, z) {
    const cosY = Math.cos(collabNet.rotY), sinY = Math.sin(collabNet.rotY);
    const cosX = Math.cos(collabNet.rotX), sinX = Math.sin(collabNet.rotX);
    // Yaw (around Y), then pitch (around X)
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const focal = collabNet.focal;
    const scale = focal / (focal + z2);
    return {
        x: collabNet.width / 2 + x1 * scale,
        y: collabNet.height / 2 + y2 * scale,
        scale,
        depth: z2
    };
}

/**
 * Apply the shared camera (zoom about the canvas centre + pan) to a point.
 */
function collabApplyCamera(px, py) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    return {
        x: (px - cx) * collabNet.zoom + cx + collabNet.panX,
        y: (py - cy) * collabNet.zoom + cy + collabNet.panY
    };
}

/**
 * Inverse of collabApplyCamera: screen point -> pre-camera (world) point.
 */
function collabScreenToWorld(sx, sy) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    return {
        x: (sx - collabNet.panX - cx) / collabNet.zoom + cx,
        y: (sy - collabNet.panY - cy) / collabNet.zoom + cy
    };
}

/**
 * Compute final screen coords (sx, sy, sr, depth) for every node + the centre,
 * handling the 2D (canvas-space) and 3D (projected) cases plus the camera.
 */
function collabComputeScreen() {
    const { center, nodes } = collabNet;
    const is3D = collabNet.is3D;
    const z = collabNet.zoom;

    const place = (node, pre) => {
        const s = collabApplyCamera(pre.x, pre.y);
        node.sx = s.x;
        node.sy = s.y;
        node.scale = pre.scale;
        node.depth = pre.depth;
        node.sr = node.r * pre.scale * z;
    };

    const cPre = is3D
        ? collabProject(center.mx, center.my, center.mz)
        : { x: collabNet.width / 2, y: collabNet.height / 2, scale: 1, depth: 0 };
    place(center, cPre);

    let minD = Infinity, maxD = -Infinity;
    for (const node of nodes) {
        const pre = is3D
            ? collabProject(node.mx, node.my, node.mz)
            : { x: node.x, y: node.y, scale: 1, depth: 0 };
        place(node, pre);
        if (pre.depth < minD) minD = pre.depth;
        if (pre.depth > maxD) maxD = pre.depth;
    }
    collabNet._minD = minD;
    collabNet._dRange = (maxD - minD) || 1;
}

/**
 * Draw edges, labels and nodes for both 2D and 3D (camera-aware, depth-shaded).
 */
function drawCollab() {
    const { ctx, width, height, center, nodes, hovered } = collabNet;
    if (!ctx) return;

    collabComputeScreen();

    ctx.clearRect(0, 0, width, height);
    const styles = getComputedStyle(document.documentElement);
    const colors = {
        textColor: (styles.getPropertyValue('--text-primary') || '#000').trim(),
        subColor: (styles.getPropertyValue('--text-secondary') || '#333').trim(),
        cardBg: (styles.getPropertyValue('--bg-secondary') || '#fff').trim()
    };
    const maxPapers = collabNet.maxPapers || 1;
    const is3D = collabNet.is3D;
    const z = collabNet.zoom;
    const depthAlpha = (d) => is3D
        ? 0.45 + 0.55 * (1 - (d - collabNet._minD) / collabNet._dRange)
        : 1;

    // Edges (far to near in 3D)
    const order = is3D ? nodes.slice().sort((a, b) => b.depth - a.depth) : nodes;
    for (const node of order) {
        const active = hovered && (hovered === node || hovered === center);
        const avgScale = (center.scale + node.scale) / 2;
        const w = Math.max(1, (1 + (node.papers / maxPapers) * 11) * avgScale * z);
        let a = is3D ? depthAlpha(node.depth) * 0.7 : 0.45;
        if (hovered) a = active ? 0.95 : (is3D ? 0.12 : 0.18);
        ctx.beginPath();
        ctx.moveTo(center.sx, center.sy);
        ctx.lineTo(node.sx, node.sy);
        ctx.strokeStyle = node.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Nodes + centre, far to near so nearer overlaps farther
    const all = is3D
        ? nodes.concat([center]).sort((a, b) => b.depth - a.depth)
        : nodes.concat([center]);
    for (const node of all) {
        const baseAlpha = node.isCenter ? 1 : depthAlpha(node.depth);
        collabDrawNode(ctx, node, node.isCenter, node.scale * z, baseAlpha, colors);
    }

    // Edge weight pills on top
    for (const node of nodes) {
        const dim = hovered && hovered !== node && hovered !== center;
        const avgScale = (center.scale + node.scale) / 2 * z;
        const mx = (center.sx + node.sx) / 2;
        const my = (center.sy + node.sy) / 2;
        const alpha = (dim ? 0.22 : 1) * (is3D ? 0.5 + 0.5 * depthAlpha(node.depth) : 1);
        collabDrawEdgeLabel(ctx, String(node.papers), mx, my, node.color, Math.max(0.7, avgScale), alpha);
    }
}

/**
 * Draw a single node (circle + label) using its computed screen coords.
 */
function collabDrawNode(ctx, node, isCenter, scale, baseAlpha, colors) {
    const hovered = collabNet.hovered;
    const dimmed = hovered && hovered !== node && !isCenter;
    const r = Math.max(2, node.sr || node.r);
    const alpha = (dimmed ? 0.35 : 1) * baseAlpha;
    const sc = Math.min(1.6, Math.max(0.6, scale));

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(node.sx, node.sy, r, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.shadowColor = node.color;
    ctx.shadowBlur = (hovered === node ? 22 : 10) * sc;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = (isCenter ? 3 : 2) * sc;
    ctx.strokeStyle = colors.cardBg;
    ctx.stroke();

    if (isCenter) {
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, Math.max(2, r - 6 * sc), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Label
    ctx.globalAlpha = (dimmed ? 0.4 : 1) * baseAlpha;
    const fontSize = Math.max(9, (isCenter ? 12 : 11) * Math.min(1.3, Math.max(0.85, scale)));
    ctx.font = (isCenter ? '700 ' : '600 ') + fontSize.toFixed(1) + 'px Inter, sans-serif';
    ctx.fillStyle = isCenter ? colors.textColor : colors.subColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = collabTruncate(ctx, node.label, isCenter ? 160 : 130);
    ctx.fillText(label, node.sx, node.sy + r + 4);
    ctx.globalAlpha = 1;
}

/**
 * Draw an edge weight pill (the joint-paper count).
 */
function collabDrawEdgeLabel(ctx, label, mx, my, color, scale, alpha) {
    const fs = Math.max(8.5, 11 * scale);
    ctx.font = '700 ' + fs.toFixed(1) + 'px Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    const padX = 6 * scale, h = (18 * scale);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(mx - tw / 2 - padX, my - h / 2, tw + padX * 2, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my + 0.5);
    ctx.globalAlpha = 1;
}

/**
 * Zoom by a multiplicative factor about a screen anchor (defaults to centre).
 */
function collabZoomBy(factor, anchorX, anchorY) {
    const cx = collabNet.width / 2, cy = collabNet.height / 2;
    if (anchorX == null) { anchorX = cx + collabNet.panX; anchorY = cy + collabNet.panY; }
    const world = collabScreenToWorld(anchorX, anchorY);
    const newZoom = Math.max(collabNet.minZoom, Math.min(collabNet.maxZoom, collabNet.zoom * factor));
    collabNet.zoom = newZoom;
    // Keep the anchored world point under the same screen position
    collabNet.panX = anchorX - (world.x - cx) * newZoom - cx;
    collabNet.panY = anchorY - (world.y - cy) * newZoom - cy;
    ensureCollabRunning();
}

/**
 * Fit the whole graph within the viewport (zoom to extent) for the current view.
 */
function collabZoomToExtent() {
    const nodes = collabNet.nodes;
    if (!nodes.length) return;
    const is3D = collabNet.is3D;
    const cx = collabNet.width / 2, cy = collabNet.height / 2;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const acc = (pre, r) => {
        minX = Math.min(minX, pre.x - r); maxX = Math.max(maxX, pre.x + r);
        minY = Math.min(minY, pre.y - r); maxY = Math.max(maxY, pre.y + r);
    };
    const cPre = is3D ? collabProject(0, 0, 0) : { x: cx, y: cy, scale: 1 };
    acc(cPre, collabNet.center.r);
    for (const node of nodes) {
        const pre = is3D ? collabProject(node.mx, node.my, node.mz) : { x: node.x, y: node.y, scale: 1 };
        acc(pre, node.r * pre.scale + 26); // pad for labels
    }

    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const margin = 50;
    const zoom = Math.max(collabNet.minZoom, Math.min(collabNet.maxZoom,
        Math.min((collabNet.width - margin) / bw, (collabNet.height - margin) / bh)));
    const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
    collabNet.zoom = zoom;
    collabNet.panX = -(bcx - cx) * zoom;
    collabNet.panY = -(bcy - cy) * zoom;
    ensureCollabRunning();
}

/**
 * Truncate a label to a pixel width, adding an ellipsis.
 */
function collabTruncate(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + '…';
}

/**
 * Find the node under a given canvas coordinate. In 3D, ties are broken by
 * depth so the nearest (front-most) node wins.
 */
function collabNodeAt(x, y) {
    const all = collabNet.nodes.concat(collabNet.center ? [collabNet.center] : []);
    let best = null;
    for (const node of all) {
        const rr = (node.sr || node.r) + 3;
        const dx = x - (node.sx != null ? node.sx : node.x);
        const dy = y - (node.sy != null ? node.sy : node.y);
        if (dx * dx + dy * dy <= rr * rr) {
            if (!best || node.depth < best.depth) best = node;
        }
    }
    return best;
}

/**
 * Pointer interactions: hover/tooltip, orbit (3D), pan (both) and node drag (2D).
 * - Plain drag: rotate in 3D, pan in 2D (or move a node when grabbed).
 * - Shift-drag or middle-button drag: pan in either mode.
 * - Mouse wheel: zoom toward the cursor.
 */
function bindCollabPointerEvents() {
    const canvas = collabNet.canvas;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const setCursor = (c) => { canvas.style.cursor = c; };

    const onMove = (e) => {
        const { x, y } = getPos(e);
        const dx = x - collabNet.lastPx;
        const dy = y - collabNet.lastPy;

        if (collabNet.action === 'pan') {
            collabNet.panX += dx;
            collabNet.panY += dy;
            collabNet.lastPx = x; collabNet.lastPy = y;
            hideCollabTooltip();
            ensureCollabRunning();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (collabNet.action === 'orbit') {
            // Horizontal drag rotates yaw (intuitive direction), vertical rotates pitch
            collabNet.rotY -= dx * 0.008;
            collabNet.rotX += dy * 0.008;
            collabNet.rotX = Math.max(-1.45, Math.min(1.45, collabNet.rotX));
            collabNet.lastPx = x; collabNet.lastPy = y;
            hideCollabTooltip();
            ensureCollabRunning();
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (collabNet.action === 'dragNode' && collabNet.dragNode) {
            const w = collabScreenToWorld(x, y);
            collabNet.dragNode.x = w.x;
            collabNet.dragNode.y = w.y;
            collabNet.dragNode.vx = 0;
            collabNet.dragNode.vy = 0;
            collabNet.alpha = Math.max(collabNet.alpha, 0.5);
            startCollabSim();
            if (e.cancelable) e.preventDefault();
            return;
        }

        const node = collabNodeAt(x, y);
        collabNet.hovered = node;
        setCursor(node ? 'pointer' : 'grab');
        if (node) showCollabTooltip(node, x, y);
        else hideCollabTooltip();
        ensureCollabRunning();
    };

    const onDown = (e) => {
        const { x, y } = getPos(e);
        collabNet.lastPx = x; collabNet.lastPy = y;
        const wantPan = e.shiftKey || e.button === 1;
        const node = collabNodeAt(x, y);

        if (wantPan) {
            collabNet.action = 'pan';
            setCursor('grabbing');
        } else if (node && !node.isCenter && !collabNet.is3D) {
            // 2D: grab a node to reposition it
            collabNet.action = 'dragNode';
            collabNet.dragNode = node;
            node.fixed = true;
        } else if (node) {
            // Clicked a node (or centre): keep the tooltip, don't start a drag gesture
            collabNet.action = 'none';
            return;
        } else if (collabNet.is3D) {
            collabNet.action = 'orbit';
            setCursor('grabbing');
        } else {
            collabNet.action = 'pan';
            setCursor('grabbing');
        }
        if (e.cancelable) e.preventDefault();
    };

    const onUp = () => {
        if (collabNet.action === 'dragNode' && collabNet.dragNode) {
            collabNet.dragNode.fixed = false;
            collabNet.dragNode = null;
            startCollabSim();
        }
        collabNet.action = 'none';
        setCursor('grab');
    };

    const onWheel = (e) => {
        const { x, y } = getPos(e);
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        collabZoomBy(factor, x, y);
        e.preventDefault();
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mouseleave', () => {
        if (collabNet.action === 'none') { collabNet.hovered = null; hideCollabTooltip(); }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    // Zoom / fit control buttons
    const controls = document.getElementById('collab-controls');
    if (controls) {
        controls.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            const act = btn.dataset.act;
            if (act === 'zoom-in') collabZoomBy(1.2);
            else if (act === 'zoom-out') collabZoomBy(1 / 1.2);
            else if (act === 'fit') collabZoomToExtent();
        });
    }
}

/**
 * Show the hover tooltip for a node.
 */
function showCollabTooltip(node, x, y) {
    const tt = collabNet.tooltip;
    if (!tt) return;
    let rows = '';
    if (node.isCenter) {
        const m = node.meta || {};
        if (m.university) rows += `<div class="tt-row"><i class="fas fa-university"></i>${m.university}</div>`;
        if (m.country) rows += `<div class="tt-row"><i class="fas fa-globe"></i>${m.country}</div>`;
        tt.innerHTML = `<div class="tt-title">${node.label}</div>${rows}`;
    } else {
        const m = node.meta || {};
        if (collabNet.mode === 'author') {
            if (m.affiliation) rows += `<div class="tt-row"><i class="fas fa-building"></i>${m.affiliation}</div>`;
            if (m.country) rows += `<div class="tt-row"><i class="fas fa-globe"></i>${m.country}</div>`;
        } else if (collabNet.mode === 'university') {
            if (m.country) rows += `<div class="tt-row"><i class="fas fa-globe"></i>${m.country}</div>`;
            if (m.authors) rows += `<div class="tt-row"><i class="fas fa-users"></i>${m.authors} co-authors</div>`;
        } else {
            if (m.authors) rows += `<div class="tt-row"><i class="fas fa-users"></i>${m.authors} co-authors</div>`;
        }
        rows += `<div class="tt-row"><i class="fas fa-file-lines"></i>${node.papers} joint paper${node.papers > 1 ? 's' : ''}</div>`;
        tt.innerHTML = `<div class="tt-title">${node.label}</div>${rows}`;
    }
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
    tt.hidden = false;
}

function hideCollabTooltip() {
    if (collabNet.tooltip) collabNet.tooltip.hidden = true;
}
