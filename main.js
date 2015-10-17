/*! plotframes | (c) 2015 RodrigoPolo.com | MIT License | https://github.com/rodrigopolo/plotframes/blob/master/LICENSE */

var 
	fs = require('fs'),
	stream = require('stream'),
	child = require('child_process'),
	extend = require('extend'),
	path = require('path'),
	split = require("split"),
	isWin = /^win/.test(process.platform),
	defterminal = isWin ? 'windows' : 'x11';


// Average array prototype
function arrAvg(arr){
	return arr.reduce(function (p, c) {return p + c;}) / arr.length;
}

// Max array prototype
function arrMax(arr){
	return Math.max.apply(Math, arr);
}

// Min array prototype
function arrMin(arr){
	return Math.min.apply(Math, arr);
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

	var 
		rf,
		r_frame_rate = /avg_frame_rate\=(\d+)\/(\d+)/,
		frame_rate,
		rd,
		r_duration = /Duration: ((\d{2}):(\d{2}):(\d{2}).(\d{2})), /,
		duration,
		seconds;

	// Run ffprobe
	var cli = child.spawn(
		'ffprobe', [
			'-show_entries',
			'stream',
			input
		],[]
	);

	// Get frame rate from stdout
	cli.stdout.pipe(split()).on('data', function (data) {
		if(rf = r_frame_rate.exec(data)){
			if(!frame_rate){
				frame_rate = (rf[1]/rf[2]) || 1;
			}
		}
	});

	// Get duration from sterr
	cli.stderr.pipe(split()).on('data', function (data) {
		if(rd = r_duration.exec(data)){
			duration = rd[1];
			seconds  = ((((rd[2]*60)+rd[3])*60)+parseInt(rd[4]))+parseFloat(rd[5]/100);
		}
	});

	// After running ffprobe return the results
	cli.on('close', function (code) {
		if (code !== 0) {
			fs.exists(input, function(exists) {
				if(exists){
					cb('Error trying to get the file details.', null);
				}else{
					cb('Error trying to get the file details, input file doesn\'t exists.', null);
				}
			});
		}
		cb(null, {
			frame_rate: frame_rate,
			duration: duration,
			seconds: seconds
		});
	});

	// If node script exits, kills the child
	process.on('exit', function() {
		cli.kill();
	});

	// On error running ffprobe
	cli.on('error', function() {
		cb('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.', null);
	});
}

// Get frame bitrate
function getBitrate(input, details, progress, cb){
	var 
		r_frame = /(?:media_type\=(\w+)\r?\n)(?:stream_index\=(\w+)\r?\n)(?:pkt_pts_time\=(\d*.?\d*)\r?\n)(?:pkt_size\=(\d+)\r?\n)(?:pict_type\=(\w+))?/,
		r,
		current_track,
		frame_count 	= 0,
		frame_type,
		frame_size,
		frame_time,
		tracks 			= [],
		fsizes 			= [],
		times			= [],
		bitrates 		= [],
		fr2br 			= [];

	// Run ffprobe
	var cli = child.spawn(
		'ffprobe', [
			'-show_entries',
			'frame=stream_index,media_type,pict_type,pkt_size,pkt_pts_time',
			input
		],[]
	);

	// Get frame data
	cli.stdout.pipe(split(/\[\/FRAME\]\r?\n/)).on('data', function (data){

		if(r = r_frame.exec(data)){

			current_track = r[2];
			frame_count++;
			frame_type  	= r[5]?r[5]:'A';
			frame_size 		= ((r[4]*8)/1000);
			frame_bitrate	= frame_size * details.frame_rate;
			frame_time  	= parseFloat(r[3]);
			frame_sec  		= parseInt(frame_time);

			// Create track if doesn't exists
			if(!tracks[current_track]){
				tracks[current_track] = {
					type: r[1],
					frames:{},
					fpos:[],
					bitrates:[],
					fsizes:[],
					times:[]
				};
			}

			// Create frame type obj if doesn't exists
			if(!tracks[current_track].frames[frame_type]){
				tracks[current_track].frames[frame_type] = {
					pos: 		[],
					sec: 		[],
					siz: 		[],
					btr: 		[],
				};
			}

			// Add frame type data
			tracks[current_track].frames[frame_type].pos.push(frame_count);
			tracks[current_track].frames[frame_type].sec.push(frame_time);
			tracks[current_track].frames[frame_type].siz.push(frame_size);
			tracks[current_track].frames[frame_type].btr.push(frame_bitrate);

			// Add frame data
			tracks[current_track].fpos.push(frame_count);
			tracks[current_track].fsizes.push(frame_bitrate);
			tracks[current_track].times.push(frame_time);

			// Add bitrates per track
			if(tracks[current_track].bitrates[frame_sec]){
				tracks[current_track].bitrates[frame_sec] += frame_size;
			}else{
				tracks[current_track].bitrates[frame_sec] = frame_size;
			}

			// Add overall frame info
			fsizes.push(frame_bitrate);
			times.push(frame_time);

			// Add overall bitrate data
			if(bitrates[frame_sec]){
				bitrates[frame_sec] += frame_size;
			}else{
				fr2br[frame_sec] 	= frame_count;
				bitrates[frame_sec] = frame_size;
			}

			// Show progress
			progress({
				time: 		frame_time,
				duration: 	details.duration,
				length: 	details.seconds
			});
			
		}
	});

	// After running ffprobe return the results
	cli.on('close', function (code) {
		if (code !== 0) {
			cb('Error trying to get the file bitrate.', null);
		}
		cb(null, {
			tracks: 	tracks,
			bitrates: 	bitrates,
			fr2br: 		fr2br,
			fsizes: 	fsizes,
			times: 		times
		});

	});

	// If node script exits, kills the child
	process.on('exit', function() {
		cli.kill();
	});

	// On error running ffprobe
	cli.on('error', function() {
		cb('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.', null);
	});
}

