# 🎓 Academic Portfolio Website

A modern, responsive, and interactive academic portfolio website by **Saddiq Ur Rehman**, PhD Student at Kyung Hee University. This portfolio showcases research work, publications, projects, and professional experience in an elegant and user-friendly design.

## 🌟 Features

### ✨ **Interactive Design**

- **Glassmorphism UI** with modern gradient backgrounds
- **Smooth animations** and hover effects
- **Responsive design** for all devices (desktop, tablet, mobile)
- **Professional academic color scheme** (#667eea, #764ba2)

### 📱 **Navigation & User Experience**

- **Sticky navigation** with smooth tab switching
- **Profile image hover effect** (changes on hover)
- **Floating social media icons** with platform-specific colors
- **Modal popups** for detailed project and certificate information
- **Keyboard navigation** support

### 📚 **Content Sections**

1. **Home** - Profile, bio, research interests, and contact information
2. **Education & News** - Academic background and recent updates
3. **Experience** - Professional and academic experience with company logos
4. **Publications** - Categorized publications with APA formatting
5. **Projects** - Interactive project cards with detailed modal views
6. **Certifications & Awards** - Awards, scholarships, and professional certificates
7. **Activities** - Professional memberships and editorial activities

### 🔬 **Academic Features**

- **APA-style publication formatting**
- **Impact factor display** and journal rankings
- **Author name highlighting** in bold
- **DOI links** and special badges (Editor's Choice, Corresponding Author)
- **Publication categorization** (International Journals, Conferences, Korean Conferences, Technical Reports)

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
│   │   ├── profile-main.jpg   # Main profile picture
│   │   ├── profile-hover.jpg  # Hover profile picture
│   │   ├── projects/          # Project images
│   │   ├── certificates/      # Certificate images
│   │   └── logos/             # Company/university logos
│   └── icons/
│       └── favicon.ico        # Website favicon
├── data/
│   ├── publications.json     # Publications data
│   ├── projects.json         # Projects data
│   └── experience.json       # Experience data
└── README.md                 # This documentation
```

## 🚀 **Quick Start**

### **Step 1: Download and Setup**

1. Download all files maintaining the folder structure
2. Place your profile images in `assets/images/`:
   - `profile-main.jpg` - Main profile picture
   - `profile-hover.jpg` - Picture shown on hover
3. Add company/university logos to `assets/images/logos/`

### **Step 2: Customize Content**

1. **Personal Information**: Edit the HTML in `index.html`

   - Update name, title, bio, and contact information
   - Modify social media links in the floating icons section

2. **Publications**: Edit `data/publications.json`

   - Add your publications in each category
   - Update DOI links, impact factors, and badges

3. **Projects**: Edit `data/projects.json`

   - Add project details, descriptions, and outcomes
   - Include technologies used and collaborators

4. **Experience**: Edit `data/experience.json`
   - Update work experience and academic positions
   - Add company information and achievements

### **Step 3: Deploy**

- Upload all files to your web hosting service
- Ensure the folder structure is maintained
- Test all interactive features and links

## 🎨 **Customization Guide**

### **Colors and Styling**

The website uses CSS custom properties for easy color customization. Main colors:

- Primary gradient: `#667eea` to `#764ba2`
- Text color: `#2c3e50`
- Background: `#f8f9fa`
- Accent: `#6c757d`

To change colors, edit the CSS variables in `assets/css/styles.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --text-color: #2c3e50;
  --background-color: #f8f9fa;
}
```

### **Adding New Publications**

Add entries to the appropriate section in `data/publications.json`:

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
  "description": "Brief description...",
  "objectives": ["Objective 1", "Objective 2"],
  "technologies": ["Tech 1", "Tech 2"],
  "outcomes": ["Outcome 1", "Outcome 2"]
}
```

### **Social Media Links**

Update social media URLs in the floating icons section of `index.html`:

```html
<a href="YOUR_LINKEDIN_URL" class="social-icon linkedin" target="_blank">
  <a href="YOUR_GITHUB_URL" class="social-icon github" target="_blank">
    <a href="YOUR_SCHOLAR_URL" class="social-icon scholar" target="_blank">
      <a href="YOUR_ORCID_URL" class="social-icon orcid" target="_blank">
        <a
          href="YOUR_RESEARCHGATE_URL"
          class="social-icon researchgate"
          target="_blank"
        ></a></a></a></a
></a>
```

## 🔧 **Technical Details**

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

### **Accessibility Features**

- **Semantic HTML** structure
- **ARIA labels** for interactive elements
- **Keyboard navigation** support
- **High contrast** color scheme
- **Screen reader** compatible

## 📱 **Responsive Design**

The website is fully responsive with breakpoints:

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

### **Mobile Optimizations**

- Simplified navigation
- Touch-friendly buttons
- Optimized images
- Condensed layouts
- Swipe gestures support

## 🛠 **Advanced Customization**

### **Adding New Tabs**

1. Add navigation button in `index.html`:

```html
<button class="nav-btn" onclick="showTab('newtab')">New Tab</button>
```

2. Add tab content:

```html
<div id="newtab" class="tab-content">
  <!-- Your content here -->
</div>
```

3. Update JavaScript in `script.js` if dynamic loading is needed.

### **Custom Animations**

Add CSS animations in `styles.css`:

```css
@keyframes customAnimation {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.custom-element {
  animation: customAnimation 0.5s ease-in-out;
}
```

## 📊 **SEO and Analytics**

### **SEO Optimization**

- Add meta tags in `<head>` section:

```html
<meta name="description" content="Your academic portfolio description" />
<meta name="keywords" content="BIM, AI, Construction, Research" />
<meta name="author" content="Saddiq Ur Rehman" />
```

### **Google Analytics**

Add tracking code before closing `</body>` tag:

```html
<!-- Google Analytics -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_MEASUREMENT_ID");
</script>
```

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Images not loading**

   - Check file paths in HTML
   - Ensure images are in correct folders
   - Verify image file formats (jpg, png, svg)

2. **Animations not working**

   - Check browser compatibility
   - Ensure CSS files are loading properly
   - Verify JavaScript is enabled

3. **Modal not opening**

   - Check JavaScript console for errors
   - Ensure project/certificate IDs match
   - Verify modal HTML structure

4. **Responsive issues**
   - Test on different screen sizes
   - Check CSS media queries
   - Validate HTML structure

### **Performance Issues**

- Optimize images (compress, resize)
- Minify CSS and JavaScript
- Use CDN for external libraries
- Enable browser caching

## 📞 **Support and Contact**

For questions, customizations, or technical support:

- **Email**: saddiqurrehman@khu.ac.kr

## 📄 **License**

This portfolio template is open source and available under the [MIT License](LICENSE). Feel free to use, modify, and distribute as needed.

## 🙏 **Acknowledgments**

- **Kyung Hee University** for academic support
- **Professor Inhan Kim** for research guidance
- **ITA Lab** colleagues for collaboration
- **Open source community** for inspiration and resources

---

**Made with ❤️ for the academic community**

_Last updated: June 2025_
