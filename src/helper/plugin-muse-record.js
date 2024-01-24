import { initJsPsych } from "jspsych";
import { MuseClient } from "muse-js";

const jsPsych = initJsPsych();

const info = {
  name: "html-muse-record",
  parameters: {
    /** The HTML string to be displayed */
    stimulus: {
      type: "HTML_STRING",
      default: undefined,
    },
    instructions: {
      type: "HTML_STRING",
      default: "Connect your Muse 2 device",
    },
    /** recording_id */
    recording_id: {
      type: "STRING",
      default: "",
    },
    /** How long to show the trial. */
    recording_duration: {
      type: "INT",
      default: 2000,
    },
    /** Label for the record again button */
    record_again_button_label: {
      type: "STRING",
      default: "Record again",
    },
    /** Label for the button to accept the audio recording (only used if allow_playback is true). */
    accept_button_label: {
      type: "STRING",
      default: "Continue",
    },
    show_done_button: {
      type: "BOOL",
      default: true,
    },
    show_timer: {
      type: "BOOL",
      default: true,
    },
  },
};
//plug in class
class MuseRecordPlugin {
  constructor(jsPsych) {
    this.jsPsych = jsPsych;
    this.muse = null;
    this.isRecording = false;
  }

  trial(display_element, trial) {
    // display html elements
    display_element.innerHTML = `
    <div>${trial.instructions}</div>
    <p><button class="jspsych-btn" id="connect-muse-btn">Connect</button></p>
    `;
    
    let button = display_element.querySelector("#connect-muse-btn");
    button.onclick = async () =>
      await this.connectToMuse(display_element, trial);

  }

  async connectToMuse(display_element, trial) {
    // Create a new MuseDevice instance
    console.log("Connect Press");
    this.muse = new MuseAPI(trial);

    try {
      await this.muse.connect();

      display_element.innerHTML = `
        <p>Connection successfull</p>
        <p>${trial.stimulus}</p>
        <button class="jspsych-btn" id="start-recording">Start</button>`;

      let btn = display_element.querySelector("#start-recording");
      btn.onclick = this.startExperiment;
    } catch (error) {
      let errorDiv = display_element.querySelector("#connection-error") || document.createElement('div');
      errorDiv.textContent = `${error}`;
      errorDiv.id = "connection-error";
      display_element.appendChild(errorDiv);
      console.log(error);
    }
  }

  displayCountdown(durationInSeconds, clock) {
    let countdownInterval = setInterval(function () {
      // Calculate minutes and seconds
      let minutes = Math.floor(durationInSeconds / 60);
      let seconds = durationInSeconds % 60;

      // Display the countdown in the HTML element
      if (clock != undefined) {
        clock.innerHTML = `${minutes}:${seconds}`;
      }

      // Decrease the remaining time
      durationInSeconds--;

      // Check if the countdown has reached zero
      if (durationInSeconds < 0) {
        clearInterval(countdownInterval);
      }
    }, 1000); // Update every second
  }

  startExperiment(display_element, trial) {
    this.startRecording();

    let html = `
    <p>${trial.stimulus}</p>
    `;

    if (trial.show_timer) {
      html += `<span id="clock"></span>`;
    }

    if (trial.show_done_button) {
      html += `<button class=jspsych-btn id="finish-trial">${trial.done_button_label}</button>`;
      const btn = display_element.querySelector("#finish-trial");
      btn.onclick = () => {
        this.endTrial(display_element);
      };
    }

    display_element.innerHTML = html;

    setTimeout(() => {
      if (this.isRecording) {
        this.endTrial(display_element, trial);
      }
    }, trial.recording_duration);
    this.isRecording = true;
    if (trial.show_timer) {
      let clock = display_element.querySelector("#clock");
      this.displayCountdown(trial.recording_duration, clock);
    }
  }

  startRecording() {
    if (this.muse.connected) {
      this.muse.stream();
    }
  }

  async stopRecording() {
    this.isRecording = false;
    // Stop collecting data
    await this.muse.stop();
  }

  async endTrial(display_element, trial) {
    await this.stopRecording();

    var data = muse.recorded_data;
    var muse_url = await this.uploadDataToURL(muse_data);

    var trial_data = {
      data,
      muse_url,
    };

    // Clear display if needed
    display_element.innerHTML = "Recording is over.";

    // Finish trial
    this.jsPsych.finishTrial(trial_data);
  }

  async uploadDataToURL(data) {
    try {
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      /*
        const json = JSON.stringify(finalObject[key]);
        const blob = new Blob([Papa.unparse(json)], {type: "text/csv"});
      */
      // Create a URL for the blob and trigger download
      const url = URL.createObjectURL(jsonBlob);

      return url;
    } catch (error) {
      console.error("Error uploading data", error);
    }
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

  constructor(trial) {
    this.connected = false;
    this.dataArray = [];
    this.WINDOW_SIZE = 2;
    this.sfreq = 256;
    this.muse = new MuseClient();
    this.id = this.muse.deviceName;
    this.connected = false;
    this.id = trial.recording_id;

    this.numberOfChannels = 3;

    // Initialize stream and writer
    this.stream = new WritableStream({
      start(controller) {
        this.controller = controller;
      },
      cancel() {
        console.log("Stream canceled");
      },
    });

    // Create a writer for the stream
    this.writer = this.stream.getWriter();
    this.recorded_data = {};
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
    } catch (error) {
      console.log(error);
      throw new Error("Unable to connect");
    }
  }

  stream() {
    this.muse.start();
    this.muse.eegReadings.subscribe((reading) => {
      if (this.connected) {
        this.dataArray.push(reading);
        console.log(reading);
        if (this.dataArray.length == 4) {
          for (let i = 0; i < this.dataArray[0].samples.length; i++) {
            const dispatchDataArray = this.dataArray.map((data, index) => ({
              [this.channelNames[data.electrode]]: data.samples[i],
            }));

            console.log(dispatchDataArray);
            const dispatchData = dispatchDataArray.reduce((acc, data) => {
              acc[Object.keys(data)[0]] = data[Object.keys(data)[0]];
              return acc;
            }, {});
            console.log(dispatchData);

            // Instead of store.dispatch, write data to stream
            this.writer.write({
              id: this.id,
              data: dispatchData,
            });
          }
        }
      }
    });
    this.startMetricStream();
  }

  async stop() {
    try {
      // Stop the Muse device from sending data
      this.muse.disconnect();

      // If you have a streaming mechanism, close the stream writer
      if (this.writer) {
        await this.writer.close();
      }

      this.recorded_data = await this.saveData();

      // Clear the metric stream interval if it exists
      if (this.metricStream) {
        clearInterval(this.metricStream);
      }

      // Update the connected status
      this.connected = false;

      console.log("Muse disconnected and streaming stopped");
    } catch (error) {
      console.error("Error stopping Muse:", error);
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

      return data;
    } catch (error) {
      console.error("Error posting data to URL:", error);
    }
  }
}

MuseRecordPlugin.info = info;
export default MuseRecordPlugin;
