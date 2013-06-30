var http         = require('http'),
	fs           = require('fs'),
	url          = require('url'),
	util         = require('util'),
	path         = require('path'),
	EventEmitter = require('events').EventEmitter;

var SoundRain = function(soundCloudURL, outdir) {
	EventEmitter.call(this);

	// Error detection
	// First replace HTTPS with HTTP.
	soundCloudURL = soundCloudURL.replace('https', 'http');
	// Secondly ensure it's actually SoundCloud we're downloading from.
	if(!soundCloudURL.match(/http:\/\/soundcloud.com/gi)) {
		this.emit('error', Error('The URL provided must be from SoundCloud.com'));
		return false;
	}
	
	this.url    = soundCloudURL;
	this.outdir = outdir;
	this.tracks;
	this.outfile;

	var self = this;

	self.test(function() {
		self.find();
	});

	return this;
};

util.inherits(SoundRain, EventEmitter);

SoundRain.prototype.test = function(callback) {
	EventEmitter.call(this);

	var testFile = this.outdir + '/.soundrain_' + Date.now(), writeTest, self = this;
	try {
		writeTest = fs.createWriteStream(testFile);
	} catch (e) {
		this.emit('error', Error('Incorrect write permissions on directory'));
	}

	writeTest.end();

	fs.unlink(testFile, function(err) {
		if(err) self.emit('error', err);
	});

	callback.apply(this);

	return this;
};

SoundRain.prototype.find = function() {
	var self = this, trackData = '';

	http.get(this.url, function(res) {
		res.on('data', function(chunk) {
			trackData += chunk;
		});
		res.on('end', function() {
			self.tracks = trackData.match(/(window\.SC\.bufferTracks\.push\().+(?=\);)/gi);
			self.download(self.parse(self.tracks[0]));
		});
	});

	return this;
};

SoundRain.prototype.parse = function(raw) {
	EventEmitter.call(this);
	
	var self = this, rawChaff;
	rawChaff = raw.indexOf('{');
	if(rawChaff === -1) return false;
	try {
		return JSON.parse(raw.substr(rawChaff));
	} catch (e) {
		this.emit('error', Error('Couldn\'t parse URL.'));
	}

	return this;
};

SoundRain.prototype.download = function(obj) {
	EventEmitter.call(this);

	var self = this;
	var trackPattern, trackArtist, trackTitle, trackFile;

	trackPattern = /&\w+;|[^\w|\s]/g;
	trackArtist  = obj.user.username.replace(trackPattern, '');
	trackTitle   = obj.title.replace(trackPattern, '');

	this.outfile = path.join(this.outdir, "/" + trackArtist + " - " + trackTitle + ".mp3");

	http.get(obj.streamUrl, function(res) {;
		return http.get(res.headers.location, function(res) {
			trackFile = fs.createWriteStream(self.outfile);
			res.on('data', function(chunk) {
				return trackFile.write(chunk);
			});
			res.on('end', function() {
				trackFile.end(); // Close handle
				self.emit('done', self.outfile);
			});
		});
	});

	return this;
};

module.exports = SoundRain;