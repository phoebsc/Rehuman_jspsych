import {initJsPsych} from 'jspsych';
import { MuseClient } from 'muse-js';

const jsPsych = initJsPsych();


const info = {
    name: "html-muse-record",
    parameters: {
        /** The HTML string to be displayed */
        stimulus: {
            type: 'HTML_STRING',
            default: undefined,
        },
        /** recording_id */
        recording_id: {
            type: 'STRING',
            default: "",
        },
        /** How long to show the trial. */
        recording_duration: {
            type: 'INT',
            default: 2000,
        },
        /** Label for the record again button */
        record_again_button_label: {
            type: 'STRING',
            default: "Record again",
        },
        /** Label for the button to accept the audio recording (only used if allow_playback is true). */
        accept_button_label: {
            type: 'STRING',
            default: "Continue",
        },
    },
};
//plug in class
class MuseRecordPlugin {
  constructor(jsPsych) {
    this.jsPsych = jsPsych;
    this.muse = null;
  }

  trial(display_element, trial) {
    // display html elements
    display_element.innerHTML = '<p>'+trial.stimulus+'</p>';
    // connect, and then start
    this.connectToMuse(display_element, trial).then(() => {
      this.startRecording();
    })

    // End recording after a set duration
    this.jsPsych.pluginAPI.setTimeout(() => {
      this.stopRecording();
      this.endTrial(display_element, trial);
    }, trial.recording_duration);
  }

  connectToMuse(display_element, trial) {
    // Create a new MuseDevice instance
    this.muse = new MuseAPI(trial);

    // Attempt to connect to the Muse device
    return this.muse.connect()
      .then(() => {
        display_element.innerHTML += "<p>Connection status: "+this.muse.connected+'</p>';
        // You can add more setup here if needed
      })
      .catch(error => {
        display_element.innerHTML += "<p>Error: "+error+"</p>";
        // Handle connection errors here
      });
  }

  startRecording() {
    if (this.muse.connected) {
      this.muse.stream()
    }
  }

  stopRecording() {
    // Stop collecting data
    this.muse.stop()
  }

  endTrial(display_element, trial) {
    // Process and return data
    var trial_data = {
      // Data collected from MuseDevice
    };

    // Clear display if needed
    display_element.innerHTML = 'Recording is over.';

    // Finish trial
    this.jsPsych.finishTrial(trial_data);
  }
}

// muse class
class MuseAPI {
  channelNames = {
    0: "TP9",
    1: "AF7",
    2: "AF8",
    3: "TP10",
  };

  // Change if you want electrodes to have different weights in the power calculation
  electrodePowerWeights = [1, 1, 1, 1];

  // Band powers of EEG. The last index is written inclusively to use all powers less than the last index.
  bandPowers = {
    'Theta': [4, 8],
    'Alpha': [8, 12],
    "Low beta": [12, 16],
    "High beta": [16, 25],
    'Gamma': [25, 45],
  };

  constructor(trial) {
    this.connected = false;
    this.dataArray = [];
    this.WINDOW_SIZE = 2;
    this.sfreq = 256;
    this.muse = new MuseClient();
    this.id = this.muse.deviceName;
    this.connected = false;
    this.id = trial.recording_id

    this.numberOfChannels = 3;
    const arrayLength = this.WINDOW_SIZE * this.sfreq;

    this.buffer = new Array(this.numberOfChannels);
    for (let i = 0; i <= this.numberOfChannels; i++) {
      this.buffer[i] = new Array(arrayLength).fill(0);
    }

    for (const key in this.bandPowers) {
      this.bandPowers[key] = [
        this.bandPowers[key][0] * this.WINDOW_SIZE,
        this.bandPowers[key][1] * this.WINDOW_SIZE - 1,
      ];
    }
    // Initialize stream and writer
    this.stream = new WritableStream({
      start(controller) {
        this.controller = controller;
      },
      cancel() {
        console.log('Stream canceled');
      }});

    // Create a writer for the stream
    this.writer = this.stream.getWriter();
  }

