/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                kumbh: ['"Kumbh Sans"', 'sans-serif'],
            },
            keyframes: {
                'voice-bar': {
                    '0%, 100%': { height: '20%' },
                    '50%': { height: '80%' },
                },
                'pill-in': {
                    '0%': { opacity: '0', transform: 'scaleX(0.35)' },
                    '100%': { opacity: '1', transform: 'scaleX(1)' },
                },
            },
            animation: {
                'voice-bar': 'voice-bar 0.8s ease-in-out infinite',
                'pill-in': 'pill-in 0.28s cubic-bezier(0.34,1.3,0.64,1) forwards',
            },
        },
    },
    plugins: [],
}
