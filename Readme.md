# 🎓 Academic Portfolio Website

A modern, responsive, and interactive academic portfolio website by **Saddiq Ur Rehman**, PhD Student at Kyung Hee University. This portfolio showcases research work, publications, projects, and professional experience in an elegant and user-friendly design.

![thumbnail](https://github.com/user-attachments/assets/f137f97c-be19-4713-828e-e05a04ebc91a)

## 🌟 Features

### ✨ **Interactive Design**

- **Glassmorphism UI** with modern gradient backgrounds
- **Smooth animations** and hover effects
- **Responsive design** for all devices (desktop, tablet, mobile)
- **Professional academic color scheme** (#3498db, #9b59b6)
- **Custom scrollbars** with themed styling

### 📱 **Navigation & User Experience**

- **Sticky navigation** with smooth tab switching and count badges
- **Profile image hover effect** (changes on hover)
- **Floating social media icons** with platform-specific colors
- **Modal popups** for detailed project, certificate, and award information
- **Keyboard navigation** support (Arrow keys, Escape)
- **Tab persistence** - URLs maintain current tab state

### 📚 **Content Sections**

1. **Home** - Profile, bio, research interests, recent news, and contact information
2. **Education** - Academic background and qualifications
3. **Experience** - Professional and academic experience with company logos
4. **Publications** - Categorized publications with statistics, numbering, and APA formatting
5. **Projects** - Interactive project cards with detailed modal views
6. **Skills** - Technical expertise with progress bars and proficiency levels
7. **Certifications & Awards** - Awards, scholarships, and professional certificates with viewable certificates
8. **Activities** - Professional memberships and editorial activities

### 🔬 **Academic Features**

- **Publication Statistics Dashboard** - Overview of total publications by category
- **Numbered Publications** - Sequential numbering for each publication type
- **Count Badges** - Navigation buttons show publication counts
- **APA-style publication formatting**
- **Impact factor display** and journal rankings
- **Author name highlighting** in bold
- **DOI links** and special badges (Editor's Choice, Corresponding Author)
- **Publication categorization** (International Journals, Conferences, Korean Conferences, Technical Reports)

### 🖼️ **Image & Media Features**

- **Responsive image sizing** - Proper fitting for project and certificate tiles
- **Image zoom functionality** - Click to view certificates in full-screen
- **Scrollable modals** - Long content automatically scrolls
- **Award certificate viewer** - Click awards to view certificates
- **Professional image handling** - Object-fit styling for optimal display

## 📁 **File Structure**

```
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
│   │   │   └── best-paper-award-2023.jpg  # Award certificates
│   │   ├── logos/             # Company/university logos
│   │   └── cover images/      # Tab cover images
│   └── icons/
│       └── favicon.ico        # Website favicon
├── data/
│   ├── publications.json     # Publications data
│   ├── projects.json         # Projects data
│   ├── experience.json       # Experience data
│   ├── skills.json           # Skills and proficiency data
│   └── certificates.json     # Certificates and awards data
└── README.md                 # This documentation
```

## 🚀 **Quick Start**

### **Step 1: Download and Setup**

1. Download all files maintaining the folder structure
2. Place your profile images in `assets/images/`:
   - `profile_pic.png` - Main profile picture
   - `profile_pic_2.jpg` - Picture shown on hover
3. Add company/university logos to `assets/images/logos/`
4. Add certificate images to `assets/images/certificates/`
5. Add project images to `assets/images/projects/`

### **Step 2: Customize Content**

1. **Personal Information**: Edit the HTML in `index.html`
   - Update name, title, bio, and contact information
   - Modify social media links in the floating icons section

2. **Publications**: Edit `data/publications.json`
   - Add your publications in each category
   - Update DOI links, impact factors, and badges
   - Publications will be automatically numbered

3. **Projects**: Edit `data/projects.json`
   - Add project details, descriptions, and outcomes
   - Include technologies used and collaborators
   - Add project images for better visual appeal

4. **Skills**: Edit `data/skills.json`
   - Add technical skills with proficiency levels
   - Include years of experience and descriptions

5. **Experience**: Edit `data/experience.json`
   - Update work experience and academic positions
   - Add company information and achievements

6. **Certificates**: Edit `data/certificates.json`
   - Add awards and certifications
   - Include certificate images for verification

### **Step 3: Deploy**

- Upload all files to your web hosting service
- Ensure the folder structure is maintained
- Test all interactive features and links

## 🎨 **Customization Guide**

### **Colors and Styling**

The website uses CSS custom properties for easy color customization. Main colors:

- Primary gradient: `#3498db` to `#9b59b6`
- Text color: `#2c3e50`
- Background: `#f8f9fa`
- Accent: `#6c757d`

To change colors, edit the CSS variables in `assets/css/styles.css`:

```css
:root {
  --primary-color: #3498db;
  --secondary-color: #9b59b6;
  --text-color: #2c3e50;
  --background-color: #f8f9fa;
}
```

### **Adding New Publications**

Add entries to the appropriate section in `data/publications.json`. Publications will be automatically numbered:

```json
{
  "title": "Your Paper Title",
  "authors": ["Author 1", "Saddiq Ur Rehman", "Author 3"],
  "year": 2024,
  "journal": "Journal Name",
  "volume": "10(2)",
  "pages": "123-145",
  "impactFactor": 3.5,
  "quartile": "Q1",
  "doi": "https://doi.org/10.xxxx/xxxx",
  "badges": ["Editor's Choice"]
}
```

### **Adding New Projects**

Add entries to `data/projects.json`:

```json
{
  "id": "project_new",
  "title": "Project Title",
  "duration": "2024 - Present",
  "role": "Lead Researcher",
  "icon": "fas fa-icon-name",
  "image": "assets/images/projects/project-image.jpg",
  "description": "Brief description...",
  "objectives": ["Objective 1", "Objective 2"],
  "technologies": ["Tech 1", "Tech 2"],
  "outcomes": ["Outcome 1", "Outcome 2"]
}
```

### **Adding Skills Categories**

Add entries to `data/skills.json`:

```json
{
  "technical_skills": {
    "title": "Technical Skills",
    "icon": "fas fa-code",
    "skills": [
      {
        "name": "Skill Name",
        "level": "Expert",
        "percentage": 90,
        "years": 5,
        "description": "Brief description of expertise"
      }
    ]
  }
}
```

### **Adding Certificates and Awards**

Add entries to `data/certificates.json`:

```json
{
  "awards": [
    {
      "title": "Award Name",
      "issuer": "Issuing Organization",
      "date": "2024",
      "icon": "fas fa-trophy"
    }
  ],
  "certifications": [
    {
      "id": "cert_id",
      "title": "Certificate Title",
      "issuer": "Issuing Authority",
      "date": "2024",
      "image": "assets/images/certificates/cert-image.jpg",
      "description": "Certificate description",
      "skills": ["Skill 1", "Skill 2"]
    }
  ]
}
```

### **Social Media Links**

Update social media URLs in the floating icons section of `index.html`:

```html
<a href="YOUR_LINKEDIN_URL" class="social-icon linkedin" target="_blank">
<a href="YOUR_GITHUB_URL" class="social-icon github" target="_blank">
<a href="YOUR_SCHOLAR_URL" class="social-icon scholar" target="_blank">
<a href="YOUR_ORCID_URL" class="social-icon orcid" target="_blank">
<a href="YOUR_RESEARCHGATE_URL" class="social-icon researchgate" target="_blank">
```

## 🔧 **Technical Details**

### **New Features in Latest Version**

- **Publication Statistics**: Automatic counting and display of publications by category
- **Publication Numbering**: Sequential numbering for each publication type
- **Image Optimization**: Proper image fitting with `object-fit` properties
- **Scrollable Modals**: Content automatically scrolls when too long
- **Certificate Viewer**: Click awards to view certificates with zoom functionality
- **Count Badges**: Navigation buttons show real-time publication counts
- **Image Zoom Overlay**: Full-screen image viewing for certificates

### **Dependencies**

- **Font Awesome 6.4.0** - Icons
- **Google Fonts (Inter)** - Typography
- **Pure CSS & JavaScript** - No frameworks required

### **Browser Support**

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### **Performance Features**

- **Lazy loading** for images
- **Debounced scroll** and resize handlers
- **Optimized animations** with CSS transforms
- **Minimal JavaScript** for fast loading
- **Custom scrollbars** for enhanced UX

### **Accessibility Features**

- **Semantic HTML** structure
- **ARIA labels** for interactive elements
- **Keyboard navigation** support (Arrow keys, Escape)
- **High contrast** color scheme
- **Screen reader** compatible
- **Focus management** for modals

## 📱 **Responsive Design**

The website is fully responsive with breakpoints:

- **Desktop**: 1600px+ (wider layout for academic content)
- **Tablet**: 768px - 1599px
- **Mobile**: 320px - 767px

### **Mobile Optimizations**

- Simplified navigation with smaller buttons
- Touch-friendly interactive elements
- Optimized image sizes
- Condensed layouts for publications
- Linear publication numbering on mobile
- Responsive statistics grid

## 🛠 **Advanced Customization**

### **Adding New Tabs**

1. Add navigation button with count badge if needed:

```html
<button class="nav-btn" onclick="showTab('newtab')">
  New Tab <span id="newtab-count" class="count-badge">0</span>
</button>
```

2. Add tab content with cover:

```html
<div id="newtab" class="tab-content">
  <div class="tab-cover newtab-cover">
    <div class="cover-overlay">
      <h1 class="cover-title">New Tab</h1>
      <p class="cover-subtitle">Description</p>
    </div>
  </div>
  <!-- Your content here -->
</div>
```

3. Update JavaScript in `script.js` for dynamic loading if needed.

### **Custom Award Certificates**

Add clickable awards with certificate viewing:

```html
<div class="award-item clickable-award" onclick="openAwardCertificate('award-id')">
  <!-- Award content -->
  <div class="award-actions">
    <span class="view-certificate-link">
      <i class="fas fa-certificate"></i> View Certificate
    </span>
  </div>
</div>
```

### **Custom Animations**

Add CSS animations in `styles.css`:

```css
@keyframes customAnimation {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.custom-element {
  animation: customAnimation 0.5s ease-in-out;
}
```

## 📊 **SEO and Analytics**

### **SEO Optimization**

Add meta tags in `<head>` section:

```html
<meta name="description" content="Academic portfolio of Saddiq Ur Rehman - PhD student specializing in BIM, AI, and construction technology" />
<meta name="keywords" content="BIM, AI, Construction Technology, Academic Research, PhD Student" />
<meta name="author" content="Saddiq Ur Rehman" />
<meta property="og:title" content="Saddiq Ur Rehman - Academic Portfolio" />
<meta property="og:description" content="PhD Student at Kyung Hee University specializing in Building Information Modeling and AI" />
```

### **Google Analytics**

Add tracking code before closing `</body>` tag:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Images not loading**
   - Check file paths match exactly (case-sensitive)
   - Ensure images are in correct folders
   - Verify image file formats (jpg, png, svg)
   - Check object-fit compatibility

2. **Publication counts not updating**
   - Verify JSON data structure
   - Check JavaScript console for errors
   - Ensure publication categories match expected names

3. **Modals not scrolling**
   - Check CSS max-height properties
   - Verify overflow-y settings
   - Test scrollbar styling compatibility

4. **Certificate images not zooming**
   - Ensure image zoom overlay HTML exists
   - Check JavaScript function bindings
   - Verify image paths are correct

5. **Count badges not showing**
   - Check span elements with count-badge class
   - Verify JavaScript count update functions
   - Ensure JSON data is loading properly

### **Performance Issues**

- Optimize images (compress, resize to appropriate dimensions)
- Minify CSS and JavaScript files
- Use CDN for external libraries
- Enable browser caching
- Test loading times on various connections

### **Mobile Issues**

- Test touch interactions on actual devices
- Verify responsive image sizing
- Check modal behavior on small screens
- Test publication numbering on mobile layout

## 📞 **Support and Contact**

For questions, customizations, or technical support:

- **Email**: saddiqurrehman@khu.ac.kr
- **Email**: saddiq.r.97@gmail.com
- **LinkedIn**: [Saddiq Ur Rehman](https://www.linkedin.com/in/saddiq-ur-rehman-b79212138/)
- **GitHub**: [isaddiq](https://github.com/isaddiq)

## 📄 **License**

This portfolio template is open source and available under the [MIT License](LICENSE). Feel free to use, modify, and distribute as needed.

## 🔄 **Version History**

### **Latest Version (June 2025)**
- ✅ Added publication statistics dashboard
- ✅ Implemented publication numbering system
- ✅ Enhanced image sizing and optimization
- ✅ Added scrollable modals
- ✅ Implemented certificate viewer for awards
- ✅ Added image zoom functionality
- ✅ Enhanced responsive design
- ✅ Added count badges to navigation

### **Previous Features**
- Tab persistence with URL hashing
- Skills section with progress bars
- JSON-driven content management
- Floating social media icons
- Interactive project modals

## 🙏 **Acknowledgments**

- **Kyung Hee University** for academic support
- **Professor Inhan Kim** for research guidance
- **ITA Lab** colleagues for collaboration
- **Open source community** for inspiration and resources
- **Academic community** for feedback and suggestions

---

**Made with ❤️ for the academic community**

_Last updated: June 2025_
