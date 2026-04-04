//{
//  "buildCommand": null,
//  "outputDirectory": null,
//  "framework": null
//}
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    // Handle different actions from your frontend
    if (action === 'upload') {
      // Add logic to upload the base64 image to HuggingFace
    } else if (action === 'predict') {
      // Add logic to start the 3D generation
    } else if (action === 'poll') {
      // Add logic to poll the status
    } else if (action === 'extract') {
      // Add logic to extract the GLB
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
