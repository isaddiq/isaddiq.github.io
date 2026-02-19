/**
 * Academic Portfolio JavaScript - Fully JSON Data-Driven with Enhanced Features
 * Author: Saddiq Ur Rehman
 * Description: Interactive functionality with custom logos, certificate images, publication numbering
 */

// ==========================================================================
// Theme Toggle Functionality
// ==========================================================================

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
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
    
    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('preferred-theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            if (themeIcon) {
                themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
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
    
    if (navMenu) {
        navMenu.classList.toggle('active');
        
        // Update icon
        const icon = menuToggle.querySelector('i');
        if (icon) {
            icon.className = navMenu.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
        }
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    }
}

/**
 * Close mobile menu when clicking outside
 */
function closeMobileMenuOnClickOutside(event) {
    const navMenu = document.querySelector('.nav-menu');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navMenu && navMenu.classList.contains('active')) {
        if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            navMenu.classList.remove('active');
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
    
    if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
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
    const validTabs = ['home', 'education', 'experience', 'publications', 'projects', 'skills', 'software', 'certifications', 'activities', 'contact'];
    
    if (validTabs.includes(hash)) {
        showTab(hash);
    } else {
        showTab('home');
    }
}

/**
 * Add keyboard navigation support
 */
function addKeyboardSupport() {
    document.addEventListener('keydown', function(e) {
        // Escape key to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    closeModal(modal.id);
                }
            });
        }
        
        // Tab navigation with arrow keys (when focus is on nav buttons)
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && 
            e.target.classList.contains('nav-btn')) {
            
            const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
            const currentIndex = navBtns.indexOf(e.target);
            
            let nextIndex;
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % navBtns.length;
            } else {
                nextIndex = (currentIndex - 1 + navBtns.length) % navBtns.length;
            }
            
            navBtns[nextIndex].focus();
            e.preventDefault();
        }
    });
}

/**
 * Load and display news from JSON file
 */
