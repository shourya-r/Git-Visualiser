const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

class CommitTreeCommand {
  constructor(tree, parent, commitMessage) {
    this.tree = tree;
    this.parentSHA = parent;
    this.commitMessage = commitMessage;
  }

  execute() {
    const contentParts = [];

    // Always add the tree
    contentParts.push(Buffer.from(`tree ${this.tree}\n`));

    // FIX: Only add the parent line if a parent SHA exists
    if (this.parentSHA) {
      contentParts.push(Buffer.from(`parent ${this.parentSHA}\n`));
    }

    // Get the timestamp once
    const timestamp = `${Math.floor(Date.now() / 1000)} +0530`; // Using IST as an example

    // Add author and committer info
    contentParts.push(
      Buffer.from(`author John Doe <johnDoe@gmail.com> ${timestamp}\n`)
    );
    contentParts.push(
      Buffer.from(`committer John Doe <johnDoe@gmail.com> ${timestamp}\n`)
    );

    // Add the commit message
    contentParts.push(Buffer.from(`\n${this.commitMessage}\n`));

    // Build the final content buffer from the parts
    const commitContentBuffer = Buffer.concat(contentParts);

    // --- The rest of your code is correct ---
    const commitHeader = `commit ${commitContentBuffer.length}\0`;
    const commitBuffer = Buffer.concat([
      Buffer.from(commitHeader),
      commitContentBuffer,
    ]);

    const hash = crypto.createHash("sha1").update(commitBuffer).digest("hex");

    const folder = hash.slice(0, 2);
    const file = hash.slice(2);

    const folderPath = path.join(process.cwd(), ".git", "objects", folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const compressedContent = zlib.deflateSync(commitBuffer);
    fs.writeFileSync(path.join(folderPath, file), compressedContent);

    process.stdout.write(`${hash}\n`);
  }
}

module.exports = CommitTreeCommand;
