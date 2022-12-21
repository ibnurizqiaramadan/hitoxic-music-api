import { Request, Response } from 'express';
import youtubedl from 'youtube-dl-exec';
import lodash from 'lodash';

const ytdlExec = (url:string) => {
  return new Promise((resolve, reject) => {
    youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    })
        .then((output) => {
          resolve(output);
        })
        .catch((err) => {
          reject(err);
        });
  });
};
const play = (req: Request, res: Response) => {
  const mainFunction = async () => {
    const { host } = req.headers;
    const query:any = req.query;
    const url:string = query.url;
    ytdlExec(url).then((output:any) => {
      if (output.is_live === true) return res.status(400).send({ statusCode: 400, message: 'tidak support live stream' });
      const filterAudio:any = output.formats.filter(
          (x:any) => (x.audio_ext === 'webm' && x.video_ext === 'none')
      );
      const filterHighest:any = lodash.maxBy(filterAudio, (x:any) => x.abr);
      // eslint-disable-next-line no-undef
      const streamKey = Buffer.from(filterHighest?.url ?? '').toString('base64').replace(/=/g, '');
      const result:Object = {
        'title': output.title,
        'thumbnail': output.thumbnail,
        'streamKey': streamKey,
        'streamUrl': `http://${host}/player/stream/${streamKey}`,
      };
      res.send({ result });
    });

    // ytdlExec(req.params);
  };
  mainFunction();
};

export default play;
