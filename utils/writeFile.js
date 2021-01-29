import fs from 'fs';

export default async (name, data, type, pathDir) => {
  let buff = Buffer.from(data, 'base64');
  const localPath = `${pathDir}/${name}`;

  if (type !== 'image') buff = buff.toString('utf8');
  /* eslint-disable no-useless-catch */
  try {
    fs.mkdirSync(pathDir, { recursive: true });
    fs.writeFileSync(localPath, buff);
  } catch (error) {
    throw error;
  }
  return localPath;
};
