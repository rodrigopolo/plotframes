/*! plotframes | (c) 2015 RodrigoPolo.com | MIT License | https://github.com/rodrigopolo/plotframes/blob/master/LICENSE */

const
  fs = require('fs'),
  stream = require('stream'),
  child = require('child_process'),
  extend = require('extend'),
  path = require('path'),
  split = require('split'),
  isWin = /^win/.test(process.platform),
  defterminal = isWin ? 'windows' : 'x11';

const { arrAvg, arrMax, arrMin } = require('./lib/array_utils');

/**
 * Bits into human readable units
 * @param {number} bits - the number of bits
 * @returns {string} - a human-readable number expression
 */
function bandWidth (bits) {
  bits = bits* 1000;
  const unit = 1000;
  if (bits < unit) return (bits % 1 === 0 ? bits : bits.toFixed(2)) + 'B';
  const exp =  parseInt(Math.log(bits) / Math.log(unit));
  const pre = 'KMGTPE'[exp-1] + 'bps';
  const n = bits / Math.pow(unit, exp);
  return (n % 1 === 0 ? n : n.toFixed(2))+pre;
}

/**
 * Get file Details
 * @param {string} input - the file path of the input file
 * @param {function} cb - the callback to call when complete
 * @returns {void}
 */
function getDetails (input, cb){
  let rf, rd, frame_rate, duration, seconds;
  const
    r_frame_rate = /avg_frame_rate\=(\d+)\/(\d+)/,
    r_duration = /Duration: ((\d{2}):(\d{2}):(\d{2}).(\d{2})), /;

  // Run ffprobe
  const cli = child.spawn(
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
      fs.exists(input, function (exists) {
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
  process.on('exit', function () {
    cli.kill();
  });

  // On error running ffprobe
  cli.on('error', function () {
    cb('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.', null);
  });
}


/**
 * Get frame bitrate
 * @param {string} input - the file path of the input file
 * @param {Object} details - file details (required keys: frame_rate, duration, seconds)
 * @param {function} progress - a function to call to report progress
 * @param {function} cb - a callback function to call on completion
 * @returns {void}
 */
function getBitrate (input, details, progress, cb){
  // for regex
  const r_frame = /(?:media_type\=(\w+)\r?\n)(?:stream_index\=(\w+)\r?\n)(?:pkt_pts_time\=(\d*.?\d*)\r?\n)(?:pkt_size\=(\d+)\r?\n)(?:pict_type\=(\w+))?/;

  let r,
    // For frame arrays
    frame_count = 0,
    frame_stream,
    frame_type,
    frame_bitrate,
    frame_size,
    frame_time,
    // Frame Arrays
    frames = {
      count: [],
      stream: [],
      type: [],
      bitrate: [],
      size: [],
      time: []
    };
    // For loop
    // let frame_size; // FIXME: Already exists? l114 above.

  // Run ffprobe
  const cli = child.spawn(
    'ffprobe', [
      '-show_entries',
      'frame=stream_index,media_type,pict_type,pkt_size,pkt_pts_time',
      input
    ],[]
  );

  // Get frame data
  cli.stdout.pipe(split(/\[\/FRAME\]\r?\n/)).on('data', function (data){
    if(r = r_frame.exec(data)){
      frame_count++;
      frame_stream 	= parseInt(r[2]);
      frame_type  	= r[5]?r[5]:'A';
      frame_size 		= ((r[4]*8)/1000);
      frame_bitrate	= frame_size * details.frame_rate;
      frame_time  	= parseFloat(r[3]);

      frames.count.push(frame_count);
      frames.stream.push(frame_stream);
      frames.type.push(frame_type);
      frames.bitrate.push(frame_bitrate);
      frames.size.push(frame_size);
      frames.time.push(frame_time);

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
    cb(null, frames);
  });

  // If node script exits, kills the child
  process.on('exit', function () {
    cli.kill();
  });

  // On error running ffprobe
  cli.on('error', function () {
    cb('Error running FFprobe, check if it is installed correctly and if it is included in the system environment path.', null);
  });
}

/**
 * Create an object containing all the frame data
 * @param {string} input - the file path of the input file
 * @param {function} progress - a function to call to report progress
 * @param {function} cb - a callback function to call on completion
 * @returns {void}
 */
function getFrames (input, progress, cb){
  progress = progress || function (d){}
  getDetails(input, function (err, details){
    if(err){
      cb(err, null);
    }else{
      getBitrate(input, details, progress, function (err, data){
        if(err){
          cb(err, null);
        }else{
          cb(null, data);
        }
      });
    }
  });
}

/**
 * Generate gnuplot script
 * @param {string} input - the file path of the input file
 * @param {Object} frames - an object with frames data
 * @param {Object} ops - an object containing option values
 * @param {function} cb - a callback function to call when complete
 * @returns {void}
 */
function genScript (input, frames, ops, cb){
  // Functional
  const all_streams = (ops.stream=='all');
  const is_frames = ops.frames;
  const selected_stream = parseInt(ops.stream);
  const graphs = [];
  const frame_types = [
    'I',
    'P',
    'B',
    'A',
  ];
  const label_sep = '\\n';

  // for loops
  let frame_sec;

  // for storing
  const bitrate = [];
  const selected_stream_bitrate = [];
  const selected_stream_bitrate_pos = [];
  let selected_bitrate;
  let gs = '';
  let bitrate_max;
  let bitrate_min;
  let bitrate_avg;
  let selected_frame_count = 0;
  const selected_frame_types={};

  const frame_start = frames.count[0];
  const frame_end 	= frames.count[frames.count.length-1];
  const time_start 	= frames.time[0];
  const time_end 	= frames.time[frames.time.length-1];

  // Create bitrate by sec for selected streams, count frames and save frame types
  for (let i = 0; i < frames.size.length; i++) {
    frame_sec = parseInt(frames.time[i]);
    if(all_streams){
      selected_frame_types[frames.type[i]] = []; // TODO: add stream number
      selected_stream_bitrate.push(frames.size[i]);
      selected_stream_bitrate_pos.push(frames.count[i]);
      selected_frame_count++;
      if(bitrate[frame_sec]){
        bitrate[frame_sec] += frames.size[i];
      }else{
        bitrate[frame_sec] = frames.size[i];
      }
    }else{
      if(frames.stream[i] == selected_stream){
        selected_frame_types[frames.type[i]] = []; // TODO: add stream number
        selected_stream_bitrate.push(frames.size[i]);
        selected_stream_bitrate_pos.push(frames.count[i]);
        selected_frame_count++;
        if(bitrate[frame_sec]){
          bitrate[frame_sec] += frames.size[i];
        }else{
          bitrate[frame_sec] = frames.size[i];
        }
      }
    }
  };

  selected_bitrate = (is_frames)?frames.bitrate:bitrate;

  if(bitrate.length == 0){
    cb('There is no data in the selected stream.', null);
  }

  // Set font size
  gs+='set key font ",10"\n';

  // Graph range
  if(is_frames){
    gs+='set xrange ['+frame_start+':'+frame_end+']\n';
  }else{
    gs+='set xrange ['+time_start+':'+time_end+']\n';
  }

  // Title
  gs += 'set title "Frames Bitrates for \\"'+path.basename(input);
  if(all_streams){
    gs += '\\""\n';
  }else{
    gs += ':'+ops.stream+'\\""\n';
  }

  // Measurement
  bitrate_max = arrMax(selected_bitrate);
  bitrate_min = arrMin(selected_bitrate);
  bitrate_avg = arrAvg(selected_bitrate);

  // Info label
  gs+='set label "';
  if(is_frames){
    gs+='Frames: '+selected_frame_count+' of '+frames.count[frames.count.length-1]+label_sep;
  }else{
    gs+='Seconds: '+frames.time[frames.time.length-1]+label_sep;
  }
  gs+=
    'Max: '+bandWidth(bitrate_max)+label_sep
  + 'Min: '+bandWidth(bitrate_min)+label_sep
  + 'Avg: '+bandWidth(bitrate_avg);

  gs+='" left at graph 0.005, graph .970 font ",10"\n';

  // X Label
  gs+='set xlabel "'+((is_frames)?'Frames':'Seconds')+'" font ",10"\n';

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


  // Loop trough selected stream frames
  for (let i = 0; i < frame_types.length; i++) {
    if(selected_frame_types[frame_types[i]]){
      graphs.push('"-" title "'+frame_types[i]+'" with '+ops.styles[frame_types[i]]+' linecolor rgb "'+ops.colors[frame_types[i]]+'"');
    }
  };

  if(!is_frames){
    // Average bitrate
    graphs.push('"-" title "Average" with lines lc rgb "'+ops.colors.average+'" lt 1 lw .5');

    // Bitrate
    graphs.push('"-" smooth bezier title "Bitrate" with lines lc rgb "'+ops.colors.bitrate+'" lt 1 lw 1.5');
  }

  // Add the graphs defs
  gs += graphs.join(', \\\n')+' \n';

  // Add frames for selected streams
  for (let i = 0; i < frames.bitrate.length; i++) {
    if(selected_frame_types[frames.type[i]]){
      if(is_frames){
        selected_frame_types[frames.type[i]].push(frames.count[i]+' '+frames.bitrate[i]);
      }else{
        selected_frame_types[frames.type[i]].push(frames.time[i]+' '+frames.bitrate[i]);
      }
    }
  };

  // Loop trough selected stream frames
  for (let i = 0; i < frame_types.length; i++) {
    if(selected_frame_types[frame_types[i]]){
      gs += selected_frame_types[frame_types[i]].join('\n')+'\ne\n';
    }
  };

  // Add average bitrate line
  if(!is_frames){
    gs += time_start+' '+bitrate_avg+'\n';
    gs += time_end+' '+bitrate_avg+'\ne\n';
  }

  // Add bitrate line
  if(!is_frames){
    for (let i = 0; i < bitrate.length; i++) {
      gs += i+' '+bitrate[i]+'\n';
    };
    gs += 'e';
  }

  cb(null, gs);
}

/**
 * Parse the options, gen the script and call gnuplot via stdin
 * @param {string} input - the file path of the input file
 * @param {function} cb - a callback function to call when complete
 * @param {Object} op - runtime options
 * @returns {void}
 */
function plotScript (input, cb, op){
  const options = {
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
    progress: function (d){}
  }

  extend(options, op);
  let script_str=''; // FIXME: never used?

  getFrames(input, options.progress, function (err, data){
    if(err){
      cb(err, null);
    }else{
      // gnuplot script
      genScript(input, data, options,function (err, gs){
        if(err){
          cb(err, null);
        }else{
          if(options.as_string){
            cb(null, gs);
          }else{
            // Run gnuplot
            const cli = child.spawn(
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
            process.on('exit', function () {
              cli.kill();
            });

            // On error running gnuplot
            cli.on('error', function () {
              cb('Error running gnuplot, check if it is installed correctly and if it is included in the system environment path.', null);
            });

            cli.stdin.setEncoding('utf-8');

            const script = new stream.Readable();
            script._read = () => {};

            script.pipe(cli.stdin);

            script.push(gs);
            script.push(null);
          }
        }
      });
    }
  }, options);
}

module.exports = {
  getFrames: getFrames,
  plotScript: plotScript
};
