document.addEventListener('DOMContentLoaded', function () {
    // Smooth scrolling for navigation links
    document.querySelectorAll('.side-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Highlight navigation on scroll
    window.addEventListener('scroll', function () {
        let sections = document.querySelectorAll('section');
        let scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

        sections.forEach(section => {
            if (section.offsetTop <= scrollPos && section.offsetTop + section.offsetHeight > scrollPos) {
                document.querySelectorAll('.side-nav a').forEach(a => {
                    a.classList.remove('active');
                    if (section.id && a.getAttribute('href').includes(section.id)) {
                        a.classList.add('active');
                    }
                });
            }
        });
    });

    // Section reveal animation
    let sections = document.querySelectorAll('section');
    function revealSections() {
        sections.forEach(section => {
            let rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                section.classList.add('visible');
            }
        });
    }

    window.addEventListener('scroll', revealSections);
    revealSections(); // Reveal sections on initial load
    // image slider

    let currentIndex = 0;
    const slides = document.querySelectorAll('.slides img');
    const totalSlides = slides.length;

    document.querySelector('.next').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlider();
    });

    document.querySelector('.prev').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlider();
    });

    function updateSlider() {
        const slideWidth = slides[0].clientWidth;
        document.querySelector('.slides').style.transform = `translateX(-${currentIndex * slideWidth}px)`;
    }


    document.addEventListener('DOMContentLoaded', function () {
        const sideNav = document.getElementById('side-nav');
        const navToggle = document.getElementById('nav-toggle');
    
        // Toggle side navigation on button click
        navToggle.addEventListener('click', function () {
            sideNav.classList.toggle('open');
        });
    
        // Close the side navigation when clicking outside
        document.addEventListener('click', function (event) {
            if (!sideNav.contains(event.target) && !navToggle.contains(event.target)) {
                sideNav.classList.remove('open');
            }
        });
    });

});
