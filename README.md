plotframes
===========
A Node.js frame plotter inspired on [FFmpeg plotframes](https://github.com/FFmpeg/FFmpeg/blob/master/tools/plotframes) but 350x faster, now without using any temporal file and available as a node module!

![Bitrate Plot](http://i.imgur.com/FJh2ucz.gif "Bitrate Plot")

Installation and running as a CLI
```
npm install plotframes -g
plotframes input.mkv
```

Progress report to `stdout`:
```
Analyzing 00:02:00.000 / 00:01:00.00 50.00%
```

CLI options
```
Usage: plotframes [OPTIONS]
options:
    -h, --help                      Print this help and exit.
    -i FILE, --input=FILE           Specify multimedia file to read. This is the
                                    file passed to the ffprobe command. If not
                                    specified it is the first argument passed to
                                    the script.
    -s 0, --stream=0                Specify stream to plot, options are "all",
                                    0, 1, 2... etc.
    -o FILE.png, --output=FILE.png  Set the name of the output used by gnuplot.
                                    If not specified no output is created. Must
                                    be used in conjunction with the terminal
                                    option.
    -t png, --terminal=png          Set the name of the terminal used by
                                    gnuplot. By default it is "windows". Must be
                                    used in conjunction with the output option.
                                    Check the gnuplot manual for the valid
                                    values.
    -f, --frames                    Create a plot based on frame number instead
                                    of frame time.
    -p, --print                     Print the gnuplot script into the stdout and
                                    doesn't run gnuplot, ideal if you want to
                                    edit/study the script.
```

####Examples

You can set many options to the `gnuplot` terminal argument:
```
plotframes -i input.m4v -o plot.png -t "set terminal png transparent enhanced size 7000,800"
```

You can set `plotframes` to output the `gnuplot` script to `stdout` and then 
pipe the result to `gnuplot`, this enables a world of possibilities for Linux 
and Unix users:
```
plotframes -i input.mkv -s 0 -p | gnuplot -p
```

Or you can save the output redirecting the result:
```
plotframes -i input.mkv -p > script.txt
```



#### Requirements:
`plotframes` for Node.js requires the following software to be installed and 
available on the system `PATH` environment:
* [gnuplot](http://www.gnuplot.info/).  
* [FFmpeg](https://www.ffmpeg.org/)  >= 1.2 with the ffprobe command.

#### Installing dependencies


##### Windows
1. [Download](https://nodejs.org) and install Node.js  
2. [Download](http://ffmpeg.zeranoe.com/builds/) a FFmpeg build, uncompress it 
into a directory that is included in the system `%path%`.
3. [Download](http://sourceforge.net/projects/gnuplot/) and install `gnpuplot`:  
   There are [other downloads](http://sourceforge.net/projects/gnuplot/files/gnuplot/) 
   in case you want to download a different version.  
4. Make sure to add `ffmpeg` and `gnuplot` to your system environment `%PATH%`.
5. Open your `Command Promt` and run `npm install plotframes -g`.
6. Done, now you can run `plotframes` anywhere in your command prompt.


##### OS X
* Install Xcode from the App Store.
* Install [Homebrew](http://brew.sh) from your terminal.

Then, with Hombrew on your terminal intall FFmpeg, XQuartz (needed to render to 
x11) and gnuplot.
```
brew install ffmpeg
brew install Caskroom/cask/xquartz
brew install gnuplot --with-x11
```

After that you can install `plotframes`:
```
sudo npm install plotframes -g
```

##### Ubuntu

Install Node.js
```
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
```

Install FFmpeg
```
sudo ppa-purge ppa:mc3man/trusty-media
sudo add-apt-repository ppa:mc3man/trusty-media
sudo apt-get update
sudo apt-get install ffmpeg
```

Install gnuplot
```
sudo apt-get install gnuplot-x11
```

Or do all at once
```
sudo ppa-purge ppa:mc3man/trusty-media
sudo add-apt-repository ppa:mc3man/trusty-media
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install ffmpeg gnuplot-x11 nodejs
```

After that you can install `plotframes`:
```
sudo npm install plotframes -g
```

#### Problems installing global packages on OS X or Ubuntu?

Ubuntu fix:
```
npm config set prefix ~/.npm
echo 'export PATH=$HOME/.npm/bin:$PATH' >> ~/.bashrc 
. ~/.bashrc
```

OS X fix:
```
npm config set prefix ~/.npm
echo 'export PATH=$HOME/.npm/bin:$PATH' >> ~/.bashrc 
echo . ~/.bashrc >> ~/.bash_profile
. ~/.bashrc
```

#### As a node module:

You can load `plotframes` as a node module and get the frames data, get the 
`gnuplot` script, customize colors, etc. here are two examples:


Example 1 - Getting the data object
```javascript
var plotframes = require('plotframes'),
  nlb = (/^win/.test(process.platform))?'\x1B[0G':'\n';

var input_file = 'input.mkv';

plotframes.getFrames(
  input_file, 
  function(err, res){
    if(err){
      console.log(err);
    }else{
      console.lod(JSON.stringify(res));
    }
  },
  function(data){
    var progress = (data.time/data.length)*100;
    process.stderr.write(progress.toFixed(2)+'%'+nlb);
  }
);
```

Example 2 - Getting the plot data
```javascript
var plotframes = require('plotframes'),
  nlb = (/^win/.test(process.platform))?'\x1B[0G':'\n';

var input_file = 'input.mkv';

plotframes.plotScript(input_file, 
  function(err, res) {
    if(err){
      console.log(err);
    }else{
      console.log(res);
    }   
  },{
    as_string: true,
    frames: false,
    stream: 0,
    colors:{
      I: '#00ffff',
      P: '#ff00ff',
      B: '#ffff00',
      A: '#2dff00',
      average: '#000000',
      bitrate: '#00ff00',
    },
    styles:{
      I: 'impulses',
      P: 'lines',
      B: 'lines',
      A: 'lines',
    },
    progress: function(data){
      var progress = (data.time/data.length)*100;
      process.stderr.write(progress.toFixed(2)+'%'+nlb);
    }
  }
);
```

#### Donations
Did you find this useful? ***Consider donating***. Your contribution will help cover the costs of developing, distributing and supporting this project, not to mention the great relief it would bring my bank account, seriously, donate, it will make me very :smiley:  

[PayPal](http://paypal.me/rodrigopolo)

### License

(The MIT License)

Copyright (c) by Rodrigo Polo http://RodrigoPolo.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
