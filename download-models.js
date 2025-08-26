const fs = require('fs');
const path = require('path');
const https = require('https');

const modelsDir = path.join(__dirname, 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

const modelFiles = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1'
];

const baseUrl = 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/';

modelFiles.forEach(file => {
  const filePath = path.join(modelsDir, file);
  const fileStream = fs.createWriteStream(filePath);
  
  https.get(baseUrl + file, response => {
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded: ${file}`);
    });
  }).on('error', err => {
    fs.unlink(filePath);
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});