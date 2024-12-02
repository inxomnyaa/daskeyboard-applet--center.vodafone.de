const q = require('daskeyboard-applet');
const logger = q.logger;
const request = require('request-promise');
const cheerio = require('cheerio');

class DataUsageApplet extends q.DesktopApp {
  constructor() {
    super();
    this.pollingInterval = 60 * 1000; // Run every minute
  }

  async run() {
    try {
      // Fetch the webpage content
      const html = await request('https://center.vodafone.de/vfcenter/index.html', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
      });

      // Load HTML with Cheerio
      const $ = cheerio.load(html);

      // Find the progress bar element
      const progressBar = $('.progress-bar');
      
      // Get the text content of the next sibling element
      const valueText = progressBar.next().text().trim();

      logger.info("Got text from Vodafone: " + valueText);

      // Extract the current and maximum values from the text using a regular expression
      const values = valueText.match(/(-?\d+)\s*MB\s*von\s*(\d+)\s*MB/);
      
      if (!values) {
        throw new Error('Could not parse data usage values');
      }

      const currentValue = parseInt(values[1]);
      const maxValue = parseInt(values[2]);

      logger.info("Current " + currentValue);
      logger.info("Max " + maxValue);
      
      // Calculate the percentage of the remaining data volume
      const percentage = (currentValue / maxValue) * 100;
      logger.info("Percentage " + percentage);
      
      // Determine the color based on the percentage
      let color;
      if (percentage >= 66) {
        // Green color (high remaining data volume)
        color = rgbToHex(255 - Math.floor((100 - percentage) * 2.55), 255, 0);
      } else if (percentage >= 33) {
        // Yellow color (medium remaining data volume)
        color = rgbToHex(255, 255 - Math.floor((66 - percentage) * 4.08), 0);
      } else {
        // Red color (low remaining data volume)
        color = rgbToHex(255, Math.floor(percentage * 4.08), 0);
      }
      logger.info("Color #" + color);

      // Create a new signal object with the calculated color and remaining data volume message
      const signal = new q.Signal({
        points: [[new q.Point(`#${color}`, q.Effects.SET_COLOR)]],
        name: 'Data Usage',
        message: `Remaining Data: ${currentValue} MB / ${maxValue} MB`,
      });

      return signal;
    } catch (error) {
  
      // Check for specific Vodafone WiFi access restriction
      if (error.message && error.message.includes('W-LAN')) {
        return new q.Signal({
          points: [[new q.Point('#FF0000', q.Effects.BREATHE)]],
          name: 'Data Usage Error',
          message: 'Vodafone requires mobile network connection'
        });
      }
    
      return q.Signal.error([`An error occurred: ${error.toString()}`]);
    }
  }
}

// Function to convert RGB values to a hexadecimal string
function rgbToHex(r, g, b) {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

module.exports = {
  DataUsageApplet: DataUsageApplet,
};

// Create an instance of the DataUsageApplet class
const dataUsageApplet = new DataUsageApplet();