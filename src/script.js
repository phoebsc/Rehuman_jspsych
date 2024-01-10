// // Import the functions you need from the SDKs you need
// // https://firebase.google.com/docs/web/setup#available-libraries
import { getDatabase, ref, set } from "firebase/database";
import { initializeApp } from "firebase/app";
import {initJsPsych} from 'jspsych';
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsPsychSurveyText from '@jspsych/plugin-survey-text';
import jsPsychInitializeMicrophone from '@jspsych/plugin-initialize-microphone';
import jsPsychHtmlAudioResponse from '@jspsych/plugin-html-audio-response';
import MuseRecordPlugin from './helper/plugin-muse-record';

const firebaseConfig = {
  apiKey: "AIzaSyDnkXLLHTGtxFrCS-OByTWOOSds3KoOPVI",
  authDomain: "rehuman-test-a4bec.firebaseapp.com",
  projectId: "rehuman-test-a4bec",
  storageBucket: "rehuman-test-a4bec.appspot.com",
  messagingSenderId: "531865232645",
  appId: "1:531865232645:web:f7535c3af2bf18e111436c",
  databaseURL: "https://rehuman-test-a4bec-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

///  length variables
var length_recall = 3*60*1000;  // 3 minutes
var length_muse_recording = 1*60*1000 // 1 min
/*
helper functions to get the sona id
*/
// function to extract data from URL variables
function getUrlVars() { // #SONA
  var vars = {}; // #SONA
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(m,key,value) { // #SONA
      vars[key] = value; // #SONA
  }); // #SONA
  return vars; // #SONA
} // #SONA

// function to go find data in the URL
// should be provided a defualt (e.g., "") so that there will be no errors thrown
function getUrlParam(parameter, defaultvalue){ // #SONA
  var urlparameter = defaultvalue; // #SONA
  if(window.location.href.indexOf(parameter) > -1){ // #SONA
      urlparameter = getUrlVars()[parameter]; // #SONA
      } // #SONA
  return urlparameter; // #SONA
}

/*
JSPSYCH code
*/
var sona_id = getUrlParam('sona_id','Empty'); // #SONA
var jsPsych = initJsPsych();

var survey_trial = {
  type: jsPsychSurveyText,
  questions: [
  {prompt: "Name", name: 'name', value:" ", rows:1, columns:15, required:true},
  {prompt: "Birth year (YYYY)", name: 'birth_year', value:" ", rows:1, columns:15, required:true}, 
  {prompt: "Gender (F/M/other)", name: 'gender', value:"", rows:1, columns:15, required:true},
  {prompt: "Handedness (RH/LH/both)", name: 'handedness', value:"", rows:1, columns:15, required:true},
  ],
};

var allow_mic = {
    type: jsPsychInitializeMicrophone
};

var post_delay_ISI = function() {
  return (Math.random()*0.2+1.2)*1000  //1.2-1.4
}
var post_delay_blank = {
   type: jsPsychHtmlKeyboardResponse,
   stimulus:'',
   trial_duration: post_delay_ISI
}
var recording_block = {
  type: MuseRecordPlugin,
  stimulus: 'close your eyes for one minute.',
  recording_id: 'test',
  recording_duration: length_muse_recording
}
var recall = {
    type: jsPsychHtmlAudioResponse,
    stimulus: 
        '<p>Please sing the first few seconds of a song and click the button when you are done.</p>'
        +'<div style="font-size: 50px; color: blue"><p><span id="clock">3:00</span></div></p>',
    recording_duration: length_recall,
    show_done_button: true,
    done_button_label: 'I am done.',
    on_load: function(){
      window.clear_timer = 1;
      var wait_time = length_recall-200; // in milliseconds
      var start_time = performance.now();
      // document.querySelector('button').disabled = true;
      var interval = setInterval(function(){
          var time_left = wait_time - (performance.now() - start_time);
          var minutes = Math.floor(time_left / 1000 / 60);
          var seconds = Math.floor((time_left - minutes*1000*60)/1000);
          var seconds_str = seconds.toString().padStart(2,'0');
          if(time_left <= 0){
              document.querySelector('#clock').innerHTML = "0:00";
              window.clear_timer = -1;
          };
          if(window.clear_timer > 0){
              document.querySelector('#clock').innerHTML = minutes + ':' + seconds_str
          }else {
              clearInterval(interval);
          };
      }, 250)
      },
    on_finish: function(data){
        window.clear_timer = -1;
        // fetch('/save-my-data.php', { audio_base64: data.response })
        //     .then((audio_id){
        //         data.response = audio_id;
        //     });
    }
};


// define final timeline
var timeline = []
// timeline.push(survey_trial)
timeline.push(recording_block);
timeline.push(allow_mic, recall)
jsPsych.run(timeline)