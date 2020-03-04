#!/usr/bin/env node

/*! plotframes | (c) 2015 RodrigoPolo.com | MIT License | https://github.com/rodrigopolo/plotframes/blob/master/LICENSE */

const
  plotframes = require('../main'),
  dashdash = require('dashdash'),
  log = require('single-line-log').stderr,
  isWin = /^win/.test(process.platform),
  defterminal = isWin ? 'windows' : 'x11';


// Single line output
const clnl = false; // FIXME: unused -- remove?
/**
 * Print logs with or without clearing previous
 * @param {string} str - the log string to print
 * @param {boolean} nl - true if the line should be cleared before printing
 * @returns {void}
 */
function cutelog (str, nl) {
  if(nl){
    log(str);
  }else{
    log.clear();
    log(str);
  }
}

/**
 * Display help on console, then exits
 * @param {number} code - the exit code to exit with
 * @returns {void}
 */
function showHelp (code){
  const help = parser.help({includeEnv: true}).trimRight();
  console.error('Usage: plotframes [OPTIONS]\n'+ 'options:\n'+ help);
  process.exit(code);
}


/**
 * Pad number
 * @param {number} num - the number to zero-pad
 * @param {number} size - the desired size of the padded number string
 * @returns {string} - the number, left-padded with zeros to length size
 */
function pad (num, size) {
  let str = num + '';
  while (str.length < size) str = '0' + str;
  return str;
}

/**
 * Seconds to time format
 * @param {number} n - a string representing the number of seconds in floating point
 * @returns {string} - the string in HH:MM:SS.SSS format
 */
function toHHMMSS (n) {
  n = parseFloat(n);
  const sep = ':',
    sss = parseInt((n % 1)*1000),
    hh = parseInt(n / 3600);
  n %= 3600;
  let mm = parseInt(n / 60),
    ss = parseInt(n % 60);
  return pad(hh,2)+sep+pad(mm,2)+sep+pad(ss,2)+'.'+pad(sss,3);
}



// User options parser
const parser = dashdash.createParser({options: [
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
    help: 'Specify stream to plot, options are "all", 0, 1, 2... etc.',
    helpArg: '0',
    default: 'all'
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
  }, {
    names: ['print', 'p'],
    type: 'bool',
    help: 'Print the gnuplot script into the stdout and doesn\'t run gnuplot, ideal if you want to edit/study the script.'
  }
]});

let opts;
try {
  opts = parser.parse(process.argv);
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

plotframes.plotScript(opts.input,
  function (err, res) {
    if (err) {
      cutelog(err,false);
      process.exit(1);
    }else{
      if(opts.print){
        log.clear();
        console.log(res);
      }else{
        cutelog('All tasks done!',false);
      }
    }
  },{
    progress: function (data){
      cutelog('Analyzing '+toHHMMSS(data.time)+' / '+data.duration+' '+((data.time/data.length)*100).toFixed(2)+'%',true);
    },
    stdout: process.stdout,
    stderr: process.stderr,
    terminal: opts.terminal,
    frames: opts.frames,
    stream: opts.stream,
    output: opts.output,
    as_string: opts.print

  }
);


