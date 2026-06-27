document.addEventListener('DOMContentLoaded', () => {
    
    const container = document.getElementById('presContainer');
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const hudFill = document.getElementById('hudFill');
    const hudCurrent = document.getElementById('hudCurrent');
    const hudTotal = document.getElementById('hudTotal');
    let currentIndex = 0;
    
    // Set total
    hudTotal.innerText = totalSlides;

    // --- Keyboard Navigation ---
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

    // --- Intersection Observer ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                const idx = Array.from(slides).indexOf(entry.target);
                currentIndex = idx;
                hudCurrent.innerText = idx + 1;
                hudFill.style.width = `${(idx / (totalSlides - 1)) * 100}%`;

                handleSlideActions(entry.target.id);
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, { root: container, threshold: 0.5 });

    slides.forEach(s => observer.observe(s));

    // --- Counter Animation ---
    function animateNum(el, start, end, dur) {
        let t0 = null;
        const step = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / dur, 1);
            el.innerHTML = Math.floor(p * (end - start) + start);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // --- Slide-Specific Actions ---
    function handleSlideActions(id) {
        // Stats slide
        if (id === 'slide-19') {
            document.querySelectorAll('.stat-num').forEach(el => {
                if (!el.classList.contains('counted')) {
                    animateNum(el, 0, parseInt(el.dataset.val), 2200);
                    el.classList.add('counted');
                }
            });
        }

        // Revenue chart
        if (id === 'slide-18') {
            const canvas = document.getElementById('revChart');
            if (canvas && !canvas.classList.contains('init')) {
                Chart.defaults.color = '#9ca3af';
                Chart.defaults.font.family = 'Inter';
                new Chart(canvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['Hospital Manager (80%)', 'Doctor (15%)', 'Platform Admin (5%)'],
                        datasets: [{
                            data: [80, 15, 5],
                            backgroundColor: ['#10b981', '#3b82f6', '#f43f5e'],
                            borderWidth: 0, hoverOffset: 20
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { font: { size: 13, weight: '600' }, padding: 20, usePointStyle: true }
                            }
                        },
                        animation: { animateScale: true, animateRotate: true, duration: 1800, easing: 'easeOutQuart' },
                        cutout: '72%'
                    }
                });
                canvas.classList.add('init');
            }
        }
    }

    // Init first slide
    if (slides.length > 0) slides[0].classList.add('active');

    // --- Touch Support ---
    let touchStartY = 0;
    container.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        const diff = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentIndex < totalSlides - 1) {
                slides[currentIndex + 1].scrollIntoView({ behavior: 'smooth' });
            } else if (diff < 0 && currentIndex > 0) {
                slides[currentIndex - 1].scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, { passive: true });
});
