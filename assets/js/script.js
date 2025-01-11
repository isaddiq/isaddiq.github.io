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
        const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;

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

    // Certificate Modal Functionality
    const modal = document.getElementById('certificate-modal');
    const modalImage = document.getElementById('modal-image');
    const closeModal = document.querySelector('.certificate-modal .close');

    // Open Modal on Certificate Click
    document.querySelectorAll('.certificate-card img').forEach(image => {
        image.addEventListener('click', function () {
            const imageSrc = this.src; // Get the image source
            modalImage.src = imageSrc; // Set the modal image source
            modal.style.display = 'flex'; // Display the modal
        });
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none'; // Hide the modal
    });

    // Close Modal on Outside Click
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        const nav = document.querySelector(".top-nav");
        
        window.addEventListener("scroll", function () {
            if (window.scrollY > 50) {
                nav.classList.add("scrolled"); // Add the "scrolled" class when scrolling down
            } else {
                nav.classList.remove("scrolled"); // Remove the "scrolled" class when at the top
            }
        });
    });
    
    
    
});