// Create an object containing all the frame data
function getFrames(input, progress, cb){
	progress = progress || function(d){}
	getDetails(input, function(err, details){
		if(err){
			cb(err, null);
		}else{
			getBitrate(input, details, progress, function(err, data){
				if(err){
					cb(err, null);
				}else{
					cb(null, data);
				}
			});
		}
	});
}

// Generate gnuplot script
function genScript(input, data, ops){
	var gs = '';
	var graphs = [];
	var frame_types=[
		'A',
		'I',
		'P',
		'B',
	];
	var label_sep = '\\n';

	var brtsrc = (ops.stream=='all')?data:data.tracks[ops.stream];
	if(!brtsrc){
		cb('That stream doesn\'t exists, it should be a number that exists.',null);
		return false;
	}
	var br_average = arrAvg(brtsrc.bitrates);
	var fr_average = arrAvg(brtsrc.fsizes);

	// Set font size
	gs+='set key font ",10"\n'

	// Graph range
	if(ops.frames){
		gs+='set xrange [1:'+(brtsrc.fsizes.length-1)+']\n';
	}else{
		gs+='set xrange [0:'+(brtsrc.bitrates.length)+']\n';
	}

	// Title 
	gs += 'set title "Frames Bitrates for \\"'+path.basename(input);
	if(ops.stream=='all'){
		gs += '\\""\n';
	}else{
		gs += ':'+ops.stream+'\\""\n';
	}

	// Info label
	gs+='set label "';
	if(ops.frames){
		gs+='Frames: '+(brtsrc.fsizes.length-1)+' of '+(data.fsizes.length-1)+label_sep;
	}else{
		gs+='Seconds: '+(brtsrc.bitrates.length)+label_sep;
	}
	gs+=
	 'Max: '+bandWidth(arrMax(brtsrc.bitrates))+label_sep
	+'Min: '+bandWidth(arrMin(brtsrc.bitrates))+label_sep
	+'Avg: '+bandWidth(br_average);

	gs+='" left at graph 0.005, graph .970 font ",10"\n';

	// X Label
	gs+='set xlabel "'+((ops.frames)?'Frames':'Seconds')+'" font ",10"\n';

	// Y Label
	gs+='set ylabel "Kbps" font ",10"\n';

	// Grid
	gs += (ops.grid)?'set grid\n':'';

	// Terminal
	gs+= 'set terminal '+ops.terminal+'\n';

	// Output
	gs += (ops.output)?'set output "'+ops.output+'"\n':'';

	// Plotting
	gs += 'plot \\\n';

	// File streams graphs
	if(ops.stream=='all'){
		for (var i = 0; i < data.tracks.length; i++){
			for (var j = 0; j < frame_types.length; j++){
				if(data.tracks[i].frames[frame_types[j]]){
					graphs.push('"-" title "'+frame_types[j]+'" with '+ops.styles[frame_types[j]]+' linecolor rgb "'+ops.colors[frame_types[j]]+'"')
				}		
			};
		};
	}else{
		for (var j = 0; j < frame_types.length; j++){
			if(data.tracks[ops.stream].frames[frame_types[j]]){
				graphs.push('"-" title "'+frame_types[j]+'" with '+ops.styles[frame_types[j]]+' linecolor rgb "'+ops.colors[frame_types[j]]+'"')
			}		
		};
	}

	// Average bitrate
	graphs.push('"-" title "Average" with lines lc rgb "'+ops.colors.average+'" lt 1 lw .5');

	// Bitrate
	graphs.push('"-" smooth bezier title "Bitrate" with lines lc rgb "'+ops.colors.bitrate+'" lt 1 lw 1.5');

	// Add the graphs defs			
	gs += graphs.join(', \\\n')+' \n';

	// Graph data
	if(ops.stream=='all'){
		for (var i = 0; i < data.tracks.length; i++){
			for (var j = 0; j < frame_types.length; j++){
				if(data.tracks[i].frames[frame_types[j]]){
					for (var k = 0; ; k++) {

						if(ops.frames){
							gs += data.tracks[i].frames[frame_types[j]]['pos'][k];
						}else{
							gs += data.tracks[i].frames[frame_types[j]]['sec'][k];
						}

						gs += ' '
							+ data.tracks[i].frames[frame_types[j]]['btr'][k]
							+'\n';

						if(k == data.tracks[i].frames[frame_types[j]]['btr'].length-1){
							gs += ('e\n');
							break;
						}
					};
				}		
			};
		};
	}else{
		for (var j = 0; j < frame_types.length; j++){
			if(data.tracks[ops.stream].frames[frame_types[j]]){
				for (var k = 0; ; k++) {

					if(ops.frames){
						gs += data.tracks[ops.stream].frames[frame_types[j]]['pos'][k];
					}else{
						gs += data.tracks[ops.stream].frames[frame_types[j]]['sec'][k];
					}

					gs += ' '
						+ data.tracks[ops.stream].frames[frame_types[j]]['btr'][k]
						+'\n';;

					if(k == data.tracks[ops.stream].frames[frame_types[j]]['btr'].length-1){
						gs += ('e\n');
						break;
					}
				};
			}		
		};
	}

	// Bitrate average data
	if(ops.stream=='all'){
		if(ops.frames){
			// frames all
			gs += '1 '+ br_average+ '\n'
			   + data.fsizes.length+ ' '+ br_average+ '\ne\n';
		}else{
			// bitrates all
			gs += '0 ' + br_average + '\n' 
			   + data.times[data.times.length-1] + ' ' + br_average + '\ne\n';
		}
	}else{
		if(ops.frames){
			// frames single
			gs += ('1 '+ br_average+ '\n'
			   + data.tracks[ops.stream].fsizes.length+ ' '+ br_average+ '\ne\n');
		}else{
			// bitrate single
			gs += ('0 ' + br_average + '\n' 
			   + data.tracks[ops.stream].times[data.tracks[ops.stream].times.length-1] + ' ' + br_average + '\ne\n');
		}
	}

	// Bitrate data
	if(ops.frames){
		for (var i = 0; ; i++) {
			
			gs += (ops.stream=='all') ? (i+1) : brtsrc.fpos[i];

			gs += ' '+brtsrc.fsizes[i]+'\n';

			if(i ==  brtsrc.fsizes.length-1){
				gs += ('e\n');
				break;
			}
		};
	}else{
		for (var i = 0; ; i++) {
			gs += (i+' '+brtsrc.bitrates[i]+'\n');
			if(i ==  brtsrc.bitrates.length-1){
				gs += ('e\n');
				break;
			}
		};
	}

	return gs;
}

