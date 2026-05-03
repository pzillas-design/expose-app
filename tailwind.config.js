/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    future: {
        // Scope `hover:*` utilities to devices that actually support hover.
        // Without this, the first tap on a touch device shows the hover state
        // (the tap "sticks") so the user has to tap a second time to fire
        // onClick — feels broken on mobile, especially for variable-option
        // buttons. With this flag, `hover:` only applies under
        // @media (hover: hover) so taps fire onClick immediately.
        hoverOnlyWhenSupported: true,
    },
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
