#!/usr/bin/env node
var child = require('child_process'),
	dashdash = require('dashdash'),
	temp = require('temp'),
	split = require("split"),
	log = require('single-line-log').stderr,
	isWin = /^win/.test(process.platform),
	defterminal = isWin ? 'windows' : 'x11';

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
		help: 'Specify stream. The value must be a string containing a stream specifier. Default value is "v".',
		helpArg: 'v',
		default: 'v'
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
	}
];

var parser = dashdash.createParser({options: options});

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

// Automatically track and cleanup files at exit
temp.track();

var clnl = false;
function cutelog(str, nl){
	if(nl){
		log(str);
	}else{
		log.clear();
		log(str);
	}
}


function pad(num, size) {
	var str = num + "";
	while (str.length < size) str = "0" + str;
	return str;
}

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

// Get file duration
function getDuration(input, cb){
	var r_duration = /Duration: ((\d{2}):(\d{2}):(\d{2}).(\d{2})), /;
	var r;
	var cli = child.spawn(
		'ffprobe', [
			input
		],[]
	);

	cli.stderr.on('data', function (data) {
		if(r = r_duration.exec(data)){	
			cb({
				duration: r[1],
				seconds: ((((r[2]*60)+r[3])*60)+parseInt(r[4]))+parseFloat(r[5]/100)
			});
		}
	});

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to get the file duration.',false);
		}
	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		console.log('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.');
		process.exit(1);
	});
}

// Get frame bitrate
function getBitrate(input, time, cb){
	var frame_count = 0;
	var streams = [];
	var r;
	var r_frame = /(?:media_type\=(\w+)\r?\n)(?:stream_index\=(\w+)\r?\n)(?:pkt_pts_time\=(\d*.?\d*)\r?\n)(?:pkt_size\=(\d+)\r?\n)(?:pict_type\=(\w+))?/;

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
			frame_count++;
			r[4] = (r[4]*8)/1000;
			r[3] = parseFloat(r[3]);
			r[5] = r[5]?r[5]:'A';

			if(!streams[r[5]]){		
				streams[r[5]] = temp.createWriteStream();
			}
			streams[r[5]].write(frame_count+' '+r[4]+'\n');
			cutelog('Analyzing '+toHHMMSS(r[3])+' / '+time.duration+' '+((r[3]/time.seconds)*100).toFixed(2)+'%',true);
		}
	});

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to get the file bitrate.',false);
		}
		cutelog('Analysis complete.',false);
		cb(streams);

	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		console.log('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.');
		process.exit(1);
	});
}

// Get file duration
function createPlot(streams, cb){

	var cm = {
		P: 'green',
		I: 'red',
		B: 'blue',
		A: 'blue'
	};
	var sep='';

	var scr='set title "Frames Sizes"\nset xlabel "Frames"\nset ylabel "Kbits"\nset grid\nset terminal "'+opts.terminal+'"\n';
	if(opts.output){
		scr += 'set output "'+opts.output+'"\n';
	}
	scr += 'plot';

	for(var k in cm){
		if(streams[k]){
			streams[k].end();
			scr += sep+'"'+(streams[k].path).replace(/\\/g,'\\\\')+'" title "'+k+' frames" with impulses linecolor rgb "'+cm[k]+'"';
			sep = ', ';
		}
	}

	var gnuplot = temp.createWriteStream();
	gnuplot.write(scr);
	gnuplot.end();

	// Run gnuplot
	var cli = child.spawn(
		'gnuplot', [
			'--persist',
			gnuplot.path
		],[]
	);

	cli.stderr.on('data', function (data) {
		cutelog(data,false);
	});

	cli.on('close', function (code) {
		if (code !== 0) {
			cutelog('Error trying to run gnuplot.',false);
		}else{
			cutelog('All tasks completed.',false);
		}
	});

	process.on('exit', function() {
		cli.kill();
	});

	cli.on('error', function() {
		console.log('Error running gnuplot, check if it is installed correctly and if it is included in the system environment path.');
		process.exit(1);
	});
}

// Run
getDuration(opts.input, function(time){
	getBitrate(opts.input, time, function(streams){
		createPlot(streams, function(){
		});
	});
});