  async connect() {
    try {
      await this.muse.connect();
      this.id = this.muse.deviceName;
      this.connected = true;

      this.muse.connectionStatus.subscribe((status) => {
        this.connected = status;
      });

      const info = await this.muse.deviceInfo();
      console.log(info);
      return info;
    } catch (error) {}
  }

  async stream() {
    this.muse.start();
    this.muse.eegReadings.subscribe((reading) => {
      if (this.connected) {
        this.dataArray.push(reading);
        if (this.dataArray.length == 4) {
          for (let i = 0; i < this.dataArray[0].samples.length; i++) {
            const dispatchDataArray = this.dataArray.map((data, index) => ({
              [this.channelNames[data.electrode]]: data.samples[i],
            }));

            console.log(dispatchDataArray);
            const dispatchData = dispatchDataArray.reduce(
              (acc, data) => {
                acc[Object.keys(data)[0]] = data[Object.keys(data)[0]]
                return acc
              },
              {}
            );
            console.log(dispatchData);
            // Instead of store.dispatch, write data to stream
            this.writer.write({
              id: this.id,
              data: dispatchData,
            });
          }

          // Fill the data analysis buffer
          this.dataArray.forEach((obj) => {
            this.buffer[obj.electrode].splice(0, obj.samples.length);
            this.buffer[obj.electrode].push(...obj.samples);
          });

          this.dataArray = [];
        }
      }
    });
    this.startMetricStream();
  }
  _applyHanningWindow(signal) {
    function hann(i, N) {
      return 0.5 * (1 - Math.cos((6.283185307179586 * i) / (N - 1)));
    }

    const array = [];
    for (let i = 0; i < signal.length; i++) {
      array.push(signal[i] * hann(i, signal.length));
    }
    return array;
  }
  async _calculate_eeg_metrics() {
    const res = Object.keys(this.bandPowers).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    for (let i = 0; i < this.numberOfChannels; i++) {
      let sample = this.buffer[i];
      sample = this._applyHanningWindow(sample); // Hanning window on the data

      const fft = math.fft(sample);
      let mag = fft.map((elem) =>
        math.sqrt(elem.re * elem.re + elem.im * elem.im)
      ); // Get the magnitude
      mag = mag.splice(0, Math.floor(sample.length / 2)); // Get first bins of Fourier Transform
      mag = mag.map((mag) => mag / sample.length); // Normalize FFT by sample length

      for (const key in this.bandPowers) {
        res[key] =
          res[key] +
          this.electrodePowerWeights[i] *
            math.mean(
              mag.slice(this.bandPowers[key][0], this.bandPowers[key][1])
            );
      }
    }

    for (const key in res) {
      res[key] = res[key] / this.numberOfChannels;
    }

    // Instead of store.dispatch, write metric data to stream
    this.writer.write({
      id: this.id,
      data: res,
    });
  }

  async startMetricStream() {
    this.metricStream = setInterval(() => {
      if (this.connected) {
        this._calculate_eeg_metrics();
      } else {
        clearInterval(this.metricStream);
      }
    }, 50);
  }

  async stop() {
    try {
      // Stop the Muse device from sending data
      await this.muse.stop();

      // If you have a streaming mechanism, close the stream writer
      if (this.writer) {
        await this.writer.close();
      }
      this.saveData();

      // Clear the metric stream interval if it exists
      if (this.metricStream) {
        clearInterval(this.metricStream);
      }

      // Update the connected status
      this.connected = false;

      console.log('Muse disconnected and streaming stopped');
    } catch (error) {
      console.error('Error stopping Muse:', error);
      // Handle any errors that occur while stopping
    }
  }

  // Method to save data from stream to a file
 async saveData() {
  try {
    // Close the writer to indicate we're done writing
    await this.writer.close();

    // Convert the stream into a response and then into a JSON blob
    const response = new Response(this.stream);
    const data = await response.json(); // This assumes your data is in a format that can be directly converted to JSON
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    // Create a URL for the blob and trigger download
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'muse-data-'+this.id+'.json'; // Change the file extension to .json
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    console.log('Data saved as JSON');
  } catch (error) {
    console.error('Error saving data as JSON:', error);
    // Handle any errors that occur during saving
  }
  }
}

MuseRecordPlugin.info = info;
export default MuseRecordPlugin;