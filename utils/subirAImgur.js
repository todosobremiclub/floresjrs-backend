const axios = require('axios');
require('dotenv').config();

const subirAImgur = async (imagenBuffer) => {
  const imagenBase64 = imagenBuffer.toString('base64');

  const response = await axios.post(
    'https://api.imgur.com/3/image',
    { image: imagenBase64, type: 'base64' },
    {
      headers: {
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
      },
    }
  );

  return response.data.data.link;
};

module.exports = subirAImgur;
