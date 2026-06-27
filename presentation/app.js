document.addEventListener('DOMContentLoaded', () => {
    
    const container = document.getElementById('presentationContainer');
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const progressFill = document.getElementById('progressFill');
    const currentSlideNum = document.getElementById('currentSlideNum');
    let currentIndex = 0;
    
    // --- 1. Keyboard Navigation ---
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

    // --- 2. Intersection Observer for Animations & HUD ---
    const observerOptions = {
        root: container,
        threshold: 0.5 // Slide is considered active when 50% visible
    };

    const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // Update HUD
                const index = Array.from(slides).indexOf(entry.target);
                currentIndex = index;
                currentSlideNum.innerText = index + 1;
                progressFill.style.width = `${((index) / (totalSlides - 1)) * 100}%`;

                // Trigger specific slide actions
                handleSpecificSlideActions(entry.target.id);
            } else {
                // Optional: remove 'active' to re-trigger animations when scrolling back
                entry.target.classList.remove('active');
            }
        });
    }, observerOptions);

    slides.forEach(slide => slideObserver.observe(slide));

    // --- 3. Number Counter Animation ---
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- 4. Handle Slide Specific Logic (Charts, Numbers) ---
    function handleSpecificSlideActions(slideId) {
        
        // Stats slide
        if (slideId === 'slide-11') {
            const stats = document.querySelectorAll('.stat-num');
            stats.forEach(stat => {
                if (!stat.classList.contains('counted')) {
                    const endVal = parseInt(stat.getAttribute('data-val'));
                    animateValue(stat, 0, endVal, 2000);
                    stat.classList.add('counted');
                }
            });
        }

        // Charts slide
        if (slideId === 'slide-10') {
            const canvas = document.getElementById('revenueChart');
            if (canvas && !canvas.classList.contains('initialized')) {
                
                Chart.defaults.color = '#94a3b8';
                Chart.defaults.font.family = 'Inter';

                new Chart(canvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['Manager (80%)', 'Doctor (15%)', 'Admin (5%)'],
                        datasets: [{
                            data: [80, 15, 5],
                            backgroundColor: ['#10b981', '#3b82f6', '#f43f5e'],
                            borderWidth: 0,
                            hoverOffset: 20
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'right', labels: { font: { size: 14 } } }
                        },
                        animation: {
                            animateScale: true,
                            animateRotate: true,
                            duration: 1500,
                            easing: 'easeOutQuart'
                        },
                        cutout: '70%'
                    }
                });
                canvas.classList.add('initialized');
            }
        }
    }
    
    // Initialize first slide state
    slides[0].classList.add('active');
    
});
