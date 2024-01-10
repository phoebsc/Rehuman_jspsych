// Import jsPsych core library
import {initJsPsych} from 'jspsych';
// Import jsPsych plugins
import htmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import audioKeyboardResponse from '@jspsych/plugin-audio-keyboard-response';
import htmlButtonResponse from '@jspsych/plugin-html-button-response';
import surveyText from '@jspsych/plugin-survey-text';
import initializeMicrophone from '@jspsych/plugin-initialize-microphone';
import htmlAudioResponse from '@jspsych/plugin-html-audio-response';

// Import muse-js
import { MuseClient } from 'muse-js';

// Import your own plugins if they are modularized
import MuseRecordPlugin from './helper/plugin-muse-record';
import './helper/jspsych.css';

// Your custom script that you had as "script.js"
import './script.js';

// Your code to set up jsPsych experiments, initialize muse client, etc.
// ... (rest of your jsPsych setup and experiment code)

