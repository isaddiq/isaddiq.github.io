document.addEventListener('DOMContentLoaded', () => {
    // Smooth Scrolling for Navigation Links
    const smoothScrollLinks = document.querySelectorAll('.side-nav a[href^="#"]');
    smoothScrollLinks.forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });

    function smoothScroll(event) {
        event.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({
            behavior: 'smooth'
        });
    }

    // Highlight Active Navigation Link on Scroll
    window.addEventListener('scroll', highlightNavOnScroll);

    function highlightNavOnScroll() {
        const sections = document.querySelectorAll('section');
        let scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

        sections.forEach(section => {
            const navLinks = document.querySelectorAll('.side-nav a');
            if (section.offsetTop <= scrollPos && section.offsetTop + section.offsetHeight > scrollPos) {
                navLinks.forEach(a => {
                    a.classList.remove('active');
                    if (section.id && a.getAttribute('href').includes(section.id)) {
                        a.classList.add('active');
                    }
                });
            }
        });
    }

    // Section Reveal Animation
    window.addEventListener('scroll', revealSections);

    function revealSections() {
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                section.classList.add('visible');
            }
        });
    }

    // Initial Reveal of Sections
    revealSections();

    // Image Slider Functionality
    let currentIndex = 0;
    const slides = document.querySelectorAll('.slides img');
    const totalSlides = slides.length;

    document.querySelector('.next').addEventListener('click', () => changeSlide(1));
    document.querySelector('.prev').addEventListener('click', () => changeSlide(-1));

    function changeSlide(direction) {
        currentIndex = (currentIndex + direction + totalSlides) % totalSlides;
        updateSlider();
    }

    function updateSlider() {
        const slideWidth = slides[0].clientWidth;
        document.querySelector('.slides').style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    }

    // Toggle Side Navigation for Mobile
    const sideNav = document.getElementById('side-nav');
    const navToggle = document.getElementById('nav-toggle');

    navToggle.addEventListener('click', toggleSideNav);
    document.addEventListener('click', closeSideNavOnClickOutside);

    function toggleSideNav(event) {
        event.stopPropagation();
        sideNav.classList.toggle('open');
    }

    function closeSideNavOnClickOutside(event) {
        if (!sideNav.contains(event.target) && !navToggle.contains(event.target)) {
            sideNav.classList.remove('open');
        }
    }

    // Close Side Navigation When a Link Inside is Clicked
    document.querySelectorAll('.side-nav a').forEach(link => {
        link.addEventListener('click', () => {
            sideNav.classList.remove('open');
        });
    });
});
