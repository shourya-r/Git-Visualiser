const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

class HashObjectCommand {
  constructor(flag, filePath) {
    this.flag = flag;
    this.filePath = filePath;
  }

  execute() {
    const filePath = path.resolve(this.filePath);

    // check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`fatal: unable to read file ${filePath}`);
      process.exit(128); // Exit to match git's behavior for bad file
    }

    // read the file content
    const fileContent = fs.readFileSync(filePath);
    const fileLength = fileContent.length;

    // create the blob object
    const header = `blob ${fileLength}\0`;
    const blob = Buffer.concat([Buffer.from(header), fileContent]);

    // calculate the SHA-1 hash
    const hash = crypto.createHash("sha1").update(blob).digest("hex");

    // if the flag is -w, write the object to the .git/objects directory
    if (this.flag && this.flag == "-w") {
      const folder = hash.slice(0, 2);
      const file = hash.slice(2);

      const folderPath = path.join(process.cwd(), ".git", "objects", folder);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      // compress the blob content
      const compressedContent = zlib.deflateSync(blob);

      fs.writeFileSync(path.join(folderPath, file), compressedContent);
    }

    process.stdout.write(`${hash}\n`);
  }
}

module.exports = HashObjectCommand;
