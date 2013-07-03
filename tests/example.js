SoundRain = require('../');
var Song = new SoundRain("https://soundcloud.com/jbrooksuk/twisted-beat-sample-at", '.');
Song.on('error', function(err) {
    if(err) throw err;
}).on('done', function(file) {
    console.log(file);
    process.exit(0);
});