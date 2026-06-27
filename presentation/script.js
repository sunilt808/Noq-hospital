// presentation/script.js

// Initialize Reveal.js with premium settings
Reveal.initialize({
    hash: true,
    slideNumber: 'c/t',
    progress: true,
    center: true,
    transition: 'concave', // More dynamic transition
    backgroundTransition: 'fade',
    keyboard: true,
    autoAnimateDuration: 0.8,
    autoAnimateEasing: 'ease-out',
    plugins: [ RevealNotes ]
});

// Initialize Mermaid.js
mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Outfit'
});

// Number Counter Animation Function
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

// Chart.js & Number animations when slides change
Reveal.on('slidechanged', event => {
    const currentSlide = event.currentSlide;
    
    // Check for animated stats
    const stats = currentSlide.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        if (!stat.classList.contains('counted')) {
            const endVal = parseInt(stat.getAttribute('data-target'));
            animateValue(stat, 0, endVal, 2000);
            stat.classList.add('counted');
        }
    });

    // Chart logic
    const canvas = currentSlide.querySelector('canvas');
    if (canvas && !canvas.classList.contains('chart-initialized')) {
        const chartId = canvas.id;
        
        Chart.defaults.color = '#cbd5e1';
        Chart.defaults.font.family = 'Outfit';
        
        if (chartId === 'revenueChart') {
            new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['Hospital Manager (80%)', 'Doctor (15%)', 'Admin (5%)'],
                    datasets: [{
                        data: [80, 15, 5],
                        backgroundColor: ['#4ade80', '#c084fc', '#38bdf8'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }
        
        if (chartId === 'growthChart') {
            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'API Requests (Millions)',
                        data: [2, 5, 12, 25, 40, 85],
                        backgroundColor: '#38bdf8',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 2000,
                        easing: 'easeOutQuart'
                    },
                    scales: {
                        y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
        canvas.classList.add('chart-initialized');
    }
});
