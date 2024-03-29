/* eslint-disable no-undef */
import React, { Component } from 'react';
import ReactHowler from 'react-howler';
import PropTypes from 'prop-types';

import { PlayButton } from 'react-soundplayer/components';
import Waveform from "react-audio-waveform";
import axios from 'axios';

const DEFAULT_DURATION = 456.1495; // have to use this become modifying the audio file breaks 2x speed
const DEFAULT_MP3 = "https://parse-server-ff.s3.amazonaws.com/ae5992f0f5bb1f259bafa41b3771e3bb_call12565815456dwwwwww795896232www-01b59bd3.mp3";

class AudioPlayer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playing: false,
            currentTime: 0,
            speedup: false,
            loadErr: false
        };
    }

    seek(secs, play) {
        if (secs && secs.seek != null) secs = secs.seek();
        this.player.seek(secs);
        let toSet = { currentTime: secs };
        if (play == true) toSet.playing = true;
        this.setState(toSet);
    }

    toggleRate() {
        let { speedup } = this.state;
        speedup = !speedup;
        this.setState({ speedup });
        this.player._howler.rate(speedup ? 2.0 : 1.0);
    }

    getState() {
        let { playing, currentTime } = this.state;
        return { playing, currentTime };
    }

    handleClick = (secs) => {
      this.setState({
        currentTime: secs
      });
    }

    // get wave data and convert it into peak.
    getWaveFormData() {
        const { mp3url } = this.props;
        const BARS= 100; // number of "bars" the waveform should have
            let audioContext = new AudioContext();
            //Get audio data using axios
            axios({url: mp3url, responseType: "arraybuffer"}).then(({data}) => {
              //Decode audio data
              audioContext.decodeAudioData(data, buffer => {
                    let decodedAudioData = buffer.getChannelData(0);
                    let dataSize = Math.floor(decodedAudioData.length / BARS);
                    let peaks = [];
                    //loop to get waveform list of numbers
                    for (let index = 0; index < BARS; index++) {
                        let startingPoint = index * dataSize;
                        let endingPoint = index * dataSize + dataSize;
                        let max = 0;
                        for (let i = startingPoint; i < endingPoint; i++) {
                            if (decodedAudioData[i] > max) {
                                max = decodedAudioData[i];
                            }
                        }
                        let size = Math.abs(max);
                        peaks.push(size / 2);
                    }
                    // set peaks to state and log peaks(waveform list of numbers) to the console
                    this.setState({peaks},() => console.log(this.state.peaks, 'list of numbers'));
                }, e => {console.log('Error with decoding audio data' + e.err);});
            }).catch(err => { console.log(err);});
    }

    getSeek() {
        if (this.playerInterval) clearInterval(this.playerInterval);
        this.playerInterval = setInterval(() => {
            let { mp3url } = this.props;
            if (this.player) {
                let currentTime = this.player.seek();
                const duration = mp3url == DEFAULT_MP3 ? DEFAULT_DURATION : this.player.duration();
                const toSet = { currentTime };
                if (!this.state.duration && duration != null) {
                    toSet.duration = duration;
                }
                if (duration != null) toSet.loadErr = false;
                if (mp3url == DEFAULT_MP3 && currentTime >= DEFAULT_DURATION) {
                    this.player.stop();
                    toSet.playing = false;
                    currentTime = 0;
                }
                this.setState(toSet);
            }
        }, 250);
    }

    componentWillUnmount() {
        if (this.playerInterval) clearTimeout(this.playerInterval);
    }

    componentDidMount() {
        this.getWaveFormData();
        this.getSeek();
    }

    isObject(obj) {
        return obj instanceof Object || ((typeof obj === "object") && (obj !== null));
    }

    render() {
        const { mp3url } = this.props;
        let { playing, currentTime, duration, speedup, loadErr, peaks } = this.state;
        if (this.isObject(currentTime)) currentTime = 0;
        if (mp3url == DEFAULT_MP3) duration = DEFAULT_DURATION;
        return (
            <div className="ff-audio">
                {duration != null && peaks != undefined ? <div className="flex flex-center px2 relative z1">
                    <PlayButton
                        playing={playing}
                        onTogglePlay={() => this.setState({ playing: !playing })}
                        className="flex-none h2 mr2 button button-transparent button-grow rounded"
                    />
                    {/* seeking={Boolean}
                        seekingIcon={ReactElement} */}

                    <div className="sb-soundplayer-volume mr2 flex flex-center">
                        <button onClick={() => this.toggleRate()} className="sb-soundplayer-btn sb-soundplayer-volume-btn flex-none h2 button button-transparent button-grow rounded">
                            <img className={speedup ? 'audio-speedup' : ""} src="/pane/speedup.svg" height={35} />
                        </button>
                    </div>
                    <Waveform
                      barWidth={2}
                      peaks={peaks}
                      height={50}
                      pos={currentTime}
                      duration={duration}
                      onClick={(secs) => this.seek(secs)}
                      color="rgba(255, 255, 255, 0.2)"
                      progressColor="#fff"
                    />
                </div> : (loadErr ? <div style={{ padding: "5 20px" }}>Unable to load audio: {loadErr}</div> : <div className="progress"><div className="indeterminate" /></div>)}
                <div>
                    <ReactHowler
                        src={mp3url}
                        playing={playing}
                        loop={false}
                        onLoadError={(id, err) => {
                            console.log('Unable to load media', err);
                            this.setState({ loadErr: (err && err.message) || 'Startup error' });
                        }}
                        onLoad={() => this.getSeek()}
                        ref={(ref) => (this.player = ref)}
                    />
                </div>
            </div>
        );
    }
}

AudioPlayer.propTypes = {
    mp3url: PropTypes.string.isRequired
};

export default AudioPlayer;
