/**
 * Academic Portfolio JavaScript - Fully JSON Data-Driven with Enhanced Features
 * Author: Saddiq Ur Rehman
 * Description: Interactive functionality with custom logos, certificate images, publication numbering
 */

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
    animationDuration: 300,
    loadingDelay: 1000,
    scrollOffset: 100,
    headerHeight: 80
};

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
    const validTabs = ['home', 'education', 'experience', 'publications', 'projects', 'skills', 'certifications', 'activities'];
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
    // Hide all tab contents
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to corresponding nav button
    const navBtn = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
    
    // Update URL hash for persistence
    setCurrentTab(tabName);
    
    // Load dynamic content if needed
    loadTabContent(tabName);
    
    // Scroll to top of content area (accounting for fixed header)
    const contentElement = document.querySelector('.content');
    if (contentElement) {
        const headerHeight = CONFIG.headerHeight;
        const elementPosition = contentElement.offsetTop - headerHeight;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }
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
 * Scroll smoothly to the top of the page
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Initialize scroll to top button functionality
 */
function initializeScrollToTop() {
    const scrollButton = document.getElementById('scrollToTop');
    if (!scrollButton) return;
    
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 300) {
            scrollButton.classList.add('visible');
        } else {
            scrollButton.classList.remove('visible');
        }
    }, 100);
    
    window.addEventListener('scroll', handleScroll);
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
 * Initialize header effects (without hiding functionality)
 */
function initializeHeaderEffects() {
    const header = document.querySelector('.header-wrapper');
    
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Only change background opacity and shadow based on scroll
        if (scrollTop > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 6px 40px rgba(0, 0, 0, 0.15)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
        }
    }, 16);
    
    window.addEventListener('scroll', handleScroll);
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
    console.log('🚀 Academic Portfolio initializing - Enhanced Features with Tab Persistence');
    
    // Load all data from JSON files first
    await loadDataFromJSON();
    
    // Hide loading spinner after data is loaded
    setTimeout(hideLoadingSpinner, CONFIG.loadingDelay);
    
    // Initialize various components
    initializeSmoothScrolling();
    initializeKeyboardNavigation();
    initializeHeaderEffects();
    initializeScrollToTop();
    
    // Set up modal click handlers
    window.addEventListener('click', handleModalClick);
    
    // Initialize animations after a short delay
    setTimeout(initializeAnimations, 500);
    
    // Initialize tab from URL hash (for persistence after refresh)
    initializeTabFromHash();
    
    // Handle browser back/forward navigation
    window.addEventListener('hashchange', function() {
        const currentTab = getCurrentTab();
        showTab(currentTab);
    });
    
    // Add resize handler for responsive adjustments
    const handleResize = debounce(() => {
        const header = document.querySelector('.header-wrapper');
        if (header) {
            CONFIG.headerHeight = header.offsetHeight;
        }
        console.log('Window resized - Header height updated');
    }, 250);
    
    window.addEventListener('resize', handleResize);
    
    // Initial header height calculation
    setTimeout(() => {
        const header = document.querySelector('.header-wrapper');
        if (header) {
            CONFIG.headerHeight = header.offsetHeight;
        }
    }, 100);

    console.log('✅ Portfolio initialization complete');
});

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

        // Compute icon's on‐screen position
        const rect       = flagIcon.getBoundingClientRect();
        const scrollTop  = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        // Read the popup's current CSS width (in px), even if display: none
        const computed = window.getComputedStyle(popup);
        const popupW    = parseFloat(computed.width);

        // Place popup so that its RIGHT edge is flush with the icon's LEFT edge
        const x = scrollLeft + rect.left - popupW;

        // Align the TOP edges of popup and icon
        const y = scrollTop + rect.top;

        popup.style.left    = x + "px";
        popup.style.top     = y + "px";
        popup.style.display = "block";
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