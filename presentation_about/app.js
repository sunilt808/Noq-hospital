document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('presentationContainer');
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const progressFill = document.getElementById('progressFill');
    const currentSlideNum = document.getElementById('currentSlideNum');
    let currentIndex = 0;
    
    // Total slides counter setup
    document.getElementById('totalSlidesNum').innerText = totalSlides;

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            if (currentIndex < totalSlides - 1) {
                slides[currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentIndex > 0) {
                slides[currentIndex - 1].scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    // Intersection Observer for Animations & HUD
    const observerOptions = {
        root: container,
        threshold: 0.5 
    };

    const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                const index = Array.from(slides).indexOf(entry.target);
                currentIndex = index;
                currentSlideNum.innerText = index + 1;
                progressFill.style.width = `${((index) / (totalSlides - 1)) * 100}%`;
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    slides.forEach(slide => slideObserver.observe(slide));

    // Initialize first slide state
    if(slides.length > 0) {
        slides[0].classList.add('active');
    }
});
