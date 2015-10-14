#!/usr/bin/env node

/*! plotframes | (c) 2015 RodrigoPolo.com | MIT License | https://github.com/rodrigopolo/plotframes/blob/master/LICENSE */

var child = require('child_process'),
	path = require('path'),
	dashdash = require('dashdash'),
	temp = require('temp'),
	split = require("split"),
	log = require('single-line-log').stderr,
	isWin = /^win/.test(process.platform),
	defterminal = isWin ? 'windows' : 'x11';

// CLI option
var options = [
	{
		names: ['help', 'h'],
		type: 'bool',
		help: 'Print this help and exit.'
	}, {
		names: ['input', 'i'],
		type: 'string',
		help: 'Specify multimedia file to read. This is the file passed to the ffprobe command. If not specified it is the first argument passed to the script.',
		helpArg: 'FILE',
		takesArg: false
	}, {
		names: ['stream', 's'],
		type: 'string',
		help: 'Specify stream. The value must be a string containing a stream specifier. Default value is "0".',
		helpArg: '0',
		default: '0'
	}, {
		names: ['output', 'o'],
		type: 'string',
		help: 'Set the name of the output used by gnuplot. If not specified no output is created. Must be used in conjunction with the terminal option.',
		helpArg: 'FILE.png'
	}, {
		names: ['terminal', 't'],
		type: 'string',
		help: 'Set the name of the terminal used by gnuplot. By default it is "'+defterminal+'". Must be used in conjunction with the output option. Check the gnuplot manual for the valid values.',
		helpArg: 'png',
		default: defterminal
	}, {
		names: ['frames', 'f'],
		type: 'bool',
		help: 'Create a plot based on frame number instead of frame time.'
	}
];

// Parse user input
var parser = dashdash.createParser({options: options});

// Display help on console
function showHelp(code){
	var help = parser.help({includeEnv: true}).trimRight();
	console.error('Usage: plotframes [OPTIONS]\n'+ 'options:\n'+ help);
	process.exit(code);
}

try {
	var opts = parser.parse(process.argv);
} catch (e) {
	console.error('Error! Unknown option.');
	showHelp(1);
}

if (opts.help) {
	showHelp(0);
}

if (!opts.input) {
	if(opts._args[0]){
		opts.input = opts._args[0]; 
	}else{
		console.error('Error! No input defined.');
		showHelp(1);
	}
}

// Cleanup stream files on exit
temp.track();

// Single line output
var clnl = false;
function cutelog(str, nl){
	if(nl){
		log(str);
	}else{
		log.clear();
		log(str);
	}
}

// Pad number
function pad(num, size) {
	var str = num + "";
	while (str.length < size) str = "0" + str;
	return str;
}

// Seconds to time format
function toHHMMSS(n) {
	var sep = ':',
		n = parseFloat(n),
		sss = parseInt((n % 1)*1000),
		hh = parseInt(n / 3600);
	n %= 3600;
	var mm = parseInt(n / 60),
		ss = parseInt(n % 60);
	return pad(hh,2)+sep+pad(mm,2)+sep+pad(ss,2)+'.'+pad(sss,3);
}

// Get average in array
function getAvg(arr) {
	return arr.reduce(function (p, c) {return p + c;}) / arr.length;
}

// Bits into human readable units
function bandWidth(bits) {
	bits = bits* 1000;
	var unit = 1000;
	if (bits < unit) return (bits % 1 === 0 ? bits : bits.toFixed(2)) + "B";
	var exp =  parseInt(Math.log(bits) / Math.log(unit));
	var pre = "KMGTPE"[exp-1] + 'bps';
	var n = bits / Math.pow(unit, exp);
	return (n % 1 === 0 ? n : n.toFixed(2))+pre;
}


// Get file Details
function getDetails(input, cb){

	var rd,
		rf,
		frame_rate,
		duration,
		seconds,
		r_frame_rate = /avg_frame_rate\=(\d+)\/(\d+)/,
		r_duration = /Duration: ((\d{2}):(\d{2}):(\d{2}).(\d{2})), /;

	var cli = child.spawn(
		'ffprobe', [
			'-show_entries',
			'stream',
			'-select_streams',
			opts.stream,
			input
		],[]
	);

	cli.stdout.pipe(split()).on('data', function (data) {
		if(rf = r_frame_rate.exec(data)){
			frame_rate = (rf[1]/rf[2]) || 1;
		}
	});

	cli.stderr.pipe(split()).on('data', function (data) {
		if(rd = r_duration.exec(data)){
			duration = rd[1];
			seconds  = ((((rd[2]*60)+rd[3])*60)+parseInt(rd[4]))+parseFloat(rd[5]/100);
		}
	});

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to get the file details.',false);
		}
		if(frame_rate && duration){
			cb({
				frame_rate: frame_rate,
				duration: duration,
				seconds: seconds
			});
		}
	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		cutelog('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.',false);
		process.exit(1);
	});
}

