import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';

import writeFile from './utils/writeFile';
import DBClient from './utils/db';

const { ObjectId } = require('mongodb');

const fileQueue = new Queue('image transcoding');
fileQueue.process(async ({ data }, done) => {
  const { _id, userId } = data;
  const { localPath } = data;

  const oldName = localPath.slice(19);

  if (!userId) done(Error('Missing userId'));
  if (!_id) done(Error('Missing fileId'));

  const fileDocument = await DBClient.db.collection('files').findOne({ _id: ObjectId(_id), userId: ObjectId(userId) });
  if (!fileDocument) done(Error('File not found'));

  const thumbNail100 = await imageThumbnail(data.data, { width: 100 });
  const thumbNail250 = await imageThumbnail(data.data, { width: 250 });
  const thumbNail500 = await imageThumbnail(data.data, { width: 500 });

  const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';

  await writeFile(`${oldName}_100`, thumbNail100, 'image', pathDir);
  await writeFile(`${oldName}_250`, thumbNail250, 'image', pathDir);
  await writeFile(`${oldName}_500`, thumbNail500, 'image', pathDir);
});

export default fileQueue;
