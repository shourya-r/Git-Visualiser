const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

class CatFileCommand {
  constructor(flag, commitSHA) {
    this.flag = flag;
    this.commitSHA = commitSHA;
  }
  execute() {
    const { flag, commitSHA } = this;

    const folder = commitSHA.slice(0, 2);
    const file = commitSHA.slice(2);

    const completePath = path.join(
      process.cwd(),
      ".git",
      "objects",
      folder,
      file
    );

    if (!fs.existsSync(completePath)) {
      // Git exits with a non-zero status code and prints to stderr
      console.error(`fatal: Not a valid object name ${commitSHA}`);
      process.exit(128); // Exit to match git's behavior for bad object name
    }

    const fileContent = fs.readFileSync(completePath);
    const decompressedContent = zlib.inflateSync(fileContent);

    switch (flag) {
      case "-p": {
        const nullByteIndex = decompressedContent.indexOf(0);
        const content = decompressedContent.subarray(nullByteIndex + 1);
        process.stdout.write(content);
        break;
      }
      case "-t": {
        const spaceIndex = decompressedContent.indexOf(32); // 32 is ASCII for space
        const type = decompressedContent.subarray(0, spaceIndex).toString();
        console.log(type); // git cat-file -t adds a newline
        break;
      }
      default:
        console.error(`error: invalid option: ${flag}`);
        process.exit(129); // git exits with 129 for bad flags
    }
  }
}

module.exports = CatFileCommand;
