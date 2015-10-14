plotframes
===========
A Node.js CLI frame plotter inspired on [FFmpeg plotframes](https://github.com/FFmpeg/FFmpeg/blob/master/tools/plotframes) but 350x faster!

![Frame Based](http://i.imgur.com/M4gT0eX.png "Frame Based")
![Time Based](http://i.imgur.com/J3l0Y7h.png "Time Based")


Requirements:
* [gnuplot](http://www.gnuplot.info/)  
* [FFmpeg >= 1.2 with the ffprobe command](https://www.ffmpeg.org/)


Installation and running
```
npm install plotframes -g
plotframes input.mkv
```

Usage
```
Usage: plotframes [OPTIONS]
options:
    -h, --help                      Print this help and exit.
    -i FILE, --input=FILE           Specify multimedia file to read. This is the
                                    file passed to the ffprobe command. If not
                                    specified it is the first argument passed to
                                    the script.
    -s 0, --stream=0                Specify stream. The value must be a string
                                    containing a stream specifier. Default value
                                    is "0".
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
```

>**WARNING:** This is **NOT** a node.js module for inclusion in other Node.js scripts, it is just a CLI for use in the terminal/console, maybe in the future I'll see to integrate it somehow.

### Installing dependencies

#### Windows
1. [Download](https://nodejs.org) and install Node.js  
2. [Download](http://ffmpeg.zeranoe.com/builds/) a FFmpeg build, uncompress it into a directory that is included in the system `%path%`.
3. [Download](http://sourceforge.net/projects/gnuplot/) and install `gnpuplot`:  
   There are [other downloads](http://sourceforge.net/projects/gnuplot/files/gnuplot/) in case you want to download a different version.  
4. Open your `Command Promt` and run `npm install plotframes`.


#### OS X
* Install Xcode from the App Store
* Install [Homebrew](http://brew.sh)

Then, using Hombrew intall FFmpeg, XQuartz (needed to render to x11) and gnuplot.
```
brew install ffmpeg
brew install Caskroom/cask/xquartz
brew install gnuplot --with-x11
```

#### Ubuntu

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

### Donations
Did you find this useful? ***Consider donating***. Your contribution will help cover the costs of developing, distributing and supporting this project, not to mention the great relief it would bring my bank account, seriously, donate, it will make me very :smiley:  

<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&amp;hosted_button_id=U7B2YPB82R47U"><img src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" alt="Donate"></a>

## License

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
