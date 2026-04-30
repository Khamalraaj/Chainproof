const { spawn } = require('child_process');
const path = require('path');

/**
 * Calls the Python ML bridge to predict spoilage and shelf life.
 * @param {Object} inputData - { vegetable_type, storage_temp_c, etc. }
 */
const predictSpoilage = (inputData) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'ml_bridge.py'),
      JSON.stringify(inputData)
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ML Bridge process exited with code ${code}: ${errorOutput}`));
      }
      try {
        const result = JSON.parse(output);
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse ML output: ${output}`));
      }
    });
  });
};

module.exports = { predictSpoilage };
