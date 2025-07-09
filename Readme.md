<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎓 Academic Portfolio Website - Interactive README</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #3498db;
            --secondary-color: #9b59b6;
            --accent-color: #e74c3c;
            --success-color: #2ecc71;
            --warning-color: #f39c12;
            --text-color: #2c3e50;
            --light-bg: #f8f9fa;
            --dark-bg: #2c3e50;
            --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            --gradient-4: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            --glass-bg: rgba(255, 255, 255, 0.1);
            --glass-border: rgba(255, 255, 255, 0.2);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: var(--text-color);
            line-height: 1.6;
            overflow-x: hidden;
            position: relative;
        }

        /* Animated Background */
        .animated-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .floating-shapes {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .shape {
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            animation: float 20s infinite linear;
        }

        .shape:nth-child(1) { width: 80px; height: 80px; left: 10%; animation-delay: 0s; }
        .shape:nth-child(2) { width: 120px; height: 120px; left: 20%; animation-delay: 2s; }
        .shape:nth-child(3) { width: 60px; height: 60px; left: 30%; animation-delay: 4s; }
        .shape:nth-child(4) { width: 100px; height: 100px; left: 40%; animation-delay: 6s; }
        .shape:nth-child(5) { width: 90px; height: 90px; left: 50%; animation-delay: 8s; }
        .shape:nth-child(6) { width: 110px; height: 110px; left: 60%; animation-delay: 10s; }
        .shape:nth-child(7) { width: 70px; height: 70px; left: 70%; animation-delay: 12s; }
        .shape:nth-child(8) { width: 130px; height: 130px; left: 80%; animation-delay: 14s; }

        @keyframes float {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }

        /* Container */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }

        /* Header */
        .header {
            text-align: center;
            padding: 60px 0;
            margin-bottom: 40px;
            animation: fadeInUp 1s ease-out;
        }

        .header h1 {
            font-size: 4rem;
            font-weight: 700;
            color: white;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            animation: glow 2s ease-in-out infinite alternate;
        }

        .header p {
            font-size: 1.5rem;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 30px;
        }

        .author-info {
            display: inline-block;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 20px 40px;
            margin-top: 20px;
            animation: slideInUp 1s ease-out 0.5s both;
        }

        .author-info h3 {
            color: white;
            font-size: 1.3rem;
            margin-bottom: 10px;
        }

        .author-info p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1rem;
        }

        /* Glass Cards */
        .glass-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 30px;
            margin: 20px 0;
            transition: all 0.3s ease;
            animation: fadeInUp 0.8s ease-out;
        }

        .glass-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .glass-card h2 {
            color: white;
            font-size: 2rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .glass-card h2 i {
            color: var(--warning-color);
            animation: pulse 2s infinite;
        }

        /* Feature Grid */
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .feature-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            transition: all 0.3s ease;
            animation: fadeInUp 0.8s ease-out;
        }

        .feature-card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        }

        .feature-card i {
            font-size: 3rem;
            color: var(--warning-color);
            margin-bottom: 15px;
            animation: bounce 2s infinite;
        }

        .feature-card h3 {
            color: white;
            font-size: 1.3rem;
            margin-bottom: 10px;
        }

        .feature-card p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
        }

        /* Statistics */
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }

        .stat-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            transition: all 0.3s ease;
            animation: fadeInUp 0.8s ease-out;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .stat-number {
            font-size: 3rem;
            font-weight: 700;
            color: var(--warning-color);
            margin-bottom: 10px;
            animation: countUp 2s ease-out;
        }

        .stat-label {
            color: white;
            font-size: 1rem;
            font-weight: 500;
        }

        /* Progress Bars */
        .progress-container {
            margin: 20px 0;
        }

        .progress-item {
            margin: 15px 0;
            animation: slideInRight 1s ease-out;
        }

        .progress-label {
            color: white;
            font-size: 1rem;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-bar {
            height: 10px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            overflow: hidden;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: var(--gradient-4);
            border-radius: 5px;
            transition: width 2s ease-out;
            animation: progressFill 2s ease-out;
        }

        /* Timeline */
        .timeline {
            position: relative;
            padding: 20px 0;
            margin: 40px 0;
        }

        .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--gradient-3);
            transform: translateX(-50%);
        }

        .timeline-item {
            position: relative;
            margin: 40px 0;
            animation: fadeInUp 0.8s ease-out;
        }

        .timeline-content {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 20px;
            width: 45%;
            position: relative;
            transition: all 0.3s ease;
        }

        .timeline-item:nth-child(odd) .timeline-content {
            left: 0;
            margin-right: 55%;
        }

        .timeline-item:nth-child(even) .timeline-content {
            left: 55%;
            margin-left: 0;
        }

        .timeline-content:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        }

        .timeline-icon {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: var(--gradient-2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2rem;
            animation: pulse 2s infinite;
        }

        /* Code Block */
        .code-block {
            background: rgba(0, 0, 0, 0.7);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            color: #00ff00;
            overflow-x: auto;
            animation: fadeIn 1s ease-out;
        }

        .code-block pre {
            margin: 0;
            white-space: pre-wrap;
        }

        /* Interactive Elements */
        .interactive-button {
            background: var(--gradient-1);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            animation: pulse 2s infinite;
        }

        .interactive-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        /* Charts */
        .chart-container {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
            animation: fadeInUp 0.8s ease-out;
        }

        .chart-title {
            color: white;
            font-size: 1.5rem;
            margin-bottom: 20px;
            text-align: center;
        }

        .pie-chart {
            width: 200px;
            height: 200px;
            margin: 0 auto 20px;
            position: relative;
            animation: spin 20s linear infinite;
        }

        .pie-segment {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%);
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInUp {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes glow {
            from { text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3); }
            to { text-shadow: 2px 2px 20px rgba(255, 255, 255, 0.5); }
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        @keyframes countUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes progressFill {
            from { width: 0%; }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2.5rem;
            }
            
            .header p {
                font-size: 1.2rem;
            }
            
            .timeline::before {
                left: 20px;
            }
            
            .timeline-item .timeline-content {
                width: calc(100% - 60px);
                left: 60px !important;
                margin: 0 !important;
            }
            
            .timeline-icon {
                left: 20px;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Scroll Animations */
        .scroll-reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease-out;
        }

        .scroll-reveal.revealed {
            opacity: 1;
            transform: translateY(0);
        }

        /* Navigation */
        .nav-dots {
            position: fixed;
            right: 30px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1000;
        }

        .nav-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            margin: 10px 0;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .nav-dot.active {
            background: var(--warning-color);
            transform: scale(1.2);
        }

        .nav-dot:hover {
            background: white;
            transform: scale(1.1);
        }
    </style>
</head>
<body>
    <!-- Animated Background -->
    <div class="animated-bg">
        <div class="floating-shapes">
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
        </div>
    </div>

    <!-- Navigation Dots -->
    <div class="nav-dots">
        <div class="nav-dot active" onclick="scrollToSection('header')"></div>
        <div class="nav-dot" onclick="scrollToSection('features')"></div>
        <div class="nav-dot" onclick="scrollToSection('stats')"></div>
        <div class="nav-dot" onclick="scrollToSection('architecture')"></div>
        <div class="nav-dot" onclick="scrollToSection('technical')"></div>
        <div class="nav-dot" onclick="scrollToSection('support')"></div>
    </div>

    <div class="container">
        <!-- Header -->
        <section id="header" class="header">
            <h1>🎓 Academic Portfolio Website</h1>
            <p>A modern, responsive, and interactive academic portfolio website</p>
            <div class="author-info">
                <h3>Saddiq Ur Rehman</h3>
                <p>PhD Student at Kyung Hee University</p>
            </div>
            <button class="interactive-button" onclick="showDemo()">
                <i class="fas fa-play"></i> Interactive Demo
            </button>
        </section>

        <!-- Features Overview -->
        <section id="features" class="glass-card scroll-reveal">
            <h2><i class="fas fa-star"></i> Features Overview</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <i class="fas fa-palette"></i>
                    <h3>Interactive Design</h3>
                    <p>Glassmorphism UI with smooth animations and responsive design</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>Mobile Responsive</h3>
                    <p>Optimized for all devices with adaptive layouts</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-chart-line"></i>
                    <h3>Analytics Dashboard</h3>
                    <p>Publication statistics and performance metrics</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>Academic Focus</h3>
                    <p>Specialized for academic and research portfolios</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-search"></i>
                    <h3>SEO Optimized</h3>
                    <p>Enhanced visibility and search engine ranking</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-lock"></i>
                    <h3>Secure & Fast</h3>
                    <p>Optimized performance with security best practices</p>
                </div>
            </div>
        </section>

        <!-- Statistics -->
        <section id="stats" class="glass-card scroll-reveal">
            <h2><i class="fas fa-chart-bar"></i> Portfolio Statistics</h2>
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-number" data-count="8">0</div>
                    <div class="stat-label">Content Sections</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" data-count="15">0</div>
                    <div class="stat-label">Interactive Features</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" data-count="95">0</div>
                    <div class="stat-label">Performance Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" data-count="100">0</div>
                    <div class="stat-label">Accessibility Score</div>
                </div>
            </div>
        </section>

        <!-- System Architecture -->
        <section id="architecture" class="glass-card scroll-reveal">
            <h2><i class="fas fa-sitemap"></i> System Architecture</h2>
            <div class="chart-container">
                <div class="chart-title">File Structure Distribution</div>
                <div class="pie-chart">
                    <div class="pie-segment" style="background: conic-gradient(#3498db 0deg 108deg, transparent 108deg);"></div>
                    <div class="pie-segment" style="background: conic-gradient(transparent 0deg 108deg, #9b59b6 108deg 180deg, transparent 180deg);"></div>
                    <div class="pie-segment" style="background: conic-gradient(transparent 0deg 180deg, #e74c3c 180deg 252deg, transparent 252deg);"></div>
                    <div class="pie-segment" style="background: conic-gradient(transparent 0deg 252deg, #2ecc71 252deg 324deg, transparent 324deg);"></div>
                    <div class="pie-segment" style="background: conic-gradient(transparent 0deg 324deg, #f39c12 324deg 360deg);"></div>
                </div>
            </div>
            
            <div class="code-block">
                <pre>
portfolio-website/
│
├── index.html                 # Main HTML file
├── assets/
│   ├── css/
│   │   └── styles.css         # Main stylesheet
│   ├── js/
│   │   └── script.js          # Interactive functionality
│   ├── images/
│   │   ├── profile_pic.png    # Main profile picture
│   │   ├── profile_pic_2.jpg  # Hover profile picture
│   │   ├── projects/          # Project images
│   │   ├── certificates/      # Certificate images
│   │   ├── logos/             # Company/university logos
│   └── icons/
│       └── favicon.ico        # Website favicon
├── data/
│   ├── publications.json     # Publications data
│   ├── projects.json         # Projects data
│   ├── experience.json       # Experience data
│   ├── skills.json           # Skills and proficiency data
│   └── certificates.json     # Certificates and awards data
└── README.md                 # Documentation
                </pre>
            </div>
        </section>

        <!-- Technical Implementation -->
        <section id="technical" class="glass-card scroll-reveal">
            <h2><i class="fas fa-cogs"></i> Technical Implementation</h2>
            
            <div class="progress-container">
                <div class="progress-item">
                    <div class="progress-label">
                        <span><i class="fab fa-html5"></i> HTML/CSS</span>
                        <span>95%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 95%;"></div>
                    </div>
                </div>
                
                <div class="progress-item">
                    <div class="progress-label">
                        <span><i class="fab fa-js"></i> JavaScript</span>
                        <span>90%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 90%;"></div>
                    </div>
                </div>
                
                <div class="progress-item">
                    <div class="progress-label">
                        <span><i class="fas fa-mobile-alt"></i> Responsive Design</span>
                        <span>98%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 98%;"></div>
                    </div>
                </div>
                
                <div class="progress-item">
                    <div class="progress-label">
                        <span><i class="fas fa-tachometer-alt"></i> Performance</span>
                        <span>92%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 92%;"></div>
                    </div>
                </div>
            </div>

            <div class="timeline">
                <div class="timeline-item">
                    <div class="timeline-icon">
                        <i class="fas fa-paint-brush"></i>
                    </div>
                    <div class="timeline-content">
                        <h3 style="color: white;">Design Phase</h3>
                        <p style="color: rgba(255, 255, 255, 0.8);">Glassmorphism UI design with modern gradient backgrounds and smooth animations</p>
                    </div>
                </div>
                
                <div class="timeline-item">
                    <div class="timeline-icon">
                        <i class="fas fa-code"></i>
                    </div>
                    <div class="timeline-content">
                        <h3 style="color: white;">Development</h3>
                        <p style="color: rgba(255, 255, 255, 0.8);">Implementation of interactive features, responsive design, and performance optimization</p>
                    </div>
                </div>
                
                <div class="timeline-item">
                    <div class="timeline-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="timeline-content">
                        <h3 style="color: white;">Analytics Integration</h3>
                        <p style="color: rgba(255, 255, 255, 0.8);">Publication statistics dashboard and performance metrics implementation</p>
                    </div>
                </div>
                
                <div class="timeline-item">
                    <div class="timeline-icon">
                        <i class="fas fa-rocket"></i>
                    </div>
                    <div class="timeline-content">
                        <h3 style="color: white;">Deployment</h3>
                        <p style="color: rgba(255, 255, 255, 0.8);">Final testing, SEO optimization, and production deployment</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Support & Contact -->
        <section id="support" class="glass-card scroll-reveal">
            <h2><i class="fas fa-life-ring"></i> Support & Contact</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <i class="fas fa-envelope"></i>
                    <h3>Email Support</h3>
                    <p>saddiqurrehman@khu.ac.kr</p>
                </div>
                <div class="feature-card">
                    <i class="fab fa-linkedin"></i>
                    <h3>LinkedIn</h3>
                    <p>Professional networking and updates</p>
                </div>
                <div class="feature-card">
                    <i class="fab fa-github"></i>
                    <h3>GitHub</h3>
                    <p>Source code and project repositories</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>Academic Profile</h3>
                    <p>Research publications and academic work</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px;">
                <button class="interactive-button" onclick="showVersionHistory()">
                    <i class="fas fa-history"></i> Version History
                </button>
                <button class="interactive-button" onclick="showLicense()">
                    <i class="fas fa-file-contract"></i> License Information
                </button>
            </div>
        </section>

        <!-- Footer -->
        <div class="glass-card" style="text-align: center; margin-top: 40px;">
            <p style="color: white; font-size: 1.2rem;">
                <i class="fas fa-heart" style="color: #e74c3c;"></i> 
                Made with love for the academic community
            </p>
            <p style="color: rgba(255, 255, 255, 0.7); margin-top: 10px;">
                Last updated: June 2025
            </p>
        </div>
    </div>

    <script>
        // Counter Animation
        function animateCounters() {
            const counters = document.querySelectorAll('.stat-number');
            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-count'));
                const increment = target / 100;
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    counter.textContent = Math.floor(current);
                }, 20);
            });
        }

        // Scroll Reveal Animation
        function revealOnScroll() {
            const reveals = document.querySelectorAll('.scroll-reveal');
            reveals.forEach(reveal => {
                const windowHeight = window.innerHeight;
                const elementTop = reveal.getBoundingClientRect().top;
                const elementVisible = 150;
                
                if (elementTop < windowHeight - elementVisible) {
                    reveal.classList.add('revealed');
                }
            });
        }

        // Navigation Dots
        function updateNavDots() {
            const sections = document.querySelectorAll('section');
            const dots = document.querySelectorAll('.nav-dot');
            
            sections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
                    dots.forEach(dot => dot.classList.remove('active'));
                    if (dots[index]) dots[index].classList.add('active');
                }
            });
        }

        function scrollToSection(id) {
            document.getElementById(id).scrollIntoView({
                behavior: 'smooth'
            });
        }

        // Interactive Functions
        function showDemo() {
            alert('🎉 Interactive Demo\n\nThis portfolio features:\n• Smooth animations\n• Responsive design\n• Interactive elements\n• Performance optimization\n• Modern UI/UX');
        }

        function showVersionHistory() {
            alert('📝 Version History\n\nLatest Version (June 2025):\n• Publication statistics dashboard\n• Publication numbering system\n• Enhanced image optimization\n• Scrollable modals\n• Certificate viewer for awards\n• Image zoom functionality\n• Enhanced responsive design\n• Count badges to navigation');
        }

        function showLicense() {
            alert('📄 License Information\n\nMIT License\n\nThis portfolio template is open source and available under the MIT License. Feel free to use, modify, and distribute as needed.');
        }

        // Initialize Animations
        window.addEventListener('scroll', () => {
            revealOnScroll();
            updateNavDots();
        });

        window.addEventListener('load', () => {
            setTimeout(animateCounters, 1000);
            revealOnScroll();
            updateNavDots();
        });

        // Progress Bar Animation
        function animateProgressBars() {
            const progressBars = document.querySelectorAll('.progress-fill');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width;
                }, 500);
            });
        }

        // Trigger progress animation on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateProgressBars();
                }
            });
        });

        document.querySelectorAll('.progress-container').forEach(container => {
            observer.observe(container);
        });

        // Add floating animation to cards
        document.querySelectorAll('.feature-card, .stat-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    </script>
</body>
</html>
