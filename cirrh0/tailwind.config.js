/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {

        // Main colors
        C11: '#A90307',//dark red
        C22: '#1F7A8C',//teal
        C33:'#BFDBF7' ,//lightblue
        C44 : "#F4F4F4",//grey
        C55 : "#FAFAFA",//white alt
        inactiveC11:"#012b3927",
        inactiveRed:"#ff5a5a3f",
        SucessGreen:"#2abf43",


        // Task priority colors

        highPriority:"#FF5A5A",
        mediumPriority:"#fac439",
        lowPriority:"#5A92FF",

      },

    },
  },
  plugins: [],
}