async function loadNews() {
    const newsContainer = document.getElementById('news-bullets');
    const showMoreBtn = document.getElementById('show-more-news');
    let currentlyShown = 0;
    const itemsPerLoad = 5;
    let allNews = [];
    
    try {
        const response = await fetch('data/news.json');
        allNews = await response.json();
        
        // Clear loading message
        newsContainer.innerHTML = '';
        
        function renderNews(start, count) {
            const newsToShow = allNews.slice(start, start + count);
            
            newsToShow.forEach(newsItem => {
                const li = document.createElement('li');
                li.className = 'news-bullet-item';
                
                const title = newsItem.title;
                const details = newsItem.details ? ` ${newsItem.details}` : '';
                
                li.innerHTML = `
                    <span class="news-date">${newsItem.date}</span>
                    <i class="${newsItem.icon} news-icon"></i>
                    <span class="news-text">
                        <strong>${newsItem.type}:</strong> ${title}${details}
                    </span>
                `;
                
                newsContainer.appendChild(li);
            });
        }
        
        // Initial load
        renderNews(0, itemsPerLoad);
        currentlyShown = itemsPerLoad;
        
        // Show "Show More" button if there are more items
        if (allNews.length > currentlyShown) {
            showMoreBtn.style.display = 'block';
            
            showMoreBtn.addEventListener('click', function() {
                renderNews(currentlyShown, itemsPerLoad);
                currentlyShown += itemsPerLoad;
                
                if (currentlyShown >= allNews.length) {
                    showMoreBtn.style.display = 'none';
                }
            });
        }
        
        console.log('✅ News loaded successfully');
        
    } catch (error) {
        console.error('Error loading news:', error);
        newsContainer.innerHTML = `
            <li class="news-loading">
                <i class="fas fa-exclamation-circle"></i>
                Failed to load news. Please refresh the page.
            </li>
        `;
    }
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
        <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">
            <i class="fas fa-medal" style="color: #f39c12; margin-right: 10px;"></i>
            ${award.title}
        </h2>
        
        <div style="text-align: center; margin: 30px 0;">
            <div style="position: relative; display: inline-block;">
                <img src="${award.image}" alt="${award.title}" 
                     onclick="openImageZoom('${award.image}', '${award.title}')" 
                     style="max-width: 100%; max-height: 400px; object-fit: contain; 
                            border-radius: 15px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); 
                            cursor: pointer; transition: transform 0.3s ease;"
                     onmouseover="this.style.transform='scale(1.02)'"
                     onmouseout="this.style.transform='scale(1)'"
                     onerror="this.parentNode.innerHTML='<div style=\\'width: 400px; height: 300px; background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); border-radius: 15px; display: flex; align-items: center; justify-content: center; color: white; font-size: 3em; box-shadow: 0 15px 35px rgba(0,0,0,0.2);\\'>📜</div>';">
                <div style="position: absolute; bottom: -10px; right: -10px; 
                           background: #3498db; color: white; border-radius: 50%; 
                           width: 40px; height: 40px; display: flex; align-items: center; 
                           justify-content: center; box-shadow: 0 4px 12px rgba(52,152,219,0.4);">
                    <i class="fas fa-search-plus"></i>
                </div>
            </div>
            <p style="font-size: 0.9em; color: #666; margin-top: 15px; font-style: italic;">
                <i class="fas fa-mouse-pointer"></i> Click image to view full size
            </p>
        </div>
        
        <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); 
                    padding: 25px; border-radius: 15px; margin: 25px 0; 
                    border: 1px solid #f39c12;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                        gap: 15px; margin-bottom: 15px;">
                <div>
                    <strong style="color: #2c3e50;">Issued by:</strong><br>
                    <span style="color: #555;">${award.issuer}</span>
                </div>
                <div>
                    <strong style="color: #2c3e50;">Event:</strong><br>
                    <span style="color: #555;">${award.event}</span>
                </div>
                <div>
                    <strong style="color: #2c3e50;">Years:</strong><br>
                    <span style="color: #555;">${award.years.join(', ')}</span>
                </div>
            </div>
            <div>
                <strong style="color: #2c3e50;">Description:</strong><br>
                <p style="margin: 10px 0 0 0; color: #555; line-height: 1.6;">${award.description}</p>
            </div>
        </div>
        
        ${award.details ? `
            <div style="margin: 25px 0;">
                <h4 style="color: #3498db; margin-bottom: 15px; font-size: 1.2em;">
                    <i class="fas fa-star"></i> Achievement Highlights
                </h4>
                <ul style="list-style: none; padding: 0;">
                    ${award.details.map(detail => `
                        <li style="margin-bottom: 12px; padding: 12px 15px; 
                                   background: rgba(52, 152, 219, 0.1); 
                                   border-left: 4px solid #3498db; border-radius: 8px;">
                            <i class="fas fa-check-circle" style="color: #27ae60; margin-right: 10px;"></i>
                            ${detail}
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding: 20px; 
                    background: rgba(39, 174, 96, 0.1); border-radius: 15px; 
                    border: 1px solid #27ae60;">
            <i class="fas fa-shield-alt" style="color: #27ae60; font-size: 1.5em; margin-bottom: 10px;"></i>
            <p style="margin: 0; color: #27ae60; font-weight: 600;">
                ${award.verification}
            </p>
        </div>
    `;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ==========================================================================
// Global Variables and Configuration
// ==========================================================================

const CONFIG = {
    animationDuration: 350,
    loadingDelay: 800,
    scrollOffset: 100,
    headerHeight: 80,
    staggerDelay: 60,
    observerThreshold: 0.1,
    debounceDelay: 150
};

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

// Data containers - will be populated from JSON files
let experienceData = [];
let publicationsData = {};
let projectsData = [];
let certificatesData = {};
let skillsData = {};

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
        loadCertificatesData()
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

// ==========================================================================
// Navigation Functions with Tab Persistence
// ==========================================================================

/**
 * Get current tab from URL hash or default to 'home'
 */
function getCurrentTab() {
    const hash = window.location.hash.slice(1);
    const validTabs = ['home', 'education', 'experience', 'publications', 'projects', 'skills', 'software', 'certifications', 'activities', 'contact'];
    return validTabs.includes(hash) ? hash : 'home';
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
    const navBtn = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (navBtn) {
        navBtn.classList.add('active');
        navBtn.setAttribute('aria-current', 'page');
    }
    
    // Update document title and URL hash
    const titleMap = {
        home: 'Home',
        education: 'Education',
        experience: 'Experience',
        publications: 'Publications',
        projects: 'Projects',
        skills: 'Skills',
        software: 'Software & Tools',
        certifications: 'Certifications & Awards',
        activities: 'Activities',
        contact: 'Contact'
    };
    
    const sectionTitle = titleMap[tabName] || 'Portfolio';
    document.title = `Saddiq Ur Rehman – ${sectionTitle}`;
    
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
    const animatableElements = tabElement.querySelectorAll('.publication-item, .project-card, .experience-item, .certificate-card, .skill-category, .research-card, .award-item, .activity-item, .news-bullet-item');
    
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
            const addressItem = document.querySelector('.contact-item:nth-child(3)');
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
                            <span class="skill-name">${skill.name}</span>
                            <span class="skill-level">${skill.level}</span>
                        </div>
                        <div class="skill-progress">
                            <div class="skill-progress-bar" style="width: 0%;" data-width="${skill.percentage}%"></div>
                        </div>
                        <div class="skill-years">${skill.years} year${skill.years > 1 ? 's' : ''} of experience</div>
                        ${skill.description ? `<div class="skill-description">${skill.description}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    skillsContainer.innerHTML = skillsHTML;
    
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
                <span class="stat-label">International Conferencs</span>
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
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
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
            <div class="pub-journal">${pub.journal}, ${pub.volume}, ${pub.pages} (${pub.year})</div>
            <div class="pub-details">
                ${pub.impactFactor ? `<span class="pub-badge impact-factor">IF: ${pub.impactFactor}</span>` : ''}
                ${pub.category ? `<span class="pub-badge">${pub.category}${pub.quartile ? ', ' + pub.quartile : ''}</span>` : ''}
                ${pub.badges ? pub.badges.map(badge => `<span class="pub-badge ${getBadgeClass(badge)}">${badge}</span>`).join('') : ''}
                ${pub.doi && pub.doi !== '#' ? `<a href="${pub.doi}" class="doi-link" target="_blank">DOI Link</a>` : ''}
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
                ${pub.doi ? `<a href="${pub.doi}" class="doi-link" target="_blank">DOI Link</a>` : ''}
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
                        `<img src="${exp.logo}" alt="${exp.organization || exp.company}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'${exp.icon || 'fas fa-building'}\\'></i>';">` :
                        `<i class="${exp.icon || 'fas fa-building'}"></i>`
                    }
                </div>
                <div class="exp-details">
                    <h3>${exp.position || exp.title}</h3>
                    <a href="${exp.companyUrl || exp.website || '#'}" class="company-name" target="_blank">${exp.organization || exp.company}</a>
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
        <div class="project-card" onclick="openProjectModal('${project.id}')">
            <div class="project-image">
                <i class="${project.icon || 'fas fa-project-diagram'}"></i>
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
        <h2 style="color: #2c3e50; margin-bottom: 20px;">${project.title}</h2>
        <div style="margin-bottom: 15px;">
            <strong>Duration:</strong> ${project.duration}<br>
            <strong>Role:</strong> ${project.role}<br>
            ${project.funding || project.funding_source ? `<strong>Funding:</strong> ${project.funding || project.funding_source}<br>` : ''}
            ${project.collaborators ? `<strong>Collaborators:</strong> ${Array.isArray(project.collaborators) ? project.collaborators.join(', ') : project.collaborators}<br>` : ''}
            ${project.status ? `<strong>Status:</strong> ${project.status}<br>` : ''}
        </div>
        <h3 style="color: #3498db; margin: 20px 0 10px 0;">Project Description</h3>
        <p style="margin-bottom: 20px; text-align: justify; line-height: 1.6;">${project.description || project.detailed_description}</p>
        ${project.objectives ? `
            <h3 style="color: #3498db; margin: 20px 0 10px 0;">Objectives</h3>
            <ul style="margin-bottom: 20px; padding-left: 20px;">
                ${project.objectives.map(obj => `<li style="margin-bottom: 8px; line-height: 1.5;">${obj}</li>`).join('')}
            </ul>
        ` : ''}
        ${project.technologies ? `
            <h3 style="color: #3498db; margin: 20px 0 10px 0;">Technologies Used</h3>
            <p style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 10px; font-family: monospace;">${Array.isArray(project.technologies) ? project.technologies.join(', ') : project.technologies}</p>
        ` : ''}
        ${project.outcomes ? `
            <h3 style="color: #3498db; margin: 20px 0 10px 0;">Key Outcomes</h3>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; border-left: 4px solid #28a745;">
                ${Array.isArray(project.outcomes) ? project.outcomes.map(outcome => `<p style="margin-bottom: 10px;">${outcome}</p>`).join('') : `<p>${project.outcomes}</p>`}
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
        <div class="certificate-card" onclick="openCertificateModal('${cert.id}')">
            <div class="certificate-image">
                ${cert.image ? 
                    `<img src="${cert.image}" alt="${cert.title}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'fas fa-certificate\\'></i>';">` :
                    `<i class="fas fa-certificate"></i>`
                }
            </div>
            <div class="certificate-caption">${cert.title}</div>
        </div>
    `).join('');
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
        <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">${cert.title}</h2>
        ${cert.image ? `
            <div class="modal-certificate-image">
                <img src="${cert.image}" alt="${cert.title}" onclick="openImageZoom('${cert.image}', '${cert.title}')" style="cursor: pointer;">
                <p style="font-size: 0.9em; color: #666; margin-top: 10px; text-align: center;">Click image to enlarge</p>
            </div>
        ` : `
            <div style="text-align: center; margin: 30px 0;">
                <div style="width: 300px; height: 200px; background: linear-gradient(135deg, #3498db 0%, #9b59b6 100%); 
                            border-radius: 15px; margin: 0 auto; display: flex; align-items: center; justify-content: center; 
                            color: white; font-size: 3em; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                    <i class="fas fa-certificate"></i>
                </div>
            </div>
        `}
        <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 15px; margin: 20px 0;">
            <p style="margin-bottom: 10px;"><strong>Issued by:</strong> ${cert.issuer}</p>
            <p style="margin-bottom: 10px;"><strong>Date:</strong> ${cert.date}</p>
            ${cert.category ? `<p style="margin-bottom: 10px;"><strong>Category:</strong> ${cert.category}</p>` : ''}
            ${cert.credential_id ? `<p style="margin-bottom: 10px;"><strong>Credential ID:</strong> ${cert.credential_id}</p>` : ''}
            <p style="margin-bottom: 0;"><strong>Description:</strong> ${cert.description}</p>
        </div>
        ${cert.skills ? `
            <div style="margin-top: 20px;">
                <h4 style="color: #3498db; margin-bottom: 10px;">Skills Acquired:</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${cert.skills.map(skill => `
                        <span style="background: linear-gradient(135deg, #3498db 0%, #9b59b6 100%); 
                                     color: white; padding: 5px 12px; border-radius: 15px; 
                                     font-size: 0.8em; font-weight: 500;">${skill}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        ${cert.verification_url ? `
            <div style="text-align: center; margin-top: 20px;">
                <a href="${cert.verification_url}" target="_blank" style="color: #3498db; text-decoration: none; font-weight: 500;">
                    <i class="fas fa-external-link-alt"></i> Verify Certificate
                </a>
            </div>
        ` : ''}
    `;
    
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
    const animateElements = '.experience-item, .publication-item, .project-card, .certificate-card, .award-item, .activity-item, .news-item, .skill-item';
    document.querySelectorAll(animateElements).forEach(el => {
        el.style.transform = 'translateY(20px)';
        el.style.opacity = '0';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
    document.body.classList.add('loaded');
}

/**
 * Add smooth scrolling to anchor links
 */
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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
        if (e.target.classList.contains('nav-btn')) {
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
    
    let lastScrollTop = 0;
    const scrollThreshold = 50;
    
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Enhanced glass morphism effect based on scroll
        if (scrollTop > scrollThreshold) {
            header.classList.add('scrolled');
            if (isDarkMode) {
                header.style.background = 'rgba(30, 41, 59, 0.95)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
            }
            header.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            header.style.backdropFilter = 'blur(20px) saturate(180%)';
        } else {
            header.classList.remove('scrolled');
            if (isDarkMode) {
                header.style.background = 'rgba(30, 41, 59, 0.8)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.7)';
            }
            header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.08)';
            header.style.backdropFilter = 'blur(20px) saturate(180%)';
        }
        
        lastScrollTop = scrollTop;
    }, 16);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();
}

// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
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

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// ==========================================================================
// Event Listeners and Initialization
// ==========================================================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Academic Portfolio initializing - Enhanced UI/UX with Performance Optimizations');
    
    // Load all data from JSON files first with loading indicator
    const dataPromise = loadDataFromJSON();
    
    // Initialize critical components immediately
    initializeTheme(); // Initialize theme toggle functionality first
    
    // Wait for data to load
    await dataPromise;
    
    // Hide loading spinner after data is loaded
    setTimeout(hideLoadingSpinner, CONFIG.loadingDelay);
    
    // Initialize various components
    initializeSmoothScrolling();
    initializeKeyboardNavigation();
    initializeHeaderEffects();
    initializeScrollToTop();
    
    // Initialize tab from URL hash on page load
    initializeTabFromUrl();
    
    // Load news dynamically
    loadNews();
    
    // Add keyboard navigation support
    addKeyboardSupport();
    
    // Set up modal click handlers
    window.addEventListener('click', handleModalClick);
    
    // Add mobile menu click outside listener
    document.addEventListener('click', closeMobileMenuOnClickOutside);
    
    // Initialize animations after a short delay
    setTimeout(initializeAnimations, 500);
    
    // Initialize tab from URL hash (for persistence after refresh)
    initializeTabFromHash();
    
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
            if (navMenu && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
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
        'assets/images/profile_pic.png',
        'assets/images/profile_pic_2.jpg'
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

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
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

/**
 * Throttle function for scroll events
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
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

document.addEventListener("DOMContentLoaded", () => {
    const popup    = document.getElementById("flagcounter-popup");
    const flagIcon = document.querySelector(".social-icon.flagcounter-icon");
    let isOpen     = false;

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
        if (
            !popup.contains(evt.target) &&
            !evt.target.closest(".social-icon.flagcounter-icon")
        ) {
            closePopup();
        }
    });

    // "✕" inside the popup also closes it
    const closeBtn = popup.querySelector(".close-popup");
    closeBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        closePopup();
    });
});

// ==========================================================================
// Software/Tools Tab Functions
// ==========================================================================

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
    // Cache elements
    const navButtons = document.querySelectorAll('.tool-nav-btn');
    
    // Add click event listeners to nav buttons
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const toolId = btn.getAttribute('data-tool');
            showTool(toolId);
        });
    });

    // Show default tool (ReUnixchange)
    showTool('reunixchange');
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

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

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
