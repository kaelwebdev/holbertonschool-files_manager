import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';

import writeFile from './utils/writeFile';

const fileQueue = new Queue('image transcoding');
fileQueue.process(async ({ data }, done) => {
  const { _id, userId } = data;
  const { localPath } = data;

  const oldName = localPath.slice(19);

  if (!userId) done(Error('Missing userId'));
  if (!_id) done(Error('Missing fileId'));

  const thumbNail100 = await imageThumbnail(data.data, { width: 100 });
  const thumbNail250 = await imageThumbnail(data.data, { width: 250 });
  const thumbNail500 = await imageThumbnail(data.data, { width: 500 });

  const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';

  await writeFile(`${oldName}_100`, 'image', thumbNail100, pathDir);
  await writeFile(`${oldName}_250`, 'image', thumbNail250, pathDir);
  await writeFile(`${oldName}_500`, 'image', thumbNail500, pathDir);
});

export default fileQueue;