// Get frame bitrate
function getBitrate(input, details, cb){
	var frame_count = 0,
		kbps_count = 0,
		peak = 0,
		min = 0,
		start= true,
		frame_bitrate,
		frame_zbits,
		frame_time,
		frame_type,
		time_sec,
		times = [],
		streams = [],
		r,
		r_frame = /(?:media_type\=(\w+)\r?\n)(?:stream_index\=(\w+)\r?\n)(?:pkt_pts_time\=(\d*.?\d*)\r?\n)(?:pkt_size\=(\d+)\r?\n)(?:pict_type\=(\w+))?/;

	var cli = child.spawn(
		'ffprobe', [
			'-show_entries',
			'frame=stream_index,media_type,pict_type,pkt_size,pkt_pts_time',
			'-select_streams',
			opts.stream,
			input
		],[]
	);

	cli.stdout.pipe(split(/\[\/FRAME\]\r?\n/)).on('data', function (data){

		if(r = r_frame.exec(data)){

			// Cleaning the data
			frame_zbits = (r[4]*8)/1000;
			frame_time  = parseFloat(r[3]);
			frame_type  = r[5]?r[5]:'A';

			// Create stream if not exists
			if(!streams[frame_type]){streams[frame_type] = temp.createWriteStream();}

			// Counters
			frame_count++;		
			kbps_count += frame_zbits;

			// Get the frame bitrate
			frame_bitrate = frame_zbits * details.frame_rate;

			if(opts.frames){
				if(start){min = frame_bitrate; start=null;}
				peak = peak < frame_bitrate ? frame_bitrate : peak;
				min  = min > frame_bitrate ? frame_bitrate : min;
				streams[frame_type].write(frame_count+' '+frame_bitrate+'\n');
			}else{
				time_sec = parseInt(frame_time);
				if(times[time_sec]){
					times[time_sec]+=frame_zbits;
				}else{
					times[time_sec] = frame_zbits;
				}
				streams[frame_type].write(frame_time+' '+frame_bitrate+'\n');
			}

			cutelog('Analyzing '+toHHMMSS(frame_time)+' / '+details.duration+' '+((frame_time/details.seconds)*100).toFixed(2)+'%',true);
		}
	});

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to get the file bitrate.',false);
		}

		cutelog('Analysis complete.',false);

		if(opts.frames){
			cb({
				streams: streams,
				avg: kbps_count/details.seconds,
				peak: peak,
				min: min,
				frames: frame_count,
				seconds: details.seconds
			});
		}else{
			cb({
				streams: streams,
				avg: getAvg(times),
				peak: Math.max.apply(Math, times),
				min: Math.min.apply(Math, times),
				frames: frame_count,
				seconds: details.seconds
			});
		}
	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		cutelog('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.',false);
		process.exit(1);
	});
}

// Create the plot files
function createPlot(data, cb){

	var cm = {
		P: 'green',
		I: 'red',
		B: 'blue',
		A: 'blue'
	},
	sep='';

	var scr='set title "Frames Bitrates for \\"'+path.basename(opts.input)+':'+opts.stream+'\\" "\n';
		if(opts.frames){
			scr+='set xlabel "Avg Bitrate: '+bandWidth(data.avg)+'. '+data.frames+' Frames; Peak: '+bandWidth(data.peak)+' Min: '+bandWidth(data.min)+'."\n';
		}else{
			scr+='set xlabel " Avg Bitrate: '+bandWidth(data.avg)+'. '+parseInt(data.seconds)+' Seconds; Max: '+bandWidth(data.peak)+' Min: '+bandWidth(data.min)+'."\n';
		}
		scr+='set ylabel "Frames Kbps"\nset grid\nset terminal "'+opts.terminal+'"\n';

	if(opts.output){
		scr += 'set output "'+opts.output+'"\n';
	}

	scr += 'plot';

	for(var k in cm){
		if(data.streams[k]){
			data.streams[k].end();
			scr += sep+'"'+(data.streams[k].path).replace(/\\/g,'\\\\')+'" title "'+k+' frames" with impulses linecolor rgb "'+cm[k]+'"';
			sep = ', ';
		}
	}

	var gnuplot = temp.createWriteStream();
	gnuplot.write(scr);
	gnuplot.end();

	console.error('\nRunnig gnuplot now.');

	var cli = child.spawn(
		'gnuplot', [
			'--persist',
			gnuplot.path
		],[]
	);

	cli.stdout.pipe(process.stdout);

	cli.stderr.pipe(process.stderr);

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to run gnuplot.',false);
		}
	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		cutelog('Error running gnuplot, check if it is installed correctly and if it is included in the system environment path.',false);
		process.exit(1);
	});
}

// Run
getDetails(opts.input, function(details){
	getBitrate(opts.input, details, function(data){
		createPlot(data, function(){
		});
	});
});

