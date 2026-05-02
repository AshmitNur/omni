const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('Selise Blocks Project Brief_2.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error) {
    console.error(error);
});
