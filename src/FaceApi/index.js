// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* eslint prefer-destructuring: ["error", {AssignmentExpression: {array: false}}] */
/* eslint no-await-in-loop: "off" */

/*
 * FaceApi: real-time face recognition, expressions, and landmark detection
 * Ported and integrated from all the hard work by: https://github.com/justadudewhohacks/face-api.js?files=1
 */

import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import callCallback from '../utils/callcallback';

const DEFAULTS = {
    withFaceLandmarks: true,
    withFaceExpressions: true,
    withFaceDescriptors: true,
    MODEL_URLS: {
        Mobilenetv1Model: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/ssd_mobilenetv1_model-weights_manifest.json',
        FaceLandmarkModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_landmark_68_model-weights_manifest.json',
        FaceLandmark68TinyNet: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_landmark_68_tiny_model-weights_manifest.json',
        FaceRecognitionModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_recognition_model-weights_manifest.json',
        FaceExpressionModel: 'https://raw.githubusercontent.com/ml5js/ml5-data-and-models/face-api/models/faceapi/face_expression_model-weights_manifest.json'
    }
}

class FaceApiBase {
    /**
     * Create FaceApi.
     * @param {HTMLVideoElement} video - An HTMLVideoElement.
     * @param {object} options - An object with options.
     * @param {function} callback - A callback to be called when the model is ready.
     */
    constructor(video, options, callback) {
        this.video = video;
        this.model = null;
        this.modelReady = false;
        this.config = {
            withFaceLandmarks: options.withFaceLandmarks || DEFAULTS.withFaceLandmarks,
            withFaceExpressions: options.withFaceExpressions || DEFAULTS.withFaceExpressions,
            withFaceDescriptors: options.withFaceDescriptors || DEFAULTS.withFaceDescriptors,
            MODEL_URLS: {
                Mobilenetv1Model: options.Mobilenetv1Model || DEFAULTS.MODEL_URLS.Mobilenetv1Model,
                FaceLandmarkModel: options.FaceLandmarkModel || DEFAULTS.MODEL_URLS.FaceLandmarkModel,
                FaceLandmark68TinyNet: options.FaceLandmark68TinyNet || DEFAULTS.MODEL_URLS.FaceLandmark68TinyNet,
                FaceRecognitionModel: options.FaceRecognitionModel || DEFAULTS.MODEL_URLS.FaceRecognitionModel,
                FaceExpressionModel: options.FaceExpressionModel || DEFAULTS.MODEL_URLS.FaceExpressionModel,
            }
        }

        this.ready = callCallback(this.loadModel(), callback);
    }

    getModelPath(absoluteOrRelativeUrl ){
        const modelJsonPath = this.isAbsoluteURL(absoluteOrRelativeUrl) ? absoluteOrRelativeUrl : window.location.pathname + absoluteOrRelativeUrl
        return modelJsonPath;
    }   

    /**
     * Load the model and set it to this.model
     * @return {this} the BodyPix model.
     */
    async loadModel() {
        const modelOptions = [
            "Mobilenetv1Model",
            "FaceLandmarkModel",
            "FaceLandmark68TinyNet",
            "FaceRecognitionModel",
            "FaceExpressionModel",
        ];

        Object.keys(this.config.MODEL_URLS).forEach(item => {
            if(modelOptions.includes(item)){
                this.config.MODEL_URLS[item] = this.getModelPath(this.config.MODEL_URLS[item]);
            }
        });

        const {Mobilenetv1Model, FaceLandmarkModel, FaceRecognitionModel, FaceExpressionModel} = this.config.MODEL_URLS;

        
        this.model = faceapi;
        await this.model.loadSsdMobilenetv1Model(Mobilenetv1Model)
        await this.model.loadFaceLandmarkModel(FaceLandmarkModel)
        // await this.model.loadFaceLandmarkTinyModel(FaceLandmark68TinyNet) 
        await this.model.loadFaceRecognitionModel(FaceRecognitionModel)
        await this.model.loadFaceExpressionModel(FaceExpressionModel)
        this.modelReady = true;
        return this;
    }

