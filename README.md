plotframes
===========
A Node.js CLI frame plotter inspired on [FFmpeg plotframes](https://github.com/FFmpeg/FFmpeg/blob/master/tools/plotframes) but 350x faster!

![plot](http://i.imgur.com/i0iIg8D.png "plot")


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
    -s v, --stream=v                Specify stream. The value must be a string
                                    containing a stream specifier. Default value
                                    is "v".
    -o FILE.png, --output=FILE.png  Set the name of the output used by gnuplot.
                                    If not specified no output is created. Must
                                    be used in conjunction with the terminal
                                    option.
    -t png, --terminal=png          Set the name of the terminal used by
                                    gnuplot. By default it is "x11". Must be
                                    used in conjunction with the output option.
                                    Check the gnuplot manual for the valid
                                    values.
```

>**WARNING:** This is **NOT** a node.js module for inclusion in other Node.js scripts, it is just a CLI for use in the terminal/console, maybe in the future I'll see to integrate it somehow.



#####OS X requirements installation
* Install Xcode
* Install [Homebrew](http://brew.sh)

```
brew install Caskroom/cask/xquartz
brew install gnuplot --with-x11
```
> More setup for other OSes coming soon


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