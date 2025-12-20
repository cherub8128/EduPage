/**
 * Tailwind CSS Configuration
 * Poster Editor custom theme settings
 */

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Pretendard', 'sans-serif'],
            },
            colors: {
                slate: {
                    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
                    300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
                    600: '#475569', 700: '#334155', 800: '#1e293b',
                    900: '#0f172a',
                },
                navyblue: {
                    DEFAULT: '#023373',
                    '50': '#E6F0FF',
                    '100': '#BEDAFF',
                    '200': '#94C3FF',
                    '300': '#6BAEFE',
                    '400': '#429AFF',
                    '500': '#1A85FF',
                    '600': '#006AD4',
                    '700': '#0052A3',
                    '800': '#013D75',
                    '900': '#023373',
                    '950': '#011A3B'
                },
                gray: {
                    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb',
                    300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280',
                    600: '#4b5563', 700: '#374151', 800: '#1f2937',
                    900: '#111827', 950: '#030712'
                }
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                'lifted': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.07)'
            },
            keyframes: {
                spin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
            },
            animation: {
                spin: 'spin 1s linear infinite',
            }
        }
    }
};
