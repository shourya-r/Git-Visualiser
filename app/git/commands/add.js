const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

class AddCommand {
  constructor(filepath) {
    if (!filepath) {
      throw new Error("No file path provided to add command");
    }
    this.filepath = filepath;
    this.gitPath = path.join(process.cwd(), ".git");
    this.indexPath = path.join(this.gitPath, "index");
  }

  readIndex() {
    const indexEntries = new Map();
    if (fs.existsSync(this.indexPath)) {
      const indexContent = fs.readFileSync(this.indexPath, "utf-8");
      const lines = indexContent
        .split("\n")
        .filter((line) => line.trim() !== "");
      for (const line of lines) {
        const [path, sha] = line.split(" ");
        indexEntries.set(path, sha);
      }
    }
    return indexEntries;
  }

  writeIndex(indexEntries) {
    let content = "";
    for (const [path, sha] of indexEntries.entries()) {
      content += `${path} ${sha}\n`;
    }
    fs.writeFileSync(this.indexPath, content.trim());
  }

  execute() {
    // 1. Check if the file exists in the working directory
    const fullFilepath = path.join(process.cwd(), this.filepath);
    if (!fs.existsSync(fullFilepath)) {
      console.error(
        `fatal: pathspec '${this.filepath}' did not match any files`
      );
      process.exit(128);
    }

    // 2. Create a blob object from the file content
    const fileContent = fs.readFileSync(fullFilepath);
    const header = `blob ${fileContent.length}\0`;
    const blob = Buffer.concat([Buffer.from(header), fileContent]);
    const sha = crypto.createHash("sha1").update(blob).digest("hex");

    // 3. Write the blob object to the .git/objects directory
    const folder = sha.slice(0, 2);
    const file = sha.slice(2);
    const objectPath = path.join(this.gitPath, "objects", folder);
    if (!fs.existsSync(objectPath)) {
      fs.mkdirSync(objectPath, { recursive: true });
    }
    const compressedContent = zlib.deflateSync(blob);
    fs.writeFileSync(path.join(objectPath, file), compressedContent);

    // 4. Read the index, update it, and write it back
    const indexEntries = this.readIndex();
    indexEntries.set(this.filepath, sha); // Add or update the file's entry
    this.writeIndex(indexEntries);

    console.log(`Staged '${this.filepath}'`);
  }
}

module.exports = AddCommand;
