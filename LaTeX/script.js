document.addEventListener('DOMContentLoaded', () => {
    // --- Header Generation ---
    function generateHeader(activePage) {
        const navItems = [
            { href: '../#LaTeX', text: '홈' },
            { href: 'syntax.html', text: '문법' },
            { href: 'graphs.html', text: '그래프' },
            { href: 'katex_usage.html', text: 'KaTeX 사용법' },
            { href: 'setting.html', text: '환경설정' }
        ];

        const navLinks = navItems.map(item =>
            `<a href="${item.href}" class="main-nav-link ${item.href === activePage ? 'active' : ''}">${item.text}</a>`
        ).join('');

        const headerHTML = `
            <div class="container header-content">
                <a href="../index.html#LaTeX" class="logo">LaTeX Hub</a>
                <nav class="main-nav">
                    ${navLinks}
                </nav>
                <nav class="theme-toggle-nav">
                    <button id="theme-toggle" title="테마 전환">
                        <svg id="theme-moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        <svg id="theme-sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    </button>
                </nav>
            </div>
        `;

        const headerPlaceholder = document.getElementById('main-header-placeholder');
        if (headerPlaceholder) {
            headerPlaceholder.innerHTML = headerHTML;
        }
    }
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    generateHeader(currentPage);

    // --- Theme Switching Logic ---
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.className = savedTheme;
    updateThemeIcon(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        const html = document.documentElement;
        const newTheme = html.classList.contains('dark') ? 'light' : 'dark';
        html.className = newTheme;
        localStorage.setItem('theme', newTheme);

        if (themeToggleBtn) {
            themeToggleBtn.classList.add('rotating');
            setTimeout(() => themeToggleBtn.classList.remove('rotating'), 500);
        }

        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const sunIcon = document.getElementById('theme-sun-icon');
        const moonIcon = document.getElementById('theme-moon-icon');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
            moonIcon.style.display = theme === 'light' ? 'block' : 'none';
        }
    }

    // --- Copy Button Logic for Code Blocks ---
    const allCodeBlocks = document.querySelectorAll('.code-block-wrapper');

    allCodeBlocks.forEach(wrapper => {
        const copyButton = wrapper.querySelector('.copy-button');
        const codeElement = wrapper.querySelector('pre > code');

        if (!copyButton || !codeElement) return;

        copyButton.addEventListener('click', () => {
            const codeToCopy = codeElement.innerText;

            navigator.clipboard.writeText(codeToCopy).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');

                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                    copyButton.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                copyButton.textContent = 'Error';
                console.error('Failed to copy text: ', err);
            });
        });
    });
});