    async detect(optionsOrCallback, configOrCallback, cb){
        let imgToClassify = this.video;
        let callback;
        let faceApiOptions = this.config;

        // Handle the image to predict
        if (typeof optionsOrCallback === 'function') {
            imgToClassify = this.video;
            callback = optionsOrCallback;
            // clean the following conditional statement up!
        } else if (optionsOrCallback instanceof HTMLImageElement) {
            imgToClassify = optionsOrCallback;
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.elt instanceof HTMLImageElement
        ) {
            imgToClassify = optionsOrCallback.elt; // Handle p5.js image
        } else if (optionsOrCallback instanceof HTMLCanvasElement) {
            imgToClassify = optionsOrCallback;
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.elt instanceof HTMLCanvasElement
        ) {
            imgToClassify = optionsOrCallback.elt; // Handle p5.js image
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.canvas instanceof HTMLCanvasElement
        ) {
            imgToClassify = optionsOrCallback.canvas; // Handle p5.js image
        } else if (!(this.video instanceof HTMLVideoElement)) {
            // Handle unsupported input
            throw new Error(
                'No input image provided. If you want to classify a video, pass the video element in the constructor. ',
            );
        }

         if (typeof configOrCallback === 'object') {
            faceApiOptions = configOrCallback;
        } else if (typeof configOrCallback === 'function') {
            callback = configOrCallback;
        }

        if (typeof cb === 'function') {
            callback = cb;
        }

        return callCallback(this.detectInternal(imgToClassify, faceApiOptions), callback);
    }

    async detectInternal(imgToClassify, faceApiOptions){
        await this.ready;
        await tf.nextFrame();

        if (this.video && this.video.readyState === 0) {
            await new Promise(resolve => {
                this.video.onloadeddata = () => resolve();
            });
        }

        this.config.withFaceLandmarks =  faceApiOptions.withFaceLandmarks !== undefined ? faceApiOptions.withFaceLandmarks : this.config.withFaceLandmarks;
        this.config.withFaceExpressions =   faceApiOptions.withFaceExpressions !== undefined ? faceApiOptions.withFaceExpressions : this.config.withFaceExpressions;
        this.config.withFaceDescriptors =   faceApiOptions.withFaceDescriptors !== undefined ? faceApiOptions.withFaceDescriptors : this.config.withFaceDescriptors;

        const {withFaceLandmarks, withFaceExpressions, withFaceDescriptors} = this.config


        let result;

        if(withFaceLandmarks){
            if (withFaceExpressions && withFaceDescriptors) {
                result = await this.model.detectAllFaces(imgToClassify).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
            } else if(withFaceExpressions){
                result = await this.model.detectAllFaces(imgToClassify).withFaceLandmarks().withFaceExpressions();
            } else {
                result = await this.model.detectAllFaces(imgToClassify).withFaceLandmarks()
            }
        } else if (withFaceLandmarks === false) {
            result = await this.model.detectAllFaces(imgToClassify).withFaceExpressions()
        } else {
            result = await this.model.detectAllFaces(imgToClassify).withFaceLandmarks().withFaceExpressions().withFaceDescriptors();
        }
        
        return result
    }

