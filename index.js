const fs = require('fs');
const path = require("path");
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');
// const express = require('express')
// const app = express()
// app.use(express.json())
// const config = require("./config.js");


// Path where the session data will be stored
const SESSION_FILE_PATH = './session.json';

// app.listen(8080, () => {
//   console.log(`Listening at http://localhost:${8080}`)
// })

// Load the session data if it has been previously saved
let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
    session: sessionData,
    puppeteer: {
      executablePath: '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
  }
});

client.on('disconnected', (reason) => {
  // Destroy and reinitialize the client when disconnected
  client.destroy();
  client.initialize();
});

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', async msg => {
  if (msg.body.startsWith("!ig ")) {
    var url = msg.body.split(" ")[1];
    if(url.includes('/?igshid=')) url = url.split('/?igshid=')[0]
    if (url.endsWith('/')) url = url.slice(0, -1)

    url = url + '/?__a=1'

    msg.reply("Espere um pouco...");

    fetch(url)
      .then(res => res.json()) // expecting a json response
      .then(async response => {

        if (response && !response.graphql.shortcode_media.is_video) {
          if (response.graphql.shortcode_media.edge_sidecar_to_children) {
            let array = response.graphql.shortcode_media.edge_sidecar_to_children.edges

            array.forEach(async (item) => {
              if (item.node.is_video) {
                const video = await fetch(item.node.video_url)
                const data = await video.buffer()
                const name = `./mp4/${Math.floor(Date.now())}.mp4`

                fs.writeFile(name, data, () => {
                  var videoMsg = MessageMedia.fromFilePath(name);
                  client.sendMessage(msg.from, videoMsg)
                });  
              } else {
                const img = await fetch(item.node.display_url)
                const data = await img.buffer()
                const b64 = data.toString('base64');

                var imagem =  new MessageMedia('image/jpeg', b64)
                client.sendMessage(msg.from, imagem);
              }
            })
          } else {
            if (response.graphql.shortcode_media.display_url) {
              const img = await fetch(response.graphql.shortcode_media.display_url)
              const data = await img.buffer()
              const b64 = data.toString('base64');

              var imagem =  new MessageMedia('image/jpeg', b64)
              client.sendMessage(msg.from, imagem);
            }
          }
        } else if(response && response.graphql.shortcode_media.is_video) {
          const video = await fetch(response.graphql.shortcode_media.video_url)
          const data = await img.buffer()
          const name = `./mp4/${Math.floor(Date.now())}.mp4`

          fs.writeFile(name, data, () => {
            var videoMsg = MessageMedia.fromFilePath(name);
            client.sendMessage(msg.from, videoMsg)
          });  
        }
      });
    }
})

client.on('message', async msg => {
  if (msg.body.startsWith("!ytmp3 ")) {
    var url = msg.body.split(" ")[1];
    var videoid = url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);

    const ytdl = require("ytdl-core")
    const { exec } = require("child_process");
    if(videoid != null) {
       console.log("video id = ",videoid[1]);
    } else {
        msg.reply("Vídeo inválido");
    }
    ytdl.getInfo(videoid[1]).then(info => {
    if (info.videoDetails.lengthSeconds> 3000){
      msg.reply("Vídeo muito grande")
    } else {

    msg.reply("Espere um minuto... Estou convertendo o seu vídeo..");
    var YoutubeMp3Downloader = require("youtube-mp3-downloader");

    //Configure YoutubeMp3Downloader with your settings
    var YD = new YoutubeMp3Downloader({
        "ffmpegPath": "/usr/bin/ffmpeg", 
        "outputPath": "./mp3",    // Where should the downloaded and en>
        "youtubeVideoQuality": "highest",       // What video quality sho>
        "queueParallelism": 100,                  // How many parallel down>
        "progressTimeout": 2000                 // How long should be the>
    });

    YD.download(videoid[1]);


    YD.on("finished", function(err, data) {

    var musik = MessageMedia.fromFilePath(data.file);

    msg.reply(` 
     
      Mp3
       
      ----------------------------------

        Nome do Arquivo: *${data.videoTitle}*
        Música : *${data.title}*
        Artista : *${data.artist}*

      ----------------------------------

      👾 YTDownload WhatsApp By MicaBot 👾
    `);
    
    client.sendMessage(msg.from, musik);

    });

    YD.on("error", function(error) {
        console.log(error);
    });

    }});
  }
});

// Save session values to the file upon successful auth
client.on('authenticated', (session) => {
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.initialize();