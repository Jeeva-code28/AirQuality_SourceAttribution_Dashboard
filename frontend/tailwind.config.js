/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'aqi-good': '#00ddd0', // Green/Teal
                'aqi-moderate': '#fdd64b', // Yellow
                'aqi-unhealthy': '#ff9b57', // Orange
                'aqi-bad': '#fe6a69', // Red/Pink
                'aqi-extreme': '#a155b9', // Purple
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