    async detectSingle(optionsOrCallback, configOrCallback, cb){
        let imgToClassify = this.video;
        let callback;
        let faceApiOptions = this.config;

        // Handle the image to predict
        if (typeof optionsOrCallback === 'function') {
            imgToClassify = this.video;
            callback = optionsOrCallback;
            // clean the following conditional statement up!
        } else if (optionsOrCallback instanceof HTMLImageElement) {
            imgToClassify = optionsOrCallback;
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.elt instanceof HTMLImageElement
        ) {
            imgToClassify = optionsOrCallback.elt; // Handle p5.js image
        } else if (optionsOrCallback instanceof HTMLCanvasElement) {
            imgToClassify = optionsOrCallback;
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.elt instanceof HTMLCanvasElement
        ) {
            imgToClassify = optionsOrCallback.elt; // Handle p5.js image
        } else if (
            typeof optionsOrCallback === 'object' &&
            optionsOrCallback.canvas instanceof HTMLCanvasElement
        ) {
            imgToClassify = optionsOrCallback.canvas; // Handle p5.js image
        } else if (!(this.video instanceof HTMLVideoElement)) {
            // Handle unsupported input
            throw new Error(
                'No input image provided. If you want to classify a video, pass the video element in the constructor. ',
            );
        }

         if (typeof configOrCallback === 'object') {
            faceApiOptions = configOrCallback;
        } else if (typeof configOrCallback === 'function') {
            callback = configOrCallback;
        }

        if (typeof cb === 'function') {
            callback = cb;
        }

        return callCallback(this.detectSingleInternal(imgToClassify, faceApiOptions), callback);
    }

    async detectSingleInternal(imgToClassify, faceApiOptions){
        await this.ready;
        await tf.nextFrame();

        if (this.video && this.video.readyState === 0) {
            await new Promise(resolve => {
                this.video.onloadeddata = () => resolve();
            });
        }

        this.config.withFaceLandmarks =  faceApiOptions.withFaceLandmarks !== undefined ? faceApiOptions.withFaceLandmarks : this.config.withFaceLandmarks;
        this.config.withFaceExpressions =   faceApiOptions.withFaceLandmarks !== undefined ? faceApiOptions.withFaceExpressions : this.config.withFaceExpressions;
        this.config.withFaceDescriptors =   faceApiOptions.withFaceLandmarks !== undefined ? faceApiOptions.withFaceDescriptors : this.config.withFaceDescriptors;

        const {withFaceLandmarks, withFaceExpressions, withFaceDescriptors} = this.config


        let result;

        if(withFaceLandmarks){
            if (withFaceExpressions && withFaceDescriptors) {
                result = await this.model.detectSingleFace(imgToClassify).withFaceLandmarks().withFaceExpressions().withFaceDescriptor();
            } else if(withFaceExpressions){
                result = await this.model.detectSingleFace(imgToClassify).withFaceLandmarks().withFaceExpressions();
            } else {
                result = await this.model.detectSingleFace(imgToClassify).withFaceLandmarks()
            }
        } else if (withFaceLandmarks === false) {
            result = await this.model.detectSingleFace(imgToClassify).withFaceExpressions()
        } else {
            result = await this.model.detectSingleFace(imgToClassify).withFaceLandmarks().withFaceExpressions().withFaceDescriptor();
        }
        
        return result
    }

    /* eslint class-methods-use-this: "off" */
    isAbsoluteURL(str) {
        const pattern = new RegExp('^(?:[a-z]+:)?//', 'i');
        return !!pattern.test(str);
    }

}

const faceApi = (videoOrOptionsOrCallback, optionsOrCallback, cb) => {
    let video;
    let options = {};
    let callback = cb;

//     if (typeof modelPath !== 'string') {
//         throw new Error('Please specify a relative path to your model to use. E.g: "/models/"');
//     }

//    const model = modelPath;

    if (videoOrOptionsOrCallback instanceof HTMLVideoElement) {
        video = videoOrOptionsOrCallback;
    } else if (
        typeof videoOrOptionsOrCallback === 'object' &&
        videoOrOptionsOrCallback.elt instanceof HTMLVideoElement
    ) {
        video = videoOrOptionsOrCallback.elt; // Handle a p5.js video element
    } else if (typeof videoOrOptionsOrCallback === 'object') {
        options = videoOrOptionsOrCallback;
    } else if (typeof videoOrOptionsOrCallback === 'function') {
        callback = videoOrOptionsOrCallback;
    }

    if (typeof optionsOrCallback === 'object') {
        options = optionsOrCallback;
    } else if (typeof optionsOrCallback === 'function') {
        callback = optionsOrCallback;
    }

    const instance = new FaceApiBase(video, options, callback);
    return callback ? instance : instance.ready;
}

export default faceApi;