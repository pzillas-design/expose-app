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
            },
            animation: {
                'voice-bar': 'voice-bar 0.8s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
