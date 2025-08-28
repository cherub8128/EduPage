document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Switcher --- //
    const themeSwitch = document.getElementById('checkbox');

    themeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('light-mode');
        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
        // Re-initialize particles for the new theme
        initParticles(); 
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeSwitch.checked = true;
    } else {
        themeSwitch.checked = false;
    }

    // --- Particle Animation --- //
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');

    let particlesArray;

    function setCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // get color from CSS variable
    function getParticleColor() {
        return getComputedStyle(document.body).getPropertyValue('--particle-color');
    }

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function initParticles() {
        setCanvasSize();
        particlesArray = [];
        const numberOfParticles = (canvas.height * canvas.width) / 9000;
        const color = getParticleColor();

        for (let i = 0; i < numberOfParticles; i++) {
            const size = (Math.random() * 2) + 1;
            const x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            const y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            const directionX = (Math.random() * .4) - .2;
            const directionY = (Math.random() * .4) - .2;
            
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        requestAnimationFrame(animateParticles);
    }

    // Initialize and start animation
    initParticles();
    animateParticles();

    // Recalculate on resize
    window.addEventListener('resize', () => {
        initParticles();
    });
});
