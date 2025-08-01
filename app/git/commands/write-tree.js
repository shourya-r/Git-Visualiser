const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

function writeFileBlob(currentPath) {
  const contents = fs.readFileSync(currentPath);
  const fileLength = contents.length;

  const header = `blob ${fileLength}\0`;
  const blob = Buffer.concat([Buffer.from(header), contents]);

  const hash = crypto.createHash("sha1").update(blob).digest("hex");

  const folder = hash.slice(0, 2);
  const file = hash.slice(2);

  const folderPath = path.join(process.cwd(), ".git", "objects", folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const compressedContent = zlib.deflateSync(blob);
  fs.writeFileSync(path.join(folderPath, file), compressedContent);
  return hash;
}

class WriteTreeCommand {
  constructor() {}

  execute() {
    function recursivelyCreateTree(basePath) {
      const dirContents = fs.readdirSync(basePath);
      const result = [];

      for (const dirContent of dirContents) {
        if (dirContent.includes(".git")) continue;

        const currentPath = path.join(basePath, dirContent);
        const stats = fs.statSync(currentPath);

        if (stats.isDirectory()) {
          const sha = recursivelyCreateTree(currentPath);
          result.push({
            mode: "040000",
            name: path.basename(currentPath),
            sha,
          });
        } else if (stats.isFile()) {
          const sha = writeFileBlob(currentPath);
          result.push({
            mode: "100644",
            name: path.basename(currentPath),
            sha,
          });
        }
      }

      result.sort((a, b) => a.name.localeCompare(b.name));

      const treeData = result.reduce((acc, current) => {
        const { mode, name, sha } = current;

        const shaBuffer = Buffer.from(sha, "hex");

        return Buffer.concat([
          acc,
          Buffer.from(`${mode} ${name}\0`),
          shaBuffer,
        ]);
      }, Buffer.alloc(0));

      const tree = Buffer.concat([
        Buffer.from(`tree ${treeData.length}\0`),
        treeData,
      ]);

      const hash = crypto.createHash("sha1").update(tree).digest("hex");
      const folder = hash.slice(0, 2);
      const file = hash.slice(2);

      const treeFolderPath = path.join(
        process.cwd(),
        ".git",
        "objects",
        folder
      );
      if (!fs.existsSync(treeFolderPath)) {
        fs.mkdirSync(treeFolderPath, { recursive: true });
      }

      const compressedContent = zlib.deflateSync(tree);
      fs.writeFileSync(path.join(treeFolderPath, file), compressedContent);

      return hash;
    }

    const sha = recursivelyCreateTree(process.cwd());
    process.stdout.write(`${sha}\n`);
  }
}

module.exports = WriteTreeCommand;
