import fs from 'fs';

export default async (name, data, type, pathDir) => {
  let buff = Buffer.from(data, 'base64');
  const pathFile = `${pathDir}/${name}`;

  if (type !== 'image') buff = buff.toString('utf8');

  try {
    await fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return '';
      return pathFile;
    });

    await fs.writeFile(pathFile, buff, (error) => {
      if (error) return '';
      return pathFile;
    });
  } catch (error) {
    return '';
  }
  return pathFile;
};