// Parse the options, gen the script and call gnuplot via stdin
function plotScript(input, cb, op){

	var options = {
		stream: 'all',
		terminal: defterminal, 
		output: false,
		frames: false,
		colors:{
			I: '#ff0000',
			P: '#00ff00',
			B: '#0000ff',
			A: '#d200ff',
			average: '#000000',
			bitrate: '#ff9016',
		},
		styles:{
			I: 'impulses',
			P: 'impulses',
			B: 'impulses',
			A: 'impulses',
		},
		grid: true,
		as_string: false,
		stdout: null,
		stderr: null,
		progress: function(d){}
	}

	extend(options, op);
	var script_str='';

	getFrames(input, options.progress, function(err, data){

		if(err){
			cb(err, null);
		}else{

			// gnuplot script
			var gs = genScript(input, data, options);
			

			if(options.as_string){
				cb(null, gs);
			}else{
				// Run gnuplot 
				var cli = child.spawn(
					'gnuplot', [
						'-p'
					], {stdin: 'pipe'}
				);

				// Pipe streams
				if(options.stdout){
					cli.stdout.pipe(options.stdout);
				}
				if(options.stderr){
					cli.stderr.pipe(options.stderr);
				}

				// Check if there is an error code, if not, run the callback with true message
				cli.on('close', function (code) {
					if (code !== 0) {
						cb('Error trying to run gnuplot.', null);
					}else{
						cb(null, true);
					}
				});

				// If node script exits, kills the child
				process.on('exit', function() {
					cli.kill();
				});

				// On error running gnuplot
				cli.on('error', function() {
					cb('Error running gnuplot, check if it is installed correctly and if it is included in the system environment path.', null);
				});

				cli.stdin.setEncoding('utf-8');

				var script = new stream.Readable();
				script._read = function noop() {};

				script.pipe(cli.stdin);

				script.push(gs);
				script.push(null);
			}

		}

	}, options);
}

module.exports = {
	getFrames: getFrames,
	plotScript: plotScript
};